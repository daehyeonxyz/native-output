# 설치 안내

Claude Code 에서 쓰는 스킬입니다. 설치는 두 단계이고 보통 3분이면 끝납니다.

## 1. 폴더를 스킬 자리에 둔다

폴더 전체를 아래 경로로 옮깁니다. 폴더 이름은 반드시 `native-output` 이어야 합니다. 훅과 스크립트의 경로가 이 이름을 가리킵니다.

| 운영체제 | 경로 |
|---|---|
| macOS, Linux | `~/.claude/skills/native-output/` |
| Windows | `%USERPROFILE%\.claude\skills\native-output\` |

옮기기가 번거로우면 Claude Code 에 압축을 푼 폴더를 알려 주고 "이 폴더를 스킬 폴더로 옮겨 줘" 라고 부탁해도 됩니다.

## 2. setup 을 실행한다

Claude Code 에서 이렇게 입력합니다.

```text
/native-output setup
```

에이전트가 순서대로 진행합니다.

1. 폴더가 올바른 자리에 있는지 확인합니다.
2. `node --version` 으로 실행 환경을 확인합니다. **node 만 있으면 됩니다.**
3. 자동 검사 강도를 물어봅니다. 아래에서 고릅니다.
4. 훅을 `~/.claude/settings.json` 에 등록합니다. 기존 설정은 `settings.json.native-output.bak` 으로 백업됩니다.
5. 전역 규칙을 `~/.claude/rules/` 에 설치합니다. Claude Code 가 세션마다 자동으로 읽는 자리입니다.
6. 훅이 실제로 동작하는지 검증하고 결과를 보여 줍니다.

끝나면 Claude Code 를 한 번 재시작합니다. 훅과 규칙은 다음 세션부터 적용됩니다.

## 검사 강도 고르기

| 강도 | 무엇을 하나 | 누구에게 |
|---|---|---|
| `warn` | 걸리는 표현이 있으면 알려 주고 그대로 진행합니다 | **처음 써 보는 사람.** 기본으로 권합니다 |
| `block` | 규칙에 어긋나면 편집을 거부합니다 | 기준을 확실히 강제하고 싶은 팀 |
| `off` | 자동 검사 없이 규칙 문서만 얹습니다 | 훅을 쓰지 않는 환경 |

나중에 언제든 바꿉니다. 재실행하면 기존 등록을 지우고 새 강도로 다시 넣습니다.

```bash
node ~/.claude/skills/native-output/install/scripts/setup-hooks.js --level=warn
```

## 설치를 확인하는 법

Claude Code 에서 `/native-output status` 라고 입력하면 훅 등록 여부와 강도, 규칙 설치 여부를 보고합니다.

설치한 뒤에는 따로 할 일이 없습니다. 한국어 글을 쓰는 작업이면 스킬을 부르지 않아도 적용됩니다.

## 잠시 끄고 싶을 때

남의 글이나 기계가 만든 글을 다룰 때는 검사를 끕니다. 환경 변수를 붙여 실행하면 그 실행에서만 꺼집니다.

```bash
NATIVE_OUTPUT_GATE=off claude
```

## 무엇이 설치되나

폴더를 복사하는 것 말고 시스템에 남는 것은 둘뿐입니다.

- `~/.claude/settings.json` 에 훅 세 줄. `--level=off` 로 재실행하면 이 세 줄만 정확히 빠집니다. 다른 훅은 건드리지 않습니다.
- `~/.claude/rules/native-output.md` 규칙 파일 하나. 지우면 그만입니다.

## 잘 안 될 때

| 증상 | 원인과 조치 |
|---|---|
| `스킬 폴더가 ... 에 없다` | 폴더 이름이나 위치가 다릅니다. 1번 경로를 다시 확인합니다 |
| 훅이 동작하지 않는다 | Claude Code 를 재시작하지 않았습니다. 훅은 다음 세션부터 적용됩니다 |
| `settings.json 파싱 실패` | 기존 설정 파일이 올바른 JSON 이 아닙니다. 먼저 고친 뒤 다시 실행합니다 |
| 한국어를 쓸 때마다 막힌다 | 강도가 `block` 입니다. `--level=warn` 으로 재실행합니다 |
| 인용하려는 표현이 막힌다 | `NATIVE_OUTPUT_GATE=off` 로 그 실행만 엽니다 |
