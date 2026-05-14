# vibe-mod ↔ AutoModerator capability-parity analysis

_Date: 2026-05-13 · Scope: `src/shared/rule-schema.ts`, `src/server/fact-bag.ts`, `src/server/evaluator.ts`, `src/shared/starter-rules.ts`_

## 1. Summary

- **vibe-mod today covers maybe ~25–30% of what a typical busy subreddit's AutoMod config does.** It handles account-age / karma gates, body/title length & caps ratios, link/image counts, a single body+title regex, and `urlDomain` membership — plus 5 SAFE-ish actions (`report / flair / lock / modqueue / remove`) and 3 guarded ones (`ban / mute / permaban`). That's a solid "spam-triage" subset, not AutoMod parity.
- **The biggest single gap is text matching.** AutoMod's bread-and-butter is `title`/`body`/`title+body`/`domain`/`url`/`flair_text` checks with `full-text`, `full-exact`, `includes`, `includes-word`, `starts-with`, `ends-with`, `~` (negate) modifiers and **word/phrase _lists_**. vibe-mod has exactly one regex fact (`content.containsRegex`, op `matches`) reused for body, `content.title.contains` (substring), and `content.urlDomain` (`in` list) — no per-field word lists, no match-modifier semantics, no `{{match}}` capture, **no comment body regex carved out separately from `content.containsRegex` which is fine but there's no `url`-text regex, no `domain` substring match (only exact-hostname `in`), and no flair check at all.**
- **Several whole AutoMod fact families are simply absent and need new facts:** author flair (`flair_text`/`flair_css_class`), `is_contributor`/`is_gold`/`has_verified_email` (the last is stubbed `false`), `post_karma`/`comment_karma` split, `combined_karma` (we have `totalKarma`), media flags (`is_video`/`is_gallery`/`is_original_content`/`is_self`/`is_meta`/`is_poll`), NSFW/spoiler flags on the item (`over_18`, `spoiler`), `is_edited`, crosspost (`crosspost_id`/`crosspost_*`), `body_longer_than`/`shorter_than` in **words** (we have chars + a wordCount fact — close), and reply-context facts (`parent_submission.*` for comments).
- **A second class of gaps needs new evaluator / executor machinery, not just facts:** `set_flair`/`overwrite_flair`/`set_nsfw`/`set_spoiler`/`set_sticky`/`set_contest_mode`/`set_locked` write-actions; `comment`/`modmail`/`message` actions with `{{author}}`/`{{permalink}}`/`{{match}}`/`{{body}}` placeholder expansion; `action_reason` (mod-log reason string); `ignore_reports`; `satisfy_any_threshold` (already covered structurally by `any`); time-of-day gating; `#priority` ordering between rules.
- **A third class needs cross-item / persistent state vibe-mod doesn't have:** repeat-offender rules ("3rd removed post in 7 days → ban"), per-author counters beyond the existing per-author _rate-limit_, "X reports from distinct users" (only crudely approximated — `reports.distinctReporters` is literally aliased to `reports.count` in `fact-bag.ts:127`), and history-based author reputation.

## 2. Findings table

