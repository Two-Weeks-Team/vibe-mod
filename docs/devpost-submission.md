# vibe-mod — Devpost submission write-up (draft)

> Working draft for the *Mod Tools and Migrated Apps Hackathon* submission (Best New Mod Tool track).
> Fill the `<<...>>` placeholders once the app is published and the demo recorded. Devpost's standard
> form has the 7 sections below ("Inspiration / What it does / How we built it / Challenges we ran into /
> Accomplishments we're proud of / What we learned / What's next"), plus tagline, "Built With", links,
> media, and (for this hackathon) a Project-Impact statement and the public repo link.
>
> Hard constraints to honor in copy and demo: LLM is build-time only (0 calls per post/comment),
> action whitelist, dry-run before activate, 24h shadow default, 30-day rollback, the LLM never sees
> Reddit content, v0.1 is English-only. Demo video: < 1 min, **no background music**.

---

## Tagline (one line, ~`<= 120` chars)

> Describe a moderation rule in plain English — vibe-mod compiles it to deterministic JSON, runs it in shadow mode first, undo on every action.

(Alternate: *"AutoMod power without the YAML: English in, deterministic rule out, shadow-tested, fully reversible."*)

## Elevator pitch (2–3 sentences, for the submission summary)

> vibe-mod lets a Reddit moderator write a rule in their own words — *"send to mod queue any post under
> 50 characters from accounts less than 7 days old"* — and compiles it, once at edit time, into a
> deterministic JSON rule that runs as plain TypeScript with zero AI calls per post. Every new rule
> starts in 24-hour shadow mode (logs what it would do, acts on nothing), ships with a dry-run preview
> against your recent posts, and keeps a one-click 30-day undo on everything it ever does. The language
> model never sees Reddit content — only the sentence the mod typed.

---

## 1. Inspiration

AutoModerator is the workhorse of Reddit moderation, but configuring it means hand-editing a YAML DSL
full of regex — a real wall for most moderators, and unforgiving when you get a pattern subtly wrong:
there's no preview, no dry run, and no built-in undo. We kept seeing the same pattern in r/ModSupport
and r/redditdev: people who know exactly what rule they want, in words, but can't (or don't want to)
express it in AutoMod's syntax.

The obvious 2025 instinct is "throw an LLM at moderation." We think that's the wrong shape — you don't
want a stochastic model making per-post calls on people's content. But there *is* a place an LLM fits
cleanly: as a **compiler**, translating one English sentence the moderator typed into a structured rule,
once, at edit time — with the output validated, previewable, and reversible. That's vibe-mod.

## 2. What it does

- **English → rule.** *Mod Tools → "vibe-mod: Compose rule"* → type the rule → **Compile + Preview**.
  OpenAI `gpt-5.4-mini` returns JSON; vibe-mod validates it against a strict Zod schema **and** an action
  whitelist before it can be stored. Ambiguous sentence? It asks a clarifying question instead of guessing.
- **Dry-run preview.** Before activation, the draft rule is replayed against your recent posts (zero
  actions) so you see exactly which posts it would have matched.
- **Shadow mode by default.** A newly activated rule runs shadow-only for 24h (default) — writes audit
  entries for what it *would* do, takes no action — then promotes itself automatically.
- **30-day rollback.** Whenever vibe-mod acts, *"vibe-mod: Undo this action"* appears on that item's `⋯`
  menu for 30 days; one click restores it.
- **Safety brakes.** Action whitelist (`report`/`flair`/`lock`/`modqueue`/`remove` are LLM-permitted;
  `ban`/`mute` need an explicit checkbox), a per-hour action circuit breaker, a per-subreddit daily
  compile quota, and a sub-level `dryRunOnly` master switch.
- **Audit log.** Every shadow decision and every live action is recorded (30-day retention), visible
  under *"vibe-mod: View rules + log"*. Five starter rules are seeded as shadow drafts on install.

**What it is not:** not an AI that reads your subreddit and decides things. The model runs exactly once
per rule edit, on the moderator's sentence only. Runtime evaluation is pure, deterministic, offline.

## 3. How we built it

- **Platform:** Devvit Web — Hono server on `@devvit/web`, all state in Devvit Redis, scoped per
  installation (`rules:active`, `rules:draft`, `audit` ZSet, `rollback:<id>` with 30-day TTL, quota
  counters). Triggers: `onPostSubmit` / `onCommentSubmit` / `onPostReport` / `onCommentReport` /
  `onAppInstall` / `onAppUpgrade`. Scheduler: audit retention (daily), dry-run replay (one-shot),
  shadow-promote check (every 15 min), rate-limit circuit breaker (every 5 min).
