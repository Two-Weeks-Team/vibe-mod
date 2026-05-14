# vibe-mod — Module Split Plan: src/server/index.ts → routes/*.ts

> Phase 2a 산출물. 사용자 승인 후 Phase 2b 구현.
>
> 페어: `claudedocs/2026-05-14-compose-flow-audit.md`, `docs/demo-scenario.md`

## §0 결론

`src/server/index.ts` (1546줄) → 12개 파일로 분리. 라우트 분기 6개 (`compose / dashboard / undo / triggers / scheduler / settings`) + 헬퍼 4개 (`diagnostics / auth / openai / rule-validation`) + 앱 wiring (`app.ts`) + 부트스트랩 (`index.ts` 슬림). 회귀 위험 mid → low (handler signature 안 바뀜, import 경로만 바뀜).

## §1 현재 구조 매핑 (line by line)

| Lines | 섹션 | LOC | 이동 대상 |
|---|---|---:|---|
| 13-52 | imports + `const app = new Hono()` | 40 | `src/server/app.ts` (Hono app 생성) + per-file imports |
| 55-103 | `describeErr`, `snapshotDevvitRuntime` | 49 | `src/server/middleware/diagnostics.ts` |
| 106-178 | `isCallerModerator` | 73 | `src/server/middleware/auth.ts` |
| 182-188 | `summarizeValidationError` | 7 | `src/server/helpers/rule-validation.ts` |
| 193-202 | `isSafeRegex` | 10 | `src/server/helpers/rule-validation.ts` |
| 205-221 | `PredicateTreeShape` + `validatePredicateRegexes` | 17 | `src/server/helpers/rule-validation.ts` |
| 224-275 | compose menu route | 52 | `src/server/routes/compose.ts` |
| 277-617 | compose-rule-submit route | 341 | `src/server/routes/compose.ts` |
| 620-704 | dashboard menu route | 85 | `src/server/routes/dashboard.ts` |
| 706-766 | dashboard-action route | 61 | `src/server/routes/dashboard.ts` |
| 770-826 | undo menu route | 57 | `src/server/routes/undo.ts` |
| 830-842 | `isDuplicateTrigger` | 13 | `src/server/routes/triggers.ts` (private) |
| 844-852 | `safeParseBundle` | 9 | `src/server/helpers/rule-validation.ts` |
| 854-896 | on-post-submit trigger | 43 | `src/server/routes/triggers.ts` |
| 898-935 | on-comment-submit trigger | 38 | `src/server/routes/triggers.ts` |
| 937-947 | on-app-install trigger | 11 | `src/server/routes/triggers.ts` |
| 950-975 | seed-on-install scheduler | 26 | `src/server/routes/scheduler.ts` |
| 977-980 | on-app-upgrade trigger | 4 | `src/server/routes/triggers.ts` |
| 982-986 | on-post-report trigger | 5 | `src/server/routes/triggers.ts` |
| 987-991 | on-comment-report trigger | 5 | `src/server/routes/triggers.ts` |
| 995-1021 | audit-retention scheduler | 27 | `src/server/routes/scheduler.ts` |
| 1023-1031 | `DryRunResult` interface | 9 | `src/server/routes/scheduler.ts` (or shared) |
| 1033-1106 | dry-run-replay scheduler | 74 | `src/server/routes/scheduler.ts` |
| 1108-1154 | shadow-promote-check scheduler | 47 | `src/server/routes/scheduler.ts` |
| 1156-1204 | rate-limit-circuit-breaker scheduler | 49 | `src/server/routes/scheduler.ts` |
| 1209-1216 | validate-rate-limit settings | 8 | `src/server/routes/settings.ts` |
| 1217-1224 | validate-shadow settings | 8 | `src/server/routes/settings.ts` |
| 1228-1232 | `todayKey` | 5 | `src/server/helpers/openai.ts` (used only by compose) |
| 1234-1463 | `callOpenAI` | 230 | `src/server/helpers/openai.ts` |
| 1464-1476 | `isClarification` | 13 | `src/server/helpers/openai.ts` |
| 1478-1488 | `unwrapFormString` | 11 | `src/server/helpers/openai.ts` |
| 1491-1495 | `summarizeRule` | 5 | `src/server/helpers/openai.ts` |
| 1506-1508 | `ALLOW_GUARDED_HELP` | 3 | `src/server/helpers/openai.ts` |
| 1509 | `export default app` | 1 | `src/server/app.ts` |
| 1511-1545 | bootstrap (`if (createServer && WEBBIT_PORT)`) | 35 | `src/server/index.ts` (entry) |

