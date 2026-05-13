// server/fact-bag.ts
// Build the closed fact bag from a Devvit event. Pure function — every fact
// is either a constant from the event payload or a single Reddit API call
// (with Redis caching). NEVER calls the LLM.

import { reddit, redis } from '@devvit/web/server';
import type { FactBag } from '../shared/rule-schema';
import { getCurrentSubredditName } from './devvit-helpers';

const USER_CACHE_TTL_SECONDS = 60 * 60; // 1h author cache

interface PostInput {
  id: string;
  title?: string;
  body?: string;
  url?: string;
  nsfw?: boolean;
  isVideo?: boolean;
  isSpoiler?: boolean;
  crosspostParentId?: string; // set when the post is a crosspost
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

// Fraction of A–Z letters in `s` that are uppercase. 0 when `s` has no letters
// (so a link post with an empty body / a numeric title scores 0, not NaN).
function upperCaseRatioOf(s: string): number {
  const letters = s.replace(/[^A-Za-z]/g, '');
  return letters.length === 0 ? 0 : (letters.match(/[A-Z]/g)?.length ?? 0) / letters.length;
}

// Fraction of characters outside the printable-ASCII range (0x20–0x7E). 0 for an
// empty string. A crude "this isn't plain English / uses another script" signal —
// useful for "send non-Latin-script posts to the mod queue"-style rules without
// shipping a language-detection model into the runtime.
function nonAsciiRatioOf(s: string): number {
  if (s.length === 0) return 0;
  let nonAscii = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp < 0x20 || cp > 0x7e) nonAscii++;
  }
  // Iterating with for..of counts code points, so divide by code-point length.
  return nonAscii / [...s].length;
}

// Whitespace-delimited token count. 0 for an empty/blank string.
function wordCountOf(s: string): number {
  const trimmed = s.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

// All HTTP(S) URLs in a chunk of text. Shared by link-count and image-detect —
// safe to reuse one /g regex because `String.prototype.match` with a global
// regex neither reads nor mutates `lastIndex`.
const URL_RE = /https?:\/\/[^\s)]+/gi;

// Heuristic image detection: a URL that points at a common image host or ends in
// an image extension. Best-effort — the Devvit trigger payload doesn't give us a
// structured media field, so we read the body text + the post's own link.
function looksLikeImageUrl(u: string): boolean {
  let host = '';
  let path = u;
  try {
    const parsed = new URL(u);
    host = parsed.hostname.toLowerCase();
    path = parsed.pathname.toLowerCase();
  } catch {
    path = u.toLowerCase();
  }
  if (host === 'i.redd.it' || host === 'i.imgur.com' || host === 'preview.redd.it') return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/.test(path);
}
function imageUrlCountIn(text: string): number {
  return (text.match(URL_RE) ?? []).filter(looksLikeImageUrl).length;
}

export async function buildPostFactBag(p: PostInput, reportsCount = 0): Promise<FactBag> {
  const a = await getAuthorFacts(p.authorId, p.authorName);
  const body = p.body ?? '';
  const links = body.match(URL_RE) ?? [];
  const upperCaseRatio = upperCaseRatioOf(body);
  const titleUpperCaseRatio = upperCaseRatioOf(p.title ?? '');
  let urlDomain = '';
  try {
    if (p.url) urlDomain = new URL(p.url).hostname;
  } catch {
    urlDomain = '';
  }
  const imageCount = imageUrlCountIn(body) + (p.url && looksLikeImageUrl(p.url) ? 1 : 0);

  return {
    'author.accountAgeHours': a.accountAgeHours,
    'author.totalKarma': a.totalKarma,
    'author.postKarma': a.postKarma,
    'author.commentKarma': a.commentKarma,
    'author.subKarma': a.subKarma,
    'author.isModerator': a.isModerator,
    'author.hasVerifiedEmail': a.hasVerifiedEmail,
    'author.subJoinAgeHours': a.subJoinAgeHours,

    'content.length': body.length,
    'content.wordCount': wordCountOf(body),
    'content.linkCount': links.length,
    'content.imageCount': imageCount,
    'content.upperCaseRatio': upperCaseRatio,
    'content.nonAsciiRatio': nonAsciiRatioOf(body),
    // A submission with no selftext body is a link / image / video post.
    'content.isLinkPost': body.length === 0,
    'content.over18': p.nsfw ?? false,
    'content.isVideo': p.isVideo ?? false,
    'content.isSpoiler': p.isSpoiler ?? false,
    'content.isCrosspost': !!p.crosspostParentId,
    // content.containsRegex actually carries the post body so op:matches works.
    // (audit FIND-08 fix — previously always '')
    'content.containsRegex': body,
    'content.title.length': p.title?.length ?? 0,
    'content.title.contains': p.title ?? '',
    'content.title.upperCaseRatio': titleUpperCaseRatio,
    'content.url': p.url ?? '',
    'content.urlDomain': urlDomain,

    'sub.weeklyActiveUsers': p.sub?.weeklyActiveUsers ?? 0,
    'sub.over18': p.sub?.over18 ?? false,

    'reports.count': reportsCount,
    'reports.distinctReporters': reportsCount, // approximation; refined later
  };
}

