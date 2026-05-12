# vibe-mod — Terms of Service

**Effective date:** 2026-05-27 (hackathon submission)
**App:** vibe-mod on Reddit Developer Platform (Devvit)
**Contact:** see r/vibe_mod modmail or the GitHub issues tracker linked from the app's developer settings page.

## 1. What vibe-mod is

vibe-mod is a Reddit moderation tool that lets the moderators of a subreddit ("you") write rules in plain English. vibe-mod translates each rule into a deterministic JSON specification and then evaluates incoming posts and comments against the active rules. It can take moderation actions on your behalf (remove, lock, send to mod queue, flair, modmail, or — with explicit confirmation — ban or mute).

vibe-mod is a third-party app built on Reddit's Developer Platform. It is **not** an official Reddit product.

## 2. Who can use vibe-mod

vibe-mod can only be installed and configured by accounts with **moderator** permission on the destination subreddit. End users who are not moderators interact with vibe-mod only through its effects (e.g. a removed post). End users do not have any vibe-mod account.

## 3. What you agree to

By installing vibe-mod on a subreddit you moderate, you agree:

1. You will use vibe-mod only on subreddits where you are an authorized moderator.
2. You will not use vibe-mod to take actions that violate Reddit's [Content Policy](https://www.redditinc.com/policies/content-policy), [User Agreement](https://www.redditinc.com/policies/user-agreement), [Developer Platform Terms](https://www.redditinc.com/policies/developer-terms), or [Devvit Rules](https://developers.reddit.com/docs/devvit_rules).
3. You are responsible for the rules you write. vibe-mod compiles your English rule into a deterministic specification, but the **decision** to write that rule is yours.
4. You will review what each rule would do (the dry-run preview) before promoting it out of shadow mode.
5. You will not attempt to bypass the action whitelist, the per-hour rate limit, the 24-hour shadow window, or the 30-day rollback window.

## 4. What vibe-mod does, and what it does not do

vibe-mod **does**:
- Read your English description of a rule when you submit one.
- Send your English description (and only your English description) to OpenAI for translation into structured JSON.
- Store the resulting JSON rule in Reddit's Devvit Redis, scoped to your subreddit.
- Evaluate the stored rules against new posts and comments in your subreddit.
- Take moderation actions on posts and comments in your subreddit, using your moderator permissions.
- Log every action with the rule that fired, the post/comment, and the time. The log is visible to your mod team and retained for 30 days.

vibe-mod **does not**:
- Read or send Reddit user content (post bodies, comment bodies, usernames, voting history, browsing history, DMs, etc.) to OpenAI or any third party. The LLM only ever sees the **moderator's own typed rule sentence**. Rule evaluation is deterministic and runs entirely inside Devvit.
- Take actions outside your subreddit.
- Take ban / mute / permaban actions automatically. Those actions are only emitted when the moderator who wrote the rule explicitly enabled the "Allow ban/mute" checkbox.
- Share data across subreddits. Each installation's Redis is namespaced and isolated.
- Train any model on your data. vibe-mod does not collect data for model training.

## 5. Acceptable use

You will not use vibe-mod to:

- Harass users, discriminate against protected groups, or violate Reddit policies.
- Take automated actions that depend on personally identifying users in ways Reddit does not already expose (vibe-mod does not give you new visibility into users — it only acts on data Reddit already shows you).
- Circumvent Reddit's review of automated moderation actions (Reddit's mod log is the canonical record).
- Build rules that depend on cross-subreddit user activity beyond what is publicly visible.

## 6. AI translation disclaimer

vibe-mod uses OpenAI to translate plain-English rule descriptions into JSON. AI translation can:

- Misinterpret ambiguous wording.
- Emit rules that are technically valid but broader (or narrower) than you intended.
- Occasionally fail to compile a rule, in which case vibe-mod shows you the failure and asks you to rephrase.

vibe-mod mitigates these risks with:
- A mandatory **dry-run preview** before any rule can be activated.
- A **24-hour shadow mode** during which a new rule logs what it would do but takes no action.
- A **closed action whitelist** (the LLM cannot smuggle in actions vibe-mod does not support).
- A **30-day rollback** window on every action vibe-mod takes.

You acknowledge that vibe-mod is a tool. Final responsibility for moderation outcomes in your subreddit remains with the moderator team.

## 7. Availability

vibe-mod is provided "as is" without warranty. Reddit may suspend the Developer Platform at any time. OpenAI may become unavailable, in which case rule **creation** is paused but already-active rules continue to evaluate normally (they do not depend on the LLM at runtime).

If the rate-limit safety brake fires (more than the configured actions/hour), vibe-mod auto-pauses all rules and notifies your mod team via modmail.

## 8. Termination

You may uninstall vibe-mod at any time from your subreddit's Mod Tools → Apps page. Uninstalling vibe-mod:
- Stops all rule evaluation immediately.
- Removes the app's Redis data scoped to your subreddit (as enforced by Devvit).
- Does **not** revert past moderation actions. You can manually undo recent actions via Reddit's mod queue, or via vibe-mod's `vibe-mod: Undo this action` menu before uninstalling.

## 9. Changes

These Terms may be updated. The "Effective date" at the top reflects the most recent version. Material changes will be announced in the app update notes.

## 10. Governing terms

These Terms supplement (but do not replace) Reddit's [User Agreement](https://www.redditinc.com/policies/user-agreement), [Content Policy](https://www.redditinc.com/policies/content-policy), [Developer Platform Terms](https://www.redditinc.com/policies/developer-terms), and [Devvit Rules](https://developers.reddit.com/docs/devvit_rules). Where this document and Reddit's terms conflict, Reddit's terms control.
