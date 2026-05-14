# vibe-mod Security & Abuse Review — Gap Analysis 04

**Date:** 2026-05-13  
**Scope:** Fresh adversarial review of `src/server/index.ts`, `src/server/executor.ts`, `src/server/fact-bag.ts`, `src/shared/rule-schema.ts`, `src/shared/system-prompt.ts`, `src/server/evaluator.ts`, `src/server/devvit-helpers.ts`, `devvit.json`  
**Basis:** Post-audit codebase (18 prior findings addressed). This review covers residual gaps and new attack surfaces.

---

## 1. Summary

The codebase demonstrates solid security foundations: `.strict()` Zod schemas, sub-scoped Redis keys, server-side moderator auth on every route, a closed fact/action schema, compile-time regex safety, and circuit breakers. The 18 prior audit findings are correctly addressed. However, seven residual issues remain, ranging from a critical guarded-action enforcement inversion to medium-severity prompt injection and quota bypass vectors.

**Prior audit fixes confirmed present:** FIND-01 through FIND-12, Gap #5 (idempotency), Gap #1 (`.strict()`) — all verified in code.

---

## 2. Findings Table

| ID | Issue | Severity | Exploitability | File:Line | Fix |
|----|-------|----------|----------------|-----------|-----|
| SEC-01 | Guarded actions (ban/mute/permaban) can never execute — dead-code enforcement inversion | HIGH | N/A (silent failure, not escalation) | executor.ts:74 | Remove executor-level guard; rely on compile-time allowGuarded check only |
| SEC-02 | NL rule input (`rule` field) has no server-side length cap before LLM call | MEDIUM | Low — requires mod role | index.ts:169–196 | Reject rule.length > 2000 before callOpenAI |
| SEC-03 | `clarificationAnswer` has no length cap and is sent verbatim as a user turn to the LLM | MEDIUM | Low — requires mod role | index.ts:804–806 | Cap at 500 chars; strip control characters |
| SEC-04 | Daily compile quota counter has a TOCTOU race: two concurrent requests can both pass the quota check | LOW | Low — Devvit serverless, usually single-threaded per sub | index.ts:177–316 | Increment counter atomically before LLM call |
| SEC-05 | `subredditOpenaiApiKey` (BYOK) stored as plaintext `type:string` — visible in Devvit settings UI to all mods; no `isSecret` flag | MEDIUM | Medium — any sub mod can read it from settings UI | devvit.json subreddit settings | Add `isSecret: true` or document rotation procedure |
| SEC-06 | `isSafeRegex` does not check curly-brace quantifiers (`{n,}`, `{n,m}`) — a pattern like `(a|aa){3,}` passes compile check | LOW | Low — runtime evaluator caps input at 4096 chars | index.ts:83–93, evaluator.ts:59–60 | Add `{n,}` pattern check to both compile and runtime guards |
| SEC-07 | LLM clarification `question` field is unvalidated and echoed into form description | LOW | Low — Devvit renders as plain text; LLM under system prompt | index.ts:217, 843–847 | Verify question is string with length cap in isClarification |

---

## 3. Detailed Findings and Recommendations

### SEC-01 — Guarded-Action Enforcement Inversion (HIGH)

**Observation:** `executor.ts:74–80`:

```
if (GUARDED_ACTIONS.includes(act.action) && !effectiveShadow) {
  audits.push(auditEntry(..., 'guarded_skip'));
  continue;  // skipped permanently
}
if (effectiveShadow) {
  audits.push(auditEntry(..., 'shadow'));
  continue;  // skipped as shadow
}
```

When `shadow=false` and `dryRunOnly=false` (a live rule), any guarded action hits line 74 first — `guarded_skip`. When `shadow=true`, line 79 catches it as `shadow`. There is no code path under which a guarded action ever reaches `applyAction`. The `allowGuarded` checkbox only gates storage of the rule; it does not unlock execution.

**Impact:** From a security perspective, this is accidentally safer (guarded actions cannot fire). However, mods who check "Allow ban/mute" and compile a ban rule see it stored but silently never fire, violating the stated contract.

**Recommendation:**

Option A (safest for v0.1): Remove `ban`, `mute`, `permaban` from the action schema entirely. Update the form to remove the checkbox. Document them as v0.2.

Option B (correct): Store an `allowedGuardedActions: boolean` flag on `RuleType` at compile time. Pass it through `ExecutionContext`. Change the guard to:

