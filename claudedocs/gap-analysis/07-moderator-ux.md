# 07 — Moderator UX (end-to-end review)

Scope: the entire moderator-facing experience of vibe-mod, built only from Devvit's
server-side primitives — subreddit/post/comment **menu items** (`devvit.json` `menu`),
**menu-response forms** (`devvit.json` `forms`, served from `/internal/menu/*` and
`/internal/form/*` in `src/server/index.ts`), and **toasts**. No custom post / webview UI.

Reference baseline for "what's possible": `docs/devvit-reference.md` — Forms
(field types: string, paragraph, number, boolean, select, image, group; field props:
`label`, `helpText`, `placeholder`, `required`, `disabled`, `defaultValue`, `lineHeight`
for paragraph; form props: `title`, `description`, `acceptLabel`, `cancelLabel`; menu
responses can chain `showForm`→`showForm` and pass `data`); Toasts (text + `appearance:
'neutral' | 'success'` only — **no error/red appearance**, auto-dismiss, "Don't rely on
toasts for critical information"); Menu items (`label`, `description`, `location`,
`forUserType` — which is a *UI hint only*, server must re-check).

---

## 1. Summary

The build is competent and the safety model (shadow-by-default, dry-run gate, circuit
breaker, BYOK, server-side mod re-check) is genuinely good. But the **interaction design
fights Devvit's constraints rather than working with them**, and several first-run and
day-to-day flows are broken or invisible:

1. **The 5 seeded draft rules are effectively invisible.** They land in a Redis
   `:rules:draft` key on install (`src/server/index.ts:573-580`) but there is *no
   install-time notification, no welcome modmail, no onboarding form*. The only way a new
   mod discovers them is to guess that "vibe-mod: View rules + log" exists and open it.
   Hackathon judging criterion "immediately understandable to new users" is not met.

2. **The Dashboard is a single read-only `description` blob with one boolean toggle.**
   You cannot see *which* rule is active vs draft vs shadow individually, cannot
   edit/disable/delete a single rule, and the only control is "Activate ALL draft
   rule(s)" (`src/server/index.ts:373-395`). "See why a rule fired" is a 60-char
   truncation of `ruleSourceNL` in a text dump (`:380`). This is the weakest screen.

3. **Errors are delivered as gray, auto-dismissing toasts** — including "Compiler
   offline", "quota reached", "not a moderator", validation failures, undo failures
   (`src/server/index.ts:121,160,186,204,266,275,302,328,448`). Devvit has no error/red
   toast appearance and explicitly warns against toasts for critical info. A mod who
   blinks misses the entire error. There is no "your draft was saved, retry from
   Dashboard" affordance — the retry path requires re-typing the rule from scratch.

Plus: the compose form's clarification loop disables the original-rule field but loses
the `clarificationAnswer` if the LLM asks a *second* question; the dry-run preview is a
text fragment buried mid-blob in a form description with no post links; comment-only
rules silently get "dry-run unavailable"; the 24h auto-promote is mentioned once in a
toast that vanishes and never surfaced again; and the undo menu item appears on *every*
post/comment for *every* mod even when vibe-mod never touched it (only discovers that
after clicking — `src/server/index.ts:440-443`).

Net: solid engine, under-designed surface. Most fixes are S/M effort and stay 100%
within Devvit primitives. Below is a findings table and a screen-by-screen redesign.

---

## 2. Findings