| Missing capability | How common in AutoMod | Severity | Effort | What it needs |
|---|---|---|---|---|
| Per-field word/phrase **lists** (`body: [a,b,c]`) | ~ubiquitous (most-used AutoMod feature) | CRIT | M | new op (`in_word_list` / reuse `matches` w/ alternation) + LLM-side list→regex compile; no schema break if we keep regex fact |
| Match modifiers: `full-exact` / `includes-word` / `starts-with` / `ends-with` | very common | HIGH | M | new ops or per-leaf `mode` param; evaluator change |
| `~` negation on a single text check inline | common | LOW | S | already expressible via `{not:…}` — just LLM guidance |
| `title` vs `body` vs `title+body` distinct text checks | very common | HIGH | S–M | already have `content.title.contains` (substring only) + body regex; add `content.title` regex fact + a combined fact, or a `field` param |
| `url`-text regex / `domain` **substring** match (not just exact hostname) | common | HIGH | S | new fact `content.url` already exists; needs `op:matches` allowed on it (it is) — but `urlDomain` only supports exact `in`; add `op:contains/matches` semantics already present → mostly LLM guidance + maybe `content.urlPath` fact |
| URL-shortener / known-bad-domain **expansion** (follow redirects) | medium | MED | L | network call at evaluate-time or edit-time enrichment; not currently allowed |
| `author.flair_text` / `author.flair_css_class` | common (flair-gated subs) | HIGH | M | new facts + Reddit API call in `getAuthorFacts` |
| `author.has_verified_email` (real value) | medium | MED | S–M | fact exists but hardcoded `false` (`fact-bag.ts:247`); needs API support or stays stub |
| `author.is_contributor` (approved user) | medium | MED | S | new fact + `reddit.getApprovedUsers`-style call |
| `author.is_gold` / premium | low | LOW | S | new fact + API |
| `post_karma` / `comment_karma` split (vs combined `totalKarma`) | medium | MED | S | new facts; `user.linkKarma` / `user.commentKarma` already fetched (`fact-bag.ts:244`) |
| `account_age` in **days/months** (we have hours) | very common | LOW | S | cosmetic; hours works, LLM converts |
| `is_edited` | medium | MED | S | new fact; available on comment/post payload |
| `body_longer_than` / `body_shorter_than` in **words** | common | LOW | S | `content.wordCount` already exists — just LLM guidance |
| `title_longer_than` (words) | common | LOW | S | add `content.title.wordCount` fact |
| `is_self` / `is_link` post | very common | LOW | S | `content.isLinkPost` already exists |
| `is_video` / `is_gallery` / `is_image` / `is_original_content` / `spoiler` / `over_18` (on the item) | common (image/video subs) | HIGH | M | new facts; Devvit trigger payload partially exposes these; `imageCount` heuristic is a poor proxy |
| `is_poll` / `is_meta` / `is_crosspostable` | low | LOW | S | new facts |
| `crosspost_id` / `crosspost_*` (parent sub, parent author) | medium | MED | M | new facts + extra API lookup |
| Comment **reply context** (`parent_submission.*` — title/flair/author/nsfw of the post being replied to) | medium | MED | M | new fact family for `onCommentSubmit`; needs `reddit.getPostById(parentId)` |
| `set_flair` / `overwrite_flair` (on the **post**, w/ template) | very common | HIGH | M | `flair` action exists but semantics = "set"; need `overwrite` flag + template-id support |
| `set_locked` / `set_sticky` / `set_nsfw` / `set_spoiler` / `set_contest_mode` | common | HIGH | M | new actions; `lock` exists, others don't; executor change |
| `comment` action (sticky/distinguished bot reply) w/ placeholders | very common | CRIT | M–L | new action + placeholder expansion engine ({{author}},{{permalink}},{{body}},{{match}},{{kind}},{{subreddit}}) |
| `modmail` / `message` actions w/ placeholders | medium | MED | M | new actions + placeholder engine |
| `action_reason` (string written to mod log) | common | MED | S | add optional `actionReason` to each Action's params; executor passes through |
| `ignore_reports` action | medium | MED | S | new action; executor calls `.ignoreReports()` |
| `{{match}}` capture from the matching regex | common | HIGH | M | evaluator must surface the matched substring into a per-rule context the executor reads |
| `satisfy_any_threshold` (OR between numeric checks) | medium | LOW | S | already covered by `{any:[…]}` |
| `#priority` (rule ordering / first-match-wins) | medium | MED | S | add `priority:number` to `Rule`; sort in `selectMatchingRules` (`evaluator.ts:79`); decide stop-on-match semantics |
| Time-of-day / day-of-week gating | low | LOW | S–M | new fact `now.hourUtc` / `now.dayOfWeek`; evaluator already does numeric compare |
| Repeat-offender / "Nth removed item in N days" | medium-high | HIGH | L | cross-item persistent counters in Redis keyed by author; new fact like `author.removedByRuleLast7d` |
| "X reports from **distinct** reporters" | medium | MED | M | `reports.distinctReporters` is faked = `reports.count` (`fact-bag.ts:127`); needs real reporter-set tracking, likely Redis-accumulated across report events |
| Regex **modifiers** beyond `iu` (e.g. multiline, dotall, case-sensitive opt-in) | low | LOW | S | evaluator hardcodes `'iu'` (`evaluator.ts:63`); add per-leaf flag, keep safe-regex guard |
| `domain` check against **submitted media** domain (not just link) | low | LOW | M | new fact; needs structured media field |
| Wiki-page-driven config / includes | n/a (different paradigm) | — | — | out of scope by design — vibe-mod is NL→JSON, not YAML |
| AutoMod's `~comment` / standard `~author`-block style **standard sections** & reusable checks | medium | LOW | — | partly modeled by repeating leaves; could add named sub-predicates later |
| Multiple actions w/ different placeholders per rule | common | LOW | S | `then` is already an array (max 5) — fine once placeholders exist |

