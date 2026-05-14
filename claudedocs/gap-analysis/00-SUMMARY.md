# vibe-mod — gap analysis: synthesis & action plan

11 expert reviews (this folder, `01`–`11`) of vibe-mod against AutoModerator, other Devvit/Reddit mod
tools, the hackathon judging criteria, and its own security / reliability / UX / rule-language / test
posture. This file synthesizes them: what was **fixed now** (PR "v0.1.1 hardening pass"), what's
**deferred** (with priority), and the highest-leverage **non-code** work for the hackathon.

## Cross-cutting themes (what the 11 reviews agreed on)

1. **The product is engineering-complete but ~0% *demonstrable*** — no installs, no playtest run, no
   demo video / screenshots, Devpost form has `<<placeholder>>` communities. (03, 10) → the hackathon
   bottleneck is *getting it running + recorded*, not more features. Publish-review takes ~1 week, so
   `devvit publish --public` must go by **~2026-05-18 (D-9)**.
2. **The closed ~22-fact set is the capability ceiling vs AutoMod** — text wordlists/match-modifiers,
   account-level facts already fetched but not exposed, repost/cross-sub state, `comment`/`modmail`
   actions with `{{placeholders}}`. (01, 09) → v0.2 roadmap, mostly cheap; the state layer is the deep one.
3. **Several "headline" features were partly broken or invisible** — shadow logging was computed and
   discarded; the shadow window was measured from compile time not activation; report triggers were
   no-op stubs; guarded actions were dead code; idempotency/rate-limit didn't actually check the
   transaction result; a bad rule bundle 500'd every trigger. (04, 05, 06, 07, 08, 11) → most fixed now.
4. **Positioning to lead with: "the AI is a *compiler*, not a judge — it never reads a post."** Plus a
   migration path *off* AutoMod YAML (addresses the "Migrated Apps" half of the hackathon name). (02, 10)

## Fixed now — PR "v0.1.1: hardening pass from gap analysis"

