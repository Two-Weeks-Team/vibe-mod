// src/shared/redis-keys.ts
// Single source of truth for every Redis key vibe-mod writes or reads. The
// only callers should use the helpers here; never construct ${sub}:something
// inline in handlers. Three reasons:
//
//   1. Subreddit scoping isn't optional — audit FIND-07 made every key
//      sub-prefixed so installs in different subs can't collide. The helper
//      makes that hard to forget.
//   2. Renames stay grep-friendly. `keys.rulesActive('foo')` produces one
//      string; we never want a typo'd `${foo}:rules:Active` to silently
//      shadow `${foo}:rules:active`.
//   3. The full key inventory lives in one place — useful for ops (TTL
//      sweeps), tests (mocking), and the gap analysis at
//      claudedocs/gap-analysis/05-code-architecture.md.

/** Build a subreddit-scoped Redis key namespace. */
export const keys = {
  /** Cached array of moderator usernames for this subreddit (JSON). */
  modlist: (sub: string) => `${sub}:modlist`,

  /** Per-day compile counter (rate limit). `day` is the result of `todayKey()`. */
  compileCount: (sub: string, day: string) => `${sub}:compile:count:${day}`,

  /** The bundle of rules currently evaluated against incoming posts/comments. */
  rulesActive: (sub: string) => `${sub}:rules:active`,

  /** The bundle of rules still in shadow-mode / pending activation. */
  rulesDraft: (sub: string) => `${sub}:rules:draft`,

  /** ZSet of audit entries (member = actionId, score = ts). Time-ordered. */
  audit: (sub: string) => `${sub}:audit`,

  /** Hash of per-action audit details. Member of the ZSet above. */
  auditEntry: (sub: string, actionId: string) => `${sub}:audit:${actionId}`,

  /** Stored reverse-payload for `actionId` so Undo can restore it. TTL-bound. */
  rollback: (sub: string, actionId: string) => `${sub}:rollback:${actionId}`,

  /** Dry-run preview JSON for a draft `ruleId`. TTL = LIMITS.DRY_RUN_TTL_SECONDS. */
  dryrun: (sub: string, ruleId: string) => `${sub}:dryrun:${ruleId}`,

  /** Per-rule, per-author rate limit lockout. Set when an action fires. */
  rateLimit: (sub: string, ruleId: string, authorId: string) => `${sub}:ratelimit:${ruleId}:${authorId}`,

  /** Per-author fact-bag cache (age, karma, mod status). TTL = USER_CACHE_TTL_SECONDS. */
  author: (sub: string, authorId: string) => `${sub}:author:${authorId}`,

  /** "1" if the auto-pause circuit breaker tripped for this sub. */
  circuitOpen: (sub: string) => `${sub}:circuit:open`,

  /** Trigger-dedupe sentinel: this {trigger, thingId} pair was already handled. */
  seen: (sub: string, trigger: string, thingId: string) => `${sub}:seen:${trigger}:${thingId}`,

  /** "1" if the moderator dismissed the dashboard onboarding intro for this sub. */
  onboardingDismissed: (sub: string) => `${sub}:onboarding:dismissed`,
} as const;

/** Global keys that are NOT subreddit-scoped (rare). */
export const globalKeys = {
  /** Hard freeze switch — set to '1' to immediately stop all rule execution everywhere. */
  betaFreeze: () => `circuit:beta_freeze`,
} as const;
