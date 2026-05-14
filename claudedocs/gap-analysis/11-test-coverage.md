# 11 — Test Coverage Gap Analysis

_Scope: ~170 tests, ~15 files. vitest + hand-rolled `test/devvit-testkit.ts` + official `@devvit/test`. Read-only audit. Cited as `file:line`._

## 1. Summary

The suite is broad and mostly **behavior-asserting** (not status-code theater): route tests check Redis state, mock-call args, and toast text; the evaluator/schema have property tests; there is a runnable acceptance gate and a local replayer. Coverage of the *happy path* and many short-circuits is solid.

But the **safety-critical invariants** — the things that, if they regress, silently nuke a subreddit — are under-tested in three structural ways:

1. **The dry-run path never proves "zero actions."** `scheduler/dry-run-replay` calls `selectMatchingRules` only (`index.ts:683`) — but no test asserts `fakeReddit.report/setPostFlair/banUser` were *not* called during a dry run. The load-bearing property is untested.
2. **TTL-dependent behavior is structurally untestable.** The fake Redis's `expire` is a no-op (`devvit-testkit.ts:67`), so the circuit-breaker auto-clear (10 min), trigger dedupe expiry (10 min), rollback 30-day expiry, and daily-quota midnight reset are *never* exercised. `@devvit/test` is adopted but only for 3 executor tests; it does not yet cover any TTL/expiry semantics either.
3. **Corrupt persisted state crashes triggers, untested.** `RuleBundle.parse(JSON.parse(rulesJson))` in `on-post-submit`/`on-comment-submit` (`index.ts:498,539`) has no try/catch; a malformed `${sub}:rules:active` throws → Hono 500 → every trigger broken until a mod re-saves. The dashboard is even laxer — bare `JSON.parse` with no schema check (`index.ts:346`). No test feeds bad JSON.

Lower-tier but real: threshold/duration **boundary conditions** on the circuit breaker (`> max` vs `== max`) and shadow auto-promote (`>= cutoff`); the **clarification → re-compile** round trip (the clarification *answer* is sent but never round-tripped in a test); `op:matches` **runtime** guards (`evaluator.ts:59-66`) — only the *compile-time* guard is tested; BYOK **key-priority** (sub key beats global) is not asserted on the wire; `onAppUpgrade` is a no-op stub yet the codebase comments imply a migration is expected.

## 2. Findings table