## 3. Proposed facts / operators / actions for v0.2

### 3.1 New `FactPaths` strings (add to `rule-schema.ts:29-60`)

```
// Author — extra
'author.postKarma',          // user.linkKarma
'author.commentKarma',       // user.commentKarma
'author.isContributor',      // approved user in this sub
'author.flairText',          // author flair text in this sub ('' if none)
'author.flairCssClass',      // author flair css class
'author.isGold',             // premium (best-effort; may stay false)

// Content — extra text/structure
'content.body',              // alias of containsRegex but clearer; supports op:matches/contains
'content.title.wordCount',
'content.urlPath',           // pathname of post link ('' for self posts)
'content.isEdited',
'content.isVideo',
'content.isGallery',
'content.isOriginalContent',
'content.isSpoiler',
'content.over18',            // item-level NSFW flag (distinct from sub.over18)
'content.isPoll',
'content.crosspostParentSub',   // '' if not a crosspost
'content.crosspostParentAuthor',

// Comment reply context (onCommentSubmit only; '' / 0 / false otherwise)
'parent.post.title',
'parent.post.flairText',
'parent.post.authorName',
'parent.post.over18',

// Time
'now.hourUtc',               // 0-23
'now.dayOfWeekUtc',          // 0-6, Sun=0

// Cross-item state (needs Redis accumulators — flag as v0.2+ stretch)
'author.itemsRemovedByRulesLast7d',
'reports.distinctReporters',  // make this REAL (currently faked = reports.count, fact-bag.ts:127)
```

### 3.2 Operators

- Keep current ops. Add **`startsWith`**, **`endsWith`**, **`wordMatch`** (whole-word, case-insensitive — equivalent to `\bword\b`), **`fullExact`** (case-insensitive full-string equality) to `PredicateOps` (`rule-schema.ts:66`) and `evaluatePredicate` (`evaluator.ts:31`). These cover AutoMod's `starts-with`/`ends-with`/`includes-word`/`full-exact` modifiers without inventing a `mode` param.
- Alternative (cleaner): add optional `mode?: 'full-text'|'full-exact'|'includes'|'includes-word'|'starts-with'|'ends-with'` to `LeafPredicate` and let `contains`/`matches` honor it. Either works; the new-ops route is a smaller evaluator diff.
- Allow an optional per-leaf `regexFlags?: 'i'|'is'|'im'|'ims'|''` for `matches`, defaulting to `'iu'`, keeping the existing safe-regex guards (`evaluator.ts:59-61`).

### 3.3 Actions (extend the `Action` discriminated union, `rule-schema.ts:107-141`)

```
{ action: 'comment',  params: { text: z.string().max(10000), sticky: z.boolean().default(false), distinguish: z.boolean().default(true), lockReply: z.boolean().default(false) } }   // GUARDED — posts visibly
{ action: 'setFlair', params: { flairText: z.string().max(64).optional(), templateId: z.string().optional(), cssClass: z.string().max(64).optional(), overwrite: z.boolean().default(false) } }   // post flair, distinct from author 'flair'
{ action: 'setNsfw',  params: { value: z.boolean() } }
{ action: 'setSpoiler', params: { value: z.boolean() } }
{ action: 'setSticky', params: { value: z.boolean(), slot: z.union([z.literal(1), z.literal(2)]).optional() } }   // GUARDED
{ action: 'setContestMode', params: { value: z.boolean() } }
{ action: 'ignoreReports', params: z.object({}).strict() }
{ action: 'modmail', params: { subject: z.string().max(100), text: z.string().max(10000) } }   // GUARDED
```