총 LOC: 1546. 분할 후 평균 파일당 ~130 LOC.

## §2 Target file 구조

```
src/server/
  index.ts                    # ENTRY (only the bootstrap `serve(...)`. imports app from app.ts)
  app.ts                      # Hono app + route registrations (each routes/* exports a register function)

  middleware/
    diagnostics.ts            # describeErr, snapshotDevvitRuntime
    auth.ts                   # isCallerModerator (depends on diagnostics)

  helpers/
    rule-validation.ts        # summarizeValidationError, isSafeRegex, validatePredicateRegexes, safeParseBundle
    openai.ts                 # callOpenAI, isClarification, unwrapFormString, summarizeRule, ALLOW_GUARDED_HELP, todayKey

  routes/
    compose.ts                # /internal/menu/compose-rule + /internal/form/compose-rule-submit
    dashboard.ts              # /internal/menu/dashboard + /internal/form/dashboard-action
    undo.ts                   # /internal/menu/undo-action
    triggers.ts               # 6 trigger routes + isDuplicateTrigger
    scheduler.ts              # 5 scheduler routes + DryRunResult interface
    settings.ts               # 2 settings validators

  # Existing — unchanged
  devvit-helpers.ts
  evaluator.ts
  evaluator.test.ts
  evaluator.property.test.ts
  executor.ts
  executor.test.ts
  executor.devvit.test.ts
  fact-bag.ts
  fact-bag.test.ts
  routes-compose.test.ts      # imports `app` — still works (re-export from app.ts via index.ts)
  routes-dashboard.test.ts    # same
  routes-scheduler.test.ts    # same
  routes-settings.test.ts     # same
  routes-triggers.test.ts     # same
  routes-undo.test.ts         # same
```

**Key invariant**: 모든 routes-*.test.ts는 `import app from './index';` 사용 중. index.ts가 app을 re-export하면 테스트 무수정 통과.

## §3 Import graph (이동 후)

```
index.ts ─→ app.ts ─→ routes/{compose,dashboard,undo,triggers,scheduler,settings}.ts
                      │
                      ├─→ middleware/auth.ts ─→ middleware/diagnostics.ts
                      │
                      ├─→ helpers/rule-validation.ts
                      │
                      └─→ helpers/openai.ts ─→ ../shared/system-prompt
                                                 ../shared/limits
                                                 ../shared/redis-keys
                                                 ./devvit-helpers (todayKey via dependent)
```