| # | UX gap | Sev | Effort | Devvit-feasible fix | File:line |
|---|--------|-----|--------|---------------------|-----------|
| F1 | Install seeds 5 draft rules but **never tells the mod** — no welcome modmail, no notification. New mod has zero signal the app did anything. | **CRIT** | S | In `on-app-install`, send `reddit.modMail.createModNotification` (already used at `:744`) with a "Welcome — 5 starter rules waiting in 'vibe-mod: View rules + log', here's what each does, nothing acts until you Activate". | `src/server/index.ts:557-582` |
| F2 | Dashboard cannot show per-rule state (active/draft/shadow), cannot edit/disable/delete one rule. Only control = "Activate ALL drafts" boolean. | **CRIT** | M | Add a `select` field listing every rule as `name — STATE` and a second `select` for action (`activate this one` / `disable` / `delete` / `back to draft`). Devvit `select` supports per-option labels; chain to a confirm form. Keeps "Activate all" as a separate option. | `src/server/index.ts:373-417` |
| F3 | All error messaging uses gray auto-dismiss toasts (no red appearance exists; docs say don't use toasts for critical info). Mod misses "compiler offline / quota hit / not a mod / validation failed / undo failed". | **HIGH** | M | For anything the mod must read & act on, return `showForm` with a `title: '⚠️ …'` and a `paragraph`/`description` explaining the problem + next step, instead of `showToast`. Reserve toasts for success confirmations only. | `src/server/index.ts:121,160,170,186,204,266,275,302,328,403,408,448` |
| F4 | "Compiler offline" toast says draft is saved but a failed compile **does not save anything** — there is no draft to retry from. Mod must re-type the whole rule. | **HIGH** | S | On OpenAI failure, stash `{rule, allowGuarded, clarificationAnswer}` in a `${sub}:pending-compose:${userId}` Redis key (TTL 1h); add a "Resume last compose" menu item / Dashboard option that re-opens the form pre-filled via form `data`. | `src/server/index.ts:200-208` |
| F5 | Clarification loop: a second clarifying question discards the first `clarificationAnswer` (the re-render only carries `rule`, not prior answers), so the LLM loses context the next turn. | **HIGH** | S | Accumulate answers: pass prior `clarificationAnswer` into the next form's `data`/`defaultValue` (a `paragraph` "Conversation so far (read-only)") and append all answers as separate user turns in `callOpenAI`. | `src/server/index.ts:211-243`, `:804-806` |
| F6 | Dry-run preview is a text fragment inside the Dashboard `description` blob: `r_x: would match 3/10 recent post(s) → modqueue`. No links to the matched posts, no titles, easy to miss. The task's "7 of your last 100" is actually "n of last 10" (`DRY_RUN_SAMPLE = 10`). | **HIGH** | M | Surface dry-run as its own form screen reached from a Dashboard `select` option per-rule: `title: 'Dry-run: <rule name>'`, `description` lists each match as `• "<post title>" by u/<author> → <actions>` with the permalink (Devvit forms render plain text URLs; can also `navigateTo` a post). Raise sample to ~25–50 (still within scheduler time budget — it's ~3 API calls/post). | `src/server/index.ts:357-371`, `:624`, `:637-702` |
| F7 | Comment-only rules can't be dry-run (`getNewComments` not in SDK) → user just sees "dry-run unavailable" with a wall-of-text note. Looks broken. | MED | S | Reword to a positive framing in its own form: "This rule watches comments. Devvit can't replay past comments, so it'll run in **shadow mode** (logs only, no action) for 24h after you activate — review the log then." Same content, but presented as the plan, not an error. | `src/server/index.ts:664-668` |
| F8 | 24h-shadow → auto-promote is communicated *once* in a toast (`:413`) that auto-dismisses, then never again. Mod has no way to see "this rule goes live in 9h" or which rules are currently shadow. | **HIGH** | S | In the Dashboard rule list, render shadow rules as `name — SHADOW (live in ~Nh)` computing `createdAt + shadowDurationHours - now`. Also restate the auto-promote behaviour in the Dashboard `description`. | `src/server/index.ts:373-395`, `:704-726` |
| F9 | "vibe-mod: Undo this action" appears on **every** post & comment for every mod, regardless of whether vibe-mod acted on it. Mod only learns "no action found" after clicking. Clutters the menu. | MED | S | Can't conditionally show menu items in Devvit, **but**: rename to "vibe-mod: Undo (if vibe-mod removed this)" so the conditional is in the label; and when nothing's found, return a `showForm` (not toast) explaining clearly + offering "Open Dashboard". Consider `postFilter: 'currentApp'`? — N/A here since vibe-mod doesn't create posts. Accept the limitation; fix the label + the empty-state. | `src/server/index.ts:422-452`, `devvit.json:81-87` |
| F10 | Compose form: the rate-limit counter is in the `description` (`"Compiles used today: 3 / 50"`) but the `helpText` only gives ONE example. New mod doesn't know what facts/actions exist (account age? karma? link count? modqueue/flair/report/remove/ban?). | MED | S | Expand `helpText` to a 3–4 line "things you can reference: account age, karma, post age, # links, title caps, link domain… actions: send to mod queue, add flair, report, remove, (ban/mute if you check the box)". Add a 2nd `paragraph` field "Examples" pre-filled (`disabled: true`) with 3 sample rules. | `src/server/index.ts:127-152` |
| F11 | `allowGuarded` boolean is on the compose form but its consequence ("re-submit with the box checked") only appears as a toast *after* a rejected submit — round-trips the LLM call & burns quota. | MED | S | Move the gate earlier isn't possible (don't know the compiled actions yet), but: improve the rejection to a `showForm` that re-opens the composer **pre-filled** with `rule`, `clarificationAnswer`, and `allowGuarded: true` toggled, so one click re-submits. Don't re-call OpenAI? — must, but at least no re-typing. Also: the daily counter doesn't increment on a guarded-reject path (good) — keep that. | `src/server/index.ts:144-148`, `:261-271` |
| F12 | `dryRunOnly` (a powerful "log but never act" master switch, default true in `devvit.json`) is **never read in `executeActions`** path shown, and never surfaced in the Dashboard. Mods don't know the whole app is in dry-run mode. | **HIGH** | S | Confirm `executeActions` honours `dryRunOnly` (it's a settings key — `devvit.json:46-50`); if so, show a banner line in the Dashboard `description`: `⚠️ DRY-RUN MODE IS ON — rules only log, never act. Turn off in app settings to go live.` If it's *not* wired, that's a correctness bug for another report. | `devvit.json:46-50`, `src/server/index.ts:337-395` |
| F13 | No accessibility affordances beyond what Devvit gives (forms are native, so screen-reader-OK by default). But the Dashboard's information-as-ASCII-art (`  r_x: …`, leading-space indentation, `…` truncation) reads terribly in a screen reader and on narrow mobile. | MED | M | Replace the indented `description` blob with structured `group` fields (a `group` per section: "Active rules", "Draft rules", "Recent actions") containing `disabled` `paragraph` fields — semantic grouping, no fake indentation. Devvit `group` has a `label` + nested `fields`. | `src/server/index.ts:373-395` |
| F14 | Mobile (Reddit app): Devvit forms render as native sheets — fine. But a `description` containing ~20 lines of text + a `paragraph` default of a long rule will be a cramped scroll on a phone. The Dashboard especially. | MED | M | Same fix as F13 — split into `group`s so the phone can collapse/scroll sections, and cap "Recent actions" preview at 5 with a "see more" via a follow-up form. Set `lineHeight` on long `paragraph` fields so they're not 2-line slits. | `src/server/index.ts:380`, `:391` |
| F15 | "Why did this rule fire?" — the audit hash stores `ruleSourceNL`, `action`, `outcome`, `thingId` (`src/server/executor.ts:274-283`) but the Dashboard only shows `action (outcome) — first-60-chars-of-NL…`. No link to the post, no the matched-facts explanation. | MED | M | Add a Dashboard `select` "Inspect a recent action" → opens a form showing `Rule: <full sourceNL>`, `On: <permalink>`, `Result: <outcome>`, `When: <time>`, plus an "Undo" `boolean` if `outcome === 'applied' && !rolledBack`. Reuses existing audit data. | `src/server/index.ts:349-381`, `src/server/executor.ts:242-283` |
| F16 | Menu labels: "vibe-mod: View rules + log" is OK; "vibe-mod: Compose rule" — "compose" is jargon-y; "vibe-mod: Undo this action" implies an action you took. | LOW | S | "vibe-mod: New rule (plain English)" / "vibe-mod: Rules & activity log" / "vibe-mod: Undo (if vibe-mod removed this)". The `description` field is also shown — use it well. | `devvit.json:65-88` |
| F17 | Success path after compile says "check Dashboard in 30s" — but there's no notification when the dry-run finishes; mod has to poll. Toast is gone by then. | LOW | S | Can't push a toast from a scheduler job (docs: "Toasts will not work from scheduled jobs"). Acceptable. But the dry-run-replay job *could* `createModNotification` "Dry-run done for '<rule>': matched N/M posts — review & activate in the Dashboard." Optional, low-noise. | `src/server/index.ts:326-331`, `:699-702` |
| F18 | The form `description` is doing far too much work everywhere (compose, clarify, dashboard). It's not selectable/structured and there's no markdown. Long descriptions get truncated/awkward on mobile. | MED | S | Push detail into `helpText` on individual fields and into `group` labels; keep `description` to ≤2 lines of orientation. | `src/server/index.ts:132,217,388` |

