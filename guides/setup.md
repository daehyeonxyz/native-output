# 설치 안내

## Claude 앱 (chat) — 주 사용처

1. 이 폴더를 zip 으로 묶는다. 배포받은 zip 그대로면 된다.
2. claude.ai 설정 → 기능(Capabilities) → 스킬에서 zip 을 올린다.
3. 끝이다. 한국어 글을 쓰는 대화에서 자동으로 적용된다.

Claude 앱에는 훅이 없으므로 아래 절차는 해당하지 않는다. SKILL.md 와 standards/ 문서가 기준의 전부다.

## Claude Code

설치는 두 단계다.

### 1. 폴더를 스킬 자리에 둔다

폴더 전체를 아래 경로로 옮긴다. 폴더 이름은 반드시 `native-output` 이어야 한다. 훅과 스크립트의 경로가 이 이름을 가리킨다.

| 운영체제 | 경로 |
|---|---|
| macOS, Linux | `~/.claude/skills/native-output/` |
| Windows | `%USERPROFILE%\.claude\skills\native-output\` |

옮기기가 번거로우면 Claude Code 에 압축을 푼 폴더를 알려 주고 "이 폴더를 스킬 폴더로 옮겨 줘" 라고 부탁해도 된다.

### 2. setup 을 실행한다

```text
/native-output setup
```

에이전트가 순서대로 진행한다.

1. 폴더가 올바른 자리에 있는지 확인한다.
2. `node --version` 으로 실행 환경을 확인한다. node 만 있으면 된다.
3. 자동 검사 강도를 물어본다. 차단(`block`)을 권한다.
4. 훅을 `~/.claude/settings.json` 에 등록한다. 기존 설정은 `settings.json.native-output.bak` 으로 백업된다.
5. 전역 규칙을 `~/.claude/rules/` 에 설치한다. Claude Code 가 세션마다 자동으로 읽는 자리다.
6. 훅이 실제로 동작하는지 검증하고 결과를 보여 준다.

끝나면 Claude Code 를 한 번 재시작한다. 훅과 규칙은 다음 세션부터 적용된다.

## 검사 강도

| 강도 | 무엇을 하나 | 누구에게 |
|---|---|---|
| `block` | 규칙에 어긋나면 편집을 거부한다 | **기본 권장.** 기준이 실제로 강제되는 것은 이 강도뿐이다 |
| `warn` | 걸리는 표현이 있으면 알려 주고 그대로 진행한다 | 며칠 겪어 보고 결정하려는 사람. 알림은 에이전트가 무시할 수 있다 |
| `off` | 자동 검사 없이 규칙 문서만 얹는다 | 훅을 쓰지 않는 환경 |

언제든 바꾼다. 재실행하면 기존 등록을 지우고 새 강도로 다시 넣는다.

```bash
node ~/.claude/skills/native-output/install/scripts/setup-hooks.js --level=block
```

## 설치를 확인하는 법

Claude Code 에서 `/native-output status` 라고 입력하면 훅 등록 여부와 강도, 규칙 설치 여부를 보고한다.

설치한 뒤에는 따로 할 일이 없다. 한국어 글을 쓰는 작업이면 스킬을 부르지 않아도 적용된다.

## 잠시 끄고 싶을 때

남의 글이나 기계가 만든 글을 다룰 때는 검사를 끈다. 환경 변수를 붙여 실행하면 그 실행에서만 꺼진다.

```bash
NATIVE_OUTPUT_GATE=off claude
```

## 무엇이 설치되나

폴더를 복사하는 것 말고 시스템에 남는 것은 둘뿐이다.

- `~/.claude/settings.json` 에 훅 세 줄. `--level=off` 로 재실행하면 이 세 줄만 정확히 빠진다. 다른 훅은 건드리지 않는다.
- `~/.claude/rules/native-output.md` 규칙 파일 하나. 지우면 그만이다.

## 잘 안 될 때

| 증상 | 원인과 조치 |
|---|---|
| `스킬 폴더가 ... 에 없다` | 폴더 이름이나 위치가 다르다. 위의 경로를 다시 확인한다 |
| 훅이 동작하지 않는다 | Claude Code 를 재시작하지 않았다. 훅은 다음 세션부터 적용된다 |
| 기준이 잘 안 지켜진다 | 강도가 `warn` 이다. 알림은 무시될 수 있으니 `--level=block` 으로 올린다 |
| `settings.json 파싱 실패` | 기존 설정 파일이 올바른 JSON 이 아니다. 먼저 고친 뒤 다시 실행한다 |
| 한국어를 쓸 때마다 막힌다 | 강도가 `block` 이다. 남의 글을 다루는 중이면 `NATIVE_OUTPUT_GATE=off` 로 그 작업만 연다 |
| 인용하려는 표현이 막힌다 | `NATIVE_OUTPUT_GATE=off` 로 그 실행만 연다 |
