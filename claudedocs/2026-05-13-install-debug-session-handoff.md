# vibe-mod — Session Handoff (2026-05-13, install/runtime debug)

> `/handon` 으로 로드. 직전 핸드오프: `claudedocs/2026-05-13-session-handoff.md` (코드/문서 셋업 마무리), `claudedocs/2026-05-13-reddit-setup-session-handoff.md` (r/SocialSeeding 셋업). 이 파일 = *Devvit Web 실런타임 install·서버 디버깅* 라운드 + 막힌 지점.

---

## §0 두 줄 요약

- **무엇**: r/SocialSeeding에 vibe-mod를 install 시도하면서 hit한 4단계의 실런타임 버그를 순서대로 픽스. ① `devvit.json` 스키마 4건 (PR #20, 이전 세션) → ② `onAppInstall` 트리거 데드라인 ("context canceled", PR #25) → ③ HTTP 서버 미실행 ("fetch failed" 모든 endpoint, PR #26 open) → ④ **Devvit 플러그인 RPC 호출이 "Error: undefined undefined: undefined" 로 throw** — `context.username`은 정상 populated, but `redis.get(...)` 와 `reddit.getModerators(...)` 가 모두 throw. **여기서 멈춤.** 앱은 v0.0.8로 install돼 있고 메뉴 항목도 떠 있지만, 클릭하면 mod check가 RPC throw로 실패해서 "Only moderators can use this." 토스트만 나옴.
- **다음 세션 1순위**: ④번을 풀어야 합니다. Devvit `_createServer`의 `runWithContext(ctx, callback)` AsyncLocalStorage scope가 우리 Hono `app.fetch(webReq)` 안쪽까지 *부분적으로*는 전파됨 (`context.*` 프록시 read는 동작) — but Devvit 플러그인 RPC (Redis, Reddit, scheduler)는 metadata를 못 찾고 throw. `node_modules/@devvit/server/server-context.js` + `@devvit/public-api/devvit/internals/context.js` + `globalThis.devvit.metadataProvider` 흐름을 정밀하게 따라가서 무엇이 빠졌는지 봐야 함. + 사용자 요청: **공식문서/예제를 더 깊게 탐색**, ENUM 정리 + 코드 best practice 리팩토링.

---

## §1 진행한 작업 (시간순)

### Phase A — 직전 세션 끝낸 자리에서 시작
- main = `19a85da` (PR #17~#23 merged, v0.2.1 facts까지). 사용자가 `npx devvit upload` 실행 → 첫 `devvit install SocialSeeding` 시도.
- 직전 세션 끝물에 만든 통합 YOU-only 체크리스트 (`claudedocs/reddit-setup-checklist.html` + GitHub Pages 미러: https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod/checklist.html) 따라 진행.

### Phase B — install 4건 동시 발현 + 단계별 분리
| Layer | 증상 | 진단 | Fix |
|---|---|---|---|
| **B-1 (이전 세션)** | `devvit upload` 자체가 거부 | `devvit.json` 스키마 4건 (top-level `version`, `dev.subreddit` 하이픈, `openaiApiKey` defaultValue, `server.entry` 경로) | PR #20 |
| **B-2** | `devvit install` → "context canceled" | `onAppInstall` trigger handler가 cold-start + Redis writes 인라인 → Devvit RPC 데드라인 미스 | try/catch + scheduler.runJob 분리 = PR #24 — **그래도 실패** → handler를 bare-minimum (`return {status:'ok'}`)으로 줄여도 실패 → **결국 devvit.json에서 트리거 선언 자체를 제거** = PR #25. install 성공 (v0.0.5). |
| **B-3** | install 성공 but 메뉴 클릭 시 아무 반응 + 스케줄러 매 tick 실패. 로그: `Failed to POST to Node.js server endpoint /internal/scheduler/...; fetch failed` | 우리 `src/server/index.ts`가 `export default app`만 하고 HTTP 서버를 listen 안 함. Devvit gateway → 서버 fetch 시 socket 없음. Devvit Web 공식 패턴 (`docs/devvit-reference.md:1619`, "Cache helper"): `createServer(app).listen(getServerPort())`. Hono app은 callable이 아니므로 Node `IncomingMessage` ↔ Web `Request` 어댑터 필요. Devvit `createServer` 통해야 `runWithContext` 설치됨. | 어댑터 + listen 추가 = PR #26 (open) → 업로드 후 v0.0.6. 로그에서 "fetch failed" 사라지고 "Cron task '...' scheduled." 정상 로깅 확인. |
| **B-4 (현재 막힘)** | "Compose rule" 메뉴 클릭 → 토스트 "Only moderators can use this.". v0.0.7 (진단 로깅 박은 버전) 업로드 후 로그 확인 결과: `isCallerModerator()` 안의 `reddit.getCurrentUser()` 가 `Error: undefined undefined: undefined` throw. | scope `permissions.reddit.scope: "moderator"` 하에서는 `getCurrentUser()` 가 동작 안 함 추정. `context.username` (experimental) + `context.userId`로 우회 → v0.0.8. **그래도 실패**: 이번엔 `redis.get(modlist) threw: Error: undefined undefined: undefined` + `getModerators threw: Error: undefined undefined: undefined`. `context.username = DragonfruitAfraid309` 는 잘 채워짐 → ALS 일부는 동작 but 플러그인 RPC는 metadata 못 찾음. **여기서 멈춤.** | — |

### Phase C — 관련 부수 결과물
- **체크리스트 HTML GitHub Pages 게시** — `claudedocs/reddit-setup-checklist.html` → gallery repo `vibe-mod/checklist.html`. 라이브 URL: https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod/checklist.html (개인정보 스크럽: 로컬 경로 `~`로 / username "본인 Reddit 계정으로"). 로컬 원본은 unscrubbed.
- **Reddit Automations 비교 분석** — 사용자가 6장의 스크린샷으로 Reddit의 새 "Automations" 기능 (Posting/Commenting 트리거 + keyword/regex/URL/domain condition + Display/Report/Block 3개 action + User flair only) 의 천장을 모두 노출 → 우리 차별점이 narrow됐지만 여전히 존재함을 확정: ① 작성자 8 fact (account age/karma/mod status… Reddit엔 flair만), ② mod action 8개 (flair/lock/remove/ban — Reddit엔 없음), ③ 리포트 트리거, ④ live shadow + 30-day undo (Reddit은 sandbox preview). 이걸 Devpost 글에 한 단락으로 반영하기로 결정 (아직 미구현, ④번 풀린 뒤 진행).
- **r/SocialSeeding 첫 콘텐츠**: 사용자가 체크리스트 C-4 ("Start here" 핀 게시물) 게시 → "Build your community" 2/3 unlocked. 핀 고정은 아직.

### Phase D — 사용자가 추가로 남긴 일반 지시 (이번 핸드오프에 명시 요청)
1. **공식문서/예제 더 깊게 탐색** — `node_modules/@devvit/**`, `docs/devvit-reference.md`, 그리고 stock Devvit "Mod Tool" 템플릿(Comment Mop)을 별도로 generate해서 우리 코드와 비교.
2. **ENUM 정리** — 현재 `as const` 배열 / 매직 상수 흩어져 있음. 적절한 enum / discriminated union / 단일 객체로 통합.
3. **코드 best practice 리팩토링** — `src/server/index.ts` 970+ 줄 분리, 매직 스트링 상수화, 어댑터 분리 등.

---

## §2 현재 상태

### Git
| branch | HEAD | 비고 |
|---|---|---|
| `main` | `99498df` (Merge #25) | post-PR #25, *pre*-PR #26 |
| `fix/server-listen` | `4ce0d8f` + **3 uncommitted edits** | PR #26 open. 미커밋: 진단로깅 + `getCurrentUser`→context.username 우회 (테스트 + helpers + index.ts) |
| `claudedocs/` | untracked | 분석 산출물 |

- **Open PRs**: #19 (dependabot — eslint 10 비호환, close 권장), **#26** (`fix/server-listen` — CI green이지만 머지 전에 §B-4 막힘 풀고 추가 커밋 필요).
- **Last upload**: v0.0.8 (uncommitted state of `fix/server-listen` branch). 사용자 r/SocialSeeding에는 v0.0.8가 install돼 있음.

### Live
- App: https://developers.reddit.com/apps/vibe-mod (uploaded, private, **In 1 community = r/SocialSeeding v0.0.8**)
- Demo sub: https://www.reddit.com/r/SocialSeeding/ (1 post: "Start here…", 2 mods = DragonfruitAfraid309 + vibe-mod)
- 체크리스트 HTML (라이브): https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod/checklist.html
- 갭 분석 + 핸드오프: `claudedocs/gap-analysis/00-SUMMARY.md`, 이 파일

### 빌드 / 점수
- 178 tests + 3 `@devvit/test` (1 skipped) | tsc clean | ESLint 0 | Prettier clean | acceptance 4/4 | `npm run doctor` 0 hard / 0 warn | `vite build` → `dist/server/index.cjs` ~2.13 MB
- OpenAI: `gpt-5.4-mini` 기본, 키 설정 완료(Devvit secret). 로컬 `.env`도 OK. `npm run openai:smoketest` 직전 7/7.
- Hackathon: **D-day = 2026-05-27 18:00 PT** (firm). `devvit publish --public`은 ~5/18 (D-9) 시작 필요. 오늘 = 5/13. **남은 ≈5일 안에 §B-4 풀고 게이트 ②③ 통과 + publish 신청해야 함.**

### 환경
- node v24.15.0 / `npm install` (npm ci는 esbuild EBADPLATFORM)
- devvit CLI authenticated as `u/DragonfruitAfraid309`
- repo cwd = `/Users/kimsejun/Documents/GitHub/vibe-mod`

---

## §3 다음 세션에서 할 수 있는 것

### 즉시 (Claude — 사용자 입력 불필요)

> **항상 코드 변경 후**: 빌드 → 업로드 → install (이미 r/SocialSeeding에 install돼 있으니 새 버전 install은 inplace update) → 로그 확인. 사이클 ~1분.

1. **[CRITICAL] §B-4 디버깅** — Devvit 플러그인 RPC가 throw하는 진짜 이유 찾기.
   - 파일 읽을 것:
     - `node_modules/@devvit/server/server-context.js` (이미 읽음 — `metaFromIncomingMessage` + `Context()` 흐름)
     - `node_modules/@devvit/server/context.js` (이미 읽음 — `runWithContext` + ALS + `getMetadata`)
     - `node_modules/@devvit/public-api/devvit/internals/context.js` (아직 안 읽음 — `getContextFromMetadata` 구현)
     - `node_modules/@devvit/redis/RedisClient.js` (있다면 — 플러그인 호출 코드, metadata 사용처)
     - `node_modules/@devvit/server/create-server.js` (이미 읽음)
   - 가설 검증할 것:
     - 가설 1: 우리 `nodeToHonoListener` 어댑터가 Devvit `runWithContext`의 ALS scope 안에서 호출되지만, `app.fetch(webReq)` 안의 핸들러로 들어가면서 ALS가 깨짐. 검증: 핸들러 첫 줄에 `getMetadata()` 직접 호출해서 metadata가 채워졌는지 로깅.
     - 가설 2: metadata는 잘 전파되는데, 플러그인 RPC에 *추가로* 필요한 게 있음 (Devvit가 별도 헤더 전달 또는 별도 ALS scope). `Header` enum (`@devvit/shared-types/Header.js`) 의 모든 헤더가 우리 IncomingMessage `req.headers`에 다 있는지 로깅.
     - 가설 3: 우리 어댑터의 `for await (const chunk of req)` 가 ALS context를 끊음. 검증: 어댑터 진입 직후 vs body 읽은 후 두 시점에서 `getMetadata()` 비교.
     - 가설 4: Hono v4.x가 내부적으로 ALS-incompatible 패턴 사용. 검증: Hono 없이 raw handler (`(req, res) => res.end(JSON.stringify({status:'ok'}))`) 를 `createServer`로 listen → `redis.get` 콜이 동작하는지.
   - 안 풀리면: **stock Devvit "Mod Tool" 템플릿을 `/tmp`에 generate** (`cd /tmp && npm create devvit@latest <new-code>`) 후 그 템플릿의 `src/server/index.ts` 동작과 비교. 무엇이 다른지 diff.
   - 풀리면: PR #26에 추가 커밋 + 진단 로깅 제거 + merge.

2. **[관련] PR #26 마무리** — §B-4 풀리면 그 커밋 묶어서 push → CI 확인 → merge. 마지막에 `npx devvit upload` 한 번 더 (clean v0.0.9+).

3. **[새 항목 P1] ENUM/매직상수 정리** — `claudedocs/gap-analysis/05-code-architecture.md` 의 권고 + 사용자 명시 요청. 후보:
   - `SAFE_ACTIONS` / `GUARDED_ACTIONS` (`as const`) → `enum ActionVerb` + helper sets, OR 그대로 유지하되 `type ActionVerb = ...[number]` 일관화.
   - `PredicateOps` (`['eq','neq','lt'...]`) — `rule-schema.ts`에서 export하고 `evaluator.ts` / `evaluator.property.test.ts`가 같은 출처에서 import.
   - Audit `outcome` 리터럴 (`'applied' | 'shadow' | 'rate_limited' | 'guarded_skip' | 'error'`) — 단일 const + Zod enum + TS type.
   - 트리거 타입 (`'onPostSubmit' | 'onCommentSubmit' | ...`) — 이미 Zod enum이지만 string 리터럴이 곳곳에 흩어짐 → 상수화.
   - TTL 상수 (`ROLLBACK_TTL_SECONDS`, `AUDIT_TTL_SECONDS`, `USER_CACHE_TTL_SECONDS`, `MOD_LIST_CACHE_SECONDS`, `TRIGGER_DEDUPE_SECONDS`, `DRY_RUN_TTL_SECONDS`, `COMPILE_RATE_LIMIT_PER_DAY`) → 단일 `TTL`/`LIMITS` 객체 (`src/shared/limits.ts`).
   - Redis 키 패턴 (`${sub}:rules:active`, `${sub}:rules:draft`, `${sub}:audit`, `${sub}:audit:${id}`, `${sub}:rollback:${id}`, `${sub}:dryrun:${id}`, `${sub}:author:${id}`, `${sub}:modlist`, `${sub}:circuit:open`, `${sub}:ratelimit:${rid}:${aid}`, `${sub}:compile:count:${day}`, `${sub}:seen:${trigger}:${id}`) → `src/shared/redis-keys.ts` 의 `keys = { rulesActive(sub), audit(sub), … }` 헬퍼.
   - 매직 sentinel (`'unknown'`, `'t2_unknown'`, `'t5_unknown'`, `'seed'`) → 상수.

4. **[새 항목 P2] `index.ts` 모듈 분리** — 970+ 줄 단일 파일. 갭 분석에서 추천한 분할:
   - `src/server/routes/menu.ts` — `/internal/menu/*`
   - `src/server/routes/forms.ts` — `/internal/form/*`
   - `src/server/routes/triggers.ts` — `/internal/trigger/*`
   - `src/server/routes/scheduler.ts` — `/internal/scheduler/*`
   - `src/server/routes/settings.ts` — `/internal/settings/validate-*`
   - `src/server/http-adapter.ts` — `nodeToHonoListener` + listen 코드
   - `src/server/openai.ts` — `callOpenAI` 헬퍼
   - `src/server/index.ts` — Hono `app` 생성 + 각 모듈 마운트 + listen만.
   - 기존 168 route 테스트가 `import app from './index'` 하니까 그건 유지.

5. **[새 항목 P3] Devpost 글에 "vs Reddit Automations" 단락 추가** — `docs/devpost-submission.md`. 본문은 직전 메시지들에 있음. 짧은 PR.

6. **[새 항목 P4] PR #19 close** — eslint 10 비호환, 한 줄 메시지 달고 close.

7. **README 스크린샷 + 데모영상 자리 표시** — Compose 폼 + dry-run 프리뷰 + audit 로그 (게이트 통과 후 사용자가 캡처).

### 사용자 입력 / 실행 필요

A. **§B-4 풀린 뒤** "vibe-mod: Compose rule" 클릭해서 폼 뜨는지 확인.
B. 게이트 ② (Compose → OpenAI 컴파일 라운드트립 — 토스트 "Compiled rule '...'. Dry-run started — check Dashboard in 30s.").
C. 게이트 ③ (View rules + log → Activate → 매칭 포스트 작성 → audit → Undo this action).
D. 스크린샷 3장 (게이트 ②③ 도중).
E. `npx devvit publish --public` (~5/18까지 시작).
F. 데모 영상 < 60초 BGM 없음 / Devpost form 마무리 / 제출 (~5/27 18:00 PT).

---

## §4 할 수 없는 것 (외부 변수)

- Reddit App Directory 리뷰 통과 시점 — `devvit publish --public` 후 ~1주, 통제 불가.
- Devvit 플랫폼 자체 버그 가능성 — §B-4가 우리 코드 문제가 아니라 *Devvit Web의 Hono 어댑터가 plugin metadata 전달을 못 하게 만드는 알려지지 않은 제약*일 수도 있음. 그 경우 우회 패턴 (e.g. Express로 전환, 또는 manual route dispatcher) 필요.
- 8080 포트 / 프로덕션 서버 — 별개 프로젝트, 절대 건드리지 않음.
- 다른 팀원 작업과의 충돌 — Two-Weeks-Team org repo, PR 보드 확인 필요.

---

## §5 추가로 필요한 것 (사용자 확인)

1. **§B-4 막힌 사이 publish 전략** — 지금 멈춰 있으면 §3의 §B-4 디버깅이 길어질 수 있음. 만약 ~1-2 세션 안에 안 풀리면:
   - 옵션 A: 어댑터 패턴 버리고 Express로 전환 (Devvit 문서가 Express 예제도 동일하게 보여줌 — `docs/devvit-reference.md:1623`).
   - 옵션 B: Hono v3로 다운그레이드 시도 (v4가 ALS 깨는 변화가 있었을 수도).
   - 옵션 C: stock Comment Mop 템플릿에 우리 로직을 *옮겨심기* (가장 거친 우회).
2. **PR #26 머지 정책** — `fix/server-listen` 안에 PR #26의 server-listen 픽스 + 그 위 §B-4 디버깅 커밋들이 다 들어가 있음. §B-4 풀고 같이 머지할지, 아니면 #26 먼저 머지하고 §B-4를 별도 PR로 할지.
3. **`claudedocs/` 커밋 정책** — 여전히 untracked. 이번 세션 다 끝나면 gap-analysis, handoffs, assets 따로 커밋할지 묻는 게 좋음. 갤러리 repo엔 이미 sanitized 버전 호스팅됨.
4. OpenAI 키 - revoke 한 적 없으므로 그대로 유효. r/SocialSeeding 데모 끝나기 전엔 유지.

---

## §6 다음 세션 시작 프롬프트 (복사용)

```text
/handon

이전 세션 핸드오프: claudedocs/2026-05-13-install-debug-session-handoff.md
관련: claudedocs/2026-05-13-session-handoff.md (직전 dev), claudedocs/2026-05-13-reddit-setup-session-handoff.md (Reddit setup), claudedocs/gap-analysis/00-SUMMARY.md (갭 분석)

읽고 다음 결정에 답한 뒤 진행하세요. **이번 세션의 최우선 작업은 §B-4 (Devvit 플러그인 RPC가 "Error: undefined undefined: undefined"로 throw하는 원인 파악)이며, 그 과정에서 공식문서·예제·node_modules/@devvit/** 를 충분히 깊게 탐색해주세요. 가설 1~4를 §3에 정리해뒀습니다. 풀리면 PR #26 마무리 + ENUM/베스트프랙티스 리팩토링까지.**

1. §B-4 디버깅을 어디까지 시도하고 막히면 어떤 우회를 쓸까요? (가설 1~4 차례로 → 다 안 되면 Express 전환 / Hono v3 다운그레이드 / 템플릿 재이식 중 어느 쪽?)
2. ENUM/매직상수 정리 (§3 항목 3) — 새 PR로 별도 분리할까요, §B-4 픽스에 묶어서 하나로 갈까요?
3. `index.ts` 970+ 줄 모듈 분리 (§3 항목 4) — 지금 vs 해커톤 후?
4. PR #26 머지 순서 — §B-4 풀고 한 번에 머지 vs 둘로 분리?

D-day: 2026-05-27 18:00 PT (firm). publish 리뷰 ~1주 → ~D-9 (2026-05-18)까지 `devvit publish --public` 시작 필요. 오늘 = 2026-05-13.
```

---

## §7 핵심 자산 위치 reference

| 항목 | 경로 |
|---|---|
| 이 핸드오프 (install debug 라운드) | `claudedocs/2026-05-13-install-debug-session-handoff.md` |
| 직전 dev 핸드오프 | `claudedocs/2026-05-13-session-handoff.md` |
| Reddit setup 핸드오프 | `claudedocs/2026-05-13-reddit-setup-session-handoff.md` |
| 11-에이전트 갭 분석 종합 | `claudedocs/gap-analysis/00-SUMMARY.md` (+`01–11.md`) |
| YOU-only 체크리스트 (로컬) | `claudedocs/reddit-setup-checklist.html` |
| 체크리스트 (라이브) | https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod/checklist.html |
| Reddit 자산 (icon/banner/svg) | `claudedocs/reddit-assets/` |
| Devvit 셋업 가이드 | `docs/devvit-setup-guide.md` |
| Devpost 글 초안 (vs Reddit Automations 추가 대상) | `docs/devpost-submission.md` |
| Devvit 공식 문서 스냅샷 | `docs/devvit-reference.md` (Cache helper 예제 = 라인 1619 — Hono 패턴) |
| Devvit conformance 노트 | `docs/devvit-conformance-notes.md` |
| 핵심 코드 — Hono adapter | `src/server/index.ts:932-996` (PR #26) |
| 핵심 코드 — mod check (현재 막힘) | `src/server/index.ts:62-117` |
| Devvit 내부 — server context | `node_modules/@devvit/server/server-context.js` |
| Devvit 내부 — ALS context | `node_modules/@devvit/server/context.js` |
| Devvit 내부 — public API context (아직 안 읽음) | `node_modules/@devvit/public-api/devvit/internals/context.js` |
| App 콘솔 | https://developers.reddit.com/apps/vibe-mod |
| Demo sub | https://www.reddit.com/r/SocialSeeding/ |
| 갤러리 repo | https://github.com/Two-Weeks-Team/reddit-mod-tools-port-gallery |

---

## §8 알려진 issue / open question

- **§B-4 (CRITICAL)** — Devvit 플러그인 RPC가 우리 핸들러 안에서 throw. `context.username`은 read 가능 (ALS 일부는 동작) but `redis.get`, `reddit.getModerators`는 throw. 다음 세션의 1순위.
- **§B-2 부작용** — `onAppInstall` 트리거 declaration 제거로 5 starter draft rules 자동 시드 안 됨. mod가 처음 install했을 때 Dashboard 빈 채로 시작. `/internal/scheduler/seed-on-install` endpoint는 유지돼 있어서 (devvit.json에 task로 등록됨) 수동/별도 트리거 가능. 데모용으론 "직접 영어로 첫 룰 쓰는 게 데모 컨셉" 이라 큰 문제 아님. 자동 시드 복원은 §B-4 풀린 뒤 재검토.
- **PR #19** — dependabot dev-deps bump 4건, eslint 10 메이저 비호환으로 CI 실패. close 권장 (한 줄 메시지로).
- **`claudedocs/` 커밋 정책** — 분석/핸드오프 산출물. 컨벤션상 미커밋이지만 자산(reddit-assets/, checklist HTML) 은 팀이 쓸 만함. 갤러리 repo에 별도 미러됐으니 vibe-mod repo엔 커밋 안 해도 OK — 사용자 판단.
- **README 스크린샷 미캡처** — `docs/devvit-setup-guide.md` 가리키는 노트로 대체돼 있음. 게이트 ②③ 통과 후 캡처해서 README/Devpost에 삽입.
- **Reddit Automations 비교 단락** — `docs/devpost-submission.md`에 추가 예정 (이번 세션 끝물에 결정만 하고 실제 글은 미작성). 본문은 직전 메시지에 정리돼 있음.
- **API 키 보안** — 사용자가 스크린샷에 sk-proj- prefix만 노출 (전문 아님, revoke 불필요).

---

## §9 사용자 명시 지시 (이번 핸드오프에 남기라고 요청한 것)

이번 세션 끝에 사용자가 명시한 다음 세션 작업 지시:

1. **공식문서/예제를 충분히 탐색하라.**
   - `docs/devvit-reference.md` (이미 우리 repo 안 — 비-게임 58 페이지 스냅샷)에서 server bootstrap·context·plugin 예제 정독.
   - `node_modules/@devvit/**` 의 `.js` 구현체를 직접 읽어 metadata 전파·플러그인 호출 흐름 파악.
   - stock "Mod Tool" 템플릿을 새로 generate해서 (`npm create devvit@latest`) 우리 코드와 diff.
   - "Comment Mop" 등 Reddit 공식 예제 앱이 있다면 그 코드도 참고.

2. **ENUM으로 정리할 것** (§3 항목 3):
   - `SAFE_ACTIONS` / `GUARDED_ACTIONS` (현재 `as const` 배열) → enum 또는 단일 SoT.
   - `PredicateOps` — `rule-schema.ts`에서 export하고 evaluator·테스트가 같은 출처에서 import.
   - Audit `outcome` 리터럴 → enum/const + Zod enum + TS type 통합.
   - 트리거 타입 (`onPostSubmit` 등) — 이미 Zod enum이지만 string 리터럴 곳곳 → 단일 SoT.
   - TTL 상수들 → 단일 `LIMITS` 객체 (`src/shared/limits.ts` 신규).
   - Redis 키 패턴 → `src/shared/redis-keys.ts` 헬퍼.
   - 매직 sentinel (`'unknown'`, `'t2_unknown'`, `'t5_unknown'`, `'seed'`) → 상수.

3. **코드를 베스트프랙티스에 적합하게 구성하라**:
   - `src/server/index.ts` 970+ 줄 단일 파일 → 라우트 모듈 분리 (§3 항목 4의 분할안).
   - `nodeToHonoListener` 어댑터 → `src/server/http-adapter.ts` 추출.
   - `callOpenAI` → `src/server/openai.ts` 추출.
   - 매직 스트링 인스턴스 → 위의 ENUM 정리와 함께 해결.
   - 핸들러 안의 try/catch + 로깅 패턴 → 공통 미들웨어 또는 `withErrorLogging(fn)` 래퍼.
   - 178 routes 테스트는 `import app from './index'` 하므로 분리해도 그대로 통과해야 함 (regression 가드).

순서 권장: **§B-4 디버깅(최우선) → PR #26 마무리 → ENUM 정리 → 모듈 분리 → Devpost 단락 추가**. 해커톤 D-day 전까지 시간 여유 보면서 진행, 막히면 §5의 우회 옵션 사용자에게 확인.

---

작성: 2026-05-13 (KST 17:20) / `/handoff` skill
