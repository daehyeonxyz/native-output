#!/usr/bin/env node
/**
 * native-output 훅 세 종을 ~/.claude/settings.json 에 등록한다.
 *
 * 강도를 고를 수 있다.
 *
 *   --level=block  (기본) 금지 표현이 있거나 스킬을 안 부르고 한국어를 쓰면 거부한다
 *   --level=warn         막지 않고 알리기만 한다
 *   --level=off          훅을 전부 뺀다 (전역 규칙 층만 남는다)
 *
 * 여러 번 실행해도 같은 결과가 나온다. 다시 실행하면 기존 native-output 훅을
 * 지우고 고른 강도로 다시 넣으므로 강도만 바꿔 재실행해도 된다.
 * 쓰기 전에 원본을 settings.json.native-output.bak 으로 백업한다.
 * 스킬 폴더가 ~/.claude/skills/native-output 에 있어야 훅 경로가 성립한다.
 *
 * 실행: node scripts/setup-hooks.js --level=warn
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');
const SKILL_DIR = path.join(os.homedir(), '.claude', 'skills', 'native-output');

const HOOK_BASE = '"$HOME/.claude/skills/native-output/hooks';
const GATE = `${HOOK_BASE}/native-output-gate.js"`;
const MARK = `${HOOK_BASE}/native-output-mark.js"`;
const STOP = `${HOOK_BASE}/native-output-stop-gate.js"`;

/* 이 문자열이 든 훅 명령은 native-output 의 것으로 본다. */
const OWNED = 'skills/native-output/hooks/';

const LEVELS = ['block', 'warn', 'off'];

function fail(msg) {
  console.error('[setup-hooks] ' + msg);
  process.exit(1);
}

function readLevel() {
  const arg = process.argv.slice(2).find((one) => one.startsWith('--level='));
  if (!arg) return 'block';
  const value = arg.slice('--level='.length).toLowerCase();
  if (!LEVELS.includes(value)) fail(`강도는 ${LEVELS.join(' 또는 ')} 중 하나여야 한다: ${value}`);
  return value;
}

/* 기존 native-output 훅을 전부 뺀다. 남의 훅은 건드리지 않는다. */
function removeOwned(settings) {
  let removed = 0;
  const events = settings.hooks || {};
  for (const event of Object.keys(events)) {
    const groups = Array.isArray(events[event]) ? events[event] : [];
    for (const group of groups) {
      const before = (group.hooks || []).length;
      group.hooks = (group.hooks || []).filter((h) => !String(h.command || '').includes(OWNED));
      removed += before - group.hooks.length;
    }
    events[event] = groups.filter((g) => (g.hooks || []).length > 0);
    if (events[event].length === 0) delete events[event];
  }
  if (Object.keys(events).length === 0) delete settings.hooks;
  return removed;
}

function addHook(settings, event, matcher, command, statusMessage) {
  settings.hooks = settings.hooks || {};
  settings.hooks[event] = settings.hooks[event] || [];
  const entry = { type: 'command', command, timeout: 10 };
  if (statusMessage) entry.statusMessage = statusMessage;
  const group = settings.hooks[event].find((g) => g.matcher === matcher);
  if (group) {
    group.hooks = group.hooks || [];
    group.hooks.push(entry);
  } else {
    settings.hooks[event].push({ matcher, hooks: [entry] });
  }
  console.log(`[setup-hooks] 등록: ${event}${matcher ? ` (${matcher})` : ''}`);
}

function main() {
  const level = readLevel();

  if (!fs.existsSync(path.join(SKILL_DIR, 'hooks', 'native-output-gate.js'))) {
    fail(`스킬 폴더가 ${SKILL_DIR} 에 없다. 폴더를 먼저 그 위치로 복사한 뒤 다시 실행할 것.`);
  }

  let settings = {};
  if (fs.existsSync(SETTINGS)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    } catch {
      fail(`${SETTINGS} 파싱 실패. 파일이 올바른 JSON 인지 먼저 확인할 것.`);
    }
    fs.copyFileSync(SETTINGS, SETTINGS + '.native-output.bak');
  }

  const removed = removeOwned(settings);
  if (removed > 0) console.log(`[setup-hooks] 기존 native-output 훅 ${removed}개를 뺐다.`);

  if (level === 'off') {
    console.log('[setup-hooks] 강도 off — 훅을 등록하지 않는다. 전역 규칙 층은 그대로 남는다.');
  } else {
    const prefix = level === 'warn' ? 'NATIVE_OUTPUT_LEVEL=warn ' : '';
    addHook(settings, 'PreToolUse', 'Write|Edit', `${prefix}node ${GATE}`, 'native-output gate');
    addHook(settings, 'PostToolUse', 'Skill', `node ${MARK}`);
    addHook(settings, 'Stop', undefined, `${prefix}node ${STOP}`, 'native-output stop gate');
    console.log(`[setup-hooks] 강도 ${level}${level === 'warn' ? ' — 막지 않고 알리기만 한다.' : ' — 걸리면 거부한다.'}`);
  }

  fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  console.log(`[setup-hooks] 저장 완료: ${SETTINGS}${fs.existsSync(SETTINGS + '.native-output.bak') ? ' (백업: settings.json.native-output.bak)' : ''}`);
  console.log('[setup-hooks] 훅은 다음 세션부터 적용된다. Claude Code 를 재시작할 것.');
}

main();