---

## 3. Improved flow — screen by screen (Devvit primitives only)

### Screen 0 — Install (new: `on-app-install`)
- App seeds the 5 draft rules (unchanged).
- **NEW:** `reddit.modMail.createModNotification` →
  > **vibe-mod is installed.** I've pre-loaded 5 starter rules — they're sitting as
  > *drafts* and **nothing acts until you turn them on**. To review: subreddit menu →
  > **"vibe-mod: Rules & activity log"**. To write your own: **"vibe-mod: New rule (plain
  > English)"**. New rules run in shadow mode (log only) for 24h, then go live
  > automatically — you can stop or delete any rule any time.
- This is the *only* reliable first-run channel Devvit gives us. Use it.

### Screen 1 — "vibe-mod: New rule (plain English)" (menu → form)
Form `title`: `New rule for r/<sub>`
`description` (≤2 lines): `Type one rule in plain English. It compiles to a deterministic rule and runs in shadow mode (log only) for 24h before going live. Compiles today: 3/50.`
Fields:
1. `paragraph` `rule` — label "Your rule", `lineHeight: 4`,
   `helpText`: "You can reference: account age, karma, post age, # of links, ALL-CAPS title, link domain, NSFW, etc. Actions: send to mod queue · add flair · report · remove · (ban/mute only if you tick the box below)."
