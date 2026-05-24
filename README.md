<div align="center">

<img src="./assets/banner.jpg" alt="vibe-mod — you write the rules in plain English, the AI builds the mod config. Natural language in, mod config out." width="880">

<strong>Write a moderation rule in plain English.<br>It runs deterministically — shadow-tested first, with one-click undo.</strong>

[![CI](https://github.com/Two-Weeks-Team/vibe-mod/actions/workflows/ci.yml/badge.svg)](https://github.com/Two-Weeks-Team/vibe-mod/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Reddit App Directory](https://img.shields.io/badge/Reddit%20App%20Directory-Live-FF4500?logo=reddit&logoColor=white)](https://developers.reddit.com/apps/vibe-mod)
&nbsp;·&nbsp; Built on [Reddit Devvit](https://developers.reddit.com/)

</div>

> A moderator types *"Send to mod queue any post under 50 characters from accounts less than 7 days old."*
> vibe-mod compiles that sentence into a **deterministic JSON rule**, runs it in **24-hour shadow mode**
> (logging what it *would* do, acting on nothing), shows a **dry-run preview** against recent posts,
> and keeps **30-day rollback** on every action it ever takes. The LLM is used **only at rule-edit
> time** — zero AI calls per post or comment, and the LLM never sees Reddit content.

---

## Why this exists

[AutoModerator](https://www.reddit.com/wiki/automoderator/) is powerful, but writing it means hand-editing
a YAML DSL full of regex — a real barrier for most mods, and easy to get subtly wrong with no safety net:
no preview, no dry run, no built-in undo.

The obvious 2025 instinct is "throw an LLM at moderation." That's the wrong shape — you don't want a
stochastic model making per-post calls on people's content. But there *is* a place an LLM fits cleanly:
as a **compiler**, translating one English sentence the moderator typed into a structured rule, once, at
edit time — with the output validated, previewable, and reversible.

The single load-bearing idea: **build-time AI, runtime determinism.** AI is excellent at *translating
intent into rules* and bad at *applying rules consistently*; vibe-mod uses it only for the former and uses
plain TypeScript for the latter — so every runtime decision is auditable, reproducible, and free.

It is **not** an AI that reads your subreddit and decides things. The language model translates *one
English sentence the moderator typed* into JSON, once, at edit time. Rule evaluation at runtime is plain
TypeScript — no network, no model, fully reproducible.

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
- **Reactive flair triggers.** Beyond submissions and reports, vibe-mod listens for `onPostFlairUpdate` —
  a rule like *"when the 'Spam' flair is applied, remove and lock"* is one sentence. Dedupe keys compose
  `(postId, flairTemplateId)` so legitimate flair changes each fire while flair-bounce loops terminate.
- **Safety brakes.** An action whitelist (`report` / `flair` / `lock` / `modqueue` / `remove` are
  LLM-permitted; `ban` / `mute` / `permaban` / `approve` are *guarded* — the compiler refuses to store
  them until the moderator ticks an explicit "enable guarded actions" checkbox), a per-hour action
  circuit breaker, a per-subreddit daily compile quota, and a sub-level `dryRunOnly` master switch.
- **Audit log.** Every shadow decision and every live action is recorded (Redis ZSet, 30-day retention),
  visible under *"vibe-mod: View rules + log"* (which also shows a ⚠ potential rule-conflict preview).

Six starter rules (ALL-CAPS titles, very short low-karma posts, a flair-driven example, etc.) are seeded
as drafts on first install so mods have something to look at — all in SAFE actions, all shadow-first. The
same first-install hook sends the mod team a one-time **welcome modmail** (idempotent + retry-safe via a
Redis sentinel), so onboarding is never a blank screen.

---

## Quickstart

1. Install **vibe-mod** from the Reddit App Directory: <https://developers.reddit.com/apps/vibe-mod>
2. *Mod Tools → "vibe-mod: Compose rule"* → type a rule in plain English → **Compile + Preview**.
   (OpenAI returns JSON → validated against the Zod schema **and** the action whitelist before storage.)
3. Review the **dry-run preview** (which recent posts the draft would have matched). No action is taken.
4. Open *"vibe-mod: View rules + log"* → **Activate**. The rule runs in **24-hour shadow mode** (logs
   only), then promotes itself automatically. Inspect those decisions + the audit log in the same menu.
5. If vibe-mod ever acts on something you disagree with, open that item's `⋯` menu →
   *"vibe-mod: Undo this action"* (available for 30 days).

You never write YAML, you never write regex, and nothing vibe-mod does is permanent. App settings you can
tune per subreddit: `dryRunOnly` (master kill-switch, default on), `maxActionsPerHour` (safety brake),
`shadowDurationHours`. There is no per-subreddit OpenAI key input — Devvit subreddit settings aren't
encrypted (only `settings.global` with `isSecret: true` is), so vibe-mod compiles through a single shared,
encrypted developer key under a uniform per-subreddit daily quota. No key to bring, nothing to pay.

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
Reddit triggers (onPostSubmit / onCommentSubmit / onPostReport / onCommentReport / onPostFlairUpdate)
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
- **No LLM at evaluation time.** The model runs exactly once per rule edit. The invariants behind this are
  hard rules, enforced in code: LLM build-time only, action whitelist, dry-run before activate, shadow
  default, 30-day rollback, the LLM never sees post/comment content, v0.1 English-only.
- **Tested without Devvit:** a 236-test suite (1 skipped) via `npm test` — unit + route (`app.fetch()`
  against Devvit/OpenAI doubles) + property-based, the official
  [`@devvit/test`](https://www.npmjs.com/package/@devvit/test) harness for the executor, an
  `npm run acceptance` gate (G1–G4), an `npm run replay` local event replayer, and an
  `npm run openai:smoketest` that hits the real OpenAI API. The Devvit *runtime* (routing, payload
  injection, RPC) is verified by `devvit playtest` — see [`docs/devvit-setup-guide.md`](./docs/devvit-setup-guide.md).

---

## How vibe-mod differs from AutoModerator / PRAW / generic "AI moderation"

vibe-mod is **not** an AutoModerator natural-language wrapper, and **not** an LLM that reads your subreddit
and decides things. The distinction is architectural, not cosmetic:

| | **vibe-mod** | **AutoModerator** | **PRAW bot** | **Generic "AI moderation" app** |
|---|---|---|---|---|
| **Where the LLM runs** | **Edit-time only** — translates one English sentence → JSON, once per rule | none (you hand-write YAML+regex) | none (you hand-write Python) | **Runtime** — model is called per post/comment |
| **Runtime evaluation** | **Deterministic TypeScript**, 0 network, 0 model, reproducible | deterministic YAML engine | arbitrary Python (whatever you wrote) | non-deterministic model output |
| **Per-post inference cost** | **$0** (model already ran at edit time) | $0 | $0 | per-post token cost |
| **Authoring** | plain English sentence + dry-run preview | YAML DSL + regex, no preview | Python + Reddit API knowledge | varies |
| **New-rule safety default** | **24h shadow mode** (logs, acts on nothing) then auto-promotes | live immediately on save | live immediately | usually live immediately |
| **Pre-activation preview** | **dry-run replay** against recent posts | none | none | rare |
| **Undo** | **per-action, 30-day, one click** | none built-in | none built-in | rare |
| **What the LLM can do** | **hard-coded action whitelist**; `ban`/`mute`/`permaban`/`approve` need a mod checkbox | n/a | anything the script does | whatever the prompt allows |
| **Runaway protection** | **per-hour circuit breaker** + per-sub daily compile quota + `dryRunOnly` master switch | rate-limited by Reddit | none built-in | varies |
| **Hosting** | **Devvit-native, no always-on server** — installed from the App Directory | Reddit-hosted | **you run a server 24/7** | usually a hosted backend |
| **Sees Reddit content?** | LLM sees **only the mod's typed sentence**, never posts/comments | n/a | yes (your code) | yes (sent to the model) |

---

## Safety guarantees (true by construction, verifiable in this repo)

| What | Value | Verify |
|---|---|---|
| LLM calls per post/comment at runtime | **0** (pure-TS evaluator, no network) | [`src/server/evaluator.ts`](./src/server/evaluator.ts) |
| LLM calls per rule | exactly **1**, at edit time | [`src/server/routes/compose.ts`](./src/server/routes/compose.ts) |
| New-rule blast radius for first 24h | **0 live actions** (shadow default on) | `shadow: true` in [`rule-schema.ts`](./src/shared/rule-schema.ts) |
| Live action reversibility | **100% for 30 days** (per-action undo) | [`src/server/executor.ts`](./src/server/executor.ts) |
| Reddit content sent to the LLM | **none** (only the mod's typed sentence) | *Fetch domains*, below |

A moderator incurs **zero risk of irreversible action for at least 24h** and **zero per-post inference
cost, forever** — the model does its one job before the rule is ever stored. Multi-rule conflicts are
surfaced as a read-only preview in *"vibe-mod: View rules + log"* (see
[`docs/conflict-handling.md`](./docs/conflict-handling.md)).

---

## For developers

```bash
npm install            # installs deps + git hooks (npm ci does NOT work here — esbuild EBADPLATFORM)
npm run typecheck      # tsc --noEmit
npm test               # 236 tests (1 skipped); npm run test:devvit for the @devvit/test harness
npm run acceptance     # G1..G4 exit gates
npm run doctor         # pre-deploy preflight (devvit.json integrity, fetch-domain↔permissions, route parity)
npm run build          # tsc --noEmit && vite build → dist/server/index.cjs (CJS server bundle)
npm run openai:smoketest   # real OpenAI API (needs OPENAI_API_KEY in .env) — model comparison table
npm run dev            # = devvit playtest (needs `devvit login` + `devvit upload` first)
```

| Path | What |
|---|---|
| `src/shared/{rule-schema,system-prompt,starter-rules}.ts` | Zod v4 strict schema · gpt-5.4 prompt + few-shot · 6 seed rules |
| `src/server/{evaluator,fact-bag,executor,devvit-helpers}.ts` | deterministic evaluator · fact bag · action executor + audit + rollback · `@devvit/web` adapters |
| `src/server/index.ts` + `src/server/routes/*` | Hono entry (re-exports `app`) + menu / form / trigger / scheduler route modules |
| `scripts/{acceptance,devvit-doctor,replay,openai-smoketest}.ts` | the `npm run` tooling |
| `assets/icon.png` | the 1024² App Directory icon (`marketingAssets.icon` in `devvit.json`) |
| `test/` + `vitest.devvit.config.ts` | reusable in-memory Devvit testkit + project setup + official `@devvit/test` config |
| `docs/devvit-setup-guide.md` | **how to take this repo to a published Devvit app** (wizard → upload → settings → playtest → publish) |
| `docs/devvit-reference.md` / `docs/devvit-conformance-notes.md` | snapshot of the non-game Devvit docs · vibe-mod ↔ Devvit-Web conformance audit |
| `docs/{tos,privacy}.md` | Terms of Service · Privacy Policy |

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
  ban / mute / permaban / approve only with an explicit moderator checkbox) and to send the one-time
  install-time welcome modmail.
- `redis` — to store compiled rules, the audit log, rollback tokens, and quota counters.
- `http` (domain `api.openai.com`) — to compile English rules into JSON, as above.

## Privacy & Terms

- [Terms of Service](./docs/tos.md)
- [Privacy Policy](./docs/privacy.md)

## Changelog

- **0.1.0** — initial release: English→JSON rule compiler (gpt-5.4-mini), strict Zod schema + action
  whitelist (SAFE `report`/`flair`/`lock`/`modqueue`/`remove`; guarded `ban`/`mute`/`permaban`/`approve`),
  deterministic evaluator, `onPostSubmit`/`onCommentSubmit`/`onPostReport`/`onCommentReport`/`onPostFlairUpdate`
  triggers, dry-run preview, 24h shadow mode, 30-day rollback, audit log, per-hour circuit breaker, per-sub
  daily compile quota, a one-time install welcome modmail, and 6 seeded starter rules.

## License

[MIT](./LICENSE).
