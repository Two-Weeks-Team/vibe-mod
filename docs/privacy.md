# vibe-mod — Privacy Policy

**Effective date:** 2026-05-27 (hackathon submission)
**App:** vibe-mod on Reddit Developer Platform (Devvit)

## 1. The short version

- vibe-mod sees Reddit posts and comments **inside your subreddit only**, to evaluate the rules you wrote.
- vibe-mod sends **only your typed English rule description** to OpenAI. It does **not** send any Reddit user content (post bodies, comment bodies, usernames, vote history, browsing history, DMs) to OpenAI or anywhere else.
- vibe-mod stores rules, audit entries, and rollback tokens in Reddit's Devvit Redis, scoped to your subreddit. Reddit handles the underlying storage.
- vibe-mod retains audit entries for **30 days**, then deletes them automatically.
- vibe-mod does **not** train any AI model on your data.

## 2. What we collect, and why

| Category | What it is | Why we need it | Where it lives | Retention |
|---|---|---|---|---|
| Mod rule input | The English sentence a moderator types into the "Compose rule" form | To translate it into a structured rule | Sent to OpenAI (`api.openai.com`) for compilation; the compiled JSON is stored in Devvit Redis | Indefinite (until the moderator deletes the rule) |
| Rule definitions | The compiled JSON rule | To evaluate posts and comments | Devvit Redis (Reddit-hosted, subreddit-scoped) | Indefinite (until deletion) |
| Audit entries | A log row per moderation action vibe-mod took | To let your mod team see what happened and undo it | Devvit Redis | 30 days, then auto-deleted |
| Rollback tokens | A serialized reversal blob per action | To support the "Undo" menu action | Devvit Redis with 30-day TTL | 30 days |
| Author cache | A short cache of an author's account age and karma | To avoid a Reddit API roundtrip on every event | Devvit Redis | 1 hour |
| Compile rate counters | A daily counter of how many rule compiles a sub has used | To enforce the per-day rate limit | Devvit Redis | 1 day |

## 3. What we do **not** collect

- We do not collect end-user personal data. End users of your subreddit are **not** vibe-mod users.
- We do not send post bodies, comment bodies, or usernames to OpenAI or any other third party. The LLM never sees Reddit content.
- We do not run any analytics or tracking. No third-party trackers, no Google Analytics, no Segment, no Sentry.
- We do not collect data from other subreddits. Each installation is sandboxed by Devvit.

## 4. Third parties

- **Reddit (Devvit)** — hosts the app and the Redis data. Subject to Reddit's privacy policies.
- **OpenAI** — receives the moderator's typed rule sentence and the vibe-mod system prompt. We use the `gpt-5.4-nano` model by default (and offer `gpt-5.4-mini` or older fallbacks as configurable). Subject to [OpenAI's API data usage policies](https://openai.com/policies/api-data-usage-policies). OpenAI states API data is not used to train their models by default.

No other third parties receive data from vibe-mod.

## 5. End-user transparency

Every moderation action vibe-mod takes appears in the standard Reddit moderation log with the prefix `vibe-mod: <rule name>`. End users see the same removal reasons and modmail messages they would see for any other moderator action. vibe-mod does not contact end users directly outside of these standard moderation channels.

## 6. Data deletion

- A moderator can delete a rule at any time from the vibe-mod Dashboard. Deletion removes the rule from `rules:active` immediately.
- A moderator can request deletion of audit entries by writing a one-time menu action (planned for v0.2) or by waiting for the automatic 30-day expiry.
- Uninstalling vibe-mod from a subreddit removes all vibe-mod data scoped to that subreddit. Reddit's Devvit storage rules govern the actual deletion semantics.

## 7. Children

vibe-mod is a tool for subreddit moderators, who must be at the age of majority in their jurisdiction to use Reddit's developer features. vibe-mod is not directed at children under 13.

## 8. Region

vibe-mod stores data wherever Reddit's Devvit infrastructure stores it. We do not control the region of Devvit's data centers.

## 9. Security

- API keys (OpenAI) are stored as Devvit App-scope secrets, encrypted by Reddit. They are only readable by app server code; they are not visible to subreddit moderators or to anyone via the UI.
- Audit entries are stored in Devvit Redis, namespaced per installation. They are not accessible across subreddits.
- All HTTP traffic (to OpenAI) goes over HTTPS.

## 10. Changes

This policy may be updated. The effective date above reflects the most recent version. Material changes will be announced in the app's update notes.

## 11. Contact

Open an issue on the GitHub repository linked from `developers.reddit.com/apps/vibe-mod`, or message r/vibe_mod on Reddit.
