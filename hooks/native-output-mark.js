#!/usr/bin/env node
/**
 * native-output 스킬이 로드되면 세션 마커를 남긴다.
 *
 * PostToolUse(Skill) 로 걸린다. `native-output-gate.js` 가 이 마커를 보고
 * 한국어 산문 쓰기를 통과시킨다. 마커는 세션마다 따로라 새 세션에서는
 * 다시 스킬을 불러야 한다.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const DIR = path.join(os.homedir(), '.claude', '.native-output-loaded');

const SKILL_NAME = /^native-output$/;

function main() {
  let raw = '';
  try {
    raw = fs.readFileSync(0, 'utf8');
  } catch {
    return;
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return;
  }

  const skill = input?.tool_input?.skill;
  if (typeof skill !== 'string' || !SKILL_NAME.test(skill.trim())) return;

  const session = input?.session_id;
  if (!session) return;

  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(path.join(DIR, `${session}`), `${skill}\n${new Date().toISOString()}\n`);
  } catch {
    // 마커를 못 남겨도 작업은 막지 않는다.
  }
}

main();