- **The compiler path:** moderator's sentence + a fixed system prompt + few-shot examples → OpenAI
  Chat Completions in `json_object` mode, `reasoning_effort: none`, `verbosity: low` (this is mechanical
  NL→JSON translation, not reasoning) → `Rule.parse()` (Zod v4, `.strict()`, closed fact/action
  enums, bounded nesting depth) → action-whitelist check → store as draft. The LLM is **never** given
  post bodies, comment bodies, or usernames.
- **The deterministic side:** an evaluator that builds a "fact bag" from the triggering item + author
  account + subreddit-scoped Redis state, then evaluates the rule's boolean tree (`all`/`any`/`not` +
  numeric/string/regex predicates over a closed set of fact paths). An executor that, in shadow,
  only logs; live, acts and writes a rollback token + audit entry. Zero network, zero model at this layer.
- **Model selection, measured:** built `npm run openai:smoketest` to fire the real system prompt +
  few-shot + 7 cases (5 compile, 2 ambiguous) at candidate models. `gpt-5.4-mini` was fastest (~1.1s
  median, 7/7), `gpt-5.4-nano` cheapest (~1.4s, 7/7), full `gpt-5.4` slower with no quality gain →
  `gpt-5.4-mini` is the default. Per compile: ≈1.3k input + ≈0.1k output tokens ≈ $0.0001 (free for
  accounts on OpenAI's daily-tier I/O-sharing program).
- **Testing without Devvit's runtime:** we couldn't assume the Devvit emulator exists (it doesn't), so
  we built a reusable in-memory Devvit testkit (Redis + Reddit + scheduler + settings + fetch doubles),
  168 unit/route tests calling `app.fetch()` directly, the official `@devvit/test` harness for the
  executor, fast-check property tests for the schema and evaluator, an `npm run acceptance` G1–G4 gate,
  and an `npm run replay` local event replayer. The actual Devvit routing/RPC is verified by
  `devvit playtest`.
- **Tooling:** `npm run doctor` (pre-deploy preflight: `devvit.json` integrity, fetch-domain↔permission
  parity, route↔config parity, Node engine), a self-contained `vite.config.ts` that emits the CJS server
  bundle Devvit expects, a self-built PNG encoder for the 1024×1024 app icon (no native deps), ESLint 9
  flat + Prettier + git hooks, and CI that runs all of the above plus a "server bundle loads" smoke.

## 4. Challenges we ran into

- **"Build-time-only LLM" had to be real, not a slogan.** It shaped the whole architecture: a closed
  fact-path enum, a strict schema the model's output must satisfy, a clarification path for ambiguity,
  and a hard rule that Reddit content never enters a prompt. Every feature got checked against it.
- **The Devvit runtime is a black box locally.** No emulator → we leaned hard on the testkit, the
  `@devvit/test` harness, and `npm run replay` to cover logic, and treated `devvit playtest` as the
  single integration check. Reading the entire non-game Devvit doc set (we crawled ~58 pages into
  `docs/devvit-reference.md`) surfaced real bugs before they'd ever have run — e.g. `devvit.json` was
  missing the required `server` block and we had no CJS server bundle build, so `devvit build` would
  have failed.
- **OpenAI API drift.** The first implementation sent `max_tokens` + `temperature`; the gpt-5.x family
  rejects both (`max_completion_tokens` only, default temperature only) — without the smoke test that
  would've meant *every* compile returning a 400 in production.
- **Devvit's settings/secrets model.** Secrets must be global to the app, not per-subreddit, and
  `devvit settings set` only works after the first upload — which reorders the "setup" steps in a
  non-obvious way. We documented the correct order in `docs/devvit-setup-guide.md`.
- **Doing the safety story right.** Action whitelist with an escape hatch for `ban`/`mute` only behind
  an explicit checkbox; a per-hour circuit breaker; a per-sub daily compile quota with optional BYOK;
  shadow-by-default with auto-promotion; 30-day rollback tokens with TTL. None of it is glamorous; all
  of it is the point.

## 5. Accomplishments we're proud of

- A genuinely **deterministic** AI mod tool — the model is a compiler, not a runtime decision-maker, and
  the codebase enforces that rather than just claiming it.
- A **safety net that's on by default**: dry-run preview, 24h shadow, 30-day undo, circuit breaker — a
  mod can't accidentally ship a destructive rule with one click.
- It's **cheap to the point of free** for the operator: ~$0.0001 per compile, $0 on OpenAI's free daily
  tier; $0 to host (Reddit hosts Devvit apps).
- **Tested like production despite no local runtime**: 168 tests + `@devvit/test` + property-based tests
  + an acceptance gate + a preflight doctor + green CI, and a documented conformance audit against the
  Devvit Web docs.
- Strong **reusability** spun out along the way: a project-agnostic Devvit testkit, a `new-mod-checklist`,
  and a full local-replay harness — useful for the next Devvit mod tool, not just this one.

## 6. What we learned

- **The right job for an LLM in moderation is "compiler", not "judge".** Constraining it to NL→JSON at
  edit time, with strict validation downstream, gets you the usability win without the per-post risk.
- **Read the whole platform doc set before you trust your build.** Crawling the Devvit docs caught
  `devvit build`-breaking config gaps and SDK mismatches that types and unit tests didn't.
- **If you can't emulate the runtime, over-invest in the layers you *can* test** — a good in-memory
  testkit + `app.fetch()` route tests + a replay harness covered ~everything except Devvit's own RPC.
- **Smoke-test the external API for real.** The `max_tokens`→`max_completion_tokens` and `temperature`
  issues were invisible until a real call was made.
- **Safety features are product features.** Shadow mode and one-click undo are what would make a mod
  actually trust an English-to-rule tool.

## 7. What's next

- **v0.2 — wider fact layer.** The current closed fact-path set (~22 paths) can't express several common
  rules: repost detection, cross-subreddit spam patterns, `content.isEdited`, account similarity, and
  language detection. Expanding it (schema fact paths + fact bag + system prompt) raises the capability
  ceiling toward AutoMod parity. (Tracked as a separate PR.)
- **Multi-language rule descriptions** (v0.1 is English-only by design).
- **Rule sharing / templates** between subreddits, and importing existing AutoMod rules as a starting
  point.
- **Richer dashboard:** per-rule hit-rate stats, false-positive flagging that feeds back into the next
  compile, side-by-side rule diffs.
- **Adopt `reddit.Filter()`** for the `modqueue` action where it fits.

---

## Devpost form fields

**Built With:** `typescript` · `reddit-devvit` · `devvit-web` · `hono` · `zod` · `openai` (gpt-5.4-mini)
· `redis` · `vite` · `vitest`

**Try it out / links:**
- Reddit App Directory listing: `<<https://developers.reddit.com/apps/vibe-mod — fill after publish>>`
- GitHub (public, MIT): https://github.com/Two-Weeks-Team/vibe-mod
- Project plan / design doc: https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod-final-plan.html
- Terms of Service: https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod/tos.html
- Privacy Policy: https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod/privacy.html
- Demo video (YouTube, < 1 min, no music): `<<fill after recording>>`

**Media:** demo video + ≥ 3 screenshots — compose form, dry-run preview, dashboard/audit log
(`<<capture from the live playtest/published app>>`).

**Project Impact (which Reddit communities will use this & how):**
> vibe-mod is built for the long tail of small-to-mid subreddits whose mod teams don't have an AutoMod
> specialist — exactly the communities AutoMod's syntax leaves behind. Concretely we're targeting
> `<<community 1 — e.g. a hobby sub the team mods>>`, `<<community 2>>`, and `<<community 3>>`, where the
> recurring need is "catch low-effort / new-account / ALL-CAPS posts" — rules that are one English
> sentence in vibe-mod and a fiddly regex block in AutoMod. Shadow mode + dry-run + 30-day undo mean a
> mod can adopt it without betting their queue on a rule they wrote in 20 seconds.
> *(Replace the placeholders with the actual demo/beta subreddits before submitting; keep each < 200
> subscribers and invite-only for the demo per hackathon rules.)*

**Hackathon / category:** Mod Tools and Migrated Apps Hackathon — Best New Mod Tool.

---

## Pre-submission checklist

- [ ] App published (`devvit publish --public`) and approved — or unlisted install link ready as fallback
- [ ] `<<App Directory URL>>` filled in everywhere above + in root `README.md`
- [ ] Demo video recorded (< 1 min, **no background music**, voiceover OK), uploaded to YouTube, captions (SRT)
- [ ] ≥ 3 screenshots captured from the live app
- [ ] `README.md` finalized (overview + installer instructions + changelog) — done in repo, re-check
- [ ] ToS + Privacy URLs reachable
- [ ] Project-Impact placeholders replaced with real communities
- [ ] Submitted on Devpost with ≥ 8h buffer before 2026-05-27 18:00 PT

---

_Draft: 2026-05-13. Edit freely; the hard constraints in the header are not negotiable._