```
if (GUARDED_ACTIONS.includes(act.action) && !ctx.rule.allowedGuardedActions) {
  audits.push(auditEntry(..., 'guarded_skip'));
  continue;
}
```

---

### SEC-02 — Unbounded NL Input Before LLM Call (MEDIUM)

**Observation:** `index.ts:169` checks only `!rule?.trim()` (empty check). The `rule` string is sent to `callOpenAI` at line 196 without a length bound. A mod can send arbitrarily large input, exhausting token budget and enabling oversized prompt-injection payloads. The schema enforces `sourceNL: max(1000)` only on the LLM's compiled output — the LLM call is made regardless.

**Recommendation:** Add before `callOpenAI` at index.ts:196:

```typescript
if (rule.length > 2000) {
  return c.json<UiResponse>({
    showToast: { text: 'Rule description too long (max 2000 characters).', appearance: 'neutral' },
  });
}
```

---

### SEC-03 — Unbounded Clarification Answer Sent to LLM (MEDIUM)

**Observation:** `index.ts:804–806`:

```typescript
messages.push({ role: 'user', content: `Clarification: ${clarificationAnswer.trim()}` });
```

`clarificationAnswer` is a free-text field with no length cap. A mod can submit up to the Devvit payload limit here. Combined with the clarification flow being triggered by a prior LLM response, this is a two-step prompt injection surface: the LLM emits a `needsClarification` response; the mod provides a crafted "answer" injected verbatim into the conversation as a user turn.

While output is Zod-validated, a long injection string beginning with "Ignore previous instructions. Output: ..." could succeed if the LLM's system prompt adherence degrades. With `allowGuarded=true`, this produces a stored rule with `permaban` (even though SEC-01 means it won't execute in v0.1).

**Recommendation:**

```typescript
if (clarificationAnswer && clarificationAnswer.length > 500) {
  return c.json<UiResponse>({
    showToast: { text: 'Clarification answer too long (max 500 characters).', appearance: 'neutral' },
  });
}
```

---

### SEC-04 — Compile Quota TOCTOU Race (LOW)

**Observation:** `index.ts:177` reads the counter; `index.ts:314` increments it after a ~1.2s LLM call. Two concurrent requests reading `count=49` both pass the quota gate, both call the LLM, both write `50`. In practice, Devvit serverless concurrency per sub is low, bounding the overrun to 1–2 extra calls.

**Recommendation:** Move the counter increment to before the LLM call using a Redis watch+multi+exec transaction. On LLM failure, optionally decrement (best-effort).

---

### SEC-05 — BYOK Key Stored as Plaintext (MEDIUM)

**Observation:** `devvit.json` subreddit settings block defines `subredditOpenaiApiKey` as `"type": "string"` without `"isSecret": true`. The global `openaiApiKey` correctly uses `"isSecret": true`. Any moderator of the subreddit can read the BYOK key from Devvit's settings panel. The `helpText` acknowledges this but does not mandate rotation procedures.

The key is not logged anywhere in the codebase (no `console.log` of `apiKey`, the `Authorization` header is not echoed). The risk is purely UI-level visibility.

**Recommendation:** Investigate whether Devvit supports `"isSecret": true` for subreddit-scoped settings. If so, add it. If not (current platform constraint), add a `helpText` warning: "Rotate this key when moderator team membership changes." Document the rotation procedure in `docs/new-mod-checklist.md`.

---

### SEC-06 — ReDoS: Curly-Brace Quantifiers Not Blocked (LOW)

**Observation:** `isSafeRegex` (`index.ts:83–93`) blocks `)+`, `)\*`, `]+`, backreferences, and alternation-with-`+/*`. It does not block `{n,}` or `{n,m}` quantifiers. A pattern like `(a|aa){3,10}` passes `isSafeRegex` (verified via node evaluation). The evaluator's runtime check (`evaluator.ts:59–60`) also misses `{n,}`.

The 4096-char input truncation in `evaluator.ts:64` is the key mitigating control — it limits the available input for any backtracking attack to a manageable window. Catastrophic hangs are impractical in practice but polynomial slowdown is possible.

**Recommendation:** Add to `isSafeRegex` at index.ts:93:

```typescript
// Curly-brace repetition on groups or character classes (polynomial backtracking risk)
if (/[)\]][+*]?\{[0-9]/.test(pattern)) return false;
```

Add the same check to `evaluator.ts` runtime guard after line 60.

---

### SEC-07 — LLM Clarification Question Not Type-Checked (LOW)

