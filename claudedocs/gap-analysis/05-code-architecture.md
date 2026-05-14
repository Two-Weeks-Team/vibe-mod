# 05 — Code Quality & Architecture Review

_Scope: `src/server/{index,evaluator,fact-bag,executor,devvit-helpers}.ts`, `src/shared/{rule-schema,system-prompt,starter-rules}.ts`. Read-only review. Cited as `file:line`._

## 1. Summary

The codebase is unusually disciplined for a hackathon entry: a closed action whitelist enforced in code (`rule-schema.ts:20-22`), a `.strict()` Zod boundary on every LLM-sourced object (`rule-schema.ts:153-187`), a pure deterministic evaluator with zero LLM calls (`evaluator.ts`), sub-scoped Redis keys, and a reasonable shadow/dry-run/rollback safety stack. Most of the audit "FIND-xx" fixes referenced in comments are real and present.

However there are **several genuine correctness bugs**, not just debt:

- The "atomic" idempotency dedupe and per-author rate-limit both use a WATCH→GET→MULTI→EXEC pattern but **never check `exec()`'s return value**, so a true concurrent race still double-executes (`index.ts:457-472`, `executor.ts:224-236`).
- The 24h shadow window is measured from **rule compile time, not activation time** (`index.ts:719`), so a rule that sat in the draft for >24h promotes to live the instant it's activated — defeating the headline "24h shadow mode" safety claim.
- `onPostReport` / `onCommentReport` triggers are wired in `devvit.json`, the schema, the evaluator, and even the dry-run code path — but the actual HTTP handlers are **empty no-ops** (`index.ts:589-597`). Report-driven rules silently never fire.
- `getCurrentSubredditName()` falls back to the literal string `'unknown'` (`devvit-helpers.ts:23`); if `context.subredditName` is ever empty, **every install collapses onto shared `unknown:*` keys** — a cross-subreddit data-leak and a corrupted-state vector.
- Activating a draft never clears it and never resets `createdAt` (`index.ts:410`, `index.ts:296-298`), so re-activation re-copies stale rules and confuses the shadow timer.

Architecturally: the `shared/` ↔ `server/` boundary is clean (schema + prompt + seeds in shared, all I/O in server). `devvit-helpers.ts` is a thin, fair abstraction but leaks `as` casts. The evaluator's `switch` is small and fine to leave as-is; the **fact-bag's two near-identical builders** (`buildPostFactBag` / `buildCommentFactBag`) are the real duplication smell. The "closed `FactPaths`" design is intentional and good for safety, but every new fact requires touching 4 files (schema, both builders, system prompt) with no compiler enforcement that they stay in sync.

## 2. Findings