| Untested / weakly-tested behavior | Risk if it regresses | Severity | Effort | Where it belongs |
|---|---|---|---|---|
| Dry-run replay provably takes **zero actions** (no `executeActions`, no `reddit.report/ban/flair/lock/remove` calls) | A dry-run silently moderates real posts; destroys the "preview is safe" promise — the headline feature | **CRIT** | S | `routes-scheduler.test.ts` (assert `fakeReddit.report` etc `not.toHaveBeenCalled()` in every dry-run case) |
| Malformed `${sub}:rules:active` / `:draft` bundle in Redis → trigger handler throws (no try/catch around `RuleBundle.parse`, `index.ts:498,539`); dashboard does bare `JSON.parse` (`index.ts:346`) | One corrupt write disables *all* moderation triggers sub-wide; dashboard 500s | **CRIT** | M | `routes-triggers.test.ts` + `routes-dashboard.test.ts` (seed garbage JSON, expect graceful `{status:'ok'}` / empty dashboard, not 500) — likely needs a source fix too |
| Circuit-breaker **auto-clear after 10 min** (`expire(...,600)`, `index.ts:741`) and executor honoring then *stopping* honoring it | Breaker either never trips off (sub frozen forever) or `expire` arg silently dropped and nobody notices | **HIGH** | M | `executor.devvit.test.ts` if `@devvit/test` supports TTL; else document as untestable + add a clock-injectable seam |
| Circuit-breaker **threshold boundary**: `recentCount === maxPerHour` must NOT open (`> ` at `index.ts:739`); off-by-one to `>=` | Breaker fires one action too early or too late | HIGH | S | `routes-scheduler.test.ts` (exactly N entries → not open; N+1 → open) |
| zCard→zCount regression coverage: there IS a "ignores >1h old entries" test (`routes-scheduler.test.ts:191`) — but it relies on the fake's by-score `zRange` filter (`devvit-testkit.ts:81-89`); no test against real Redis semantics | A real-Redis-only divergence (e.g. inclusive/exclusive score bounds, or reverting to `zRange(0,-1).length`) slips through | HIGH | M | port the breaker count test into `executor.devvit.test.ts` / a `routes-scheduler.devvit.test.ts` |
| Shadow auto-promote **boundary** (`now - createdAt === cutoff` → should promote, `>=` at `index.ts:719`) and **clock skew** (`createdAt` in the future → negative age, must not promote) | A rule promotes a tick early/late or, with a bad clock, never promotes / promotes instantly | MED | S | `routes-scheduler.test.ts` |
| Daily compile quota **reset at midnight** (date-keyed `compile:count:${todayKey()}`, `index.ts:176`) | Quota that never resets (mods locked out) or resets too eagerly (cost blow-out) — never exercised because no test mocks the clock across a day | HIGH | M | `routes-compose.test.ts` with `vi.setSystemTime` across midnight |
| Trigger **idempotency for comments** (`on-comment-submit`); dedupe **TTL expiry** allowing legit re-processing after window | Comment double-actions; or dedupe key never expires → a re-submitted thing id is permanently ignored | MED | S | `routes-triggers.test.ts` |
| Clarification **round trip**: LLM asks → mod answers → second compile sees `clarificationAnswer` as a *separate* user turn (`index.ts:804`), produces a valid rule, stores draft | Clarification answer dropped or concatenated (the FIND-11 fix) → confused compiles, prompt-injection surface | MED | S | `routes-compose.test.ts` |
| `op:matches` **runtime** ReDoS guards (`evaluator.ts:59-66`: >100 char reject, nested-quantifier reject, backreference reject, 4096-char input bound) | A rule that slipped the compile-time check (e.g. old bundle, future schema change) hangs the trigger worker | MED | S | `evaluator.test.ts` |
| OpenAI error variety beyond 503: **429**, fetch **timeout/throw**, **non-JSON content** body, **empty `choices`** | A new error shape leaks compile context to the user or 500s the form instead of "Compiler offline" | MED | S | `routes-compose.test.ts` |
| BYOK **key priority**: sub-scope `subredditOpenaiApiKey` must beat global `openaiApiKey` in the `Authorization` header (`index.ts:787-789`) | A change that reverses precedence bills the wrong account / leaks the dev key | MED | S | `routes-compose.test.ts` (assert `fakeFetch` call's header) |
| Undo **already-manually-re-removed / re-approved** item (`post.approve()` on a non-removed post) | Undo reports success on a no-op, or surfaces a confusing raw error | LOW | S | `routes-undo.test.ts` |
| Undo of a **`flair`/`modqueue`/`report`** audit entry (the `else → not reversible` branch in `rollbackAction`, `executor.ts:201`) — only `report` is tested via execute path; `flair` rollback (`prevFlair`) is captured but never *applied* anywhere | A claimed-reversible action that isn't; or a flair rollback path that's dead code | LOW | S | `executor.test.ts` |
| `onAppUpgrade` **migration** — currently a bare `return {status:'ok'}` stub (`index.ts:584`) despite the file header listing "onAppUpgrade migration" | Schema bumps with no migration → `RuleBundle.parse` fails on old bundles → triggers dead (see CRIT row above) | MED | M | source first, then `routes-triggers.test.ts` |
| `validatePredicateRegexes` recursion over **nested `all`/`any`/`not`** trees (`index.ts:103-112`) — the compose test only puts the bad regex at the top level | A dangerous regex nested two levels deep compiles through | LOW | S | `routes-compose.test.ts` |
| Rule-cap (50) and tree-depth (>6) rejection at compose time (`index.ts:256,300`) | LLM-generated 51st rule or a 7-deep tree slips through | LOW | S | `routes-compose.test.ts` |
| `isCallerModerator` **cache** behavior: stale modlist served from `${sub}:modlist` after a demod; cache TTL (`index.ts:53-63`) | A demodded user retains access for up to 5 min — acceptable, but uncovered; a cache-key bug could serve another sub's list | LOW | S | `routes-compose.test.ts` |
| Testkit fidelity: `watch→multi→exec` runs **eagerly, not buffered** (`devvit-testkit.ts:102-111`) — TOCTOU/atomicity bugs invisible | A regression in the SET-NX-like emulation (`executor.ts:224`) passes the hand-rolled suite | MED | — | rely on `@devvit/test` for atomicity (already does, `executor.devvit.test.ts:68`); expand its coverage to the breaker + dedupe + quota |

## 3. Prioritized list of tests to add

1. **Dry-run = zero side effects.** In every `scheduler/dry-run-replay` case, assert `fakeReddit.report`, `setPostFlair`, `banUser`, `muteUser` were not called, and `${sub}:audit` is empty afterward. (S)
2. **Corrupt-bundle resilience.** Seed `${sub}:rules:active` = `"{not json"` and `= '{"rules":[{"bad":1}]}'`; expect `on-post-submit` returns `{status:'ok'}` and takes no action (requires a source try/catch around `RuleBundle.parse`). Same for the dashboard. (M, source+test)
3. **Circuit-breaker boundary + clear.** Exactly `maxPerHour` entries → breaker not opened; `maxPerHour+1` → opened. If `@devvit/test` exposes TTL, assert the executor stops returning `rate_limited` after the 600 s window; otherwise add a clock seam. (S/M)
4. **Quota midnight reset.** `vi.setSystemTime` on day N at 23:59 → compile → counter `=1`; advance to day N+1 00:01 → menu shows `0/50` and compile succeeds past a stale `=50` on day N's key. (M)
5. **Clarification round trip.** Mock OpenAI to return a clarification, then on the second call assert the request `messages` includes a separate `{role:'user', content:'Clarification: ...'}` turn and the returned rule is stored as a draft. (S)
6. **`op:matches` runtime guards.** Direct `evaluatePredicate` tests: 120-char pattern → `false`; `'(x+)+y'` → `false`; `'(.)\\1'` → `false`; 5000-char body truncated to 4096 before `.test`. (S)
7. **OpenAI error matrix.** 429, fetch throws (timeout), content = `"not json"`, `choices: []` → all yield the "Compiler offline" toast, never a 500, never echoing compile context. (S)
8. **Comment-trigger idempotency** + **shadow-promote boundary/clock-skew** + **BYOK header priority** + **undo of an already-approved post**. (S each)
9. **Port the breaker hour-window count test into a `@devvit/test` file** so real Redis score-range semantics back the zCount substitute. (M)
10. **`onAppUpgrade` migration** — once implemented: old-schema bundle in Redis → upgrade trigger → bundle re-parses clean. (M)

## 4. Do NOW vs LATER

**Do NOW (before any further demo / publish):**
- #1 Dry-run zero-side-effects assertions — cheapest, highest-stakes.
- #2 Corrupt-bundle try/catch in triggers + dashboard + tests — a single bad write currently bricks moderation.
- #3 Circuit-breaker threshold boundary (the `> ` vs `>=` line) — the prior audit already burned us on this exact function.
- #5 Clarification round trip — the FIND-11 prompt-injection fix has no behavioral test.

**LATER (hardening, schedule alongside the next feature):**
- #4 Quota midnight reset, #7 OpenAI error matrix, #6 `op:matches` runtime guards.
- #9 Move TTL/atomicity-sensitive tests onto `@devvit/test`; deprecate the hand-rolled kit for those cases. **Worth expanding `@devvit/test` adoption** — its real-ish transactions and (likely) TTL support close the two biggest fidelity holes; keep the hand-rolled kit for fast route smoke tests.
- #8 boundary/clock-skew/comment-idempotency/undo-edge cases.
- #10 `onAppUpgrade` migration — only after the migration is actually built; until then, flag the stub as a known gap.

---

### Notes on test *quality* (assessed)
- **Route tests assert behavior, not just status codes** — they check Redis writes, mock-call arguments, and toast text (`routes-compose.test.ts`, `routes-undo.test.ts`, `routes-dashboard.test.ts`). Good.
- **Hand-rolled testkit faithfulness:** `zAdd` correctly updates score (no dup member); `zRange` by-score honors bounds; but `expire` is a no-op and transactions execute eagerly — so TTL and atomicity bugs are invisible. The official `@devvit/test` harness (used in `executor.devvit.test.ts`) fixes both for the cases it covers; expand it.
- **Acceptance gate** (`scripts/acceptance.ts`) is static config↔code consistency + the vitest run — useful as a CI smoke gate, but it does not add behavioral coverage; don't mistake "4/4 gates" for "well-tested."