export async function buildCommentFactBag(c: CommentInput, reportsCount = 0): Promise<FactBag> {
  const a = await getAuthorFacts(c.authorId, c.authorName);
  const links = c.body.match(URL_RE) ?? [];
  const upperCaseRatio = upperCaseRatioOf(c.body);

  return {
    'author.accountAgeHours': a.accountAgeHours,
    'author.totalKarma': a.totalKarma,
    'author.postKarma': a.postKarma,
    'author.commentKarma': a.commentKarma,
    'author.subKarma': a.subKarma,
    'author.isModerator': a.isModerator,
    'author.hasVerifiedEmail': a.hasVerifiedEmail,
    'author.subJoinAgeHours': a.subJoinAgeHours,

    'content.length': c.body.length,
    'content.wordCount': wordCountOf(c.body),
    'content.linkCount': links.length,
    'content.imageCount': imageUrlCountIn(c.body),
    'content.upperCaseRatio': upperCaseRatio,
    'content.nonAsciiRatio': nonAsciiRatioOf(c.body),
    // These are post-only concepts — always false/0 for comments.
    'content.isLinkPost': false,
    'content.over18': false,
    'content.isVideo': false,
    'content.isSpoiler': false,
    'content.isCrosspost': false,
    // Comment body is the substrate for op:matches (audit FIND-08 fix)
    'content.containsRegex': c.body,
    'content.title.length': 0,
    'content.title.contains': '',
    'content.title.upperCaseRatio': 0,
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
  postKarma: number;
  commentKarma: number;
  subKarma: number;
  isModerator: boolean;
  hasVerifiedEmail: boolean;
  subJoinAgeHours: number;
}

// When the Reddit author lookup fails (rate limit / outage), fail SAFE: the
// author looks long-established and high-karma, so common restrictive rules
// ("new account < N hours", "karma < N") do NOT fire on a flood of legitimate
// posts. Every action in the whitelist is restrictive, so "looks established"
// is the conservative default. (Was all-zeros, which made every author look like
// a brand-new throwaway — gap-analysis.)
const ESTABLISHED = 1_000_000; // ≈114 years / "very high karma"
const SAFE_AUTHOR_DEFAULTS: AuthorFacts = {
  accountAgeHours: ESTABLISHED,
  totalKarma: ESTABLISHED,
  postKarma: ESTABLISHED,
  commentKarma: ESTABLISHED,
  subKarma: ESTABLISHED,
  isModerator: false,
  hasVerifiedEmail: false,
  subJoinAgeHours: ESTABLISHED,
};

async function getAuthorFacts(authorId: string, authorName: string): Promise<AuthorFacts> {
  // SECURITY: All Redis keys are sub-scoped. Devvit Redis is per-install,
  // but defense-in-depth — if Reddit changes the isolation model, we don't leak.
  const subName = getCurrentSubredditName();
  const cacheKey = `${subName}:author:${authorId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      /* fall through */
    }
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
  // getUserKarmaFromCurrentSubreddit → { fromComments?, fromPosts? }.
  let subKarma = 0;
  try {
    const k = await reddit.getUserKarmaFromCurrentSubreddit(authorName);
    subKarma = (k?.fromComments ?? 0) + (k?.fromPosts ?? 0);
  } catch {
    /* keep default 0 */
  }

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
      modUsernames = (await mods.all()).map((m: { username: string }) => m.username);
      await redis.set(modListKey, JSON.stringify(modUsernames));
      await redis.expire(modListKey, 300); // 5 min
    }
    isModerator = modUsernames.includes(authorName);
  } catch {
    /* keep default false */
  }

  const postKarma = user.linkKarma ?? 0;
  const commentKarma = user.commentKarma ?? 0;
  const facts: AuthorFacts = {
    accountAgeHours,
    totalKarma: postKarma + commentKarma,
    postKarma,
    commentKarma,
    subKarma,
    isModerator,
    hasVerifiedEmail: false, // Devvit API does not expose this; document as always-false
    subJoinAgeHours: accountAgeHours, // v0.2: query first-activity-in-sub for true value
  };

  await redis.set(cacheKey, JSON.stringify(facts));
  await redis.expire(cacheKey, USER_CACHE_TTL_SECONDS);
  return facts;
}