2. `paragraph` `examples` — `disabled: true`, `defaultValue`:
   `• "If an account under 1 day old posts, send it to the mod queue."`
   `• "If a comment is 80%+ caps and over 60 chars, report it."`
   `• "If a post links bit.ly or tinyurl, send it to the mod queue."`
3. `boolean` `allowGuarded` — "Allow this rule to ban or mute users (otherwise it can only remove)" — `helpText`: "Leave off unless you really mean it. You can always re-submit with this on."
`acceptLabel`: "Compile & preview" · `cancelLabel`: "Cancel"

### Screen 2a — Clarification (form, on `needsClarification`)
`title`: `One question about your rule`
`description`: the LLM's question.
Fields:
1. `paragraph` `conversationSoFar` — `disabled: true`, accumulates: original rule + every Q&A so far. (Fixes F5.)
2. `paragraph` `clarificationAnswer` — "Your answer", `lineHeight: 3`.
3. `boolean` `allowGuarded` — carried through.
`acceptLabel`: "Re-compile" — loops back here if the LLM asks again (now with full context).

### Screen 2b — Compile failure (form, replaces the "offline" toast)
`title`: `⚠️ Couldn't compile right now`
`description`: "The rule compiler is unavailable (OpenAI). Your text is saved — pick it up from the Dashboard's 'Resume last rule' option, or just retry below." *(implements F4)*
Field: `boolean` `retryNow` — "Try compiling again now". On true → re-run compile.

### Screen 2c — Validation / guarded reject (form, replaces those toasts)
`title`: `⚠️ This rule needs a small change`
`description`: the sanitized reason (e.g. "This rule would ban/mute users — re-submit with the 'allow ban/mute' box ticked if that's intended.").
Fields: pre-filled `paragraph rule` (editable), `paragraph clarificationAnswer` (carried), `boolean allowGuarded` (pre-toggled to `true` if that was the issue). `acceptLabel`: "Re-submit". *(F3, F11)*

### Screen 3 — Compile success (toast — this one's fine as a toast)
`appearance: 'success'`: `Compiled "<name>" as a draft. Dry-run is running — open "Rules & activity log" to see what it'd match, then activate it.`

### Screen 4 — "vibe-mod: Rules & activity log" (menu → form) — the redesign
`title`: `vibe-mod — r/<sub>`
`description` (≤3 lines): `<N> active · <M> draft · DRY-RUN MODE: ON ⚠ (rules only log; change in app settings)` *(F8, F12)*
Fields, using **`group`s** (F13/F14):
- **group "Rules"** — fields:
  - `select` `ruleToInspect` — options, one per rule, label =
    `r_new_account_fast_post — ACTIVE` / `r_low_karma — SHADOW (live in ~9h)` / `my_rule — DRAFT (dry-run: 4/25 matched)`. `helpText`: "Pick a rule to view / activate / disable / delete it."
