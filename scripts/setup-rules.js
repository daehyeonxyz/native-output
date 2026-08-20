#!/usr/bin/env node
/**
 * 동봉된 전역 규칙 파일을 ~/.claude/rules/ 에 설치한다.
 *
 * Claude Code 는 ~/.claude/rules/ 의 md 파일을 세션 시작 때 자동으로 로드한다
 * (근거: https://code.claude.com/docs/en/memory.md). 그래서 복사만 하면 배선이 끝나고,
 * CLAUDE.md 에 임포트를 추가하면 중복 로드가 되므로 추가하지 않는다.
 *
 * 여러 번 실행해도 같은 결과가 나온다. 설치본이 이미 있고 내용이 다르면
 * (사용자가 고쳐 쓴 경우) 덮어쓰지 않고 보고만 한다.
 *
 * 실행: node scripts/setup-rules.js
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SRC = path.join(__dirname, '..', 'rules', 'native-output.md');
const DEST_DIR = path.join(os.homedir(), '.claude', 'rules');
const DEST = path.join(DEST_DIR, 'native-output.md');

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('[setup-rules] 동봉 규칙 파일이 없다: ' + SRC);
    process.exit(1);
  }
  const src = fs.readFileSync(SRC, 'utf8');

  if (fs.existsSync(DEST)) {
    const dest = fs.readFileSync(DEST, 'utf8');
    if (dest === src) {
      console.log('[setup-rules] 이미 설치됨: ' + DEST);
      return;
    }
    console.log('[setup-rules] 설치본이 동봉본과 다르다: ' + DEST);
    console.log('[setup-rules] 사용자가 고쳐 쓴 규칙일 수 있어 덮어쓰지 않는다. 갱신하려면 설치본을 지우고 재실행할 것.');
    return;
  }

  fs.mkdirSync(DEST_DIR, { recursive: true });
  fs.writeFileSync(DEST, src, 'utf8');
  console.log('[setup-rules] 설치 완료: ' + DEST);
  console.log('[setup-rules] 규칙은 다음 세션부터 자동 로드된다.');
}

main();
