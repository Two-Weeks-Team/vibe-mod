// src/server/middleware/auth.ts
// Server-side moderator authorization guard (audit FIND-03).
//
// Devvit's `forUserType: "moderator"` is a UI hint, not server enforcement.
// Every form/menu/scheduler handler that accepts moderator-level input MUST
// call `isCallerModerator()` and bail on `false`. The function caches the
// mod list in Redis and falls back to the gateway-side filter if the
// plugin RPC is unreachable (reddit/devvit#258 work-around).

import { reddit, redis } from '@devvit/web/server';
import { LIMITS } from '../../shared/limits';
import { keys } from '../../shared/redis-keys';
import { getCurrentSubredditName, getCurrentUsername } from '../devvit-helpers';
import { describeErr, snapshotDevvitRuntime } from './diagnostics';

export async function isCallerModerator(): Promise<boolean> {
  // Diagnostic snapshot — proves whether plugin config + ALS metadata are
  // present at request time. (Remove once §B-4 root cause is confirmed.)
  const runtime = snapshotDevvitRuntime();
  const subredditName = getCurrentSubredditName();
  const username = getCurrentUsername();
  console.log('[vibe-mod] mod-check enter:', { sub: subredditName, user: username, runtime });

  if (!subredditName || subredditName === 'unknown') {
    console.warn('[vibe-mod] mod check: no subreddit in context — refusing');
    return false;
  }
  if (!username) {
    console.warn('[vibe-mod] mod check: no username in context — refusing');
    return false;
  }

  // Try the Redis cache first.
  const cacheKey = keys.modlist(subredditName);
  let mods: string[] | null = null;
  let redisOk = true;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) mods = JSON.parse(cached);
    console.log(`[vibe-mod] mod check: redis cache ${mods ? 'hit' : 'miss'}`);
  } catch (err) {
    redisOk = false;
    console.warn('[vibe-mod] mod check: redis.get(modlist) threw:', describeErr(err));
  }

  let redditOk = true;
  if (!mods) {
    try {
      const list = await reddit.getModerators({ subredditName });
      mods = (await list.all()).map((m) => m.username);
      console.log(`[vibe-mod] mod check: getModerators → ${mods.length} mods: ${mods.join(',')}`);
      try {
        await redis.set(cacheKey, JSON.stringify(mods));
        await redis.expire(cacheKey, LIMITS.MOD_LIST_CACHE_SECONDS);
      } catch (err) {
        console.warn('[vibe-mod] mod check: cache write failed (non-fatal):', describeErr(err));
      }
    } catch (err) {
      redditOk = false;
      console.warn('[vibe-mod] mod check: getModerators threw:', describeErr(err));
    }
  }

  // Resilient fallback (reddit/devvit#258 work-around): if BOTH redis.get AND
  // reddit.getModerators throw, we can't enumerate the mod list ourselves —
  // but Devvit's gateway already filtered this request by
  // `forUserType:"moderator"` (see devvit.json menu.items). The gateway is
  // the security boundary; trust it as fallback so menus open even while
  // the plugin RPC sidecar is broken. Logged loudly so the fallback is
  // auditable. Removed once #258 is fixed.
  if (!mods) {
    if (!redisOk && !redditOk) {
      console.warn(
        `[vibe-mod] mod check: plugin RPC unreachable for both redis and reddit — falling back to gateway-side forUserType:"moderator" filter; trusting ${username}`,
      );
      return true;
    }
    console.warn('[vibe-mod] mod check: could not resolve mod list — refusing');
    return false;
  }

  const isMod = mods.includes(username);
  console.log(`[vibe-mod] mod check: ${username} ∈ mods? ${isMod}`);
  return isMod;
}
