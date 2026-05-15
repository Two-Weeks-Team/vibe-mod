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

### "But doesn't Reddit's new Automations cover this?"

Reddit shipped **Automations** in 2026 — UI-driven Posting/Commenting triggers, keyword / regex / URL /
domain conditions, and a small set of actions (Display, Report, Block) gated by *User flair only*. It's
real progress for the easy case, and the floor is now much higher than YAML AutoMod. But the ceiling is
narrower than vibe-mod's, in three concrete ways:

- **Facts we can rule on.** Automations expose user **flair** as the only author signal. vibe-mod's
  closed fact-path enum gives a rule **nine** author signals — account age, post karma, comment karma,
  per-sub karma, sub-join age, mod status, verified-email, premium status, **sub-scoped author flair**
  (v0.0.50) — plus content signals (length, word count, all-caps ratio, non-ASCII ratio, URL count,
  domain, post-flair text + cssClass, NSFW/spoiler/video flags, crosspost flag), **time-of-day in UTC**
  (v0.0.50: hourOfDay + dayOfWeek), and three report signals. "Brand new account posting a link after
  midnight UTC" is one sentence in vibe-mod; it's not expressible in Automations.
- **Actions we can take.** Automations offer Display / Report / Block. vibe-mod's whitelist includes
  *report*, *flair*, *lock*, *modqueue*, *remove* (default-allowed) plus *ban*, *mute*, *permaban*,
  *approve* behind an explicit "Allow ban/mute/approve" checkbox at compile time — nine actions vs
  three. *Approve* (v0.0.50) is gated specifically because the LLM has a wider ambiguous path to it
  than to *remove* (positive paraphrases like "trust regulars" / "whitelist"), and a wrong approve is
  asymmetric: spam waved through, no undo.
- **Triggers.** Automations match on Posting and Commenting. vibe-mod also handles **report triggers**
  (`onPostReport` / `onCommentReport`) and **flair-change triggers** (`onPostFlairUpdate`, v0.0.50) so
  rules like "auto-remove a comment after 3 reports from distinct accounts" and "when the 'Spam' flair
  is applied, remove and lock the thread" are each one sentence.

### One language, many rules

vibe-mod is a general-purpose **rule compiler**: the same one-sentence interface that produces "Spam
flair → remove + lock" also produces "low-karma + 3 links → modqueue", "after midnight UTC → mod
review", and any combination of the 30+ facts and 9 actions inside the schema. Deterministic JSON
intermediate representation means the rule is auditable, diffable, version-control-friendly, and
shadow-testable before it goes live.

And on the safety story: Automations show a sandbox **preview** before activation; vibe-mod runs the
real rule in **24-hour shadow mode** against real traffic (logs everything it would do, acts on
nothing) with a **30-day one-click undo** on every live action. Both are valuable; they're not the
same thing.

If Automations is enough for the rule you want, use it — it's right there in the Reddit UI. The space
vibe-mod is built for is "I know exactly what rule I want, the existing UI doesn't have these knobs,
and I'd rather not learn AutoMod's YAML to express it."

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
- **Reactive flair triggers (v0.0.50).** Beyond user submissions, vibe-mod also listens for
  `onPostFlairUpdate` — a rule like *"when the 'Spam' flair is applied, remove and lock"* is one
  sentence. Dedupe keys compose (postId, flairTemplateId) so legitimate flair changes each fire while
  flair-bounce loops terminate after one hop.
- **Safety brakes.** Action whitelist (`report`/`flair`/`lock`/`modqueue`/`remove` are LLM-permitted;
  `ban`/`mute`/`approve` need an explicit checkbox — `approve` is gated because its failure mode is
  asymmetric: a wrong approve waves spam through and is non-reversible), a per-hour action circuit
  breaker, a per-subreddit daily compile quota, and a sub-level `dryRunOnly` master switch.
- **Audit log.** Every shadow decision and every live action is recorded (30-day retention), visible
  under *"vibe-mod: View rules + log"*. Six starter rules are seeded as shadow drafts on install
  (one of them showcases the new `onPostFlairUpdate` trigger).
