# vibe-mod

**Write a moderation rule. In English. It works.**

vibe-mod is a Reddit moderation app for Devvit. You type a rule in plain English, vibe-mod compiles it into a deterministic JSON rule, and it goes live in your subreddit — with a 24-hour shadow period, a dry-run preview against your last 7 days of posts, and 30-day rollback on every action.

---

## 🧑‍⚖️ I'm a moderator

1. Install vibe-mod from the Reddit App Directory on your subreddit.
2. Open Mod Tools → **vibe-mod: Compose rule**.
3. Type something like *"Send to mod queue any post under 50 characters from accounts less than 7 days old."*
4. Click **Compile + Preview**. vibe-mod shows you which of your last 100 posts the rule would have matched.
5. If the preview looks right, open **vibe-mod: View rules + log** and click **Activate**. The rule goes live in shadow mode for 24 hours (logs what it would do, takes no action), then promotes itself automatically.
6. Any time vibe-mod acts on a post, you can **vibe-mod: Undo this action** from that post's three-dot menu for up to 30 days.

That's it. You never write YAML, you never write regex, and nothing is permanent.

---

## 🧑‍💻 I'm a developer

vibe-mod is a single Devvit app:

- **Runtime is pure deterministic TypeScript.** Zero LLM calls per post or comment.
- **LLM is used only at rule-edit time** (build-time-equivalent). The mod's typed sentence goes to OpenAI **gpt-5.4-nano** (default — current latest tier, cheapest, `json_object` mode supported), which emits a JSON rule. The JSON is validated against a strict Zod (v4) schema and an action whitelist before it can be stored. The LLM never sees Reddit post content. Premium option: `gpt-5.4-mini` for higher-quality compile on ambiguous prompts.
- **State lives in Devvit Redis** scoped per installation: `rules:active`, `rules:draft`, `audit` (ZSet, 30-day retention), `rollback:<actionId>` (30-day TTL).
- **Triggers**: `onPostSubmit`, `onCommentSubmit`, `onPostReport`, `onCommentReport`, plus `onAppInstall` / `onAppUpgrade` for setup and migrations.
- **Scheduler** for audit retention (daily cron), dry-run replay (one-shot), shadow promotion check (every 15 min), and the per-hour action circuit breaker (every 5 min).

Run locally: `npm run dev` (Devvit handles the playtest subreddit and uploads).

See [`docs/architecture.md`](./docs/architecture.md) for the full architecture, [`docs/rule-schema.md`](./docs/rule-schema.md) for the rule grammar, and [`docs/api-reference.md`](./docs/api-reference.md) for the HTTP endpoint surface.

---

## Fetch Domains

The following external domains are requested for this app:

- **`api.openai.com`** — Used only at rule-edit time to translate the moderator's plain-English rule description into a structured JSON rule that vibe-mod's deterministic evaluator can execute. The LLM call happens **only** when a moderator clicks "Compile" in the rule composer. It does **not** run on every post or comment. Reddit user content (post bodies, comment bodies, usernames) is **never** sent to OpenAI; only the moderator's own typed sentence is sent.

---

## Permissions used

- `reddit` (scope: `moderator`) — to take moderation actions (remove, lock, modqueue, ban with explicit confirmation)
- `redis` — to store compiled rules, audit log, and rollback tokens
- `http` (domain `api.openai.com`) — to compile English rules into JSON

## Privacy & Terms

- [Terms of Service](https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod/tos.html)
- [Privacy Policy](https://two-weeks-team.github.io/reddit-mod-tools-port-gallery/vibe-mod/privacy.html)

## License

MIT. See [LICENSE](./LICENSE).