각 routes/*.ts는 해당 라우트 등록 함수를 export:
```ts
// src/server/routes/compose.ts
export function registerComposeRoutes(app: Hono): void {
  app.post('/internal/menu/compose-rule', async (c) => { ... });
  app.post('/internal/form/compose-rule-submit', async (c) => { ... });
}
```

`app.ts`:
```ts
import { Hono } from 'hono';
import { registerComposeRoutes } from './routes/compose';
import { registerDashboardRoutes } from './routes/dashboard';
import { registerUndoRoutes } from './routes/undo';
import { registerTriggerRoutes } from './routes/triggers';
import { registerSchedulerRoutes } from './routes/scheduler';
import { registerSettingsRoutes } from './routes/settings';

const app = new Hono();
registerComposeRoutes(app);
registerDashboardRoutes(app);
registerUndoRoutes(app);
registerTriggerRoutes(app);
registerSchedulerRoutes(app);
registerSettingsRoutes(app);

export default app;
```

`index.ts` (entry, ~30 lines):
```ts
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import app from './app';

export default app;  // tests still do `import app from './index'`

if (typeof createServer === 'function' && typeof getServerPort === 'function' && process.env.WEBBIT_PORT) {
  try {
    serve({ fetch: app.fetch, createServer, port: getServerPort() });
  } catch (err) {
    console.warn('[vibe-mod] server bootstrap skipped:', err);
  }
}
```

## §4 이동 불가 / 주의 사항

| 함수 | 이슈 | 처리 |
|---|---|---|
| `app.post(...)` 등록 순서 | Hono은 등록 순서대로 처리. 분리해도 같은 순서 보장해야 함 | `app.ts`에서 register 호출 순서 = 현재 index.ts 순서 |
| `describeErr` (diagnostics) | `isCallerModerator`, 모든 route handler에서 `console.warn(..., describeErr(err))` 사용 | `middleware/diagnostics.ts`에서 export, 모든 파일에서 import |
| `snapshotDevvitRuntime` | `isCallerModerator`, `scheduler/rate-limit-circuit-breaker`에서 호출 | diagnostics.ts |
| `safeParseBundle` | dashboard, dashboard-action, scheduler/dry-run-replay, scheduler/shadow-promote-check, on-post-submit trigger, on-comment-submit trigger 6곳 사용 | helpers/rule-validation.ts |
| `todayKey` | compose-rule menu + compose-rule-submit (2곳, 같은 파일) | helpers/openai.ts (compose 의존성과 묶음) — 또는 helpers/time.ts 별도 |
| `DryRunResult` interface | scheduler/dry-run-replay 정의 + dashboard 사용 (`as DryRunResult`) | scheduler.ts에 export |
| `callOpenAI`, `isClarification`, `unwrapFormString`, `summarizeRule`, `ALLOW_GUARDED_HELP` | compose-rule-submit + (clarify form만) compose-rule menu | helpers/openai.ts (compose가 유일한 caller) |
| `Hono` type | Hono v4 인스턴스 타입 (`Hono<E, S, BasePath>`) | register 함수 시그니처 = `(app: Hono) => void` 단순화 OK (제네릭 안 씀) |
| `app` re-export | tests 호환성 핵심 | index.ts에서 `export default app` 유지 (re-import from app.ts) |

## §5 분리 위험 평가

| 항목 | 위험도 | 완화 |
|---|---|---|
| 라우트 등록 누락 | 🔴 high | acceptance test G3 (모든 route 존재 확인) → 자동 catch |
| 핸들러 cross-import 누락 | 🟡 mid | typecheck (4 gates 1번) → 자동 catch |
| Hono middleware 순서 변경 | 🟢 low | 현재 middleware 사용 안 함 (모든 auth는 handler 내부에서 호출) |
| `import app from './index'` 깨짐 | 🟡 mid | index.ts에서 re-export, 모든 routes-*.test.ts 무수정 통과 확인 |
| ESM/CJS interop | 🟢 low | tsconfig "module": "ESNext", build = vite. 기존 패턴 그대로 |
| Devvit `createServer` 부트스트랩 누락 | 🔴 high | index.ts에서 그대로 유지 (이 부분은 코드 안 옮김) |
| 회귀 시 PR revert | 🟢 low | 단일 PR, 한 번에 revert 가능 |

## §6 실행 순서 (Phase 2b)

1. `git checkout -b refactor/split-server-routes` (PR #43 머지된 main 위)
2. `mkdir -p src/server/{middleware,helpers,routes}`
3. **`middleware/diagnostics.ts`** 생성 → `describeErr`, `snapshotDevvitRuntime` 이동
4. **`middleware/auth.ts`** 생성 → `isCallerModerator` 이동 (diagnostics import)
5. **`helpers/rule-validation.ts`** 생성 → `summarizeValidationError`, `isSafeRegex`, `validatePredicateRegexes`, `PredicateTreeShape`, `safeParseBundle` 이동
6. **`helpers/openai.ts`** 생성 → `callOpenAI`, `isClarification`, `unwrapFormString`, `summarizeRule`, `ALLOW_GUARDED_HELP`, `todayKey` 이동
7. **`routes/compose.ts`** 생성 → 2 routes 이동, `registerComposeRoutes(app)` export
8. **`routes/dashboard.ts`** 생성 → 2 routes
9. **`routes/undo.ts`** 생성 → 1 route
10. **`routes/triggers.ts`** 생성 → 6 routes + `isDuplicateTrigger` (private)
11. **`routes/scheduler.ts`** 생성 → 5 routes + `DryRunResult`
12. **`routes/settings.ts`** 생성 → 2 routes
13. **`app.ts`** 생성 → register 6개 호출 + `export default app`
14. **`index.ts`** 슬림화 → bootstrap만 + `export { default } from './app'` (re-export)
15. **`npm run check`** → 4 gates green 확인
16. PR 생성, CI 통과, merge

각 단계 완료 시마다 `npm run typecheck` 실행해서 회귀 즉시 catch (snapshot 단위).

## §7 LOC 추정 (분할 후)

| 파일 | 예상 LOC | comment + import 포함 |
|---|---:|---|
| `index.ts` | ~30 | bootstrap only |
| `app.ts` | ~25 | wiring |
| `middleware/diagnostics.ts` | ~55 | describeErr + snapshotDevvitRuntime |
| `middleware/auth.ts` | ~80 | isCallerModerator |
| `helpers/rule-validation.ts` | ~55 | 4 helpers + PredicateTreeShape |
| `helpers/openai.ts` | ~285 | callOpenAI 큰 비중 |
| `routes/compose.ts` | ~410 | submit handler 큰 비중 |
| `routes/dashboard.ts` | ~155 | menu + action |
| `routes/undo.ts` | ~65 | menu |
| `routes/triggers.ts` | ~125 | 6 triggers + isDuplicateTrigger |
| `routes/scheduler.ts` | ~245 | 5 scheduler jobs |
| `routes/settings.ts` | ~25 | 2 validators |
| **총합** | **~1555** | (현재 1546 + register 함수 boilerplate) |

평균 파일당 130 LOC. 가장 큰 파일 = `routes/compose.ts` 410 LOC (현재 1546 → 410 = 명확한 개선).

## §8 Test 영향

- `routes-{compose,dashboard,scheduler,settings,triggers,undo}.test.ts` 6개 → 모두 `import app from './index'` → re-export로 무수정 통과
- `evaluator.test.ts`, `executor.test.ts`, `fact-bag.test.ts` → server/index.ts 의존 안 함, 무영향
- `executor.devvit.test.ts` → @devvit/test 사용, 영향 없음
- 새 테스트 추가: 없음 (refactor only, 동작 동일)

## §9 Open question (Phase 2b 시작 전 사용자 결정)

1. **`Hono` 인스턴스 타입 제네릭** — register 함수 시그니처 `(app: Hono) => void` 단순화 vs `(app: Hono<EnvType>) => void` 정확형. 단순화 권장 (현재 vibe-mod는 Hono env 안 씀).
2. **`todayKey` 위치** — `helpers/openai.ts` (현재 compose에서만 사용) vs `helpers/time.ts` (미래 다른 파일이 쓸 가능성). 추천: openai.ts (YAGNI).
3. **`DryRunResult` interface 위치** — `routes/scheduler.ts` (export, dashboard에서 import) vs `shared/types.ts` (도메인 타입). 추천: scheduler.ts (single owner).
4. **단일 PR vs 단계 PR** — 1 PR로 모두 (현재 추천) vs 4-5 PR (middleware → helpers → routes/compose → routes/others). 추천: 단일 PR (한 번 review, 한 번 revert 가능). LOC 1555 + boilerplate ≈ 200 → review 부담 mid.

## §10 References

- 직전 phase 산출물: `claudedocs/2026-05-14-compose-flow-audit.md`, `docs/demo-scenario.md`
- PR #43 (Phase 1.6, 머지 대기 중) — 이 split의 baseline
- 사용자 직전 핸드오프: `claudedocs/2026-05-14-openai-400-resolved-handoff.md`

작성: 2026-05-14 KST / Phase 2a