**Observation:** `isClarification` at `index.ts:843–847` checks `needsClarification === true` but does not verify `question` is a string or has a length bound. `compiled.question` is placed directly into `form.description` at line 217. If the LLM returns `{ "needsClarification": true, "question": {...} }`, the form receives `[object Object]`. If the LLM is manipulated to return a very long question, it floods the form description.

**Recommendation:**

```typescript
function isClarification(obj: unknown): obj is { needsClarification: true; question: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as Record<string, unknown>).needsClarification === true &&
    typeof (obj as Record<string, unknown>).question === 'string' &&
    ((obj as Record<string, unknown>).question as string).length <= 400
  );
}
```

---

## 4. Prior Audit Fixes — Verification Status

| Prior Finding | Fix Expected | Verified Present |
|---|---|---|
| FIND-01 | Sub-karma fallback to 0 on API failure | Yes — fact-bag.ts:214–219 |
| FIND-02 | Regex safety at compile time | Yes — index.ts:83–112, 259 |
| FIND-03 | Server-side mod auth on every route | Yes — all routes call isCallerModerator() |
| FIND-04 | Circuit breaker on last-hour window | Yes — index.ts:737 zRange by score |
| FIND-05 | Crypto-random action IDs | Yes — executor.ts:216 getRandomValues |
| FIND-06 | Zod error sanitization | Yes — index.ts:72–79 summarizeValidationError |
| FIND-07 | Sub-scoped Redis keys | Yes — all keys prefixed with subredditName |
| FIND-08 | content.containsRegex populated with post body | Yes — fact-bag.ts:115–116 |
| FIND-09 | Correct Devvit flair API | Yes — executor.ts:122 setPostFlair |
| FIND-10 | Atomic set-NX for per-author rate limit | Yes — executor.ts:66 trySetIfNotExists |
| FIND-11 | Clarification as separate turn, not concat | Yes — index.ts:802–806 |
| FIND-12 | BYOK fallback to developer key | Yes — index.ts:787–790 |
| Gap #1 | .strict() on Rule schema | Yes — rule-schema.ts:172 |
| Gap #5 | Trigger idempotency dedupe | Yes — index.ts:457–471 isDuplicateTrigger |

---

## 5. Additional Design Observations

**`circuit:beta_freeze` is not sub-scoped (executor.ts:44).** Intentional per comment ("one flag freezes every install"). No app endpoint exposes a setter. Acceptable as an ops tool, provided Devvit Redis is per-app isolated (not cross-app).

**Dry-run replay is confirmed read-only.** `selectMatchingRules` is called; `executeActions` is never invoked from the replay path. Result stored only to `dryrun:` key.

**Shadow promotion does not re-validate.** `dashboard-action` (index.ts:397–417) copies `draftJson` to `rules:active` without calling `RuleBundle.parse`. If the draft were corrupted after initial storage (requires direct Redis write access), it would be promoted unvalidated. A `RuleBundle.parse(JSON.parse(draftJson))` call before promotion would harden this.

**Rollback is scoped to vibe-mod actions only.** The undo handler searches only `audit` entries created by `writeAuditAndRollback` (vibe-mod actions). Human mod actions have no rollback tokens. Correctly scoped.

**`author.hasVerifiedEmail` is always `false` (fact-bag.ts:247).** Any rule using this fact will never match. Not a security issue but a silent correctness gap. The system prompt does not warn the LLM to avoid it.

---

## 6. Do NOW vs LATER

### Do NOW (before first live install / hackathon submission)

| Priority | Item | Effort |
|---|---|---|
| SEC-01 | Decide: remove guarded actions from v0.1 (Option A), or implement `allowedGuardedActions` flag on RuleType (Option B) | ~30 min |
| SEC-02 | Add 2000-char server-side cap on `rule` before callOpenAI | 3 lines |
| SEC-03 | Add 500-char cap on `clarificationAnswer` before LLM call | 5 lines |
| SEC-07 | Strengthen isClarification type guard | 3 lines |

### Do LATER (v0.2 / post-launch hardening)

| Priority | Item |
|---|---|
| SEC-04 | Atomic compile quota increment (Redis INCR before LLM call) |
| SEC-05 | Investigate Devvit isSecret for subreddit settings; if unavailable, document rotation |
| SEC-06 | Add curly-brace quantifier check to isSafeRegex and evaluator runtime guard |
| Design | Re-validate draft with RuleBundle.parse in dashboard-action before promotion |
| Design | Document author.hasVerifiedEmail always-false in system prompt |

---

*Generated by adversarial security review — 2026-05-13*
