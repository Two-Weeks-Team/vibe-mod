# 08 — Devvit platform idiom & missed-feature review

Scope: how idiomatically `vibe-mod` uses the Devvit Web platform, and which platform
features a moderation tool like this *should* be using but isn't. Cross-referenced
against `docs/devvit-reference.md` (58-page non-game docs snapshot) and the
authoritative `node_modules/@devvit/*/**/*.d.ts` typedefs. Companion to
`docs/devvit-conformance-notes.md` (which already covers the build/bundle/import
fixes — not repeated here).

Files reviewed: `devvit.json`, `src/server/index.ts`, `src/server/devvit-helpers.ts`,
`src/server/fact-bag.ts`, `src/server/executor.ts`.

---

## 1. Summary

The core integration is **sound and the conformance pass cleaned up the worst issues**
(server bundle, `context.*` instead of API round-trips, real `TaskRequest/Response`,
sub-scoped Redis keys, secret-scoping). API method names and signatures in the hot
path are largely correct (`reddit.report`, `target.remove/lock`, `reddit.setPostFlair`,
`reddit.banUser/muteUser/unbanUser`, `reddit.modMail.createModNotification`,
`getUserKarmaFromCurrentSubreddit`, `getModerators().all()`, branded `t3_/t1_` ids).

The gaps are mostly **missed features** rather than bugs, and they cluster around the
two things a "Mod Tool" should lean on hardest:

1. **Mod-queue integration.** vibe-mod fakes "send to modqueue" with a self-report
   (`reddit.report(thing, {reason})`) — there is no real "filter into modqueue"
   primitive being used, and it never reads the modqueue / reports / mod log. A
   moderation tool that can't see the modqueue or learn from human mod actions is
   leaving its best signal on the table. (Note: the task brief mentions a
   `reddit.Filter()` / `0.12.21+` modqueue-filter API and an `onAutomoderatorFilter*`
   path — `reddit.Filter()` does **not** exist in this SDK version's typedefs or the
   docs snapshot; the closest real things are the `onAutomoderatorFilterPost/Comment`
   triggers and `getModQueue`/`getReports`. Treat "use `reddit.Filter()`" as a
   no-op recommendation until the SDK actually ships it.)

2. **Triggers as a feedback loop.** vibe-mod subscribes to 6 triggers and 4 of them
   (`onAppUpgrade`, `onPostReport`, `onCommentReport`) are **empty stubs that return
   `{status:'ok'}`**. The report triggers are *the* event for a tool whose fact bag
   has `reports.count` / `reports.distinctReporters` — and `onModAction` would let
   vibe-mod learn what human mods actually do. None of these are wired.

A handful of correctness nits exist (an unused `dryRunOnly` short-circuit makes
`isShadowMode` partly dead code; `subJoinAgeHours` is faked as `accountAgeHours`;
`hasVerifiedEmail` is hard-`false`; the hand-rolled "SET NX via watch/multi/exec" is
unnecessary now that `redis.set(k,v,{nx:true,expiration})` exists). None block ship.