| # | Issue | Type | Sev | Effort | File:line |
|---|-------|------|-----|--------|-----------|
| 1 | WATCH/MULTI idempotency dedupe ignores `exec()` result → concurrent triggers still double-execute the rule | bug | HIGH | S | `index.ts:457-472` |
| 2 | Per-author rate-limit `trySetIfNotExists` has the same ignored-`exec()` race → rate limit bypassable under concurrency | bug | HIGH | S | `executor.ts:224-236` |
| 3 | Shadow-mode window measured from `rule.createdAt` (compile time), not activation time → rule activated >24h after compile goes live immediately | bug | HIGH | S | `index.ts:704-726`, `index.ts:719` |
| 4 | `onPostReport` / `onCommentReport` trigger handlers are empty no-ops despite full schema/evaluator/dry-run support | bug (dead capability) | HIGH | M | `index.ts:589-597` |
| 5 | `getCurrentSubredditName()` returns `'unknown'` fallback → all installs share `unknown:*` keys if context missing (data leak / state corruption) | risk | HIGH | S | `devvit-helpers.ts:22-24` |
| 6 | Activating draft → active does a raw copy: draft is never cleared, `createdAt` never reset; re-activation re-copies; combined with #3 the shadow timer is wrong | bug | MED | S | `index.ts:397-417`, `index.ts:410` |
| 7 | Dashboard reads `rules:active` / `rules:draft` with bare `JSON.parse`, not `RuleBundle.parse` — inconsistent with the trigger handlers; trusts possibly-corrupt Redis | debt / risk | MED | S | `index.ts:346-347`, `index.ts:362` |
| 8 | `set` then separate `expire` everywhere (mod-list cache, dedupe, rate-limit, counter, rollback, dryrun) is non-atomic — crash between leaves a key with no TTL forever | risk | MED | M | `index.ts:61-62`, `index.ts:315-316`, `index.ts:468-470`, `executor.ts:232-234`, `executor.ts:287-288`, `fact-bag.ts:234-235`, `fact-bag.ts:251-252` |
| 9 | `audit:${actionId}` hashes have no TTL — only the daily `audit-retention` cron deletes them; if the cron fails, unbounded growth (rollback string keys do auto-expire, hashes don't) | debt | MED | S | `executor.ts:274-284`, `index.ts:602-616` |
| 10 | `flair` rollback path captures `prevFlair` (`executor.ts:121`) but `rollbackAction` has no `flair` branch → returns "not reversible"; `prevFlair` is dead code | debt / bug | MED | M | `executor.ts:121-128`, `executor.ts:186-203` |
| 11 | `flair` on a comment silently returns `{reverseable:false}` and the audit still records `outcome:'applied'` for a no-op | bug | LOW | S | `executor.ts:116` |
| 12 | `sourceNL` is taken verbatim from the LLM output, never checked against the moderator's actual input string; rendered in the Dashboard ("Recent actions" line) — a prompt-injection-into-mod-UI surface | risk | LOW | M | `index.ts:255-256`, `index.ts:380`, `system-prompt.ts:20` |
| 13 | `isSafeRegex` rejects patterns >80 chars at compile (`index.ts:84`) but the evaluator runtime guard allows up to 100 (`evaluator.ts:59`) — inconsistent bounds; also two near-duplicate regex-safety implementations to keep in sync | debt | LOW | M | `index.ts:81-93`, `evaluator.ts:50-68` |
| 14 | `callOpenAI` → `JSON.parse(content)` (`index.ts:837`) can throw and is caught by the generic `catch` in the submit handler, surfacing "Compiler offline. Your draft is saved" — but no draft was saved; misleading message | debt | LOW | S | `index.ts:200-208`, `index.ts:835-840` |
| 15 | `reports.distinctReporters` is just `reportsCount` (`fact-bag.ts:127`, `:163`) — a fact the schema/prompt advertise as distinct but is an approximation; rules using it are subtly wrong | debt | LOW | S | `fact-bag.ts:126-127`, `fact-bag.ts:162-163` |
| 16 | `buildPostFactBag(p, reportsCount=0)`: the `onPostSubmit` trigger never passes reports (always 0), only the dry-run path does — inconsistent fact population between live and preview | debt | LOW | S | `index.ts:482-492`, `index.ts:672-682` |
| 17 | Type-safety holes: `as` casts on `validated.when` (`index.ts:256,259`), `r.when as PredicateTree` (`evaluator.ts:87`), `act.params as {...}` (`executor.ts:124-126`), `(target as {removed?:boolean})` (`executor.ts:143`), `context.subredditId as T5` (`devvit-helpers.ts:28`); `asT1`/`asT3` are unchecked casts presented as "narrowing" | debt | LOW | M | multiple |
| 18 | `PredicateTreeSchema` (Zod `z.lazy`) imposes no depth limit; `checkTreeDepth` runs only *after* a successful parse, so a pathologically nested LLM/BYOK payload recurses through Zod first | risk | LOW | S | `rule-schema.ts:85-102`, `:190-195` |
| 19 | `dashboard-action`: if `activate` is false it returns `{showToast: 'No action taken.'}` (string form) while elsewhere toasts are objects — inconsistent `UiResponse` shape usage (works, but sloppy) | debt | LOW | S | `index.ts:403,408` |
| 20 | `summarizeValidationError` does substring matching on `String(err)` (`index.ts:75-78`) — brittle; a Zod error mentioning a field literally named "action" anywhere mis-classifies; relies on never echoing, which is correct, but the heuristic itself is fragile | debt | LOW | S | `index.ts:72-79` |
| 21 | `evaluator.ts` `'matches'` uses `new RegExp(v, 'iu')` — the `u` flag makes some otherwise-valid patterns throw (caught → silent `false`); rules silently never match instead of erroring at compile | debt | LOW | S | `evaluator.ts:63` |
| 22 | Two ways to derive subreddit identity (`getCurrentSubredditName` vs `getCurrentSubredditRef`) both re-reading `context`; the circuit breaker uses `Ref`, everything else uses `Name` — minor inconsistency, easy to drift | debt | LOW | S | `devvit-helpers.ts:21-29`, `index.ts:730` |
| 23 | `on-app-upgrade` handler is a pure no-op — fine today, but there is no schema-migration hook, so a future `schemaVersion` bump has nowhere to live (the parser will hard-reject old bundles) | debt | LOW | M | `index.ts:584-587`, `rule-schema.ts:179` |

## 3. Concrete fixes / refactors (prioritized)

### A. The four real bugs — fix before any demo

1. **Check `exec()` for the optimistic-lock pattern** (#1, #2). `redis.watch` + ignored `exec()` is not atomicity — it's a no-op. Either:
   - use a real `SET key value NX EX ttl` if the Devvit Redis client exposes options on `set` (it does in recent versions: `redis.set(key, val, { nx: true, expiration: ... })`), **or**
   - keep WATCH/MULTI but inspect the return of `exec()` (`null` ⇒ aborted ⇒ treat as "lost the race" ⇒ for dedupe: treat as duplicate, bail; for rate-limit: treat as limited, bail). Without this, both `isDuplicateTrigger` and `trySetIfNotExists` are decorative.

2. **Shadow window from activation time, not compile time** (#3, #6). When `dashboard-action` promotes draft→active, stamp each rule with `activatedAt = Date.now()` (new optional field) and have `shadow-promote-check` compare against `activatedAt ?? createdAt`. Also clear `rules:draft` after a successful activate (or merge-and-clear), so re-activation doesn't re-copy stale rules.

3. **Implement (or explicitly remove) the report triggers** (#4). Either wire `on-post-report` / `on-comment-report` the same way as submit (build a fact bag with `reports.count`, `selectMatchingRules(..., 'onPostReport', ...)`, `executeActions`), or delete `onPostReport`/`onCommentReport` from `RuleTrigger`, the system prompt, and the dry-run branch. Right now the surface lies about what fires.

4. **Harden `getCurrentSubredditName()`** (#5). Don't silently fall back to `'unknown'`. Throw, or return `null` and have callers no-op the trigger / refuse the menu action. A shared `unknown:*` namespace across installs is the worst-case Redis-key bug.

### B. Robustness / consistency

5. Route all `rules:active` / `rules:draft` reads through `RuleBundle.parse(...)` (#7) — the trigger handlers already do; the Dashboard and `dashboard-action` should too. One helper: `loadBundle(key): Promise<RuleBundleType | null>`.
6. Replace every `set` + `expire` pair with a single atomic write (#8) — the Devvit Redis `set` accepts an `expiration` option; use it. This also kills the "key with no TTL forever" failure mode behind #9.
7. Give `audit:${id}` hashes a TTL at write time (`ROLLBACK_TTL_SECONDS`, 30d) so retention is enforced even if the cron never runs (#9). Keep the cron as a backstop for the ZSET.
8. Implement `flair` rollback using the captured `prevFlair`, or stop capturing it (#10). Don't record `outcome:'applied'` for the comment-flair no-op (#11) — use `'error'` or a new `'noop'`.
9. Validate `sourceNL` server-side: overwrite it with the moderator's actual `rule` string instead of trusting the LLM (#12). It's already passed into `callOpenAI`; just `validated.sourceNL = rule.trim()` after parse. Free, removes an injection surface.
10. Unify the regex-safety check (#13): one `isSafeRegex(pattern)` in `shared/`, called both at compile and at eval, one length bound.

### C. Architecture

11. **Collapse the two fact-bag builders** into one `buildFactBag(input: PostOrCommentInput)` with a discriminant; the only real differences are `content.isLinkPost`, the title facts, `content.url*`, and the `(p.url image)` bump. ~60% of the two functions is identical. This is the highest-value refactor for "painful to extend".
12. **Keep the evaluator's `switch`** — a data-driven operator table (`OPS: Record<string, (a,b)=>boolean>`) is marginally cleaner but the `switch` is 9 cases and well-tested; not worth the churn. Do extract the `matches` runtime guard into the shared regex helper (see #10) so it isn't a third copy.
13. **Add a compile-time link** between `FactPaths` and the fact bag: `type FactBag = Record<FactPath, ...>` already exists (`rule-schema.ts:200`) — good — but the *builders* return object literals that TS will happily under- or over-populate without error if the object is widened. Annotate the return as `satisfies FactBag` (or build it as a typed `const`) so a new `FactPath` forces both builders to be updated. Cheap, prevents the worst extension footgun.
14. `devvit-helpers.ts` is fine as-is; if you want to earn the "narrowing" comment, make `asT1`/`asT3` actually assert the prefix (`if (!id.startsWith('t1_')) throw …`) instead of a bare cast — they're called on data that *should* be prefixed but isn't type-guaranteed.
15. Add an `onAppUpgrade` migration shim (#23) even if it's just `// schemaVersion 1.0.0 → no migration` today — gives future-you a place to stand.

## 4. Do NOW vs LATER

**Do NOW (correctness / safety, all small):**
- #1, #2 — check `exec()` (or switch to `SET NX EX`). Without this, idempotency and rate-limiting are theater.
- #3, #6 — shadow timer from activation time; clear draft on activate.
- #5 — kill the `'unknown'` subreddit fallback.
- #4 — either implement or delete the report triggers (decide which; don't ship the lie).
- #12 — overwrite `sourceNL` with the user's real input (one line).
- #7, #9 — validate bundles on every read; TTL the audit hashes.

**LATER (debt, refactors):**
- #8 — atomic set+expire sweep across all call sites.
- #10, #11 — flair rollback + honest no-op outcome.
- #11 fact-bag dedup into one builder; `satisfies FactBag` on the result.
- #13 — unify the regex-safety helper into `shared/`.
- #16, #15 — pass real `reports.*` into the submit fact bag; or document distinctReporters as a known approximation in the prompt.
- #17 — chip away at the `as` casts (low risk, just hygiene).
- #18 — add a depth guard inside the Zod schema, not only after.
- #23 — `onAppUpgrade` migration shim.

---
_Note: the `evaluator.ts` operator semantics, the `.strict()` schema boundary, the GUARDED-action gating in `executor.ts`, and the sub-scoped key convention are all sound — don't churn them. The work above is concentrated in the Redis read-modify-write paths, the trigger wiring, and the fact-bag duplication._
