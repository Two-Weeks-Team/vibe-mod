# vibe-mod

**Write a moderation rule. In plain English. It works — deterministically, in shadow mode first, with one-click undo.**

[![CI](https://github.com/Two-Weeks-Team/vibe-mod/actions/workflows/ci.yml/badge.svg)](https://github.com/Two-Weeks-Team/vibe-mod/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
&nbsp;·&nbsp; Built on [Reddit Devvit](https://developers.reddit.com/) · for the *Mod Tools and Migrated Apps Hackathon* — Best New Mod Tool

> A moderator types *"Send to mod queue any post under 50 characters from accounts less than 7 days old."*
> vibe-mod compiles that sentence into a **deterministic JSON rule**, runs it in **24-hour shadow mode**
> (logging what it *would* do, acting on nothing), shows a **dry-run preview** against recent posts,
> and keeps **30-day rollback** on every action it ever takes. The LLM is used **only at rule-edit
> time** — zero AI calls per post or comment, and the LLM never sees Reddit content.

_Screenshots (compose form · dry-run preview · audit log) are added once the app is running in a test community — see [`docs/devvit-setup-guide.md`](./docs/devvit-setup-guide.md)._

---

## 📦 Submission baseline & build versions (read this first)

vibe-mod has **two builds that judges may encounter**, and they are deliberately not the same. This section is the canonical statement of which is which.

| Build | What it is | Where it lives | Contains |
|---|---|---|---|
| **v0.0.49** | **Reddit App Directory listed build** — the build a judge installs from the listing | <https://developers.reddit.com/apps/vibe-mod> (approved & PUBLIC since 2026‑05‑15) | The full mod-tool flow: English→JSON compile, dry-run preview, 24h shadow, 30-day rollback, audit log, action whitelist, circuit breaker |
| **v0.0.51** | **Repo HEAD — security-hardened build** (commit [`7ad2f85`](https://github.com/Two-Weeks-Team/vibe-mod/commit/7ad2f85)) | this repository's `main` | Everything in v0.0.49 **plus** the post-publish changes below |

**Treat v0.0.49 as the canonical "install and try it" build.** Everything described in *For moderators* below is present in v0.0.49.

### What changed *after* v0.0.49 (repo-only unless/until republished)

These are in the repo (v0.0.50 → v0.0.51) but are **not** guaranteed to be in the App Directory build you install. Do **not** assume they are live in the listing:

- **v0.0.50** (commit [`b376d88`](https://github.com/Two-Weeks-Team/vibe-mod/commit/b376d88)) — `onPostFlairUpdate` trigger, dashboard multi-line render, Chrome live-verify script.
- **v0.0.51** (commit [`7938bd0`](https://github.com/Two-Weeks-Team/vibe-mod/commit/7938bd0), PR #54) — **security fix: removed the per-subreddit "bring-your-own OpenAI key" (BYOK) input.** Devvit subreddit-scoped settings are not encrypted (only `settings.global` with `isSecret: true` is), so a per-sub key input would have exposed a pasted key in plaintext to every moderator of the sub. v0.0.51 deletes that input; every install now compiles through the single shared, encrypted developer key under the same uniform per-subreddit daily quota.
- **Repo HEAD also adds** a read-only multi-rule **conflict preview** (see [`docs/conflict-handling.md`](./docs/conflict-handling.md)) that is **not** in the v0.0.49 listing.

> **Versioning note.** The `v0.0.x` numbers are **Devvit App Directory build numbers** assigned by the platform at `devvit publish` time. They are **not** git tags and **not** the npm `version` in `package.json` (which is an unrelated `0.1.0`). v0.0.50 and v0.0.51 were submitted to the publish re-review queue on 2026‑05‑15; **as last verified (2026‑05‑21) the App Directory still serves v0.0.49 as the approved listed build.** Promoting repo HEAD (v0.0.51) to the listing requires another Reddit review (observed turnaround ≤1 day on the v0.0.49 submission). Full version/CI/verification matrix: [`docs/release-baseline.md`](./docs/release-baseline.md).

---

## 📊 Moderator impact

Split honestly into **architectural facts** (true by construction, verifiable in this repo today) and **to‑measure** metrics (defined precisely but needing a real-subreddit pilot — *not asserted as results*). Full breakdown with file-level citations: [`docs/impact.md`](./docs/impact.md).

**Architectural facts (verify in code now):**

| What | Value | Verify |
|---|---|---|
| LLM calls per post/comment at runtime | **0** (pure-TS evaluator, no network) | [`src/server/evaluator.ts`](./src/server/evaluator.ts) |
| LLM calls per rule | exactly **1**, at edit time | [`src/server/routes/compose.ts`](./src/server/routes/compose.ts) |
| New-rule blast radius for first 24h | **0 live actions** (shadow default on) | `shadow: true` in [`rule-schema.ts`](./src/shared/rule-schema.ts) |
| Live action reversibility | **100% for 30 days** (per-action undo) | [`src/server/executor.ts`](./src/server/executor.ts) |
| Reddit content sent to the LLM | **none** (only the mod's typed sentence) | README *Fetch domains* |

**Metrics to measure in a pilot (defined, not claimed):** dry-run match rate · false-positive rate across the dry-run→shadow→live→undo workflow · moderator authoring/triage time saved · shadow decisions reviewed before promotion · rollback-usage and audit-open rates. Each has a definition and a data source in [`docs/impact.md`](./docs/impact.md) and is labelled **to measure**.

**Headline:** a moderator incurs **zero risk of irreversible action for at least 24h** and **zero per-post inference cost forever** — the model does its one job before the rule is ever stored.

---

## Why this exists

[AutoModerator](https://www.reddit.com/wiki/automoderator/) is powerful but writing it means hand-editing
a YAML DSL with regex — a real barrier for most mods, and easy to get subtly wrong with no safety net.
vibe-mod's bet: **let mods describe the rule in their own words, compile it to something deterministic and
inspectable, and never let a freshly-written rule act without a shadow period, a preview, and an undo.**

What it deliberately is **not**: it is not an AI that reads your subreddit and decides things. The
language model translates *one English sentence the moderator typed* into JSON, once, at edit time. Rule
evaluation at runtime is plain TypeScript — no network, no model, fully reproducible.

---

## What it does

- **English → rule.** Open *Mod Tools → "vibe-mod: Compose rule"*, type the rule, hit **Compile + Preview**.
  OpenAI (`gpt-5.4-mini` by default) returns a JSON rule; it's validated against a strict
  [Zod](https://zod.dev/) schema **and** an action whitelist before it can be stored. If the sentence is
  ambiguous, vibe-mod asks a clarifying question instead of guessing.
- **Dry-run preview.** Before you activate anything, vibe-mod replays the draft rule against your recent
  posts (no actions taken) and shows which ones it would have matched.
- **Shadow mode by default.** A newly activated rule runs shadow-only for `shadowDurationHours`
  (default 24h) — it writes audit entries for what it *would* do, takes no action — then promotes itself.
- **30-day rollback.** Any time vibe-mod acts on a post/comment, *"vibe-mod: Undo this action"* appears on
  that item's `⋯` menu for 30 days. One click restores it.
- **Safety brakes.** An action whitelist (`report` / `flair` / `lock` / `modqueue` / `remove` are
  LLM-permitted; `ban`/`mute` require an explicit moderator checkbox), a per-hour action circuit breaker,
  a per-subreddit daily compile quota, and a sub-level `dryRunOnly` master switch.
- **Audit log.** Every shadow decision and every live action is recorded (Redis ZSet, 30-day retention),
  visible under *"vibe-mod: View rules + log"*.

Five starter rules (ALL-CAPS titles, very short low-karma posts, etc.) are seeded as drafts on install so
mods have something to look at — all in SAFE actions, all shadow-first.

---

## How it works (architecture in one screen)

```
Moderator types a rule
        │  (only the moderator's sentence is sent — never Reddit content)
        ▼
OpenAI gpt-5.4-mini   ──►  JSON  ──►  Zod strict parse + action whitelist  ──►  rules:draft (Redis)
   (build-time only,                         (reject if invalid)
    reasoning_effort: none)
        │  dry-run preview / activate
        ▼
rules:active (Redis)
        │
Reddit triggers (onPostSubmit / onCommentSubmit / onPostReport / onCommentReport)
        ▼
Deterministic evaluator (pure TS, 0 network, 0 LLM)
        │   builds a "fact bag" from the post/comment + account + subreddit-scoped Redis state
        ▼
Action executor  ──►  shadow? log only  :  live? act + write rollback token (30-day TTL) + audit entry
        ▲
Scheduler: audit retention (daily) · dry-run replay (one-shot) · shadow-promote check (15 min) · rate-limit breaker (5 min)
```

- **Runtime:** Devvit Web app (Hono server, `@devvit/web`). State in Devvit Redis, scoped per
  installation: `rules:active`, `rules:draft`, `audit`, `rollback:<actionId>`, plus daily-quota counters.
- **No LLM at evaluation time.** The model runs exactly once per rule edit. The hard locks behind this
  (LLM build-time only, action whitelist, dry-run before activate, shadow default, 30-day rollback, LLM
  never sees content, v0.1 English-only) are documented in [`HANDOFF.md`](./HANDOFF.md).
- **Tested without Devvit:** 168 unit + route tests (`app.fetch()` against Devvit/OpenAI doubles), the
  official [`@devvit/test`](https://www.npmjs.com/package/@devvit/test) harness for the executor,
  property-based tests (fast-check) for the schema and evaluator, an `npm run acceptance` gate (G1–G4),
  an `npm run replay` local event replayer, and an `npm run openai:smoketest` that hits the real OpenAI
  API. The Devvit *runtime* (routing, payload injection, RPC) is verified by `devvit playtest` — see the
  setup guide.

---

## For moderators (installer-facing)

1. Install **vibe-mod** from the Reddit App Directory on your subreddit.
2. *Mod Tools → "vibe-mod: Compose rule"* → type a rule in plain English → **Compile + Preview**.
3. Review the dry-run preview (which recent posts it would have matched). If it looks right, open
   *"vibe-mod: View rules + log"* → **Activate**.
4. The rule runs in **shadow mode for 24 hours** (logs only, no action), then goes live automatically.
5. If vibe-mod ever acts on something you disagree with, open that post/comment's `⋯` menu →
   *"vibe-mod: Undo this action"* (available for 30 days).

App settings you can tune per subreddit: `dryRunOnly` (master kill-switch, default on),
`maxActionsPerHour` (safety brake), `shadowDurationHours`. There is no per-subreddit OpenAI key input
— Devvit subreddit settings are not encrypted (only `settings.global` with `isSecret: true` is), so
v0.0.51 removed the input and every install compiles through the shared developer key under the same
per-sub daily quota.

You never write YAML, you never write regex, and nothing vibe-mod does is permanent.

---

## For developers

```bash
npm install            # installs deps + git hooks (npm ci does NOT work here — esbuild EBADPLATFORM)
npm run typecheck      # tsc --noEmit
npm test               # 168 tests (1 skipped); npm run test:devvit for the @devvit/test harness
npm run acceptance     # G1..G4 exit gates
npm run doctor         # pre-deploy preflight (devvit.json integrity, fetch-domain↔permissions, ...)
npm run build          # tsc --noEmit && vite build → dist/server/index.cjs (CJS server bundle)
npm run openai:smoketest   # real OpenAI API (needs OPENAI_API_KEY in .env) — model comparison table
npm run dev            # = devvit playtest (needs `devvit login` + `devvit upload` first)
```

Layout:

| Path | What |
|---|---|
| `src/shared/{rule-schema,system-prompt,starter-rules}.ts` | Zod v4 strict schema · gpt-5.4 prompt + few-shot · 5 seed rules |
| `src/server/{evaluator,fact-bag,executor,devvit-helpers}.ts` | deterministic evaluator · fact bag · action executor + audit + rollback · `@devvit/web` adapters |
| `src/server/index.ts` | Hono routes — menu / form / trigger / scheduler handlers, `isCallerModerator` guard, `callOpenAI`, dry-run replay |
| `scripts/{acceptance,devvit-doctor,replay,build-icon,openai-smoketest}.ts` | the `npm run` tooling |
| `test/` + `vitest.devvit.config.ts` | reusable in-memory Devvit testkit + project setup + official `@devvit/test` config |
| `docs/devvit-setup-guide.md` | **how to take this repo to a published Devvit app** (wizard → upload → settings → playtest → publish) |
| `docs/devvit-reference.md` / `docs/devvit-conformance-notes.md` | snapshot of the non-game Devvit docs · vibe-mod ↔ Devvit-Web conformance audit |
| `docs/{tos,privacy}.md` | Terms of Service · Privacy Policy |
| `HANDOFF.md` | project plan, hard locks, schedule, deliverable inventory |

CI (`.github/workflows/ci.yml`): install → lint (0 warnings) → format check → `tsc` → tests (coverage)
→ `@devvit/test` → acceptance → `vite build` → "server bundle loads" smoke. Dependabot groups `@devvit/*`
updates into one weekly PR.

---

## Fetch domains

This app makes outbound HTTP requests to exactly one external domain:

- **`api.openai.com`** — used **only at rule-edit time** to translate the moderator's plain-English rule
  description into a structured JSON rule that vibe-mod's deterministic evaluator can execute. The call
  happens **only** when a moderator clicks "Compile" in the rule composer — it does **not** run on every
  post or comment. **Reddit user content (post bodies, comment bodies, usernames) is never sent to
  OpenAI** — only the moderator's own typed sentence, plus vibe-mod's fixed system prompt.

(Declared in `devvit.json` under `permissions.http.domains` and mirrored in `package.json`'s
`vibe-mod.fetch-domains`.)

## Permissions

- `reddit` (scope `moderator`) — to take moderation actions (report / flair / lock / modqueue / remove;
  ban or mute only with an explicit moderator checkbox).
- `redis` — to store compiled rules, the audit log, rollback tokens, and quota counters.
- `http` (domain `api.openai.com`) — to compile English rules into JSON, as above.

## Privacy & Terms

- [Terms of Service](https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod/tos.html)
- [Privacy Policy](https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod/privacy.html)

## Links

- Project plan / final design: https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod-final-plan.html
- Gallery (all reports): https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/
- Setup & launch guide: [`docs/devvit-setup-guide.md`](./docs/devvit-setup-guide.md)
- Devpost write-up (draft): [`docs/devpost-submission.md`](./docs/devpost-submission.md)

## Changelog

- **0.1.0** — initial release: English→JSON rule compiler (gpt-5.4-mini), strict Zod schema + action
  whitelist, deterministic evaluator, dry-run preview, 24h shadow mode, 30-day rollback, audit log,
  per-hour circuit breaker, per-sub daily compile quota, 5 seeded starter rules. (Pre-publish; see
  `HANDOFF.md` for what's verified vs. pending `devvit playtest`.)

## License

[MIT](./LICENSE).
