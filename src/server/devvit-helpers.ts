// server/devvit-helpers.ts
// Thin adapters over the @devvit/web SDK surface (v0.12.x). Centralised so the
// server modules don't repeat the same casts / accessor chains, and so a future
// SDK bump only touches one file.
//
// Why these exist:
//   - The Reddit client exposes `getCurrentSubreddit(): Promise<Subreddit>` but
//     no `getCurrentSubredditName()` shorthand — we want the name (and sometimes
//     the t5_ id) in a lot of places, so wrap it once.
//   - Thing ids that arrive from Devvit trigger payloads are already correctly
//     prefixed (`t3_…` / `t1_…`), but TypeScript only knows them as `string`.
//     `asT3` / `asT1` narrow them at the call site without an inline cast.

import { reddit } from '@devvit/web/server';

export type T1 = `t1_${string}`;
export type T3 = `t3_${string}`;
export type T5 = `t5_${string}`;

export const asT1 = (id: string): T1 => id as T1;
export const asT3 = (id: string): T3 => id as T3;

/** Current subreddit's name (e.g. `mysubreddit`). One Reddit API call. */
export async function getCurrentSubredditName(): Promise<string> {
  return (await reddit.getCurrentSubreddit()).name;
}

/** Current subreddit's `{ id, name }`. One Reddit API call. */
export async function getCurrentSubredditRef(): Promise<{ id: T5; name: string }> {
  const sub = await reddit.getCurrentSubreddit();
  return { id: sub.id as T5, name: sub.name };
}