| # | Fix | Source |
|---|---|---|
| 1 | Shadow / rate-limited / error outcomes now **write an audit row** (ZSet + detail hash, 30-day TTL) so the Dashboard log actually shows what rules did or *would* have done — shadow logging was previously computed and thrown away. | 05, 07, 11 |
| 2 | `acquireOnce()` (`SET key=<token> NX EX` + read-back) replaces the watch/multi/exec that never checked `exec()` — fixes the real double-execution / per-author-rate-limit-bypass race. | 05, 08 |
| 3 | Guarded actions (`ban`/`mute`/`permaban`) **execute** when a rule that opted in at compile time goes live (after 24h shadow), with the existing 30-day rollback — they were unreachable dead code. | 04 (SEC-01) |
| 4 | `activatedAt` stamped on activation; the shadow-mode window is measured from it, not from compile time — a draft sitting >24h no longer goes live the instant it's promoted. | 05 |
| 5 | `RuleBundle.parse(JSON.parse(...))` on the trigger / dashboard / scheduler paths is wrapped — a malformed or legacy bundle is treated as "no rules" (fail-SAFE), never a 500 on every post/comment. | 06, 11 |
| 6 | Audit detail hashes get a 30-day TTL on write (the daily retention cron's `zRange` page-caps at 1000 on a busy sub → leak). | 06 |
| 7 | On a Reddit-API author-lookup failure the author looks **established / high-karma** (was all-zeros), so "new account < N" / "low karma" rules fail SAFE instead of mass-firing on legit posts. | 06 |
| 8 | `clarificationAnswer` (and the original rule text) length-capped before going into the OpenAI prompt — prompt-injection-surface + token-budget bound. | 04 (SEC-03) |
| — | New tests: dry-run takes **zero** real actions & writes no audit (even when everything matches); shadow trigger writes a `shadow` row with no rollback token; malformed/schema-invalid persisted bundle → safe no-op; guarded action executes when live & is rollback-able. `@devvit/test` testkit `set` now honours `NX`/`XX`. | 11 |

Out of this PR's scope but verified *not* a bug: `reddit.Filter()` doesn't exist in this SDK (08);
`devvit.json` is otherwise schema-correct incl. the cron-less one-off `dry-run-replay` task (08); the
`${sub}:audit` ZSet already holds only `applied`+now-other-outcome rows, so the circuit breaker counts
the right things (06's claim about it counting shadow was wrong); `subredditOpenaiApiKey` *can't* be a
secret — Devvit's subreddit-scope `StringSetting` schema has no `isSecret` — so the existing in-help
warning is the only available mitigation (04 SEC-05 not actionable on-platform).

## Deferred — prioritized backlog (separate PRs; mostly post-hackathon)

**P1 — cheap, high value (good v0.2):**
- Wire `onPostReport` / `onCommentReport` handlers (currently no-ops): fetch the thing for
  `numberOfReports`, build the fact bag, run rules — unlocks "3+ reports → modqueue". Deferred only
  because the trigger payload shape (`PostReport` has no `author`) needs a `devvit playtest` to verify.
  (05, 08)
- New facts already fetched or trivially derivable: `author.postKarma` / `author.commentKarma`
  (the API call already returns them), `content.over18` / `content.isSpoiler` / `content.isVideo`,
  `author.flairText`, `content.crosspostOf`. (01, 08)
- New string ops: `startsWith` / `endsWith` / `wordMatch` (word-boundary) / `fullExact`; text
  normalization (lowercase/strip-accents/zero-width) before `contains`/`matches`. (01, 09)
- New actions: `comment` / `modmail` / `removalReason` with `{{author}}` / `{{permalink}}` / `{{body}}`
  / `{{match}}` placeholders (needs the evaluator to surface the regex match) + `setNsfw` / `setSpoiler`
  / `setSticky`; an `actionReason` param on every action; a `priority` (first-match-wins) field. (01, 09)
- `onModAction` subscription: skip rules on items a human mod already handled; surface "rules disagreed
  with mods N×" in the Dashboard. (08)

**P2 — needs new machinery:**
- Cross-trigger state layer (sub-scoped Redis counters/history): "N posts in an hour from this author",
  "this URL posted 5× this week", "user's last 3 comments were all removed", repeat-offender rules,
  true `reports.distinctReporters`. This is the deepest gap and what makes AutoMod feel "intelligent". (01, 06, 09)
- Per-rule wordlists / sub-configured lists (so banlists aren't monster regexes). (01, 09)
- Fact-to-fact comparison in `value` ("title longer than body"). (09)
- A real Dashboard: per-rule active/draft/shadow state, edit/disable/delete a single rule, "why this
  rule fired", "Resume last failed compose", `showForm` (not toasts) for actionable errors, an
  install-time welcome modmail. (07)

**P3 — bigger:** richer custom-post-type Dashboard UI; multi-language rule descriptions; import
existing AutoMod rules as a starting point; per-trigger time/Reddit-call budget + bounded fact-bag
parallelism for trigger storms (06); expand `@devvit/test` adoption + TTL-aware tests (11).

## Non-code, hackathon-critical (do in the next two weeks)

1. **Install + playtest + record** (user only): `devvit playtest` on a <200-sub test community → run
   the 3 manual gates → fix anything → `devvit publish --public` by ~2026-05-18.
2. **Demo video** (≤60s, no music): per `10-demo-storytelling.md`'s shot list — type an English rule →
   watch it compile to JSON → dry-run preview shows matching posts → undo restores a post. Pre-stage
   data (set `shadowDurationHours: 0`, pre-create test posts, do the 30s dry-run wait off-camera).
3. **Devpost write-up**: de-placeholder the link block + Project-Impact in `docs/devpost-submission.md`
   (needs the real demo subreddit names + the App Directory URL); lead the tagline/pitch/VO with
   "the AI is a compiler, not a judge".
4. **Beta installs for Moderator's Choice ($10K)**: that prize needs ≥3–5 real mod installs — outreach
   to r/ModSupport / r/redditdev would need to start ~D-11 if pursued. (03)

---
Generated 2026-05-13 from the 11 reviews in this folder. The reviews have the file:line evidence.