`devvit.json` is schema-correct as far as I can verify, including the
`dry-run-replay` task having no `cron` — the docs explicitly show runtime one-off
tasks declared with just `endpoint` and no `cron` (`docs/devvit-reference.md` §"Scheduling
one-off jobs at runtime"). So that's *not* a bug.

---

## 2. Findings

| # | Item | Type | Sev | Effort | File:line / doc ref |
|---|------|------|-----|--------|---------------------|
| 1 | `onPostReport` / `onCommentReport` triggers are empty stubs (`return {status:'ok'}`) — yet `reports.count`/`reports.distinctReporters` are first-class facts. Report-driven rules ("3+ reports → modqueue") can never fire from live reports. | missed-feature | **HIGH** | M | `src/server/index.ts:589-597`; `devvit.json` triggers; `fact-bag.ts:126-127,162-163`; docs §Triggers (`onPostReport`,`onCommentReport`) |
| 2 | No `onModAction` subscription. A mod tool could observe human approve/remove/ban actions to (a) auto-suppress its own rules on items mods already handled, (b) surface "your rules disagree with mods N times this week" in the Dashboard, (c) seed future rule suggestions. | missed-feature | **HIGH** | M | docs §Triggers (`onModAction`); `RedditClient.d.ts:632 getModerationLog`; not present in `devvit.json` |
| 3 | "modqueue" action = `reddit.report(thing, {reason:"vibe-mod: …"})`. That's a *report*, not a filter-into-queue; it also can't be undone (`reverseable:false`) and clutters the public report count. No use of `getModQueue`/`getReports`/`addRemovalNote`/removal reasons. The idiomatic "needs review" path for a removal is `target.remove()` + `reddit.addRemovalNote(...)` (item sits in the removed/spam queue with a reason mods see). | idiom / missed-feature | MED | M | `src/server/executor.ts:135-140` ("modqueue"), `:141-146` ("remove"); `RedditClient.d.ts:851 addRemovalNote`, `:1191 getModQueue`, `:1208 getReports`, `:632 getModerationLog` |
| 4 | `dryRunOnly` setting is read in `executeActions` and OR-ed into `effectiveShadow` (`executor.ts:38-39`), but it's *also* meant to be folded into `ExecutionContext.isShadowMode` by callers — the triggers pass `isShadowMode: rule.shadow` (`index.ts:509,550`) and never the sub setting, so the only thing keeping `dryRunOnly` effective is the executor-side re-read. Works, but the `isShadowMode` plumbing through `ExecutionContext` is half-dead; comment on line 32 ("`rule.shadow OR sub.dryRunOnly`") is aspirational, not what the code does. | correctness (latent) | MED | S | `src/server/executor.ts:25-39`; `index.ts:501-511,542-552` |
| 5 | Hand-rolled "SET NX" via `watch → get → multi → set → expire → exec` in 3 places, with comments saying "Devvit's redis client may not expose SET NX". It does: `redis.set(key, val, { nx: true, expiration: <Date> })` is one round-trip and atomic. The watch/multi version is 3 round-trips and the `get` inside it is redundant. | idiom | LOW | S | `src/server/index.ts:457-472 isDuplicateTrigger`; `executor.ts:224-236 trySetIfNotExists`; `redis.d.ts SetOptions {nx, expiration}` (`@devvit/redis/types/redis.d.ts:1439`) |
| 6 | `redis.set` + separate `redis.expire` everywhere (`index.ts:61-62,315-316,468-469`; `executor.ts:287-288`; `fact-bag.ts:251-252`). Two round-trips where one suffices: `redis.set(k, v, { expiration: new Date(Date.now()+ttl*1000) })`. (The `watch/multi` cases need the txn-form `txn.set`/`txn.expire`, fine — but the plain ones don't.) | idiom | LOW | S | as above; `SetOptions.expiration` |
| 7 | `subJoinAgeHours` is set to `accountAgeHours` ("v0.2: query first-activity-in-sub for true value", `fact-bag.ts:248`). Rules like "new-to-this-sub account posts within N hours of joining" silently degrade to "account younger than N hours". `getCommentsAndPostsByUser({username, subreddit?, sort:'new'})` (`RedditClient.d.ts` / docs §getCommentsAndPostsByUser) could give a real first-activity timestamp. | correctness (degraded fact) | MED | M | `src/server/fact-bag.ts:172,182,248`; docs §getCommentsAndPostsByUser (`reddit.getCommentsAndPostsByUser`) |
| 8 | `hasVerifiedEmail` hard-coded `false` ("Devvit API does not expose this", `fact-bag.ts:247`). Accurate as a limitation, but the *system prompt / starter rules* should refuse to emit rules keyed on it rather than silently always-false (a "require verified email" rule would match nobody). Worth a guard at compile time, not just a doc note. | correctness (degraded fact) | LOW | S | `src/server/fact-bag.ts:171,182,247` |
| 9 | `getUserByUsername(authorName)` is used to fetch the author (`fact-bag.ts:203`) when the trigger payload already carries `author.id` (`t2_…`). `reddit.getUserById(authorId as T2)` is the direct lookup and avoids a name→user resolution. Minor. | idiom | LOW | S | `src/server/fact-bag.ts:185,203`; `RedditClient.d.ts:324 getUserById` |
| 10 | No `marketingAssets` beyond `icon` — and the icon path is `assets/icon.png` but the conformance notes say a **1024×1024** PNG is required for the App Directory; not verified here. Also `marketingAssets` can hold a hero image / screenshots for the listing. Low priority for a hackathon but flagged. | missed-feature | LOW | S | `devvit.json:5 marketingAssets`; conformance notes §marketingAssets |
| 11 | No custom-post / web-view dashboard. The Dashboard is rendered as a `description` string in a `showForm` (`index.ts:373-394`) — fine and cheap, but a `post` block + a tiny web-view would give a real rules/log/undo UI (charts, per-rule toggle, inline "this rule disagreed with a mod" badges). `permissions` would need nothing new (`reddit`+`redis` already there). Out of scope for the hackathon, but it's the obvious "richer dashboard" upgrade. | missed-feature | LOW | L | `devvit.json` (no `post`); docs §Custom posts / web views |
| 12 | Forms don't use `group` field groups or per-field `required`. The composer form has 2 flat fields; the dashboard form 1. A `group` ("Advanced: rate limits / scoping") would tidy the composer; `required:true` on the rule paragraph would let the client block empty submit instead of the server toast at `index.ts:170`. Cosmetic. | idiom | LOW | S | `src/server/index.ts:135-149,218-239,391`; docs §Forms (`type:'group'`, `required`) |
| 13 | No `runJob` use of `id` for de-dup. `scheduler.runJob({name:'dry-run-replay', runAt:new Date(), data})` (`index.ts:320-324`) omits `id`; if the mod re-submits the same rule fast, two replay jobs run. `runJob` accepts a stable `id` (`scheduler` typedefs `ScheduledJobOptions.id`) — `id: \`dryrun-${ruleId}\`` would coalesce. Also `cancelJob`/`listJobs` are unused (could power a "cancel pending dry-run" Dashboard action). Minor. | idiom | LOW | S | `src/server/index.ts:320-324`; docs §Scheduler (one-off `id`, `cancelJob`, `listJobs`) |
| 14 | `redisCompressed` not used for the rule bundle / audit-hash strings. Rule bundles can grow (50 rules × predicate trees) and audit entries are JSON-stuffed hashes; `@devvit/redis`'s `redisCompressed` client is the documented escape hatch for large values. Probably not needed at current sizes, but a `bundleVersion`-gated migration to it is the documented pattern (docs §Redis "compression"). | idiom | LOW | M | `src/server/index.ts:311,571,579`; `executor.ts:274`; docs §Redis (`redisCompressed`) |
| 15 | `onAppUpgrade` handler is a no-op (`index.ts:584-587`). Fine *today* (schemaVersion `1.0.0`), but it's the migration hook — when `rule-schema` bumps, this is where a bundle re-parse/upgrade belongs. Flag so it doesn't get forgotten. The `onAppInstall` seeding (`index.ts:557-582`) is correct and idiomatic (empty active + draft starter rules, doesn't clobber existing draft). | missed-feature (latent) | LOW | S | `src/server/index.ts:584-587`; docs §Triggers (`onAppUpgrade` for migrations) |
| 16 | `isCallerModerator` caches the mod list 5 min but `getCurrentUser()` is called on *every* form/menu hit and again inside the validate path (`index.ts:48,251` / `:48,398` etc.). Cheap, but the `userId` is already in `context.userId` (`@devvit/shared-types/.../baseContext.d.ts:10`); only the *username* needs the API call, and only for the membership check. Could resolve mod-ness by `userId` against a cached `t2_…` set instead. Micro-opt. | idiom | LOW | S | `src/server/index.ts:46-69`; `context.userId` |

### Confirmed correct (no action)

- `reddit.report(thing, {reason})`, `target.remove(spam?)`, `target.lock()/unlock()`,
  `post.approve()`, `comment.approve()`, `reddit.unbanUser(name, sub)` — all match typedefs.
- `reddit.setPostFlair({subredditName, postId, text, cssClass})` — `SetPostFlairOptions = SetFlairOptions & {postId: T3}`, and `SetFlairOptions` has `text`/`cssClass`. ✓ (`Flair.d.ts:52-72`)
- `reddit.banUser({username, subredditName, reason, duration})` / `muteUser({username, subredditName, note})` — match `BanUserOptions` (`User.d.ts:34`) and `MuteUserOptions` (`RedditClient.d.ts:21`). ✓
- `reddit.modMail.createModNotification({subject, bodyMarkdown, subredditId})` — exists (`@devvit/reddit/models/ModMail.d.ts:460`). ✓ Better than `sendPrivateMessage` for an ops alert.
- `reddit.getUserKarmaFromCurrentSubreddit(name) → {fromComments?, fromPosts?}` — correct shape, and the "caller must be a mod" caveat is satisfied (app account has mod perms). ✓ (`RedditClient.d.ts:8267` doc / typedef)
- `getModerators({subredditName}).all()` → `User[]` with `.username`. ✓
- `context.subredditName/subredditId/userId/appName` from `@devvit/web/server` — correct, request-scoped, no round-trip. ✓
- Redis: no `zCount` in the client (`zCard`/`zRange`/`zIncrBy`/`zRemRangeByScore` only) — the `rate-limit-circuit-breaker` comment ("no zCount, so range-scan by score and count") is *accurate*; the `zRange(key, oneHourAgo, MAX, {by:'score'}).length` workaround is the right call. ✓ (`RedisClient.d.ts:25-91`)
- `watch/multi/exec` transactions used correctly in `writeAuditAndRollback` and the dedup/rate-limit helpers (the *transaction* part is fine; only the "SET NX" framing is over-engineered — see #5). ✓
- `dry-run-replay` task with no `cron` — valid for a runtime-only one-off (`docs/devvit-reference.md` §"Scheduling one-off jobs at runtime" shows exactly `{ "one-off-task-example": { "endpoint": "..." } }`). ✓
- No recursive triggers: none of vibe-mod's actions create posts/comments. ✓
- `forUserType:"moderator"` treated as a UI hint with a real server-side `isCallerModerator` guard on every handler. ✓ (correct — the docs say `forUserType` is not enforcement)

---

## 3. Prioritized recommendations

**P1 — Wire the report triggers (Finding 1).** Move the live `reports.count` /
`reports.distinctReporters` into the fact bag from the `OnPostReport`/`OnCommentReport`
payloads and run `selectMatchingRules(..., 'onPostReport'/'onCommentReport', facts)` +
`executeActions`, exactly like `on-post-submit` does. Right now report-keyed rules are
dead. Effort M. This is the single highest-leverage fix — it makes a whole class of
the product's advertised rules actually work.

**P2 — Subscribe to `onModAction` (Finding 2).** Add `"onModAction": "/internal/trigger/on-mod-action"` to `devvit.json`, persist a rolling count of "human mod handled item X" keyed by `thingId` (short TTL), and in `executeActions` skip (audit as `mod_handled_skip`) if a human already acted. Then surface "rules disagreed with mods N×" in the Dashboard. This is the "learn from human mods" feature and it's the most *idiomatic-for-a-mod-tool* thing missing. Effort M.

**P3 — Replace the fake "modqueue" action with a real removed-with-reason flow (Finding 3).** `target.remove()` + `reddit.addRemovalNote({itemIds:[id], reasonId?/note})` puts the item in the removed queue with a reason mods see — and it's *undoable* (`approve()`), unlike the current self-report. Keep `report` as its own distinct action. Effort M. (Do **not** chase `reddit.Filter()` — not in this SDK.)

**P4 — Real `subJoinAgeHours` (Finding 7).** `reddit.getCommentsAndPostsByUser({username, subredditName, sort:'new', limit:1}).all()` → oldest item's `createdAt` ≈ first activity in sub. Cache it in the existing author cache. Effort M. Without it, "new to *this* sub" rules are quietly wrong.

**P5 — Tidy the Redis idioms (Findings 5, 6).** Swap the watch/multi "SET NX" helpers for `redis.set(k, '1', { nx: true, expiration: <Date> })`; collapse `set`+`expire` pairs into `set(k, v, { expiration })`. Pure cleanup, ~3 sites each. Effort S.

**P6 — `runJob` stable `id` for the dry-run job (Finding 13).** `id: \`dryrun-${ruleId}\`` so a double-submit coalesces. Effort S.

**P7 — Compile-time guard on always-false facts (Finding 8).** Have the system prompt / `Rule.parse` reject predicates on `author.hasVerifiedEmail` (until it's real). Effort S.

**LATER / out of scope for the hackathon:**
- Custom-post + web-view Dashboard (Finding 11) — the big UX upgrade, L effort.
- `redisCompressed` migration gated on `bundleVersion` (Finding 14).
- Form `group` fields + `required` (Finding 12), `getUserById` over `getUserByUsername` (Finding 9), `context.userId`-based mod check (Finding 16), hero/screenshot `marketingAssets` (Finding 10).
- Flesh out `onAppUpgrade` when the schema next bumps (Finding 15).

---

## 4. Do NOW vs LATER

**Do NOW (before publish — small, high-value, low-risk):**
- Finding 1: wire `onPostReport`/`onCommentReport` (P1) — *the* functional gap.
- Finding 4: make `dryRunOnly` plumbing honest — pass it through `isShadowMode` at the call site (or delete the `ExecutionContext.isShadowMode` half and rely solely on the executor re-read, but pick one).
- Finding 5 + 6: `set` with `{nx, expiration}` cleanup (P5) — touches 3 files, removes ~30 lines.
- Finding 13: stable `runJob` `id` (P6).
- Finding 8: compile-time reject `hasVerifiedEmail` predicates (P7).

**Do LATER (post-hackathon, real value but bigger or speculative):**
- Finding 2: `onModAction` learning loop (P2) — M effort, but the standout feature.
- Finding 3: removed-with-reason instead of self-report (P3).
- Finding 7: real `subJoinAgeHours` (P4).
- Finding 11: web-view Dashboard.
- Findings 9, 10, 12, 14, 15, 16: polish.

**Explicitly DON'T:**
- `reddit.Filter()` / `0.12.21+` modqueue-filter API — not present in this SDK version's typedefs or the docs snapshot. Revisit only if/when `@devvit/reddit` ships it. The real "automod filtered this" hook is the `onAutomoderatorFilterPost/Comment` *trigger*, which would be a reasonable future subscription (learn from automod, not just human mods) but isn't urgent.
- Adding `onPostUpdate`/`onCommentUpdate`/`onPostNsfwUpdate`/`onPostSpoilerUpdate` *now* — they'd let vibe-mod re-evaluate *edited* posts (a real evasion vector: post clean, edit dirty), which is genuinely worth doing, but it needs the fact bag to handle "this is an edit, here's the new body" and dedup carefully against `postSubmit` — that's a feature, not a quick win. File it as a tracked enhancement, not a NOW item.
