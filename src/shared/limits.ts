// src/shared/limits.ts
// Single source of truth for every TTL, cache window, rate limit, and sample
// size in vibe-mod. Previously these lived as private `const`s scattered
// across index.ts, executor.ts, and fact-bag.ts — moving them here makes
// tuning ops behaviour (e.g. "loosen the rate limit for a beta sub") a
// one-file change instead of a grep-and-patch.
//
// All units are seconds unless the constant name says otherwise.

export const LIMITS = {
  /** Compiler quota per subreddit per day. BYOK installs are exempt. */
  COMPILE_RATE_LIMIT_PER_DAY: 50,

  /** Cache the subreddit's moderator list for this long. Read by isCallerModerator. */
  MOD_LIST_CACHE_SECONDS: 5 * 60,

  /** Suppress duplicate trigger fires for the same {trigger, thingId} for this long. */
  TRIGGER_DEDUPE_SECONDS: 10 * 60,

  /** How long Undo can roll back an action after it lands. 30 days. */
  ROLLBACK_TTL_SECONDS: 30 * 24 * 60 * 60,

  /** Audit-row HSET retention. Same window as rollback (30 days). */
  AUDIT_TTL_SECONDS: 30 * 24 * 60 * 60,

  /** Per-author fact-bag cache window (age, karma, mod status). 1 hour. */
  USER_CACHE_TTL_SECONDS: 60 * 60,

  /** Dry-run replay sample size — recent posts to evaluate against a draft rule. */
  DRY_RUN_SAMPLE: 10,

  /** How long a dry-run summary stays available in Redis after the run. 7 days. */
  DRY_RUN_TTL_SECONDS: 7 * 24 * 60 * 60,
} as const;
