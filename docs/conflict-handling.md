# Multi-rule conflict handling

> Honest status of what vibe-mod does when two rules disagree about the same item. Read this alongside the code: [`src/server/conflict.ts`](../src/server/conflict.ts) (detector), [`src/server/conflict.test.ts`](../src/server/conflict.test.ts) (tests), [`src/server/routes/triggers.ts`](../src/server/routes/triggers.ts) (runtime), [`src/server/routes/dashboard.ts`](../src/server/routes/dashboard.ts) (preview surface).

## TL;DR (what is and isn't implemented)

| Capability | Status |
|---|---|
| Read-only **conflict preview** (detect + surface potential conflicts) | ✅ **Implemented** in repo HEAD: pure detector + 11 unit tests + a read-only dashboard warning |
| Runtime that applies multiple matching rules | ✅ Implemented (all matching rules execute in order) |
| **Blocking** live-promotion on conflict | ❌ **Not implemented** (documented design below) |
| **Predicate-overlap** analysis (do two rules actually match the same post?) | ❌ **Not implemented** — the detector is trigger+action heuristic only |
| Conflict surface in the **compose** flow (not just the dashboard) | ❌ Not implemented (dashboard only) |
| Any of the above in the **v0.0.49 App Directory build** | ❌ **No** — the preview is repo-HEAD-only code, *after* the listed build |

This file does not claim more than the table. The preview is real and tested; arbitration/blocking is honestly deferred.

## Current runtime behaviour (today, all builds)

When a post/comment trigger fires, `routes/triggers.ts` does:

```ts
const matching = selectMatchingRules(bundle.rules, trigger, facts);
for (const rule of matching) {
  await executeActions({ rule, ... });   // every match runs, in array order
}
```

There is **no arbitration**. If two active rules both match the same item:

- **Different action types** (e.g. one `flair`, one `modqueue`) → **both** are applied.
- **Same field, different values** (e.g. two `flair` actions with different text) → **last write wins** silently — whichever rule is later in the bundle array.
- **Opposing dispositions** (e.g. one `approve`, one `remove`) → **both API calls are attempted in order**; the net effect depends on Reddit's handling and ordering, and is not something the moderator was warned about.

This is bounded by the existing safety nets — every such action is shadow-logged for 24h first, is reversible for 30 days, and is capped by the per-hour circuit breaker — so a conflict is *recoverable*, but until now it was **invisible** before promotion. That gap is what the preview closes.

## What the conflict preview catches (repo HEAD)

`detectRuleConflicts(rules)` is a **pure function** (zero I/O, not on the runtime path). Over the enabled, id-deduplicated rule set it reports pairs that **could** collide:

1. **`disposition`** — one rule has `approve` and the other has a suppress/route action (`remove` / `ban` / `mute` / `permaban` / `modqueue`) on a **shared trigger**. (`lock` is excluded — locking comments is not the opposite of approving a post.)
2. **`flair`** — two rules both set `flair` with **different** text on a shared trigger (the silent last-write-wins case above).

Results are surfaced read-only in the **"vibe-mod: View rules + log"** dashboard as `⚠ N potential rule conflict(s)` with a one-line description per pair, computed over **active + draft** rules so a draft that would clash once promoted is visible early.

### Deliberate limitations (why "potential", not "will")

- **No predicate overlap.** The detector flags rules that *share a trigger*, not rules proven to match the *same* post. Two rules can share `onPostSubmit` yet have disjoint `when` predicates and never co-fire. Reporting these as *potential* is the conservative choice (false positives over false negatives); precise overlap is a predicate-satisfiability problem (see future work).
- **Pairwise only.** Three-way interactions are reported as their constituent pairs, not as a single N-way conflict.
- **Action-class heuristic.** It does not model every semantic interaction (e.g. `lock` + `remove`, or two `modqueue` notes) — only the two highest-signal contradiction classes.
- **Non-blocking.** It informs; it does not stop activation. A moderator can still promote a conflicting rule.

## Designed (not implemented) — full conflict handling

If/when this is taken further, the intended design:

1. **Promotion gate.** In the Manage-rules "Activate" path, run `detectRuleConflicts(active ∪ {candidate})`. If the candidate introduces a `disposition` conflict, require an explicit "activate anyway" confirmation (mirrors the guarded-action checkbox pattern) rather than silently promoting.
2. **Predicate-overlap refinement.** Narrow "potential" → "actual" by checking whether two predicate trees can be simultaneously satisfiable (interval analysis on numeric facts, set intersection on `in`/`eq`, etc.), so disjoint rules stop being reported.
3. **Compose-time preview.** Surface the conflict in the dry-run preview panel at compose time, not only in the dashboard, so the clash is visible at authoring time.
4. **Deterministic arbitration (optional).** A documented precedence (e.g. most-restrictive-wins, or explicit rule priority) so runtime stops being array-order-dependent — only worth doing once mods ask for it; today the safer answer is to *warn* and let the human decide.

## Why this is the right scope for now

The published build (v0.0.49) already bounds the blast radius of any conflict with shadow mode + 30-day rollback + circuit breaker. The missing piece was *visibility*, not *recoverability*. A read-only, well-tested preview adds the visibility with zero risk to the deterministic runtime path; arbitration and predicate-SAT are larger changes that should not be rushed into a published moderation tool near a deadline. Hence: preview shipped in repo HEAD, blocking/overlap honestly deferred.
