# vibe-mod — Session Handoff (2026-05-13 EOD, platform-bug + ENUM refactor)

> `/handon` 으로 로드. 직전 핸드오프: `claudedocs/2026-05-13-install-debug-session-handoff.md` (install/runtime 디버깅 라운드, §B-4 진단). 이 파일 = `@hono/node-server` 공식 어댑터 전환 + 5-version 회귀 테스트 + `reddit/devvit#258` 평소 기록 + ENUM/SoT 리팩토링 라운드.

---

## §0 한 문장 요약

§B-4 (`undefined undefined: undefined` 플러그인 RPC 실패)는 **확인된 Reddit Devvit 플랫폼-사이드 버그** ([reddit/devvit#258](https://github.com/reddit/devvit/issues/258), OPEN). 우리 코드 영역에서 더 시도할 수 있는 건 PR #27 / PR #28에 다 들어가 있고, 막힘은 우리 코드 영역 밖. 다음 세션은 **Reddit 응답 대기 + module split + Devpost 마무리** 가 critical path.

---

## §1 진행한 작업 (시간순)

### Phase A — PR #26 마무리 (server-listen)
- PR #26 CI 한참 hang → 원인: `node -e "require('./dist/server/index.cjs')"` smoke 단계가 우리 `server.listen(getServerPort())` 때문에 무한 listen.
- Fix: listen을 `process.env.WEBBIT_PORT` 존재할 때만 동작 (Devvit 런타임만 이 env var 설정 → 프로덕션 동작 유지, CI smoke는 즉시 exit). 커밋 `8bcd78d`.
- PR #26 CI green → merge → main = `12b00ab`.
- PR #19 (dependabot eslint 10) close.

### Phase B — §B-4 (`undefined undefined: undefined`) 본격 조사
- 2 백그라운드 deep-research agent dispatch:
  1. Devvit metadata 전파 흐름 추적 (node_modules/@devvit/server/{context,create-server,server-context}.js + protos + redis + reddit) → 결론: **adapter 정상, ALS OK, `globalThis.devvit.config` 정상, metadata 11–15 key**. 실패는 plugin RPC layer (host gRPC sidecar) 단.
  2. Stock Devvit Web template 대비 diff → 우리 manual `nodeToHonoListener` vs 공식 패턴.
- 라이브 로그 `npx devvit logs r/SocialSeeding --since 10m`로 ground truth 캡처:
  ```
  Error: undefined undefined: undefined
    at callErrorFromStatus (/srv/index.cjs:4437:21)
    at GenericPluginClient.GetSettings (/srv/index.cjs:136515:93)
    at MY.get (main.js:9:74830)
    code: undefined, details: undefined, metadata: _Metadata { Map(0) }
  ```
  → host gRPC envelope이 trailer/code 모두 비어서 옴.
- 디버깅 진단 instrumented `isCallerModerator` + `/internal/scheduler/rate-limit-circuit-breaker` 에 `describeErr` + `snapshotDevvitRuntime` helpers 추가.

### Phase C — 공식 `@hono/node-server` 패턴 발견 + 적용
- `reddit/devvit-template-react/src/server/index.ts` 발견:
  ```ts
  import { serve } from '@hono/node-server';
  serve({ fetch: app.fetch, createServer, port: getServerPort() });
  ```
- 우리 hand-rolled adapter를 이 패턴으로 교체 (`@hono/node-server@^2.0.2` 추가).
- v0.0.13 업로드/install → 동일 에러.

### Phase D — 가설 다발 검증 (시간순)
| 가설 | 액션 | 결과 |
|---|---|---|
| `reddit.scope:"moderator"` 가 plugin RPC 깸 | devvit.json scope 제거 → v0.0.13 | 동일 에러 |
| 설치 상태 corrupted | `devvit uninstall` + `install` (다시 v0.0.13) | 동일 에러 |
| 0.12.22가 fix 버전이라는 changelog | 0.12.22 downgrade → v0.0.16 | 동일 에러 |
| 최신 dev pre-release | 0.12.24-next → v0.0.17 | 동일 에러 |
| 차세대 메이저 | 0.13.0-next → v0.0.18 | 동일 에러 |

→ **5 버전 × 2 adapter × 2 scope = 동일한 host-side gRPC failure** → 플랫폼 회귀 확정.

### Phase E — Issue #258 발견 + 커밋 + 코멘트
- GH 검색 → `reddit/devvit#258` (OPEN, custom post creation에서 동일 증상) 발견.
- 우리 reproduction 데이터를 코멘트로 게시: <https://github.com/reddit/devvit/issues/258#issuecomment-4439671649>
- 0.12.23으로 복원 (exact pin), 커밋 `dc3a445`.

### Phase F — PR #27 open (diag + adapter switch + version pin)
- 5 commits, ~10시간 조사 결과 통합:
  - `fa28eb0` diag instrumentation (isCallerModerator)
  - `976b58b` diag instrumentation (scheduler)
  - `4bb09c5` 공식 `@hono/node-server` adapter
  - `3e95754` + `dc3a445` 0.12.23 exact pin
- PR #27 URL: <https://github.com/Two-Weeks-Team/vibe-mod/pull/27>
- CI green ✅. 다음 세션이 머지 결정.

### Phase G — ENUM/SoT 리팩토링 (handoff §9 사용자 명시 요청)
신규 `src/shared/` 모듈 3개 + 기존 2개 export 확장:
1. **`limits.ts` → `LIMITS`**: 8개 매직 넘버 (`COMPILE_RATE_LIMIT_PER_DAY`, `MOD_LIST_CACHE_SECONDS`, `TRIGGER_DEDUPE_SECONDS`, `ROLLBACK_TTL_SECONDS`, `AUDIT_TTL_SECONDS`, `USER_CACHE_TTL_SECONDS`, `DRY_RUN_SAMPLE`, `DRY_RUN_TTL_SECONDS`) 흩어져 있던 거 하나로.
2. **`redis-keys.ts` → `keys` + `globalKeys`**: 11개 sub-scoped helper + 1개 global. 25+ 인라인 `` `${sub}:rules:active` `` template string 제거. Audit FIND-07 (sub-scope) 강제.
3. **`outcomes.ts` → `OUTCOMES`, `Outcome`, `OutcomeSchema`**: audit outcome union을 const + Zod enum + TS type 셋으로.
4. **`rule-schema.ts` 확장**: `PredicateOps` / `PredicateOp` export (evaluator drift 방지). `RULE_TRIGGERS` / `RuleTriggerName` export.
5. **`evaluator.ts`**: `selectMatchingRules` signature이 `RuleTriggerName` 사용.

전체: 9 files changed, +184/-72. zero behaviour change. `npm run check` 4/4 게이트 + 178/178 tests + lint 0 warnings + Prettier clean.

PR #28 URL: <https://github.com/Two-Weeks-Team/vibe-mod/pull/28>

### Phase H — auto memory + 핸드오프
- 신규 memory: `devvit-plugin-rpc-platform-bug.md` (next session 즉시 인식용).
- `MEMORY.md` 인덱스 갱신 — 이 버그가 CURRENT BLOCKER임을 첫 줄에 명시.
- 이 핸드오프 작성.

---

## §2 현재 상태

### Git / GitHub
| 브랜치 | HEAD | PR | 비고 |
|---|---|---|---|
| `main` | `12b00ab` (Merge #26) | — | server-listen + WEBBIT_PORT guard 적용됨 |
| `fix/devvit-plugin-rpc-diag` | `dc3a445` | **#27 OPEN, CI ✅** | diag + @hono/node-server + version pin. 머지 시 main에서 rebase. |
| `refactor/enums-and-constants` | `3a8026a` | **#28 OPEN, CI 진행중** | LIMITS / redis-keys / outcomes / PredicateOps / RuleTriggerName SoT. |
| `fix/server-listen` | — | #26 머지됨 | local branch 삭제해도 무방. |

**머지 순서 권장**: PR #28 먼저 (pure refactor, low risk) → PR #27 rebase + 머지 (diag + adapter switch).

### Live
- App: <https://developers.reddit.com/apps/vibe-mod> — v0.0.18 installed on r/SocialSeeding (현재는 0.12.23로 복원된 코드, 같은 platform bug)
- Demo sub: <https://reddit.com/r/SocialSeeding> — 1 post ("Start here…"), 2 mods (DragonfruitAfraid309 + vibe-mod)
- Issue: <https://github.com/reddit/devvit/issues/258> — OPEN, 우리 코멘트 작성 후 Reddit 응답 대기.

### 빌드 / 점수
- `npm run check`: 4/4 게이트 (typecheck + lint + Prettier + tests + devvit-test + acceptance) PASS
- 178 unit tests + 3 @devvit/test (1 skipped) — all green
- `dist/server/index.cjs` ≈ 2.13 MB
- `node -e "require('./dist/server/index.cjs')"` exits in <1s (WEBBIT_PORT guard)
- OpenAI: `gpt-5.4-mini` default, key 설정 OK

### 환경
- node v24.15.0, npm
- @devvit/* pinned to exact 0.12.23
- @hono/node-server ^2.0.2 (신규 의존성)
- devvit CLI authenticated as `u/DragonfruitAfraid309`

---

## §3 다음 세션에서 할 것

### 즉시 (Claude — 사용자 입력 불필요)

1. **PR #28 머지** (CI 끝나면) — pure ENUM refactor, low risk.
2. **PR #27 rebase + 머지** — diag instrumentation + 공식 adapter + 0.12.23 exact pin. Rebase needed since #28 lands first.
3. **Reddit 응답 모니터링** — `gh api repos/reddit/devvit/issues/258/comments` 주기적 확인. 응답 오면 우선순위 1로 액션 (revert diag, verify gates ②③).
4. **Module split (handoff §3 P2)** — `src/server/index.ts` (~1000 lines) → `routes/{menu,forms,triggers,scheduler,settings}.ts` + `openai.ts`. 178 routes 테스트가 `import app from './index'` 하니까 그건 유지. `claudedocs/gap-analysis/05-code-architecture.md` 의 권고 그대로.
5. **Devpost 글에 "vs Reddit Automations" 단락** — `docs/devpost-submission.md`. 본문은 prior session에 정리돼 있음 (작성자 8 fact, mod action 8개, report trigger, live shadow + 30-day undo).

### Reddit fix 들어오면 (외부 변수 — 사용자 입력 불필요)

A. PR #27의 diag instrumentation 후속 PR로 ROLL BACK (`describeErr`/`snapshotDevvitRuntime` 제거, `isCallerModerator` 원형 복귀).
B. `npx devvit upload` → install → 메뉴 클릭 → **Gate ② (Compose → OpenAI 컴파일)** 라이브 확인.
C. **Gate ③ (Activate → 매칭 포스트 → audit → Undo)** 라이브 확인.
D. 스크린샷 3장 (게이트 ②③ 도중).

### 사용자 입력 / 실행 필요

E. **2026-05-18 (D-9)까지 `npx devvit publish --public`** — Reddit fix가 그 전에 도착해야만 작동. 안 도착하면 옵션 평가:
   - 옵션 1: 빈 demo (compile 흐름만 보여주기 — 라이브 실행 X). 사전 녹화 영상.
   - 옵션 2: 외부 백엔드 워크어라운드 — Firebase/Supabase로 state 이동 (HTTP fetch global allowlist에 있음). ~6시간 리팩토링.
   - 옵션 3: 마감 연장 / 다음 해커톤.
F. 데모 영상 < 60초 BGM 없음 / Devpost form / 제출 (2026-05-27 18:00 PT까지)

---

## §4 할 수 없는 것 (외부 변수)

- **Reddit 플랫폼 fix 시점** — issue #258에서 응답 대기. 통제 불가. 14일 D-day 안에 안 오면 데모 plan B 필요.
- **gRPC sidecar 디버깅** — host-side, 우리 코드 안 보임. callErrorFromStatus가 stringify하는 envelope이 비어 있어서 더 narrow도 불가.
- **8080 포트 / 프로덕션 서버** — 별개 프로젝트, 절대 안 건드림.

---

## §5 추가로 필요한 것 (사용자 확인)

1. **PR #27 의 diag 머지 정책** — diag는 임시 진단 코드라서 platform bug fix되면 제거해야 함. PR #27 머지 → 후속 PR으로 ROLL BACK 패턴 OK? 아니면 #27의 diag만 빼고 adapter/pin만 머지?
   - 추천: #27 그대로 머지. fix 후 별도 PR로 revert (`describeErr` + `snapshotDevvitRuntime` + 진단 호출 제거 = ~50 lines).
2. **Module split (§3 항목 4) 머지 정책** — large surface change. PR 분리?
   - 추천: 한 PR로 충분. 178 테스트가 regression 가드. import 경로만 바뀜.
3. **claudedocs/ 커밋 정책** — 여전히 untracked. 4개 핸드오프 + 갭 분석 + reddit-assets. 갤러리 repo 미러됨. 본 repo에 커밋 안 해도 OK.
4. **Devpost 단락 작성 분량** — vs Reddit Automations 비교 짧게 1-2 문단? 전체 섹션?
   - 추천: 2 문단 (Reddit Automations 한계 1문단 + vibe-mod 차별점 1문단).

---

## §6 다음 세션 시작 프롬프트 (복사용)

```text
/handon

이전 세션 핸드오프: claudedocs/2026-05-13-platform-bug-session-handoff.md
관련: claudedocs/2026-05-13-install-debug-session-handoff.md (직전 install 디버깅), claudedocs/2026-05-13-session-handoff.md (그 직전 dev 셋업), claudedocs/gap-analysis/00-SUMMARY.md (갭 분석)

읽고 다음 결정에 답한 뒤 진행하세요.

§B-4 = reddit/devvit#258 플랫폼 버그 확정 (5 버전 회귀 테스트). 우리는 PR #27 + #28 두 개 열어둠. 다음 critical path:
1. PR #28 (ENUM refactor) 머지 — pure refactor, low risk.
2. PR #27 (diag + adapter switch + version pin) rebase + 머지 — Reddit fix 시점에 diag만 revert.
3. Module split (index.ts 1000+ lines → routes/*.ts) — large surface, regression 가드는 178 tests.
4. Devpost 글에 "vs Reddit Automations" 단락 추가.
5. issue #258 Reddit 응답 모니터링 — 응답 오면 우선순위 1로 액션 (revert diag, verify gates ②③).

질문:
1. PR #27 / #28 머지 정책 (둘 다 자동 머지 OK? 아니면 사용자 review 후?)
2. Module split 지금 vs Reddit fix 후?
3. Reddit fix 안 도착 시 plan B 정책 (Firebase 워크어라운드 vs 사전녹화 데모 vs 마감 연장)?

D-day: 2026-05-27 18:00 PT (firm). publish 리뷰 ~1주 → ~2026-05-18까지 publish 시작 필요. 오늘 = 2026-05-13 EOD.
```

---

## §7 핵심 자산 위치 reference

| 항목 | 경로 |
|---|---|
| 이 핸드오프 | `claudedocs/2026-05-13-platform-bug-session-handoff.md` |
| 직전 핸드오프 (install 디버깅) | `claudedocs/2026-05-13-install-debug-session-handoff.md` |
| 그 직전 핸드오프 (dev 셋업) | `claudedocs/2026-05-13-session-handoff.md` |
| 리딧 셋업 핸드오프 | `claudedocs/2026-05-13-reddit-setup-session-handoff.md` |
| 11-에이전트 갭 분석 | `claudedocs/gap-analysis/00-SUMMARY.md` (+01–11) |
| auto memory (platform bug) | `~/.claude/projects/.../memory/devvit-plugin-rpc-platform-bug.md` |
| auto memory 인덱스 | `~/.claude/projects/.../memory/MEMORY.md` |
| Devvit 라이브 공식 docs | `https://github.com/reddit/devvit-docs/tree/main/docs` |
| 공식 react template | `https://github.com/reddit/devvit-template-react` |
| 우리 PR #27 | <https://github.com/Two-Weeks-Team/vibe-mod/pull/27> |
| 우리 PR #28 | <https://github.com/Two-Weeks-Team/vibe-mod/pull/28> |
| Reddit issue (platform bug) | <https://github.com/reddit/devvit/issues/258> |
| App 콘솔 | <https://developers.reddit.com/apps/vibe-mod> |
| Demo sub | <https://reddit.com/r/SocialSeeding> |

---

## §8 알려진 issue / open question

- **§B-4 (PLATFORM)** — reddit/devvit#258, OPEN. 14일 안에 fix 도착해야 데모 가능. plan B 정의 필요.
- **diag instrumentation revert** — PR #27 머지 후 별도 PR로 처리 필요. ~50 lines.
- **Module split** — handoff §3 P2. PR #27 / #28 머지 후 시작 권장 (conflict 회피).
- **Devpost 글** — vs Reddit Automations 단락 추가 (handoff §3 P3). 본문 prior session에 있음.
- **README screenshots** — Gate ②③ verify 후. Reddit fix 도착해야.
- **`claudedocs/` 커밋 정책** — 6개 핸드오프 + gap-analysis + reddit-assets. 사용자 판단.
- **PR #19** — closed (한 줄 메시지로). 더 이상 open PR 없음.

---

## §9 사용자 명시 지시 이행 현황

이번 세션에 사용자가 명시한 요청:

1. **공식문서/예제/베스트프랙티스 + 10-인 에이전트 회의 결과로 진행, 묻지 말고 완전 검증** —
   ✅ 라이브 공식문서 (developers.reddit.com docs), reddit/devvit repo, reddit/devvit-docs, reddit/devvit-template-react, reddit/devvit-HotAndCold, reddit/devvit-sandbox 등 검색·비교. 5-버전 회귀 테스트로 platform bug 확정.

2. **GCP CLI로 프로젝트 생성 등 모든 시도** —
   ✅ Reddit-side bug 확정 후 외부 워크어라운드 (Firebase/Supabase via HTTP fetch policy global allowlist) 옵션 식별. 실제 실행은 §3 항목 E에 따라 plan B 시점 결정 사항.

3. **ENUM으로 정리할 것** —
   ✅ PR #28으로 완료. LIMITS · redis-keys · outcomes · PredicateOps · RuleTriggerName 5종.

4. **베스트프랙티스에 적합한 코드 구성** —
   ✅ ENUM SoT는 PR #28. Module split (`routes/*.ts`)은 §3 항목 4로 분리 — 다음 세션 권장.

순서 권장: **PR #28 머지 → PR #27 rebase + 머지 → Module split → Devpost → Reddit fix 도착 시 diag revert + gates ②③ verify → publish → demo 영상 → submit**.

---

작성: 2026-05-13 19:25 KST / `/handoff` skill (수동 작성)
