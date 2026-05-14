# 09 — Rule-Language Expressiveness: Design Gap Analysis

Scope: the *rule language* itself — the `when` predicate tree, the `then` action
list, and the closed `FactPaths` set — judged as a design for "a mod writes
English, it compiles once into deterministic JSON, a pure-TS evaluator runs it
forever with zero further LLM calls."

Primary sources:
- Schema: `src/shared/rule-schema.ts:29-201` (FactPaths `:29-60`, ops `:66`, leaf `:68-72`, composites `:85-102`, actions `:107-141`, rule `:153-172`).
- Evaluator: `src/server/evaluator.ts:13-89` (operators `:31-71`, rule selection `:79-89`).
- Fact bag: `src/server/fact-bag.ts:84-165` (post `:84-129`, comment `:131-165`, author `:185-254`).
- Executor: `src/server/executor.ts:108-174` (action implementations).

---

## 1. Summary

The language is a clean, deliberately *finite* boolean DSL: ~22 closed facts,
9 operators, AND/OR/NOT to depth 6, ≤5 actions from a closed verb set, one
optional per-author rate limit. That finiteness is the whole product — it is
what makes "deterministic and inspectable" true, and it is what makes the LLM a
*compiler front-end* rather than a runtime dependency. The cost of that bet,
however, is that the language can only express **stateless, single-thing,
literal-comparison** rules. A large fraction of what real subreddit moderators
actually automate falls outside that box:

1. **No memory across triggers.** Every fact is computed from *this* post/comment
   + the author's account snapshot + sub context (`src/server/fact-bag.ts:84-129`).
   There is no counter, no recent-history, no "Nth occurrence" — so the entire
   class of rate/repetition rules ("3 posts in an hour", "this link posted 5×
   this week", "user's last 3 comments all removed") is unreachable. This is the
   single biggest gap, and AutoModerator/repost-bots/crowd-control all live here.

2. **No text normalization or per-rule wordlists.** `op:contains` is a raw
   case-insensitive substring (`src/server/evaluator.ts:46-49`); `op:matches` is
   a length-/shape-limited regex (`:50-68`). There is no lowercase+strip-accents+
   de-leetspeak canonicalization, no word-boundary primitive beyond hand-rolled
   `\b` regexes, and no notion of "a slur from a list the sub configures." A mod
   maintaining a 200-word banlist must do it as one giant alternation regex (or
   200 rules), and trivially defeated by `n​i​g` zero-width tricks or `n1gger`.

3. **`value` is always a literal.** A leaf is `{fact, op, value}` where `value`
   is `string|number|boolean|array` (`src/shared/rule-schema.ts:71`) — never
   another fact. So "title longer than body", "more links than words / 5", "sub
   karma exceeds account-age-hours" are all inexpressible. Cheap to fix.

4. **Actions can't speak.** The action union (`:107-141`) has report/flair/lock/
   modqueue/remove + guarded ban/mute/permaban. There is **no** `comment`,
   `modmail`, `removalreason` (a free-text removal comment), `approve`, `sticky`,
   `nsfw`, `spoiler` — and no templating, so even if you added `comment` you
   couldn't say "{{author}}, your post was removed for X, see {{permalink}}."
   For most mods the *reply* is half of AutoModerator's value.

5. **No control flow.** Rules are an unordered set evaluated independently
   (`src/server/evaluator.ts:79-89` — `filter`, no ordering, no short-circuit).
   No priorities, no first-match-wins, no "stop processing if this fires," no
   per-rule exemption block (skip mods / approved users / flaired users) as a
   first-class concept — today you bolt `not(author.isModerator)` onto every
   rule by hand, and "approved user" / "user flair" aren't even facts.

6. **The closed fact set means every new signal = code change + redeploy.**
   That's correct for safety but brutal for iteration. There is a narrow,
   *still-deterministic* escape hatch: let the mod (not the LLM) define a small
   number of named "computed facts" as bounded expressions over existing facts,
   stored in the rule bundle and evaluated by the same pure evaluator. This buys
   most of #3 + a chunk of #2 without ever putting an LLM or arbitrary code on
   the hot path.

None of these require abandoning determinism. #1 needs a *bounded, append-only
counters/history layer in Redis* whose reads are pure given the stored counts.
#2/#3/#4 are pure language additions. #5 is a pure ordering/metadata change.
#6 is a constrained mini-expression-language with the same evaluator. The
inspectability property survives all of them as long as: facts stay
enumerable, expressions stay bounded & total, and the LLM never emits anything
that isn't re-checkable by a human reading the JSON.

---

## 2. Findings Table

| # | Inexpressible rule class | Example rule a mod would want | Severity | Effort | What it needs |
|---|---|---|---|---|---|
| F1 | **Per-author rate / volume** ("N things in window") | "If this author has submitted >3 posts in the last hour, send to modqueue" | CRIT | L | **State layer**: sub-scoped Redis counter `${sub}:rate:author:${id}` w/ sliding window; new facts `author.postsLastHour`, `author.commentsLastHour`, `author.postsLast24h` |
| F2 | **Repost / URL-frequency** | "If this exact URL has been posted ≥5× in this sub this week, remove as spam" | CRIT | L | **State layer**: `${sub}:url:${hash}` rolling count; new fact `content.urlPostCount7d`; needs canonical-URL hashing (strip query/utm) |
| F3 | **Author recent-outcome history** | "If this user's last 3 comments were all removed, ban for 1 day" | HIGH | L | **State layer**: per-author bounded ring of last-K mod outcomes (written by executor `src/server/executor.ts:141-146`); new facts `author.removedLast3`, `author.lastActionWasRemove` |
| F4 | **Per-rule wordlist / list-membership** | "Remove if title contains any word from the sub's slur list" | HIGH | M | New action-independent **`wordlist` resource** on the rule bundle (`name → string[]`, ≤N words); new op `inList` whose `value` is a wordlist name; tokenized word-boundary match in evaluator (`src/server/evaluator.ts:31-71`) |
| F5 | **Normalized-text matching** (leetspeak / accents / zero-width) | "Block `n1gg3r`, `nïgger`, `n‌igger` — all variants" | HIGH | M | New facts `content.normalized`, `content.title.normalized` built in `src/server/fact-bag.ts` (NFKD → lowercase → strip combining marks + zero-width → ASCII-confusable fold → leet map); pairs with F4 |
| F6 | **Fact-to-fact comparison** | "If the title is longer than the body" / "if linkCount > wordCount/20" | MED | S | `value` becomes `literal \| { fact: FactPath }` (optionally `{ fact, mul, add }` for cheap arithmetic) in `src/shared/rule-schema.ts:71`; evaluator resolves RHS the same way it resolves LHS (`src/server/evaluator.ts:28-30`) |
| F7 | **No reply / modmail / removal-reason action** | "Remove and reply: 'Removed under Rule 3 — no low-effort posts.'" | HIGH | M | New `comment` action (`{ text, sticky?, lock? }`), `modmail` action (`{ subject, body }`), and `removalReason` flag on `remove`; all reversible via existing rollback (`src/server/executor.ts:176-212`) — comment delete, no-op modmail |
| F8 | **Action templating** | "Reply: '{{author}}, your post was removed; see {{permalink}}'" | MED | S | A tiny, fixed placeholder set (`{{author}}`, `{{permalink}}`, `{{ruleName}}`, `{{title}}`) substituted at execute time; no expressions, no loops — stays inspectable |
| F9 | **Rule priority / first-match-wins / stop** | "Whitelist rule for trusted domains runs first; if it matches, stop." | MED | S | Add `priority: number` + optional `stopOnMatch: boolean` to `Rule` (`src/shared/rule-schema.ts:153-172`); sort + short-circuit in `selectMatchingRules` (`src/server/evaluator.ts:79-89`) |
| F10 | **First-class exemptions** | "This rule never applies to mods, approved users, or users with the 'Verified' flair" | HIGH | S→M | `exempt: { mods?, approvedUsers?, contributors?, userFlair?: string[] }` block on `Rule`; needs new facts `author.isApprovedUser`, `author.flairText` (extra API call, cache like modlist `src/server/fact-bag.ts:222-240`) |
| F11 | **Time-of-day / day-of-week** | "Auto-lock new posts overnight (00:00–06:00 sub-local) when no mods are online" | LOW | S | New facts `now.hourUtc`, `now.dayOfWeek` (constants at trigger time); optional per-sub UTC offset in settings |
| F12 | **True "joined this sub" age** | "Hold posts from accounts active <7 days in *this* sub" | MED | M | `author.subJoinAgeHours` is currently a stub equal to account age (`src/server/fact-bag.ts:248`); needs a first-seen-in-sub timestamp in Redis (write on first trigger), making it part of the same state layer |
| F13 | **Crowd-control / vote-velocity / report-rate** | "If a post collects >5 reports in <10 min, lock it" | MED | L | `reports.distinctReporters` is a fake equal to count (`src/server/fact-bag.ts:127`); needs real distinct-reporter tracking + report timestamps → state layer; also `reports.rate10m` |
| F14 | **Cross-thing context** ("this comment is on a locked/removed post") | "Remove comments posted on threads that are already locked" | LOW | M | New facts `context.parentLocked`, `context.parentRemoved`, `context.parentAuthorIsOp` — one extra `getPostById` per comment trigger; pure given the fetch |
| F15 | **Account-profile signals** beyond karma/age | "Hold posts from accounts with a default-snoo avatar and no profile description" | LOW | M | New facts `author.hasDefaultAvatar`, `author.hasProfileDescription`, `author.isSuspended` — depend on Devvit API surface; some (`hasVerifiedEmail`) already documented as unavailable (`src/shared/rule-schema.ts:35`, `src/server/fact-bag.ts:247`) |
| F16 | **Extensibility without redeploy** (any novel signal) | "I want to match on a field you didn't ship" | HIGH | L | **Computed facts**: mod (not LLM) defines ≤8 named expressions over existing facts (`{name, expr}` where `expr` is the *existing* predicate-tree leaf grammar + F6 arithmetic), stored in the bundle, evaluated by the same pure evaluator. Bounds the blast radius; LLM may *reference* them but not *invent* them |

---

## 3. Proposed phased rule-language roadmap

### v0.2 — cheap, pure-language wins (no new infra, no state)

These touch only `rule-schema.ts` + `evaluator.ts` (+ a little `fact-bag.ts`).
They roughly double expressiveness for near-zero risk and zero new failure modes.

1. **F6 fact-to-fact comparison.** `value: literal | { fact, mul?, add? }`
   (`src/shared/rule-schema.ts:71`). One branch in the evaluator leaf
   (`src/server/evaluator.ts:28-30`): resolve RHS like LHS, then apply the same
   op. Determinism unchanged.
2. **F9 priority + stopOnMatch.** Two optional fields on `Rule`; sort then
   short-circuit in `selectMatchingRules` (`src/server/evaluator.ts:79-89`).
3. **F10 exemptions (mods only, to start).** `exempt: { mods?: boolean }` — the
   data is already there (`author.isModerator`); this is sugar that the LLM
   should emit by default and the form should default-check. Add
   `isApprovedUser` / `flairText` facts in the same release if the Devvit API
   is cheap (cache like the modlist, `src/server/fact-bag.ts:222-240`).
4. **F4 + F5 wordlists & normalization.** Add a `wordlists: Record<string,
   string[]>` resource to `RuleBundle` (`src/shared/rule-schema.ts:177-187`,
   capped: ≤20 lists, ≤500 words each), an `inList` op, and
   `content.normalized` / `content.title.normalized` facts in `fact-bag.ts`.
   This is the single highest-leverage v0.2 item — it kills the "200-rules-or-
   one-monster-regex" anti-pattern and hardens against obfuscation.
5. **F7 + F8 talking actions.** Add `comment`, `modmail`, and a `removalReason`
   string on `remove`; add a *fixed, tiny* placeholder set (`{{author}}`,
   `{{permalink}}`, `{{ruleName}}`, `{{title}}`) substituted at execute time in
   `src/server/executor.ts:108-174`. `comment` is reversible (delete) so it
   slots into the existing rollback machinery (`src/server/executor.ts:176-212`)
   — keep it *unguarded* (it's low-harm), keep `modmail` *guarded* (spam risk).
6. **F11 time facts.** `now.hourUtc`, `now.dayOfWeek` — constants, trivial.

Net: rules can now compare facts to each other, run in order, exempt mods,
match against curated/normalized wordlists, reply to users, and act on
time-of-day — all still 100% deterministic and inspectable.

### v0.3 — the state layer (the big one: F1, F2, F3, F12, F13)

Introduce a **bounded, append-only "signals" layer** in sub-scoped Redis,
written by the trigger handler / executor and read by `fact-bag.ts`:

- **Counters with sliding windows.** On every post/comment trigger, increment
  `${sub}:rate:author:${id}` (and `${sub}:url:${canonHash}`) into a small set of
  time buckets (e.g. 1h / 24h / 7d, each a short list of `(bucketStart, count)`
  pairs, trimmed on write — bounded size). Reads are pure: given the stored
  buckets, the fact value is a deterministic sum.
- **Per-author outcome ring.** When the executor applies `remove` (or `ban`,
  `approve`) — `src/server/executor.ts:141-174` — push the outcome onto a
  fixed-length ring `${sub}:hist:author:${id}` (last K=10). Facts:
  `author.removedLastK`, `author.lastActionWasRemove`.
- **First-seen-in-sub.** `SETNX ${sub}:firstseen:author:${id} = now` on the
  first trigger → makes `author.subJoinAgeHours` real (`src/server/fact-bag.ts:248`).
- **Real distinct reporters & report timing** → fixes the
  `reports.distinctReporters == reports.count` stub (`src/server/fact-bag.ts:127`)
  and unlocks F13.

New facts (all numeric, all bounded): `author.postsLastHour`,
`author.commentsLastHour`, `author.postsLast24h`, `content.urlPostCount7d`,
`author.removedLast10`, `author.lastActionWasRemove`, `reports.rate10m`.

**Determinism note:** the evaluator stays pure; the *state* is now part of the
inspectable surface. The dashboard should expose these counters so a mod (or an
audit) can see exactly what the rule saw. The dry-run replay path
(`isDryRun` in `src/server/executor.ts:31`) must be careful not to mutate
counters — replay reads, never writes.

### v1.0 — controlled extensibility (F16) + polish

1. **Computed facts.** `RuleBundle` gains `computedFacts: { name: string; expr:
   ComputedExpr }[]` (≤8). `ComputedExpr` is *exactly* the existing leaf
   grammar + F6 arithmetic + a couple of fixed reducers (`min`, `max`,
   `ratio(a,b)`) over existing facts — no loops, no recursion, total by
   construction. The evaluator gains a pre-pass that resolves computed facts
   into the fact bag before predicate evaluation. The LLM may *reference*
   `computed.X` but the *definition* is mod-authored and shown verbatim in the
   JSON. This is the only "extensibility" that doesn't reopen the
   redeploy-for-every-signal problem while keeping the inspectability invariant.
2. **F14 parent-context facts** for comment triggers (`context.parentLocked`,
   `context.parentRemoved`, `context.parentAuthorIsOp`).
3. **F15 / F12 finalization** as the Devvit API allows.
4. **Sub-config wordlist sharing** (import a community-maintained list by URL,
   snapshotted into the bundle at compile time so the runtime stays offline).

### Explicitly *out of scope* (would break the core property)

- LLM emitting arbitrary sandboxed expressions at runtime → re-introduces a
  trust boundary on the hot path; rejected. (Mod-authored, bounded
  computed-facts are the safe analog.)
- Calls to external services from the evaluator / executor beyond the existing
  Reddit + Redis surface.
- Unbounded history ("scan all of this author's posts ever").

---

## 4. Do NOW vs LATER

**Do NOW (v0.2 — pure language, low risk, high value):**
- **F4+F5 wordlists + text normalization** — biggest leverage, fixes the
  obfuscation hole, removes the monster-regex anti-pattern.
- **F7+F8 `comment` action + fixed templating** — "remove *and tell them why*"
  is table stakes for AutoModerator parity; reversible, fits existing rollback.
- **F6 fact-to-fact comparison** — tiny diff, removes a whole class of "can't
  express that" complaints.
- **F10 exempt-mods sugar** — should arguably ship immediately; today every rule
  hand-rolls `not(author.isModerator)` and the LLM sometimes forgets.
- **F9 priority/stopOnMatch** — small, makes whitelist-before-blacklist possible.

**Do LATER (v0.3 — needs the Redis state layer; design carefully w.r.t. dry-run
& dashboard inspectability):**
- **F1 rate/volume, F2 reposts, F3 recent-outcome history, F13 report-rate** —
  the highest *demand* gaps, but each depends on the counters/history layer and
  on getting replay-safety + audit visibility right. Worth a dedicated design
  doc before any code.
- **F12 real sub-join age** — folds into the same first-seen tracking.

**Do EVENTUALLY (v1.0):**
- **F16 mod-defined computed facts** — the principled answer to "the fact set is
  closed"; only worth it once v0.2/v0.3 are stable and you can see which
  computed shapes mods actually reach for.
- **F11 time-of-day** (could ride along in v0.2 — trivial), **F14 parent
  context**, **F15 profile signals** — nice-to-haves, API-dependent.

---

### Top 3 findings (≤150 words)

1. **No state across triggers (F1/F2/F3) — CRITICAL.** Every fact is derived
   from the single thing + an author snapshot (`src/server/fact-bag.ts:84-129`),
   so the most-demanded rule classes — "N posts in an hour", "this URL posted 5×
   this week", "user's last 3 comments were all removed" — are simply
   unreachable. Needs a bounded, sub-scoped Redis counters/history layer (v0.3).

2. **Wordlists & text normalization are missing (F4/F5) — HIGH, cheap.**
   `op:contains` is raw substring and `op:matches` is a length-limited regex
   (`src/server/evaluator.ts:46-68`); there's no per-rule banlist and no
   leetspeak/accent/zero-width folding, so banlists become monster regexes and
   are trivially evaded. Pure language addition — ship in v0.2.

3. **Actions can't speak, and `value` can't reference a fact (F7/F8/F6) — HIGH.**
   No `comment`/`modmail`/`removalReason` action and no templating
   (`src/shared/rule-schema.ts:107-141`); `value` is always a literal (`:71`),
   so "title longer than body" is inexpressible. All cheap v0.2 wins.
