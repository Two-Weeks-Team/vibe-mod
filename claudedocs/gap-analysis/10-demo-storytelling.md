# 10 — Demo & Storytelling Gap Analysis

_vibe-mod · Reddit "Mod Tools and Migrated Apps Hackathon — Best New Mod Tool ($10K)" · deadline 2026-05-27_
_Scope: README.md, docs/README-vibe-mod.md, docs/devpost-submission.md, HANDOFF.md, docs/devvit-setup-guide.md, claudedocs/hackathon-audit-*.html, src/server/index.ts, src/shared/starter-rules.ts. Read-only analysis._

---

## 1. Summary

The **written narrative is genuinely strong** — sharper than most hackathon copy. The "AI as a *compiler*, not a judge" framing is already the spine of the README (`README.md:26-28`) and the Devpost Inspiration section (`docs/devpost-submission.md:40-43`), and it's the right, memorable thesis. The safety story (shadow / dry-run / undo) is present everywhere. So the gaps here are **not "rewrite the story"** — they are:

1. **Nothing visual exists yet, and the product's UI is unusually un-visual.** vibe-mod has *no custom UI* — every surface is a native Devvit form (a modal with a text `title` + a multi-line text `description`) or a toast. The "dry-run preview" the copy keeps promising is **text lines inside the Dashboard form's `description` string** (`src/server/index.ts:357-381`), and it appears *after a 30-second scheduler delay* — the compose form just returns a toast saying "check Dashboard in 30s" (`src/server/index.ts:326-331`). A demo script written as if there's a live, lighting-up preview panel will not survive contact with the real screen. The script in §3 is built around what the forms/toasts can actually render.
2. **The Devpost write-up has placeholder rot in the two places judges actually weight: the link block and the Project-Impact statement** (`docs/devpost-submission.md:166-185`). Three `<<community N>>` placeholders and an unfilled App Directory URL in a submission = an incomplete submission.
3. **The "Migrated Apps" half of the hackathon name is unaddressed, and there's a missed framing opportunity** — vibe-mod is net-new (not a Devvit-platform port), but it has a legitimate *"replaces / migrates-off AutoMod"* story that the copy half-tells and should tell deliberately (it's competing in the **Best New Mod Tool** track, so "new" is fine — but the AutoMod-migration angle is the strongest "why now / why this" hook and it's currently buried in §1 and §7).
4. **No screenshots can exist until the app is installed** (still pending the Devvit wizard per `HANDOFF.md` / `docs/devvit-setup-guide.md`), and the screenshot *plan* doesn't exist either — `docs/devpost-submission.md:174` just says "compose form, dry-run preview, dashboard/audit log" with no framing direction. §4 fixes that.
5. **The single most memorable line is not yet chosen and surfaced consistently.** Candidates are scattered: README H1 "Write a moderation rule. In plain English. It works." (`README.md:3`), the tagline "AutoMod power without the YAML…" (`docs/devpost-submission.md:19`), and the thesis "the right job for an LLM in moderation is *compiler*, not *judge*" (`docs/devpost-submission.md:135`). Pick one, lead every asset with it. Recommendation in §5.

**Bottom line for effort:** the story is ~85% there; the work is (a) producing assets that match a deliberately-plain UI, (b) de-placeholdering Devpost, (c) promoting the AutoMod-migration hook, (d) recording a 60s screen-capture with voiceover. All of it is gated on the user finishing the Devvit wizard → upload → playtest (the long pole, per `docs/devvit-setup-guide.md` Step 7 — start by ~D-9 / 2026-05-18).

---

## 2. Findings table

