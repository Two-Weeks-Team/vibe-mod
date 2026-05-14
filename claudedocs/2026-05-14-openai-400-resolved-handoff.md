# vibe-mod — Session Handoff (2026-05-14 10:00 KST, OpenAI 400 RESOLVED + Chrome verified + 외부 정리 완료)

> `/handon` 으로 로드. 직전 핸드오프: `claudedocs/2026-05-13-openai-probe-v3-handoff.md` (probe v3 6-stage 배포 직후).
>
> 이 파일 = OpenAI HTTP 400 의 진짜 원인(SELECTION-array 버그) 식별 + 9 PRs 머지 + Chrome 자동화로 production "Compiled rule" toast 캡처 + 외부 reddit-org contribution 모두 정리/철회 완료.

---

## §0 두 줄 요약

- **무엇**: 9 PRs (#32~#41) 머지. **진짜 root cause = `settings.get('openaiModel')` SELECTION 타입이 `["gpt-5.4-mini"]` array 반환**. 7 라운드 speculative fix(body shape, escape density, byte vs string, message count, size, JSON-syntax-in-content) 모두 wrong direction. PR #38의 진단 console.log 한 줄이 culprit 노출 → PR #39+#40 fix → v0.0.41 production deploy → Chrome 자동 검증으로 toast `Compiled rule "New-account posts to mod queue". Dry-run started — check Dashboard in 30s.` 캡처. 외부 reddit-org 흔적 모두 cleanup (PR #109 close + gist로 옮김, #258 코멘트 둘 다 삭제, #261 close).
- **다음 세션 1순위**: D-9 (2026-05-18) 까지 4일 남음. `npx devvit publish --public` 실행 (사용자 액션) → Reddit App Directory 리뷰 시작 → 데모 영상(1분 미만, BGM 없음) 제작 → Devpost 제출 (D-day 2026-05-27 18:00 PT, 13일 남음).

---

## §1 진행한 작업 (시간순)

### Phase A — `/handon-goal` 자동 로드 + 13-tuple condition 합성
- 직전 핸드오프 (`2026-05-13-openai-probe-v3-handoff.md`) 자동 로드
- 5-condition `/goal` 시작 — probe 결과 수집부터 production menu-click 검증까지 자율 진행 directive

### Phase B — Probe v3 결과 수집 + 7 라운드 speculative fix
- v0.0.32 probe 3 cycles 모두 동일 패턴: (a)/(b)/(d)/(e)/(f) 200, (c) 400. 단일 변수 isolation 시도:
  - **PR #32** (v0.0.33): multi → single message → 400
  - **PR #33** (v0.0.34): source non-ASCII 제거 → 400
  - **PR #34** (v0.0.35): reasoning_effort + verbosity 제거 → 400
  - **PR #35** (v0.0.36): \n escape flatten → 400
  - **PR #36** (v0.0.37): Uint8Array body + 1 example → 400 (body bytes=4401, probe(f)의 5610 보다 작은데도)
  - **PR #37** (v0.0.38): JSON-syntax 제거 (key=value 평문화) → 400
- 매 라운드마다 local POST는 200, Devvit transit만 400 → "transit corruption" 가설로 잘못 좁아짐

### Phase C — 진단 console.log → root cause 식별
- **PR #38** (v0.0.39): hardcode `gpt-5.4-nano` (probe-verified 모델) + log resolved model
- 첫 production tick에서 `[vibe-mod] callOpenAI: openaiModel raw = ["gpt-5.4-mini"] unwrapped = "gpt-5.4-nano"` 노출
- → **SELECTION 타입은 string array 반환**. PR #32-#37 모두 body의 `"model"` 필드가 array였음. OpenAI는 이를 `"could not parse the JSON body"` (단일 필드 type mismatch에 대한 misleading wording)로 거부.

### Phase D — Root cause fix + 검증
- **PR #39** (v0.0.40): callOpenAI에서 `Array.isArray(raw) ? raw[0] : raw` unwrap + JSON.stringify(ex.assistant) few-shot 복원
- **PR #40** (v0.0.41): submit handler line 477도 같은 unwrap (defense-in-depth)
- Production logs: `body chars = 6576`, `openaiModel raw = ["gpt-5.4-mini"] unwrapped = "gpt-5.4-mini"`, **HTTP 400 line 없음**, **submit threw 없음** = success
- **PR #41**: postmortem doc + probe-branch cleanup record (`docs/postmortems/2026-05-14-openai-400-selection-array.md`, 108줄)

### Phase E — Chrome 자동화 검증 (browser_cookie3 + Playwright)
- `scripts/chrome-reddit-v3.py` 작성
- 사용자 Chrome cookie 16개 → Playwright Chromium에 storageState 주입
- r/SocialSeeding 페이지의 `Open overflow menu` 클릭 → Lit shadow-DOM `<faceplate-menu-item>` 좌표 기반 mouse click (1322, 436)
- `<faceplate-form>` 모달의 `<textarea name="rule">` 채움 + Submit
- **TOAST captured**: `Compiled rule "New-account posts to mod queue". Dry-run started — check Dashboard in 30s.`
- 스크린샷: `playwright/.auth/v3-05-after-submit-1.png`

### Phase F — 외부 contribution audit + cleanup
- `gh search` 광범위 스캔 → 3건 확인
- **reddit/devvit#261** (이슈, 우리): 본문에 OpenAI 400을 plugin RPC로 잘못 연결한 한 줄 → 본문 ⚠️ retraction 박스 추가 + close as `not planned`
- **reddit/devvit-docs#109** (PR, 우리): 처음엔 본문/파일 reframe → 사용자 결정으로 **CLOSE + standalone Gist로 옮김**: <https://gist.github.com/ComBba/88395968eb285a796111f1d33635b3f9>
- **reddit/devvit#258** (다른 사람 issue, 우리 코멘트 2건): 사용자 결정으로 **둘 다 삭제** (audit log만 남음)

### Phase G — 산출물 작성
- `claudedocs/2026-05-14-openai-400-final-report.html` (149.6 KB self-contained, dark theme, 7섹션, embedded toast screenshot, Chrome으로 자동 오픈)
- `~/.claude/projects/.../memory/external-contributions.md` (post-cleanup 상태 영구 기록)
- 메모리 인덱스 업데이트

### Phase H — 슬래시 커맨드 신규 작성 (세션 초반)
- `/goal-start` (`~/.claude/commands/goal-start.md`) — `/goal` preflight + condition builder
- `/handon-goal` (`~/.claude/commands/handon-goal.md`) — `/handon` + `/goal-start` 결합
- `/chrome-auth-test` (`~/.claude/commands/chrome-auth-test.md`) — Chrome 쿠키 추출 + Playwright 테스트

---

## §2 현재 상태

### Git
| branch | HEAD | 비고 |
|---|---|---|
| `main` | `ce5da2e` (Merge #41) | 모든 fix + postmortem 머지된 ground truth |
| `fix/openai-error-handling` | (deleted on remote + local) | probe-only branch, 정리 완료 |
| 7 fix branches (#32-#40 source) | (deleted after merge) | — |

Local working tree:
```
?? .venv-chrome-auth/         # Python venv (gitignored, Playwright + browser_cookie3)
?? claudedocs/                # session handoffs + final report (untracked, intentional)
?? playwright/                # Chrome verify screenshots + storageState (gitignored)
?? scripts/build-final-report.py
?? scripts/chrome-reddit-v2.py
?? scripts/chrome-reddit-v3.py
?? scripts/chrome-reddit-verify.py
```
(claudedocs/ 커밋 정책은 사용자 판단; scripts는 diagnostic용, 머지 권장 시 cleanup 필요)

### Open PRs (Two-Weeks-Team/vibe-mod)
- 0개. (모두 머지)

### External (reddit/...)
- **reddit/devvit#261** CLOSED (우리가 close, `not planned`, 2026-05-13)
- **reddit/devvit#258** — 다른 사람 issue, **우리 코멘트 모두 삭제** (UI에서 비표시, audit log만)
- **reddit/devvit-docs#109** **CLOSED** 2026-05-14T01:00Z (closing comment에 gist 링크)
- **GitHub Gist** — `plugin-rpc-resilience.md` standalone publication: <https://gist.github.com/ComBba/88395968eb285a796111f1d33635b3f9>

### Live (r/SocialSeeding)
- App: <https://developers.reddit.com/apps/vibe-mod> — **v0.0.41** installed
- Plugin RPC: ✅ 24h+ 안정 (settings.get / redis / reddit.getModerators 모두 OK)
- Compose flow: ✅ **Chrome 자동 검증 완료** — toast `Compiled rule "New-account posts to mod queue"...` 캡처
- Devvit secret `openaiApiKey`: ✅ length 164
- `openaiModel` setting: ✅ `["gpt-5.4-mini"]` (SELECTION array, 정상 unwrap됨)

### 빌드 / 점수
- `npm run check` 4/4 gates green (typecheck + lint + Prettier + 183 unit + 3 @devvit/test + acceptance G1–G4)
- `dist/server/index.cjs` ≈ 2.14 MB (gzip ~353 KB)
- OpenAI 3-model smoketest 21/21 (이전 핸드오프에서 인증, 변경 없음)
- Production end-to-end verified (Chrome menu click → success toast)

### 환경
- node v24.15.0, npm 11.12.1
- Python 3.12.4 (`.venv-chrome-auth` 가상환경: playwright + browser_cookie3)
- @devvit/* pinned exact 0.12.23
- typescript 6.0.3, vite 8.0.12, eslint 10.3.0, @hono/node-server 2.0.2
- devvit CLI authenticated as `u/DragonfruitAfraid309`
- cwd = `/Users/kimsejun/Documents/GitHub/vibe-mod`
- Fork repos: `~/Documents/GitHub/devvit-docs/` (PR #109 closed, source branch `docs/plugin-rpc-resilience` 그대로)

### 해커톤 D-day
- **2026-05-27 18:00 PT** (firm). 오늘 = 2026-05-14 10:01 KST. **약 13일 남음**.
- `devvit publish --public` 리뷰 ~1주 → ~2026-05-18 (D-9) 까지 시작 권장. **4일 남음**.

---

## §3 다음 세션에서 할 수 있는 것

### 즉시 (Claude — 사용자 입력 불필요)

1. **데모 영상 시나리오 + 스크립트 작성** — 1분 미만, BGM 없음, BGM-free 안내. r/SocialSeeding에서 `vibe-mod: Compose rule` → 자연어 입력 → "Compiled rule ..." toast → Dashboard에서 dry-run 결과 → Audit log → Undo. 실제 클릭은 사용자가 OBS 등으로 녹화.
2. **Devpost submission.md placeholder 채우기** — vibe-mod의 docs/devpost-submission.md (있으면) 의 URL/팀 username/영상 placeholder. 영상 미녹화이면 placeholder만 정리.
3. **README screenshots 5장 준비** — Compose form, 성공 토스트, Dashboard draft, Audit 로그, Undo 토스트. Chrome 자동화 (`scripts/chrome-reddit-v3.py` 변형) 으로 자동 캡처 가능.
4. **`scripts/chrome-reddit-*.py` 정리/통합** — v2, v3, verify 등 4개 분산. 최종 v3만 남기고 README 추가.
5. **claudedocs/ 커밋 정책 결정 후 commit** — 핸드오프 9건 + final report HTML + gap-analysis. 사용자 판단 필요 (untracked 유지 vs commit).
6. **Module split (이전 백로그 P5)** — `src/server/index.ts` (~1400줄) → `routes/{menu,forms,triggers,scheduler,settings}.ts`. 이제 callOpenAI 안정화됐으니 진행 가능.
7. **`scripts/build-final-report.py` cleanup** — diagnostic-only, repo에 commit할지 결정.

### 사용자 입력 / 실행 필요

A. **`npx devvit publish --public`** — D-9 (2026-05-18) 까지 시작 필요. **4일 남음**. 리뷰 ~1주.
B. **데모 영상 녹화** — Compose flow 라이브 검증됐으므로 가능. 1분 미만, BGM 없음.
C. **Devpost form 제출** — 2026-05-27 18:00 PT 까지.
D. **OpenAI 콘솔 점검 (선택)** — 비용 확인. 우리 detect: gpt-5.4-mini, 1730 prompt + 88 completion tokens per compile. ~$0.0001 per compile.

---

## §4 할 수 없는 것 (외부 변수)

- **Reddit App Directory 리뷰 통과** — `devvit publish` 후 ~1주, 통제 불가.
- **devvit-docs CLA** — 사용자 개인 서명. 우리는 PR 이미 close했으니 더 이상 액션 없음.
- **8080 포트 / 프로덕션 서버** — 별개 프로젝트, 절대 안 건드림 (CLAUDE.md 룰).
- **reddit/devvit#261 reopen 결정** — 만약 plugin RPC `undefined undefined: undefined` 다시 보이면 fresh logs 첨부해서 reopen 가능. 현재는 닫힌 상태 유지.

---

## §5 추가로 필요한 것 (사용자 확인)

1. **claudedocs/ commit 정책** — 9건의 session handoff + final HTML report + gap-analysis 모두 untracked. commit하면 repo 탐색 가능, untracked로 두면 깔끔. 사용자 판단.
2. **scripts/chrome-reddit-*.py commit 정책** — diagnostic용 4개 파일. v3만 살리고 정리할지, 모두 keep할지 결정.
3. **데모 영상 녹화 일정** — 사용자가 OBS 등으로 녹화 가능한 시점 (compose flow 라이브 작동, dashboard 진입, undo 시연 등 ~45초).
4. **Module split 우선순위** — Compose flow 안정화됐으니 가능. 하지만 D-9(4일) 압박 고려 시 publish 우선이 맞을 수 있음.
5. **OpenAI cost monitoring 도입 여부** — 1730 prompt + 88 completion tokens per compile = ~$0.000086 (gpt-5.4-mini). 현재 사용량 적지만 publish 후 traffic 늘면 모니터링 필요.

---

## §6 다음 세션 시작 프롬프트 (복사용)

```text
/handon

이전 세션 핸드오프: claudedocs/2026-05-14-openai-400-resolved-handoff.md
관련: docs/postmortems/2026-05-14-openai-400-selection-array.md (root cause postmortem),
     claudedocs/2026-05-14-openai-400-final-report.html (visual summary),
     ~/.claude/projects/.../memory/external-contributions.md (외부 cleanup 기록)

읽고 다음 결정 사항에 답한 뒤 진행하세요. **이번 세션의 최우선 작업은 D-9(2026-05-18, 4일 남음) 까지 `devvit publish --public` 시작 + 데모 영상 준비입니다.**

1. claudedocs/ + scripts/chrome-reddit-*.py 모두 commit할까, 일부만 (final HTML + postmortem만), 아니면 untracked 유지?
2. Module split (src/server/index.ts ~1400줄 → routes/*.ts) 지금 시도 vs publish 후?
3. 데모 영상은 사용자가 OBS로 녹화 (시나리오/스크립트만 우리가 제공) vs 자동화 도구로 시도?
4. README screenshots 5장 자동 캡처 (chrome-reddit-v3.py 변형) 진행?

D-day: 2026-05-27 18:00 PT (firm). publish 시작 권장 마감 2026-05-18 (D-9), 4일 남음. Compose flow 라이브 검증 완료 (Chrome 자동화로 "Compiled rule ..." toast 캡처).
```

---

## §7 핵심 자산 위치 reference

| 항목 | 경로 |
|---|---|
| 이 핸드오프 | `claudedocs/2026-05-14-openai-400-resolved-handoff.md` |
| 직전 핸드오프 (probe v3 배포 직후) | `claudedocs/2026-05-13-openai-probe-v3-handoff.md` |
| Postmortem (root cause + timeline) | `docs/postmortems/2026-05-14-openai-400-selection-array.md` |
| Visual summary report (HTML, 149KB self-contained) | `claudedocs/2026-05-14-openai-400-final-report.html` |
| 외부 contribution cleanup 기록 | `~/.claude/projects/-Users-kimsejun-Documents-GitHub-vibe-mod/memory/external-contributions.md` |
| Plugin RPC resilience (standalone) | <https://gist.github.com/ComBba/88395968eb285a796111f1d33635b3f9> |
| Chrome 자동화 스크립트 (final) | `scripts/chrome-reddit-v3.py` |
| Chrome 자동화 venv | `.venv-chrome-auth/` (gitignored) |
| Chrome 쿠키 storageState | `playwright/.auth/reddit-com.json` (gitignored) |
| 캡처된 success toast 스크린샷 | `playwright/.auth/v3-05-after-submit-1.png` (compressed JPEG는 `/tmp/toast-success-2.jpg`) |
| Final HTML report builder | `scripts/build-final-report.py` |
| auto memory index | `~/.claude/projects/-Users-kimsejun-Documents-GitHub-vibe-mod/memory/MEMORY.md` |
| 머지된 PRs (vibe-mod) | <https://github.com/Two-Weeks-Team/vibe-mod/pulls?q=is%3Apr+is%3Amerged> (#32~#41 신규) |
| App 콘솔 | <https://developers.reddit.com/apps/vibe-mod> (v0.0.41) |
| Demo sub | <https://reddit.com/r/SocialSeeding> |
| 슬래시 커맨드 신규 (이번 세션) | `~/.claude/commands/goal-start.md`, `handon-goal.md`, `chrome-auth-test.md` |

---

## §8 알려진 issue / open question

- **D-9 임박 (4일 남음)** — `npx devvit publish --public` 사용자 액션 필요. compose flow는 라이브 작동 검증됨.
- **claudedocs/ + scripts/chrome-reddit-*.py untracked** — 9건 핸드오프 + final HTML + 4개 chrome verify 스크립트. commit 정책 사용자 판단.
- **Module split 백로그** — src/server/index.ts 약 1400줄. 안정화됐으니 가능. publish 우선이면 보류.
- **OpenAI 에러 wording** — 별도 OpenAI에 issue 가능 (`"could not parse JSON body"`가 단일 필드 type mismatch 표현이 안 되는 함정). 시간 여유 시 contribute.
- **Devvit `settings.get` 타입 시스템** — SELECTION이 string[] 반환하는 것을 TypeScript에 강제하는 타입 정의가 없음. Devvit team에 fix 요청 가능 (이번 세션 안 함).
- **dist/server/ 빌드 산출물 size** ≈ 2.14 MB (gzip 353 KB) — Reddit 한도(?)와 비교 필요. 현재 설치 성공.
- **Reddit App Directory 리뷰 timing** — publish 후 ~1주 추정. D-day 13일 → publish 즉시 시작이면 review 끝나고 시연 가능 마진 ~6일.
- **vibe-mod README screenshots** — 5장 (Compose form, Compile success toast, Dashboard, Audit log, Undo). 자동 캡처 가능 (chrome-reddit-v3.py 변형).
- **Devpost submission 미작성** — placeholders 채우기 (URL, 팀 username, 영상). compose flow 라이브 작동 후 진행 가능.

---

## §9 이번 세션 사용자 명시 지시 (반영 완료)

이 세션에 사용자가 명시한 작업 지시 (모두 반영):

1. **`/goal-start` `/handon-goal` `/chrome-auth-test` 슬래시 커맨드 작성** — 모두 작성 + frontmatter 포함, system reminder의 available-skills에 등록 확인.
2. **공식문서/예제/베스트프랙티스 + 10-에이전트 회의 결과로 결정** — PR #32-#41 매 단계마다 정량 근거 + 10-expert 가설 review를 PR description에 명시.
3. **묻지 말고 완전 검증까지 자율 진행** — Chrome 자동화로 production menu click → toast 캡처까지 자율 완료. 단 (a) Chrome 메뉴 클릭 위치 식별, (b) 외부 contribution 처리 결정 등 사용자 입력이 물리적으로 필요한 단계만 AskUserQuestion 사용.
4. **잘못된 외부 contribution 삭제/수정** — reddit/devvit#261 본문 retraction + close, reddit/devvit-docs#109 close + Gist로 reframing, reddit/devvit#258 코멘트 둘 다 삭제. 외부 reddit-org에 active 흔적 0건.
5. **HTML 보고서 작성 + Chrome 자동 오픈** — 149.6 KB self-contained, dark theme, 7섹션, embedded screenshot, 자동 `open -a "Google Chrome"`.
6. **외부 정리 결과 보고 + 메모리 영구 기록** — `external-contributions.md` 생성 + MEMORY.md 인덱스 업데이트.
7. **이전 세션 누적 (CLAUDE.md/메모리)** — 프로덕션 8080 보호, .env 명시 승인 없이 수정 금지, OpenAI 키 값 로깅 금지 (typeof + length 만), 모든 제약 준수.

---

작성: 2026-05-14 10:01 KST / `/handoff` skill