Plus: add an optional **`actionReason: z.string().max(200).optional()`** to every action's `params` (or a sibling `reason` field on the action wrapper) → passed to the Reddit mod-log on `remove`/`ban`/etc. And add a placeholder-expansion pass in the executor that resolves `{{author}}`, `{{permalink}}`, `{{subreddit}}`, `{{kind}}`, `{{body}}`, `{{title}}`, `{{match}}` (the last requires the evaluator to stash the regex match — see 3.4).

### 3.4 Evaluator / executor / rule-level changes

- `Rule`: add `priority: z.number().int().min(-100).max(100).default(0)` and have `selectMatchingRules` (`evaluator.ts:79-89`) sort by priority desc; optionally add `stopOnMatch: z.boolean().default(false)` for AutoMod-style first-match-wins per item kind.
- `evaluatePredicate` should optionally return a `{matched: boolean, captures: Record<string,string>}` so a top-level `matches` capture flows to `{{match}}`. (Internal change; schema unaffected.)
- `fact-bag.ts`: stop aliasing `reports.distinctReporters` to `reports.count` (line 127, 163); accumulate a per-item reporter set in Redis across `onPostReport`/`onCommentReport` events.
- `fact-bag.ts`: populate `author.postKarma`/`author.commentKarma` from the already-fetched `user.linkKarma`/`user.commentKarma` (line 244) — near-zero cost.

## 4. Do NOW vs LATER

### Do NOW (cheap, high leverage — mostly S, no new machinery)
1. **Word-list text matching** — teach the compiler to turn an English "remove posts containing X, Y, Z" into a single safe alternation regex on `content.containsRegex` / `content.title.contains`. _No schema change._ Closes the #1 AutoMod use-case. (CRIT, M but mostly prompt work.)
2. Add `startsWith` / `endsWith` / `wordMatch` / `fullExact` ops — small `evaluator.ts:31` + `rule-schema.ts:66` diff. (HIGH, S)
3. Add facts that are free from already-fetched data: `author.postKarma`, `author.commentKarma`, `content.title.wordCount`, `content.urlPath`, `content.isEdited`. (`fact-bag.ts`) (MED, S)
4. Add `content.over18` / `content.isSpoiler` / `content.isVideo` / `content.isGallery` from the trigger payload. (HIGH, S–M)
5. Add `actionReason` param + `ignoreReports` action — trivial executor passthrough. (MED, S)
6. Add `priority` to `Rule` + sort in `selectMatchingRules`. (MED, S)
7. Add `now.hourUtc` / `now.dayOfWeekUtc` facts. (LOW, S)

### Do LATER (needs real engineering)
- **`comment` / `modmail` actions + `{{placeholder}}` engine + `{{match}}` capture** — biggest UX win after word-lists, but touches evaluator return shape + executor + GUARDED-action plumbing. (CRIT, M–L)
- **`setFlair`/`setNsfw`/`setSpoiler`/`setSticky`/`setContestMode`** write-actions — straightforward but each is a new executor path + whitelist entry. (HIGH, M)
- `author.flairText` / `author.flairCssClass` / `author.isContributor` — extra Reddit API calls in `getAuthorFacts`, caching, error handling. (HIGH, M)
- Comment **reply-context** facts (`parent.post.*`) — extra `getPostById` per comment event. (MED, M)
- **Repeat-offender / cross-item counters** (`author.itemsRemovedByRulesLast7d`) and **real `reports.distinctReporters`** — needs Redis accumulators, TTLs, and careful idempotency. This is the deepest gap and the one that makes AutoMod feel "smart". (HIGH, L)
- URL-shortener **expansion** / redirect-following — needs a network call somewhere safe (edit-time enrichment, not evaluate-time). (MED, L)
- `crosspost_*` facts — extra lookup + payload parsing. (MED, M)

### Explicitly out of scope (different paradigm — not a "gap")
- Wiki-page YAML config, `includes`, AutoMod's `standard:` reusable checks, multi-file config. vibe-mod is NL→deterministic-JSON by design; reusable named sub-predicates could be added later as a convenience but aren't parity blockers.
