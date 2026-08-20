#!/usr/bin/env node
/**
 * native-output 훅 두 종을 ~/.claude/settings.json 에 등록한다.
 *
 * 여러 번 실행해도 같은 결과가 나온다. 이미 등록된 항목은 다시 넣지 않고,
 * 쓰기 전에 원본을 settings.json.native-output.bak 으로 백업한다.
 * 스킬 폴더가 ~/.claude/skills/native-output 에 있어야 훅 경로가 성립한다.
 *
 * 실행: node scripts/setup-hooks.js
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');
const SKILL_DIR = path.join(os.homedir(), '.claude', 'skills', 'native-output');

const GATE_CMD = 'node "$HOME/.claude/skills/native-output/hooks/native-output-gate.js"';
const MARK_CMD = 'node "$HOME/.claude/skills/native-output/hooks/native-output-mark.js"';
const STOP_CMD = 'node "$HOME/.claude/skills/native-output/hooks/native-output-stop-gate.js"';

function fail(msg) {
  console.error('[setup-hooks] ' + msg);
  process.exit(1);
}

function hasCommand(groups, cmd) {
  return (groups || []).some((g) => (g.hooks || []).some((h) => h.command === cmd));
}

function addHook(settings, event, matcher, cmd, statusMessage) {
  settings.hooks = settings.hooks || {};
  settings.hooks[event] = settings.hooks[event] || [];
  if (hasCommand(settings.hooks[event], cmd)) {
    console.log(`[setup-hooks] 이미 등록됨: ${event} ${cmd}`);
    return false;
  }
  const entry = { type: 'command', command: cmd, timeout: 10 };
  if (statusMessage) entry.statusMessage = statusMessage;
  const group = settings.hooks[event].find((g) => g.matcher === matcher);
  if (group) {
    group.hooks = group.hooks || [];
    group.hooks.push(entry);
  } else {
    settings.hooks[event].push({ matcher, hooks: [entry] });
  }
  console.log(`[setup-hooks] 등록: ${event}${matcher ? ` (${matcher})` : ''} ${cmd}`);
  return true;
}

function main() {
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

  const changed = [
    addHook(settings, 'PreToolUse', 'Write|Edit', GATE_CMD, 'native-output gate'),
    addHook(settings, 'PostToolUse', 'Skill', MARK_CMD),
    addHook(settings, 'Stop', undefined, STOP_CMD, 'native-output stop gate'),
  ].some(Boolean);

  if (changed) {
    fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    console.log(`[setup-hooks] 저장 완료: ${SETTINGS} (백업: settings.json.native-output.bak)`);
    console.log('[setup-hooks] 훅은 다음 세션부터 적용된다. Claude Code 를 재시작할 것.');
  } else {
    console.log('[setup-hooks] 변경 없음. 이미 전부 등록되어 있다.');
  }
}

main();
