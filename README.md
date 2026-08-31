# native-output

## 개요

- 정의: AI 가 쓰는 한국어에 잘 쓴 글의 기준을 적용하는 Claude Code 스킬이다.
- 적용: 설치하면 한국어가 포함된 산출물 전부에 적용된다. 훅이 검사를 맡는다.
- 환경: Claude Code 용이다. Claude 앱용은 outputs 가 따로 있다.

## 판정 방식

- 글 종류 판정: AI 상투 표현을 일괄 제거하지 않는다.
  - "결론적으로" 는 보고서에서 정당한 어휘이고 회고 글에서는 AI 상투 표현이다.
  - 글 종류별 판정표는 `standards/genres.md` 가 갖는다.
- 실측 수치: 글 종류별 리듬이 잘 쓴 글을 측정한 값으로 들어 있다.
  - 문장 길이의 중앙값이 캐주얼 단문은 26.5자, 보고서는 80자다.
- 글 종류 분리: 산문 규칙을 산문이 아닌 곳에 적용하지 않는다.
  - 슬라이드 제목은 짧은 명사구로, 화면 라벨은 문장이 아니라 이름으로 쓴다.

## 설치

1. 이 폴더를 `~/.claude/skills/native-output/` 에 둔다. 폴더 이름은 그대로 유지한다.
2. Claude Code 에서 `/native-output setup` 을 실행한다.
3. 검사 강도는 차단(`block`)을 권장한다.
4. Claude Code 를 재시작한다.

- 필요한 것: node.
- 시스템에 남는 것: `~/.claude/settings.json` 의 훅 세 줄과 `~/.claude/rules/` 의 규칙 파일 하나.
- 상세와 문제 해결: `guides/setup.md`.

## 사용

- 한국어 산출물에 자동으로 적용된다.
- 남의 글이나 기계 생성물을 다룰 때는 `NATIVE_OUTPUT_GATE=off` 로 검사를 끈다.
- 상태 확인: `/native-output status`.

## 구조

- `SKILL.md`: 에이전트가 따르는 적용 절차.
- `standards/`: 글쓰기 기준. 다섯 개의 공용 레이어와 세 개의 전용 레이어.
- `standards/genres/`: 글 종류별 기준 7종. 실측 수치 포함.
- `guides/`: 설치 안내와 독립 검수 절차.
- `install/`: 훅 3종, 설치 스크립트, 전역 규칙.

기준 수정 방법은 `standards/README.md` 가 갖는다.
