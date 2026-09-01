#!/usr/bin/env node
/**
 * 한국어가 들어가는 산출물을 쓸 때 native-output 스킬이 로드됐는지 본다.
 *
 * PreToolUse(Write|Edit) 로 걸린다. md 만이 아니라 한글이 들어가는 텍스트 파일
 * 전부를 검사하고, 글자 수 기준 없이 한 글자라도 한글이 있으면 검사한다.
 *
 *   - 외부 소유물(vendor·node_modules·_archive)과 잠금 파일과 생성물은 안 본다
 *   - 마커는 60분 안의 것만 인정하고 통과하는 편집마다 시각을 갱신한다
 *   - 쓰려는 내용만 본다. 한글 없는 편집은 지나간다
 *   - 스크립트가 어떤 이유로든 실패하면 통과시킨다
 *
 * 마커 검사에 더해 금지 표현을 결정론으로 검사한다. 목록의 단일 원본은
 * 스킬 폴더의 standards/banned-words.json 이다. 스킬을 불렀어도 목록의 말이
 * 들어 있으면 거부한다. 스킬 호출이 표현 준수를 보장하지 않는다.
 * 스킬 폴더 자신은 금지 표현을 인용으로 담으므로 이 검사에서 뺀다.
 *
 * 강도는 `NATIVE_OUTPUT_LEVEL` 이 정한다. `block`(기본)은 거부하고 `warn` 은
 * 막지 않고 알리기만 한다. 값은 setup 이 훅 명령 앞에 붙여 둔다.
 * `NATIVE_OUTPUT_GATE=off` 를 넣으면 강도와 무관하게 이 문이 열린 채로 있는다.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const DIR = path.join(os.homedir(), '.claude', '.native-output-loaded');
const MARKER_FRESH_MS = 60 * 60 * 1000;
const BANNED_LIST = path.join(__dirname, '..', '..', 'standards', 'banned-words.json');

const TEXT_EXT = /\.(md|txt|ts|tsx|js|jsx|mjs|cjs|rs|py|toml|css|html|json|ya?ml)$/i;
const SKIP = /(node_modules|[\\/]vendor[\\/]|[\\/]_archive[\\/]|[\\/]target[\\/]|[\\/]dist[\\/]|[\\/]build[\\/]|[\\/]\.git[\\/]|CHANGELOG|package-lock|pnpm-lock)/i;

/* 스킬 폴더 자신은 금지 표현을 인용으로 담으므로 검사하지 않는다. */
const QUOTE_OK = /(native-output)/i;

function pass() {
  process.exit(0);
}

function warnOnly() {
  return (process.env.NATIVE_OUTPUT_LEVEL || 'block').toLowerCase() === 'warn';
}

/* warn 강도에서는 막지 않고 사용자에게 알리기만 한다. */
function report(reason) {
  if (warnOnly()) {
    process.stdout.write(JSON.stringify({ systemMessage: '[native-output] ' + reason }));
    process.exit(0);
  }
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

function main() {
  if ((process.env.NATIVE_OUTPUT_GATE || '').toLowerCase() === 'off') pass();

  let raw = '';
  try {
    raw = fs.readFileSync(0, 'utf8');
  } catch {
    pass();
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    pass();
  }

  const file = input?.tool_input?.file_path || '';
  if (!TEXT_EXT.test(file)) pass();
  if (SKIP.test(file)) pass();

  const text = input?.tool_input?.content ?? input?.tool_input?.new_string ?? '';
  if (typeof text !== 'string' || !text) pass();

  const hangul = (text.match(/[가-힣]/g) || []).length;
  if (hangul === 0) pass();

  /* 금지 표현의 결정론 검사 */
  if (!QUOTE_OK.test(file)) {
    let banned = [];
    try {
      banned = JSON.parse(fs.readFileSync(BANNED_LIST, 'utf8')).banned || [];
    } catch {
      banned = [];
    }
    const hits = banned.filter((one) => one.word && text.includes(one.word));
    if (hits.length > 0) {
      const lines = hits.map((one) => `  "${one.word}" 대신 "${one.fix}"`);
      report(
        [
          '금지 표현이 들어 있습니다.',
          '',
          ...lines,
          '',
          '해당 문장을 실사용 어휘로 다시 쓰세요. 목록은 native-output 의 standards/banned-words.json 입니다.',
          '인용 목적이면 NATIVE_OUTPUT_GATE=off 로 이 문을 엽니다.',
        ].join('\n'),
      );
    }
  }

  const session = input?.session_id;
  if (session) {
    try {
      const marker = path.join(DIR, `${session}`);
      if (fs.existsSync(marker) && Date.now() - fs.statSync(marker).mtimeMs < MARKER_FRESH_MS) {
        const now = new Date();
        fs.utimesSync(marker, now, now);
        pass();
      }
    } catch {
      pass();
    }
  }

  const reason = [
    '한국어 산출물은 native-output 을 거쳐야 합니다.',
    '',
    `한글 ${hangul}자 · ${path.basename(file)}`,
    '',
    'Skill 도구로 native-output 을 부르고 이 글의 종류에 맞는 기준을 읽은 뒤에 쓰세요.',
    '사용자가 부르지 않아도 한국어를 쓸 때는 먼저 부릅니다.',
    '마커는 마지막 통과 편집에서 60분까지 유효하니 오래 쉬었으면 다시 부르세요.',
    '남의 글이나 기계 생성물이면 NATIVE_OUTPUT_GATE=off 로 이 문을 엽니다.',
  ].join('\n');

  report(reason);
}

main();
