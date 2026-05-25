![vibe-mod — write the rules in plain English, the AI builds the mod config; natural language in, mod config out](https://raw.githubusercontent.com/Two-Weeks-Team/vibe-mod/main/assets/banner.jpg)

**Write a moderation rule in plain English. It runs deterministically — shadow-tested first, with one-click undo.**

[![CI](https://github.com/Two-Weeks-Team/vibe-mod/actions/workflows/ci.yml/badge.svg)](https://github.com/Two-Weeks-Team/vibe-mod/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE) [![Reddit App Directory](https://img.shields.io/badge/Reddit%20App%20Directory-Live-FF4500?logo=reddit&logoColor=white)](https://developers.reddit.com/apps/vibe-mod) · Built on [Reddit Devvit](https://developers.reddit.com/)

> A moderator types _"Send to mod queue any post under 50 characters from accounts less than 7 days old."_ vibe-mod turns that sentence into a real rule, runs it in **24-hour shadow mode** (logging what it _would_ do, acting on nothing), shows a **preview** against recent posts, and keeps **30-day undo** on every action it takes. The AI is used **only when you write a rule** — never on your community's posts.

## What it does

Type a moderation rule in plain English — _"remove posts whose title is ALL CAPS"_, _"send links from accounts under 7 days old to the mod queue"_ — and vibe-mod turns it into a real, working rule. It shows you exactly what the rule will do, runs it quietly for 24 hours first, and lets you undo any action for 30 days. **No YAML, no regex, no code.**

The AI only ever reads the sentence _you_ type — never your community's posts, comments, or usernames. Once it has written the rule, the AI is done: every check after that is plain, deterministic logic, so the same post always gets the same decision, and there's **zero AI cost per post**.

## How to use it

1. Install **vibe-mod** on your subreddit from the [App Directory](https://developers.reddit.com/apps/vibe-mod).
2. **Mod Tools → "vibe-mod: Compose rule"** → type your rule → **Compile + Preview**. (If your sentence is ambiguous, vibe-mod asks a quick clarifying question instead of guessing.)
3. Review the **dry-run preview** — which of your recent posts the rule would have caught. Nothing happens yet.
4. **Activate** it. The rule runs in **24-hour shadow mode** (just logging what it would do), then goes live automatically. Watch those decisions under _"vibe-mod: View rules + log"_.
5. If it ever acts on something you disagree with, open that item's `⋯` menu → **"vibe-mod: Undo this action"** (available for 30 days).

Six starter rules are seeded as drafts on install so you have something to look at, and the mod team gets a one-time welcome message with a 3-step start guide.

## Settings you can tune (per subreddit)

- **Dry-run only** — master off-switch; rules log but never take real action (on by default until you're ready).
- **Max actions per hour** — a safety brake against a runaway rule.
- **Shadow duration** — how long a new rule observes before going live (default 24 hours).

No OpenAI key and no billing — **vibe-mod covers the AI cost**, up to 50 rule compiles per day per subreddit.

## Why a new rule can't hurt your community

- 🕒 **24-hour shadow mode** — every new rule only _logs_ what it would do for a full day before it can act.
- 👀 **Dry-run preview** — see exactly which of your recent posts a rule catches _before_ you turn it on.
- ↩️ **30-day undo** — every action vibe-mod takes is reversible with one click.
- 🛑 **Guarded actions** — `report` / `flair` / `lock` / `modqueue` / `remove` are allowed, but `ban` / `mute` / `permaban` / `approve` stay blocked unless you explicitly tick a checkbox.
- 🧠 **No AI on your content** — the model only sees the sentence you typed, runs once per rule (never per post), and never reads posts, comments, or usernames.

## How it compares to AutoModerator

vibe-mod is **not** an AutoMod natural-language wrapper, and **not** an AI that reads your subreddit and decides things:

- **Authoring** — one plain-English sentence with a dry-run preview, instead of hand-editing YAML + regex with no preview.
- **When the AI runs** — once, at rule-edit time. (AutoMod uses no AI; "generic AI moderation" bots call a model on _every_ post.)
- **Per-post cost** — **$0**: the model already ran at edit time. (Runtime AI bots pay per post and hit rate limits.)
- **New-rule safety** — 24-hour shadow mode + dry-run preview + 30-day undo, vs live-on-save with no undo.
- **Sees your content?** — the model only ever sees your typed sentence, never posts, comments, or usernames.

The idea: **AI is great at turning intent into a rule, and bad at applying rules consistently.** vibe-mod uses it only for the first part and plain, deterministic TypeScript for the rest.

## Fetch domains

This app makes outbound requests to exactly one external domain:

- **`api.openai.com`** — used **only** when a moderator clicks "Compile" to turn a plain-English sentence into a structured rule. It does **not** run on posts or comments, and **Reddit content (post/comment bodies, usernames) is never sent** — only the moderator's own typed sentence plus a fixed system prompt.

## Permissions

- `reddit` (scope `moderator`) — to take moderation actions (report / flair / lock / modqueue / remove; ban / mute / permaban / approve only with an explicit checkbox) and to send the one-time welcome message.
- `redis` — to store your compiled rules, the audit log, undo tokens, and quota counters.
- `http` (`api.openai.com`) — to compile English rules into structured rules, as above.

## How it works

The one idea: **build-time AI, runtime determinism.** The model runs once, when you write a rule, turning your sentence into a deterministic rule; every runtime decision after that is plain TypeScript — no model, no network, reproducible, and free. The full architecture (trigger + scheduler map, the deterministic evaluator, and the guarantees that hold by construction) is in **[docs/architecture.md](./docs/architecture.md)**.

## For developers

The test suite (236 tests), the in-memory Devvit testkit, the `npm run acceptance` gate, the pre-deploy `doctor`, and the rest of the `npm run` tooling are documented in **[docs/for-developers.md](./docs/for-developers.md)**. CI runs lint → format → `tsc` → tests → `@devvit/test` → acceptance → `vite build` on every push.

## Privacy & Terms

- [Terms of Service](./docs/tos.md)
- [Privacy Policy](./docs/privacy.md)

## License

[MIT](./LICENSE).
