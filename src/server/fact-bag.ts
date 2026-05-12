// server/fact-bag.ts
// Build the closed fact bag from a Devvit event. Pure function — every fact
// is either a constant from the event payload or a single Reddit API call
// (with Redis caching). NEVER calls the LLM.

import { reddit } from '@devvit/web/server';
import { redis } from '@devvit/redis';
import type { FactBag } from '../shared/rule-schema';

const USER_CACHE_TTL_SECONDS = 60 * 60; // 1h author cache

interface PostInput {
  id: string;
  title?: string;
  body?: string;
  url?: string;
  sub?: { weeklyActiveUsers?: number; over18?: boolean };
  authorId: string;
  authorName: string;
}

interface CommentInput {
  id: string;
  body: string;
  parentId: string;
  authorId: string;
  authorName: string;
  sub?: { weeklyActiveUsers?: number; over18?: boolean };
}

export async function buildPostFactBag(p: PostInput, reportsCount = 0): Promise<FactBag> {
  const a = await getAuthorFacts(p.authorId, p.authorName);
  const linkRegex = /https?:\/\/[^\s)]+/gi;
  const links = p.body?.match(linkRegex) ?? [];
  const upper = (p.body ?? '').replace(/[^A-Za-z]/g, '');
  const upperCaseRatio = upper.length === 0 ? 0 : (upper.match(/[A-Z]/g)?.length ?? 0) / upper.length;
  let urlDomain = '';
  try { if (p.url) urlDomain = new URL(p.url).hostname; } catch { urlDomain = ''; }

  return {
    'author.accountAgeHours': a.accountAgeHours,
    'author.totalKarma': a.totalKarma,
    'author.subKarma': a.subKarma,
    'author.isModerator': a.isModerator,
    'author.hasVerifiedEmail': a.hasVerifiedEmail,
    'author.subJoinAgeHours': a.subJoinAgeHours,

    'content.length': p.body?.length ?? 0,
    'content.linkCount': links.length,
    'content.imageCount': 0,                  // v0.2: parse media field
    'content.upperCaseRatio': upperCaseRatio,
    // content.containsRegex actually carries the post body so op:matches works.
    // (audit FIND-08 fix — previously always '')
    'content.containsRegex': p.body ?? '',
    'content.title.length': p.title?.length ?? 0,
    'content.title.contains': p.title ?? '',
    'content.url': p.url ?? '',
    'content.urlDomain': urlDomain,

    'sub.weeklyActiveUsers': p.sub?.weeklyActiveUsers ?? 0,
    'sub.over18': p.sub?.over18 ?? false,

    'reports.count': reportsCount,
    'reports.distinctReporters': reportsCount,  // approximation; refined later
  };
}

export async function buildCommentFactBag(c: CommentInput, reportsCount = 0): Promise<FactBag> {
  const a = await getAuthorFacts(c.authorId, c.authorName);
  const linkRegex = /https?:\/\/[^\s)]+/gi;
  const links = c.body.match(linkRegex) ?? [];
  const upper = c.body.replace(/[^A-Za-z]/g, '');
  const upperCaseRatio = upper.length === 0 ? 0 : (upper.match(/[A-Z]/g)?.length ?? 0) / upper.length;

  return {
    'author.accountAgeHours': a.accountAgeHours,
    'author.totalKarma': a.totalKarma,
    'author.subKarma': a.subKarma,
    'author.isModerator': a.isModerator,
    'author.hasVerifiedEmail': a.hasVerifiedEmail,
    'author.subJoinAgeHours': a.subJoinAgeHours,

    'content.length': c.body.length,
    'content.linkCount': links.length,
    'content.imageCount': 0,
    'content.upperCaseRatio': upperCaseRatio,
    // Comment body is the substrate for op:matches (audit FIND-08 fix)
    'content.containsRegex': c.body,
    'content.title.length': 0,
    'content.title.contains': '',
    'content.url': '',
    'content.urlDomain': '',

    'sub.weeklyActiveUsers': c.sub?.weeklyActiveUsers ?? 0,
    'sub.over18': c.sub?.over18 ?? false,

    'reports.count': reportsCount,
    'reports.distinctReporters': reportsCount,
  };
}

interface AuthorFacts {
  accountAgeHours: number;
  totalKarma: number;
  subKarma: number;
  isModerator: boolean;
  hasVerifiedEmail: boolean;
  subJoinAgeHours: number;
}

const SAFE_AUTHOR_DEFAULTS: AuthorFacts = {
  accountAgeHours: 0,
  totalKarma: 0,
  subKarma: 0,
  isModerator: false,
  hasVerifiedEmail: false,
  subJoinAgeHours: 0,
};

async function getAuthorFacts(authorId: string, authorName: string): Promise<AuthorFacts> {
  // SECURITY: All Redis keys are sub-scoped. Devvit Redis is per-install,
  // but defense-in-depth — if Reddit changes the isolation model, we don't leak.
  const subName = await reddit.getCurrentSubredditName().catch(() => 'unknown');
  const cacheKey = `${subName}:author:${authorId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* fall through */ }
  }

  // SECURITY: catch all Reddit API errors so a flaky upstream doesn't kill the trigger.
  let user;
  try {
    user = await reddit.getUserByUsername(authorName);
  } catch (err) {
    console.warn(`[vibe-mod] getUserByUsername failed for ${authorName}:`, err);
    return SAFE_AUTHOR_DEFAULTS;
  }
  if (!user) return SAFE_AUTHOR_DEFAULTS;

  const now = Date.now();
  const accountAgeHours = Math.floor((now - user.createdAt.getTime()) / 3_600_000);

  // Resolve per-sub karma. Falls back to 0 if API fails (audit FIND-01 mitigation).
  let subKarma = 0;
  try {
    subKarma = await reddit.getUserKarmaFromCurrentSubreddit({ username: authorName }) ?? 0;
  } catch { /* keep default 0 */ }

  // Resolve mod status — read once per sub, cache for 5 min, lookup author in list.
  // Cached separately so we don't refetch the entire mod list every author hit.
  let isModerator = false;
  try {
    const modListKey = `${subName}:modlist`;
    const cachedModList = await redis.get(modListKey);
    let modUsernames: string[];
    if (cachedModList) {
      modUsernames = JSON.parse(cachedModList);
    } else {
      const mods = await reddit.getModerators({ subredditName: subName });
      modUsernames = mods.map((m: { username: string }) => m.username);
      await redis.set(modListKey, JSON.stringify(modUsernames));
      await redis.expire(modListKey, 300);   // 5 min
    }
    isModerator = modUsernames.includes(authorName);
  } catch { /* keep default false */ }

  const facts: AuthorFacts = {
    accountAgeHours,
    totalKarma: (user.linkKarma ?? 0) + (user.commentKarma ?? 0),
    subKarma,
    isModerator,
    hasVerifiedEmail: false,   // Devvit API does not expose this; document as always-false
    subJoinAgeHours: accountAgeHours,   // v0.2: query first-activity-in-sub for true value
  };

  await redis.set(cacheKey, JSON.stringify(facts));
  await redis.expire(cacheKey, USER_CACHE_TTL_SECONDS);
  return facts;
}
