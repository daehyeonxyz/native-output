#!/usr/bin/env node
/**
 * 턴이 끝날 때 마지막 대화 응답을 금지 표현 목록과 대조한다.
 *
 * Stop 훅이다. 목록의 단일 원본은 standards/banned-words.json 으로,
 * Write·Edit 를 검사하는 native-output-gate.js 와 같은 목록을 쓴다.
 * 산출물만이 아니라 대화 응답에서도 측정으로 확정한 금지 표현을 막기 위해서다.
 *
 *   - 코드블록과 큰따옴표 인용 안은 검사에서 뺀다
 *   - 한글 없는 응답은 지나간다
 *   - stop_hook_active 면 통과시켜 반복 차단 루프를 막는다
 *   - 스크립트가 어떤 이유로든 실패하면 통과시킨다
 *
 * 강도는 `NATIVE_OUTPUT_LEVEL` 이 정한다. `block`(기본)은 응답을 다시 쓰게 만들고
 * `warn` 은 막지 않고 알리기만 한다.
 * `NATIVE_OUTPUT_GATE=off` 로 비활성화된다.
 */

const fs = require('node:fs');
const path = require('node:path');

const BANNED_LIST = path.join(__dirname, '..', '..', 'standards', 'banned-words.json');

function pass() {
  process.exit(0);
}

function lastAssistantText(transcriptPath) {
  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (entry?.type !== 'assistant') continue;
    const content = entry?.message?.content;
    if (!Array.isArray(content)) continue;
    const text = content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
    if (text) return text;
  }
  return '';
}

function strip(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/"[^"\n]*"/g, ' ');
}

function main() {
  if ((process.env.NATIVE_OUTPUT_GATE || '').toLowerCase() === 'off') pass();

  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    pass();
  }

  if (input?.stop_hook_active) pass();
  const transcriptPath = input?.transcript_path;
  if (!transcriptPath || !fs.existsSync(transcriptPath)) pass();

  let text = '';
  try {
    text = lastAssistantText(transcriptPath);
  } catch {
    pass();
  }
  if (!text || !/[가-힣]/.test(text)) pass();

  let banned = [];
  try {
    banned = JSON.parse(fs.readFileSync(BANNED_LIST, 'utf8')).banned || [];
  } catch {
    pass();
  }

  const body = strip(text);
  const hits = banned.filter((one) => one.word && body.includes(one.word));
  if (hits.length === 0) pass();

  const lines = hits.map((one) => `"${one.word}" 대신 "${one.fix}"`);
  const found = '마지막 응답에 금지 표현이 있습니다. ' + lines.join(' / ') + '.';

  if ((process.env.NATIVE_OUTPUT_LEVEL || 'block').toLowerCase() === 'warn') {
    process.stdout.write(JSON.stringify({ systemMessage: '[native-output] ' + found }));
    process.exit(0);
  }

  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason: '[native-output] ' + found + ' 응답을 고쳐서 다시 내보내세요.',
    }),
  );
  process.exit(0);
}

main();