| # | Asset / narrative gap | Severity | Effort | Fix |
|---|---|---|---|---|
| F1 | Demo video does not exist; the product has no custom UI, so a generic "preview panel lights up" script is unfilmable. The dry-run preview is text inside a form's `description` and is delayed 30s behind a scheduler job (`src/server/index.ts:326-331`, `:357-381`). | **CRIT** | M | Use the §3 shot list, built around forms + toasts; pre-stage data so the Dashboard already shows dry-run results when you open it; lower `shadowDurationHours` so the live-action→undo beat is filmable in one take. |
| F2 | Devpost link block has unfilled `<<App Directory URL>>` and `<<demo video>>` placeholders (`docs/devpost-submission.md:166-172`), and root `README.md:170` Links section is missing the App Directory listing. | **CRIT** | S | Fill `https://developers.reddit.com/apps/vibe-mod` everywhere the moment `devvit upload` succeeds; add YouTube URL after recording. |
| F3 | Project-Impact statement is three `<<community N>>` placeholders (`docs/devpost-submission.md:177-185`). A submission with this unfilled reads as incomplete to judges. | **CRIT** | S | Name 1–3 real subreddits the team mods (must be the <200-sub invite-only demo subs per hackathon rules — see audit HTML); state the recurring rule each one needs in one English sentence. Rewrite in §5. |
| F4 | Screenshots don't exist and the plan is one undifferentiated sentence (`docs/devpost-submission.md:174`). | **HIGH** | S | Capture the 4 framed shots in §4 during playtest; annotate 2 of them with callout arrows. |
| F5 | "Migrated Apps" half of the hackathon name is unaddressed. vibe-mod is net-new on Devvit Web — fine for *Best New Mod Tool* — but the *"migrate off AutoMod"* angle (currently in `docs/devpost-submission.md:38-43` and `:153-156`) is the strongest hook and is buried mid-paragraph and in "What's Next". | **HIGH** | S | Promote AutoMod-as-the-thing-you're-migrating-from to the *first sentence* of the tagline + Inspiration; add a one-line "Not a platform port — a migration *path* off AutoMod's YAML" note to pre-empt the category question. See §5. |
| F6 | No single chosen "money line." Three candidates scattered across README/Devpost (`README.md:3`, `docs/devpost-submission.md:19`, `:135`). | **HIGH** | S | Adopt **"The LLM is a compiler, not a judge — it never sees a single post."** as the spine; lead the video VO, the Devpost tagline, and the README pull-quote with it. |
| F7 | The copy promises a "dry-run preview against your recent posts" in a way that implies a rich visual; the implementation samples **10 posts** (`DRY_RUN_SAMPLE = 10`, `src/server/index.ts:624`) and renders `"  ruleId: would match 2/10 recent post(s) → modqueue"` (`:363-367`). Demo and screenshots must show *that exact text*, not a mock. | **MED** | S | Frame screenshot #2 on the real Dashboard `description` text; in the VO say "it tells me it would have caught 2 of my last 10 posts" — concrete, true, and more credible than a slick panel. |
| F8 | README says screenshots are "added once the app is running" (`README.md:15`) and Devpost media line is a `<<capture…>>` placeholder (`docs/devpost-submission.md:174`) — i.e. the front page a judge lands on currently has zero imagery. | **MED** | S | Same fix as F4; also drop one screenshot (the compose form) into `README.md` right under the H1. |
| F9 | The model name drifts between docs: README/Devpost say `gpt-5.4-mini` is the default; `docs/README-vibe-mod.md:27` says `gpt-5.4-nano` is the default with `mini` as the "premium option". Code default is `gpt-5.4-mini` (`src/server/index.ts:37` n/a — `:792`, `:290`). A judge who reads both will notice. | **MED** | S | Make `docs/README-vibe-mod.md:27` match the others: `gpt-5.4-mini` default, `nano` cheaper alt, full `5.4` no quality gain. |
| F10 | "What's next" lists "importing existing AutoMod rules as a starting point" (`docs/devpost-submission.md:155`) — but if the AutoMod-migration angle is promoted to the headline (F5), this line needs to be honest that it's *future*, not implied-shipped. | **MED** | S | Keep it in §7, but in §2 ("What it does") add one sentence: "AutoMod-rule import is on the roadmap (v0.2); today you re-describe the rule in English — which is usually shorter than the YAML anyway." |
| F11 | The "no background music" choice is asserted (HANDOFF / task brief) but never *explained* anywhere — a judge won't know it was deliberate. | **LOW** | S | One line in the Devpost media notes / video description: "No music — moderators watch these at work with the sound on or off; the voiceover carries everything, and silence keeps the captions legible." |
| F12 | Elevator pitch (`docs/devpost-submission.md:23-28`) and "What it does" (`:45-60`) are near-duplicates of the README — fine, but the pitch buries the killer fact (zero AI calls per post) in sentence 2. | **LOW** | S | Reorder so sentence 1 of the elevator pitch *is* the money line (F6). |
| F13 | No accessibility / captions plan for the video beyond a checklist tick (`docs/devpost-submission.md:195` "captions (SRT)"). | **LOW** | S | Write the SRT from the VO script in §3 (it's already timed); state in the video description that captions are provided. |

---

## 3. Demo video — full ≤60s shot list (no music, voiceover + on-screen action)

**Format:** screen recording of the actual subreddit (desktop web), one continuous take if possible, voiceover added in post. No music. Captions burned in or SRT attached. Total target: **55–58s**.

**Pre-staging required (do this before you hit record):**
- In the demo sub's app settings, set `shadowDurationHours` to `0` (so an activated rule acts immediately — `src/server/index.ts:707` reads this; `:719` promotes when `now - createdAt >= cutoff`, so `0` → live on next 15-min check, or trigger the `shadow-promote-check` job manually). Alternatively leave it at 24h and just narrate "after 24h it goes live" over a pre-made post — but a real live action + real undo is far stronger, so prefer `shadowDurationHours: 0`.
- Pre-create 2 short "test" posts in the sub (one ~20 chars, from a fresh-ish account if you can) so the dry-run actually matches something and there's a live target for the undo beat. Wait the ~30s after compiling so the Dashboard already shows the dry-run result when you open it on camera — **do not film the 30s wait.**
- Have the post that will be auto-removed already submitted; you'll trigger the rule on it live.

| # | Time | On-screen action | Voiceover line |
|---|---|---|---|
| 0 | 0:00–0:05 | Cold open on the subreddit's Mod Tools menu, cursor hovering **"vibe-mod: Compose rule"**. Title card overlay (no music): **"vibe-mod — describe a mod rule in plain English."** | "This is vibe-mod. You write a moderation rule the way you'd say it out loud." |
| 1 | 0:05–0:16 | Click the menu → the native compose form opens. Type into the paragraph field, visibly: *"Send to mod queue any post under 50 characters from accounts less than 7 days old."* Cursor moves to **"Compile + Preview"**, clicks. | "Type the rule. No YAML, no regex. Hit compile — and here's the important part: the only thing OpenAI ever sees is *that sentence I just typed*. It never touches a single post or comment." |
| 2 | 0:16–0:21 | Toast appears: *"Compiled rule "…". Dry-run started — check Dashboard in 30s."* (cut here — the wait is pre-done off-camera). | "It compiles, once, into a plain JSON rule — and immediately dry-runs it against my recent posts." |
| 3 | 0:21–0:33 | Open **"vibe-mod: View rules + log"** (the Dashboard form). Camera frames the form's `description` text: "Draft rules: 1 / Dry-run preview (draft rules): ruleId: would match 2/10 recent post(s) → modqueue". Highlight that line. | "The dashboard tells me exactly what it *would* do — it would have caught two of my last ten posts, and sent them to the queue. Nothing's happened yet. I can see it before I trust it." |
| 4 | 0:33–0:40 | In the Dashboard form, tick **"Promote draft → active"** → submit. Toast: *"Draft activated. Shadow mode is ON by default…"* (with `shadowDurationHours: 0` it's effectively live; narrate accordingly, or keep it honest: "by default it runs in shadow for 24 hours first — I've shortened that for this demo"). | "When I'm ready, I activate it. By default it runs in shadow mode first — logging, not acting — so a rule I wrote in twenty seconds can't blow up my queue." |
| 5 | 0:40–0:50 | Cut to a freshly-submitted short post in the sub → refresh → it's been removed / sent to modqueue by vibe-mod. Open that post's `⋯` menu → **"vibe-mod: Undo this action"** is there → click it → toast: *"Rolled back."* → post is back. | "Here it caught a post. And if I disagree — every action vibe-mod ever takes has a one-click undo, for thirty days. One click. It's back." |
| 6 | 0:50–0:58 | End card (no music): **"vibe-mod"** / "AI as a *compiler*, not a judge." / "Built on Reddit Devvit · MIT · github.com/Two-Weeks-Team/vibe-mod" / "developers.reddit.com/apps/vibe-mod" | "The model is a compiler — it turns your sentence into a rule, once. It never judges your community. That's the whole idea." |

**SRT note (F13):** the table above is already timestamped — convert directly to `vibe-mod-demo.srt` and attach it to the YouTube upload. State in the video description: "No background music by design; full captions provided."

**If `shadowDurationHours: 0` doesn't behave on camera:** fall back to keeping shadow at 24h, and replace shots 5–6 with: open the Dashboard → frame an **audit-log entry** that says `modqueue (shadow) — <rule text>` (the `recent.slice(0,10)` lines, `src/server/index.ts:380`) → VO: "In shadow mode it logs what it *would* do — here's the entry — and after 24 hours it promotes itself. When it does act, that undo button is on the post." You lose the live undo demo but keep honesty; weigh that against re-shoot time.

---

## 4. Screenshots to capture (≥3; capture 4, annotate 2)

All from the live playtest/published app, desktop web, in the <200-sub demo subreddit.

1. **The compose form, mid-typing.** Frame the whole native form: title "Compose rule for r/<sub>", the help text "Compiles used today: N / 50", the paragraph field with the example sentence visibly typed in it, the "Allow ban/mute" checkbox unticked, and the **"Compile + Preview"** button. _Annotate:_ arrow to the paragraph field — "plain English, no syntax." This is the hero shot; also embed it in `README.md` under the H1.
2. **The Dashboard showing a real dry-run result.** Frame the form `description` text block: "Active rules: 1 / Draft rules: 1 / Recent actions: 3 / Dry-run preview (draft rules): … would match 2/10 recent post(s) → modqueue / Recent actions: modqueue (shadow) — <rule NL>…". _Annotate:_ highlight the "would match 2/10" line — "it tells you before you trust it." This is the proof that "dry-run" is real, not marketing.
3. **The undo affordance on a post's `⋯` menu.** A removed/queued post with its overflow menu open, **"vibe-mod: Undo this action"** visible in the list. (No annotation needed — it speaks for itself.)
4. **The audit log / "Recent actions" lines in the Dashboard**, ideally showing a mix of `(shadow)` and `(applied)` outcomes plus a `(rolled back)` one if you can stage it. Demonstrates the accountability story. _Optional 5th:_ the app **Settings** screen showing `dryRunOnly`, `maxActionsPerHour`, `shadowDurationHours` — proves the safety knobs are real, not a slide.

(Devpost requires ≥3; 1–3 are the must-haves, 4 is the strong nice-to-have.)

---

## 5. Marked-up critique of `docs/devpost-submission.md` (rewrites for the weak parts)

Section-by-section. The doc is in good shape — flagging only what's weak, generic, or placeholdered.

### Tagline (`:15-19`) — **REWRITE**
**Current:** "Describe a moderation rule in plain English — vibe-mod compiles it to deterministic JSON, runs it in shadow mode first, undo on every action." (alt: "AutoMod power without the YAML…")
**Problem:** It's a feature list, not a hook. Buries the one idea that makes a judge stop scrolling.
**Rewrite (≤120 chars):**
> **The AI is a compiler, not a judge — it never reads a post. Write a mod rule in English; vibe-mod compiles it, shadow-tests it, and keeps a 30-day undo.**

(If too long for Devpost's field, drop the second sentence: *"The AI is a compiler, not a judge — it never reads a single post or comment."*)

### Elevator pitch (`:23-28`) — **REORDER**
**Problem:** Sentence 1 leads with "lets a moderator write a rule in their own words" (true, but every AI-mod-tool says that). The differentiator — *zero AI calls per post, model never sees content* — is sentence 3.
**Rewrite (lead with the money line):**
> The 2025 instinct is to point an LLM at a subreddit and let it decide things. vibe-mod does the opposite: the language model is a **compiler**. A moderator writes a rule in plain English — *"send to mod queue any post under 50 characters from accounts less than 7 days old"* — and the LLM translates that one sentence, once, at edit time, into a deterministic JSON rule. From then on it's plain TypeScript: zero AI calls per post or comment, and the model has never seen a single post body, comment, or username. Every new rule starts in 24-hour shadow mode (logs what it would do, acts on nothing), ships with a dry-run preview against your recent posts, and keeps a one-click 30-day undo on everything it ever does.

### 1. Inspiration (`:32-43`) — **PROMOTE THE AUTOMOD-MIGRATION HOOK; otherwise fine**
**Strength:** the "compiler not judge" turn at `:40-43` is the best paragraph in the doc — keep it verbatim.
**Weakness:** the AutoMod pain is stated well at `:34-38` but the *migration* framing (this is the path *off* AutoMod's YAML) is implicit. Given the hackathon is "Mod Tools **and Migrated Apps**", make it explicit in one added sentence at the end of `:38`:
> Add: "We didn't want to *port an old app to a new platform* — we wanted to give moderators a migration *path off AutoMod itself*: keep the rule, drop the YAML."

This pre-empts "is this a migrated app?" without overclaiming (you're in the *Best New Mod Tool* track — "new" is the right word; the migration is conceptual, AutoMod→English).

### 2. What it does (`:45-63`) — **ADD ONE HONESTY LINE (F10)**
After the bullets, before "What it is not:", add:
> "AutoMod-rule *import* is on the roadmap (v0.2). Today you re-describe the rule in English — which, for the common cases, is shorter than the AutoMod YAML it replaces."
**Otherwise:** the "What it is not" paragraph (`:62-63`) is excellent — it's doing the heavy lifting. Keep.

### 3. How we built it (`:66-95`) — **STRONG, MINOR TRIM**
This section is detailed and credible. The model-selection paragraph (`:81-85`) with measured numbers is a real proof point — keep. Only nit: `:86-91` ("Testing without Devvit's runtime") is long; a judge skims it. Lead that bullet with the punchy version — "We assumed the Devvit emulator doesn't exist (it doesn't), so we over-built the layers we *could* test: 168 route tests via `app.fetch()`, the official `@devvit/test` harness, fast-check property tests, an acceptance gate, a replay harness." — then the rest as supporting detail.

### 4. Challenges (`:97-117`) — **STRONG, NO CHANGE**
The five challenges are concrete and honest (the `max_tokens`→`max_completion_tokens` one at `:108-110` is a great "we actually shipped and hit reality" detail). Leave it.

### 5. Accomplishments (`:119-131`) — **TRIM ONE BULLET**
`:130-131` ("Strong reusability spun out along the way: a project-agnostic Devvit testkit…") is true but reads as scope-padding to a judge evaluating a *mod tool*. Either cut it or compress to half a line. The first four bullets are the ones that matter.

### 6. What we learned (`:133-144`) — **NO CHANGE** (it correctly echoes the thesis at `:135`).

### 7. What's next (`:146-157`) — **MINOR**
Fine. If F5/F10 land, make sure `:155` ("importing existing AutoMod rules") is consistent with the "roadmap, not shipped" honesty line you added to §2.

### Built With (`:163-164`) — **NO CHANGE** (accurate; matches `package.json`).

### Try it out / links (`:166-172`) — **DE-PLACEHOLDER (F2)**
- `:167` → fill `https://developers.reddit.com/apps/vibe-mod` immediately after `devvit upload`.
- `:172` → fill the YouTube URL after recording.
- Also: add the App Directory link to root `README.md:170` Links section (currently missing it — F2/F8).

### Media (`:174`) — **REPLACE WITH THE §4 PLAN (F4)**
Replace "demo video + ≥ 3 screenshots — compose form, dry-run preview, dashboard/audit log (`<<capture…>>`)" with the specific framed shots from §4 of this doc. Add the F11 note: "No background music — moderators watch these with the sound off; the voiceover carries everything and silence keeps captions legible."

### Project Impact (`:177-185`) — **REWRITE — THIS IS THE WEAKEST PART OF THE DOC (F3)**
**Current:** three `<<community N>>` placeholders + a hedge paragraph.
**Why it's weak:** Project-Impact is a *scored* field in this hackathon (per `claudedocs/hackathon-audit-…html`). A placeholder here is a self-inflicted wound. It needs *named* communities and a *specific* recurring rule for each.
**Rewrite template (the team fills the three sub names — must be the <200-sub invite-only demo subs per hackathon rules, and the team must actually moderate them):**
> vibe-mod is built for the long tail of small-to-mid subreddits whose mod teams don't have an AutoMod specialist — exactly the communities AutoMod's syntax leaves behind. We're piloting it in **r/<sub-1>** (a <hobby/niche> community of ~<N> members), where the recurring need is "catch ALL-CAPS rant titles before they hit the front page" — one English sentence in vibe-mod, a fiddly regex block in AutoMod; **r/<sub-2>**, where new accounts dropping link-only posts is the daily fight — vibe-mod rule: *"if a new account posts only a link, send it to the mod queue"*; and **r/<sub-3>**, where low-effort one-line posts need a nudge — *"flair any post under 50 characters as 'add more detail?'"*. In all three, shadow mode + dry-run + 30-day undo are what let a part-time mod adopt the tool without betting the queue on a rule they wrote in twenty seconds. Beyond the pilots, anyone running AutoMod today is a candidate: vibe-mod doesn't replace AutoMod's reach, it replaces the part where you have to *write YAML* to use it.
> _(All pilot subs are <200 subscribers and invite-only for the demo period, per hackathon rules.)_

If the team genuinely doesn't moderate three subs: name *one* real one, describe two *concrete hypothetical* communities ("a 5k-member regional sub", "a 500-member fan community") with their actual rules — specificity beats placeholders even when one is hypothetical.

### Pre-submission checklist (`:191-201`) — **NO CHANGE** (it's correct; just execute it).

---

## 6. Do NOW vs LATER

**Do NOW (don't need the running app — do today):**
- F5/F6: Pick the money line ("**The AI is a compiler, not a judge — it never reads a post**"), rewrite the Devpost tagline (`:15`) and elevator pitch (`:23`) to lead with it, add the AutoMod-migration sentence to Inspiration (`:38`), add the AutoMod-import-is-roadmap honesty line to "What it does" (`:62`).
- F3: Draft the Project-Impact rewrite with the three real sub names filled in (the team knows which subs; do it now while you have the context).
- F9: Fix the model-name drift in `docs/README-vibe-mod.md:27` to match the others (`gpt-5.4-mini` default).
- F11/F13: Write the "no music, here's why" line and pre-write the SRT from the §3 VO script.
- F2/F8: Pre-write the link block with `https://developers.reddit.com/apps/vibe-mod` (it's already the known URL — the app is uploaded per HANDOFF), add it to `README.md:170`. Only the YouTube URL is genuinely blocked on later.
- Trim the two padding bullets (`:130-131`, and tighten `:86-91`).

**Do LATER (gated on `devvit upload` → `devvit playtest` per `docs/devvit-setup-guide.md` — start by ~D-9 / 2026-05-18):**
- F1: Record the 60s video per the §3 shot list. **Pre-stage data first** (set `shadowDurationHours: 0`, pre-create the test posts, do the 30s dry-run wait off camera).
- F4/F7: Capture the 4 screenshots per §4; annotate #1 and #2; embed #1 in `README.md`.
- Upload video to YouTube with the SRT and the "no music by design" note in the description.
- Final pass: fill the YouTube URL in `docs/devpost-submission.md:172` and `README.md`; run the `:191-201` pre-submission checklist; submit on Devpost with ≥8h buffer before 2026-05-27 18:00 PT.

---

_Written 2026-05-13. Read-only analysis — no repo files modified. Cross-ref: `claudedocs/hackathon-audit-20260512-reddit-mod-tools.html` (deadlines, required deliverables), `docs/devvit-setup-guide.md` Steps 5–8 (the human path that gates all the LATER items)._