- **Welcome onboarding (v0.0.50).** On first install, vibe-mod sends a one-time markdown welcome
  message to the mod team via the existing modmail notification API — three-step start guide + new
  trigger highlights — guarded by a never-expires Redis sentinel so re-installs after uninstall
  correctly re-onboard.

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
  211 unit/route tests calling `app.fetch()` directly, the official `@devvit/test` harness for the
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
- **Doing the safety story right.** Action whitelist with an escape hatch for `ban`/`mute`/`approve`
  only behind an explicit checkbox; a per-hour circuit breaker; a per-sub daily compile quota under
  a single developer-owned encrypted global key (v0.0.51 removed the per-sub key input — Devvit
  subreddit settings aren't encrypted, so accepting a key there would have exposed it plaintext to
  every mod of that sub); shadow-by-default with auto-promotion; 30-day rollback tokens with TTL.
  None of it is glamorous; all of it is the point.

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
- Reddit App Directory listing: <https://developers.reddit.com/apps/vibe-mod>  **(PUBLIC — approved 2026-05-15, ~11h after publish; anyone moderating any subreddit can install with one click. v0.0.50 enters re-review queue alongside this Devpost submission and will auto-upgrade r/SocialSeeding on approval.)**
- GitHub (public, MIT): https://github.com/Two-Weeks-Team/vibe-mod
- Project plan / design doc: https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod-final-plan.html
- Terms of Service: https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod/tos.html
- Privacy Policy: https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod/privacy.html
- Demo video (YouTube, < 1 min, no music): `<<TBD — record per docs/demo-scenario.md §3 then upload>>`

**Media:** demo video + 5 screenshots — Compose form, Clarify modal (with select options), Confirm form (humanizeRule output), Dashboard with onboarding card + dry-run preview, Manage rules per-rule action panel.
*(Auto-capture script: `scripts/chrome-reddit-screenshots.py` — produces all 5 PNGs from a live r/SocialSeeding session via browser_cookie3 + Playwright. See `docs/demo-scenario.md` §3 for the cut-by-cut shot list.)*

**Project Impact (which Reddit communities will use this & how):**
> vibe-mod is built for the long tail of small-to-mid subreddits whose mod teams don't have an AutoMod
> specialist — exactly the communities AutoMod's syntax leaves behind. As of **2026-05-15** the app is
> **publicly listed on the Reddit App Directory** (<https://developers.reddit.com/apps/vibe-mod>),
> meaning *any mod of any subreddit can install with one click* — no allowlist, no whitelist. The
> verified demo install runs on **r/SocialSeeding** (mod-team identity, Chrome-automated verify 16/16
> PASS at the v0.0.48 baseline, full v0.0.50 verification scheduled post-approval — see
> `scripts/chrome-reddit-verify-v050.py`).
>
> The communities where this lands first are the ones with the recurring "catch low-effort / new-account
> / ALL-CAPS / link-spam / flair-triggered cleanup" patterns: one English sentence in vibe-mod, a fiddly
> regex block in AutoMod. **Shadow mode + dry-run preview + 30-day undo + a one-time welcome modmail
> with the 3-step start guide** mean a mod can adopt it without betting their queue on a rule they
> wrote in 20 seconds.
>
> Phase 1.7b shipped a **per-rule control surface** (Manage rules menu) and a **compile-confirmation
> form** that renders the deterministic JSON as English before saving. v0.0.50 (in re-review now) adds
> the **onPostFlairUpdate trigger**, **author/post flair facts**, **UTC time-of-day facts**, the
> **approve action behind an explicit guard**, and **welcome onboarding modmail** — all directly aimed
> at the "I want to write rules but I'm not a YAML person" mod we're building for.

**Hackathon / category:** Mod Tools and Migrated Apps Hackathon — Best New Mod Tool.

---

## Pre-submission checklist

- [x] App **published AND approved PUBLIC** (`devvit publish --public` succeeded 2026-05-14, approval landed 2026-05-15 ~06:27 KST, ~11h ETA — anyone moderating any sub can install)
- [x] App Directory URL stable + flagged PUBLIC — `https://developers.reddit.com/apps/vibe-mod` (filled in submission body and root `README.md`)
- [ ] v0.0.50 re-publish after the trigger-expansion PR merge — enters review queue alongside Devpost submission **(USER ACTION — D-11 = 2026-05-16)**
- [ ] Demo video recorded — **two-stage strategy**: (Stage 1) v0.0.48 base 60s now, (Stage 2) v0.0.50 epilogue 30s after approval. Per `docs/demo-scenario.md` §3. **(USER ACTION)**
- [ ] 5 screenshots captured from the live app — auto-script `scripts/chrome-reddit-screenshots.py` (Phase 3, see this PR's siblings)
- [x] `README.md` finalized (overview + installer instructions + changelog) — done in repo as of v0.0.41
- [x] ToS + Privacy URLs reachable — both 200 on the GitHub Pages hosting
- [x] Project-Impact framing replaces "beta community 2/3" placeholders with the PUBLIC-listing message (anyone moderating any sub can install)
- [ ] Chrome verify on v0.0.50 new features post-approval — `scripts/chrome-reddit-verify-v050.py` (per [[feedback-chrome-verify-mandate]])
- [ ] Submitted on Devpost with ≥ 8h buffer before 2026-05-27 18:00 PT (D-day)

---

_Draft: 2026-05-13. Edit freely; the hard constraints in the header are not negotiable._