- **group "Recent activity"** — fields:
  - `select` `actionToInspect` — last 10, label = `removed (applied) — "If a post links bit.ly…" — 2h ago`. `helpText`: "Pick one to see details / undo."
- **group "Bulk"** — fields:
  - `boolean` `activateAllDrafts` — "Activate ALL <M> draft rules now (they'll still run 24h shadow first)."
`acceptLabel`: "Apply" → routes to the chosen sub-screen.

### Screen 4a — Rule detail (form, from `ruleToInspect`)
`title`: `<rule name>`
`description`: full `sourceNL` + state + `if <rule was compiled> the compiled summary`.
If draft & has a dry-run result: a `paragraph` (disabled) listing `• "<post title>" by u/x → modqueue` per match (F6). If comment-only: the positive shadow-mode note (F7).
Fields: `select` `action` — `Activate this rule` / `Disable (keep but stop it firing)` / `Delete` / `Move back to draft`. `acceptLabel`: "Do it" → confirm form → toast.

### Screen 4b — Action detail (form, from `actionToInspect`)
`title`: `<action> by rule "<short name>"`
`description`: `Rule: <full sourceNL>` · `On: <permalink>` · `Result: <outcome>` · `When: <time>` · `Rolled back: yes/no`.
Field: `boolean` `undo` — only present if `applied && !rolledBack` — "Undo this action (restore the post/comment)". *(F15)* → toast.

### Screen 5 — "vibe-mod: Undo (if vibe-mod removed this)" (post/comment menu → form)
- If a matching applied action is found: confirm form → `rollbackAction` → success toast.
- If not found: `showForm` (**not** toast) `title: 'Nothing to undo here'`, `description: "vibe-mod hasn't acted on this item (or it was already restored, or the window expired). Open 'Rules & activity log' to see what vibe-mod has done."`. *(F9)*

### "Not a moderator" (any handler)
Replace the gray toast with `showForm` `title: 'Moderators only'`, short body. (Edge case, but currently a blink-and-miss toast.)

---

## 4. Do NOW vs LATER

### Do NOW (pre-submission, all S effort, big judging payoff)
- **F1** — install welcome modmail. Single biggest "understandable to new users" win.
- **F3 (partial)** — convert the *critical* error toasts (compiler offline, quota,
  validation, guarded-reject, not-a-mod, undo-failed) to `showForm`. ~6 call sites,
  mechanical change.
- **F4** — stash the failed-compose payload + a "Resume last rule" entry point. Stops
  the "type your rule again from scratch" rage path.
- **F8 + F12** — add the `<N> active · <M> draft · DRY-RUN: ON` + per-rule `SHADOW (live
  in ~Nh)` lines to the Dashboard `description`. ~15 lines of string-building.
- **F10** — expand the compose form `helpText` + add a disabled "Examples" paragraph.
- **F16** — rename the 3 menu items + write real `description`s. 4-line `devvit.json` diff.
- **F7** — reword the comment-only dry-run note from error-shaped to plan-shaped.

### LATER (post-hackathon, M effort)
- **F2** — per-rule activate/disable/delete via `select` + confirm-form chain. The
  proper Dashboard. (If time permits before submission, this is the #2 win after F1.)
- **F5** — accumulating clarification context across multiple LLM turns.
- **F6** — dry-run as its own screen with post titles + permalinks; raise sample size.
- **F13 / F14 / F18** — restructure Dashboard from ASCII blob to `group`/`paragraph`
  fields; mobile + screen-reader cleanup.
- **F15** — action-detail inspection screen + inline undo.
- **F11** — pre-filled re-submit form on guarded reject.
- **F17** — optional "dry-run finished" modmail from the scheduler job.

### Won't fix (Devvit limitation, document & move on)
- No conditional menu items → can't hide "Undo" on untouched items (F9): mitigate with
  the label + a clear empty-state form.
- No toast from scheduler/trigger context → no push when dry-run completes (F17): use
  modmail or accept polling.
- No red/error toast appearance, toasts auto-dismiss → never put must-read info in a
  toast; that's why F3 exists.
- No markdown in form `description` → structure via `group` labels & `helpText`, not
  formatting.

---

*Files referenced: `src/server/index.ts`, `devvit.json`, `src/shared/starter-rules.ts`,
`src/server/executor.ts`, `docs/devvit-reference.md` (Forms / Menu actions / Toasts
capability docs).*
