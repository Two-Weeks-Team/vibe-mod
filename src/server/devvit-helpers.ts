// server/devvit-helpers.ts
// Thin adapters over the @devvit/web SDK surface (v0.12.x).
//
//   - Devvit injects a request-scoped `context` (from @devvit/web/server) with
//     `subredditName`, `subredditId`, `postId`, `commentId`, `userId`, `appName`.
//     Read those instead of making a Reddit API round-trip (`reddit.getCurrentSubreddit()`):
//     it's cheaper and it's the documented pattern. (There is no `reddit.getCurrentSubredditName()`.)
//   - Thing ids that arrive in trigger/menu payloads are already correctly prefixed
//     (`t3_…` / `t1_…`) but TypeScript only knows them as `string`. `asT3` / `asT1`
//     narrow them at the call site without an inline cast.

import { context } from '@devvit/web/server';

export type T1 = `t1_${string}`;
export type T3 = `t3_${string}`;
export type T5 = `t5_${string}`;

export const asT1 = (id: string): T1 => id as T1;
export const asT3 = (id: string): T3 => id as T3;

/** Current subreddit's name from the request context (e.g. `mysubreddit`). */
export function getCurrentSubredditName(): string {
  return context.subredditName || 'unknown';
}

/** Current subreddit's `{ id, name }` from the request context. */
export function getCurrentSubredditRef(): { id: T5; name: string } {
  return { id: (context.subredditId || 't5_unknown') as T5, name: context.subredditName || 'unknown' };
}
