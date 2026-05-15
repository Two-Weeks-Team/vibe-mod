// src/server/fact-bag.test.ts
// The fact bag is hand-built per event and NEVER sourced from the LLM.
// Key invariants: closed key set, safe defaults on API failure, sub-scoped cache.

import { describe, it, expect } from 'vitest';
import { fakeRedis, fakeReddit, fakeListing } from '../../test/setup';
import { buildPostFactBag, buildCommentFactBag } from './fact-bag';
import { FactPaths } from '../shared/rule-schema';

const POST = {
  id: 't3_p1',
  title: 'Check this out',
  body: 'Hello WORLD see https://discord.gg/abc and http://example.com/x',
  url: 'https://discord.gg/abc',
  authorId: 't2_a1',
  authorName: 'alice',
  sub: { weeklyActiveUsers: 1234, over18: true },
};

describe('buildPostFactBag', () => {
  it('emits exactly the closed fact-path key set', async () => {
    const bag = await buildPostFactBag(POST);
    expect(new Set(Object.keys(bag))).toEqual(new Set(FactPaths));
  });

  it('counts links, computes uppercase ratio, extracts the URL domain', async () => {
    const bag = await buildPostFactBag(POST);
    expect(bag['content.linkCount']).toBe(2);
    expect(bag['content.urlDomain']).toBe('discord.gg');
    expect(bag['content.length']).toBe(POST.body.length);
    expect(bag['content.title.length']).toBe(POST.title.length);
    // body has letters "HelloWORLDseediscordgg..." — ratio between 0 and 1
    expect(bag['content.upperCaseRatio']).toBeGreaterThan(0);
    expect(bag['content.upperCaseRatio']).toBeLessThanOrEqual(1);
    // op:matches substrate carries the raw body (audit FIND-08)
    expect(bag['content.containsRegex']).toBe(POST.body);
  });

  it('computes content.title.upperCaseRatio from the title, independent of the body', async () => {
    const shouty = await buildPostFactBag({ ...POST, title: 'BUY MY COURSE NOW', body: 'a perfectly calm body' });
    expect(shouty['content.title.upperCaseRatio']).toBe(1);
    expect(shouty['content.upperCaseRatio']).toBeLessThan(0.2); // body ratio unaffected
    const calm = await buildPostFactBag({ ...POST, title: 'a perfectly calm title', body: 'WHATEVER' });
    expect(calm['content.title.upperCaseRatio']).toBe(0);
    // numeric-only title → 0, not NaN
    const numeric = await buildPostFactBag({ ...POST, title: '2024 results' });
    expect(numeric['content.title.upperCaseRatio']).toBe(0);
  });

  it('passes through subreddit context', async () => {
    const bag = await buildPostFactBag(POST);
    expect(bag['sub.weeklyActiveUsers']).toBe(1234);
    expect(bag['sub.over18']).toBe(true);
  });

  it('computes wordCount, nonAsciiRatio, imageCount, and isLinkPost (v0.2 facts)', async () => {
    // text post with two image links + one non-image link
    const bag = await buildPostFactBag({
      ...POST,
      url: 'https://www.reddit.com/r/sub/comments/p1/x', // self-post permalink, not an image
      body: 'look https://i.redd.it/abc.jpg and https://example.com/pic.png plus https://example.com/page',
    });
    expect(bag['content.wordCount']).toBe(6); // look <url> and <url> plus <url>
    expect(bag['content.imageCount']).toBe(2); // i.redd.it/*.jpg + example.com/*.png
    expect(bag['content.isLinkPost']).toBe(false); // has a selftext body
    expect(bag['content.nonAsciiRatio']).toBe(0); // pure ASCII

    // link/image submission: empty body, post url is an image
    const link = await buildPostFactBag({ ...POST, body: '', url: 'https://i.redd.it/zzz.png' });
    expect(link['content.isLinkPost']).toBe(true);
    expect(link['content.imageCount']).toBe(1); // the post's own image link
    expect(link['content.wordCount']).toBe(0);

    // non-ASCII body
    const intl = await buildPostFactBag({ ...POST, body: '안녕하세요 모두', url: undefined });
    expect(intl['content.nonAsciiRatio']).toBeGreaterThan(0.7);
    expect(intl['content.isLinkPost']).toBe(false);
  });

  it('passes through the post flags over18 / isVideo / isSpoiler / isCrosspost (v0.2.1 facts)', async () => {
    const flagged = await buildPostFactBag({
      ...POST,
      nsfw: true,
      isVideo: true,
      isSpoiler: true,
      crosspostParentId: 't3_orig',
    });
    expect(flagged['content.over18']).toBe(true);
    expect(flagged['content.isVideo']).toBe(true);
    expect(flagged['content.isSpoiler']).toBe(true);
    expect(flagged['content.isCrosspost']).toBe(true);
    // default (flags omitted) → all false
    const plain = await buildPostFactBag(POST);
    expect(plain['content.over18']).toBe(false);
    expect(plain['content.isVideo']).toBe(false);
    expect(plain['content.isSpoiler']).toBe(false);
    expect(plain['content.isCrosspost']).toBe(false);
  });

  it('uses safe zero/false defaults for missing optional inputs', async () => {
    const bag = await buildPostFactBag({ id: 't3_x', authorId: 't2_x', authorName: 'bob' });
    expect(bag['content.length']).toBe(0);
    expect(bag['content.linkCount']).toBe(0);
    expect(bag['content.upperCaseRatio']).toBe(0);
    expect(bag['content.url']).toBe('');
    expect(bag['content.urlDomain']).toBe('');
    expect(bag['sub.weeklyActiveUsers']).toBe(0);
    expect(bag['sub.over18']).toBe(false);
  });

  it('tolerates a malformed post URL without throwing', async () => {
    const bag = await buildPostFactBag({ ...POST, url: 'not a url' });
    expect(bag['content.urlDomain']).toBe('');
  });

  it('threads reportsCount through', async () => {
    const bag = await buildPostFactBag(POST, 3);
    expect(bag['reports.count']).toBe(3);
    expect(bag['reports.distinctReporters']).toBe(3);
  });

  it('passes through post flair text + cssClass (defaults to empty string)', async () => {
    const flaired = await buildPostFactBag({
      ...POST,
      flairText: 'Spam',
      flairCssClass: 'spam-flair',
    });
    expect(flaired['post.flairText']).toBe('Spam');
    expect(flaired['post.flairCssClass']).toBe('spam-flair');

    const unflaired = await buildPostFactBag(POST);
    expect(unflaired['post.flairText']).toBe('');
    expect(unflaired['post.flairCssClass']).toBe('');
  });

  it('passes through author flair text (defaults to empty string)', async () => {
    const flaired = await buildPostFactBag({ ...POST, authorFlairText: 'Verified Contributor' });
    expect(flaired['author.flairText']).toBe('Verified Contributor');

    const unflaired = await buildPostFactBag(POST);
    expect(unflaired['author.flairText']).toBe('');
  });

  it('emits trigger-time clock facts within valid ranges (UTC)', async () => {
    const bag = await buildPostFactBag(POST);
    expect(bag['time.hourOfDay']).toBeGreaterThanOrEqual(0);
    expect(bag['time.hourOfDay']).toBeLessThanOrEqual(23);
    expect(bag['time.dayOfWeek']).toBeGreaterThanOrEqual(0);
    expect(bag['time.dayOfWeek']).toBeLessThanOrEqual(6);
    // UTC-derived: values must match Date.now() at evaluation time
    const now = new Date();
    expect(bag['time.hourOfDay']).toBe(now.getUTCHours());
    expect(bag['time.dayOfWeek']).toBe(now.getUTCDay());
  });
});

describe('buildCommentFactBag', () => {
  it('emits the closed key set with title facts zeroed out', async () => {
    const bag = await buildCommentFactBag({
      id: 't1_c1',
      body: 'nice POST friend',
      parentId: 't3_p1',
      authorId: 't2_a1',
      authorName: 'alice',
    });
    expect(new Set(Object.keys(bag))).toEqual(new Set(FactPaths));
    expect(bag['content.title.length']).toBe(0);
    expect(bag['content.title.contains']).toBe('');
    expect(bag['content.url']).toBe('');
    expect(bag['content.containsRegex']).toBe('nice POST friend');
    // post-only flags are always false/0 for comments
    for (const k of [
      'content.isLinkPost',
      'content.over18',
      'content.isVideo',
      'content.isSpoiler',
      'content.isCrosspost',
    ] as const) {
      expect(bag[k]).toBe(false);
    }
  });

  it('computes wordCount / imageCount / nonAsciiRatio for comment bodies', async () => {
    const bag = await buildCommentFactBag({
      id: 't1_c2',
      body: 'see https://i.imgur.com/x.png 좋아요',
      parentId: 't3_p1',
      authorId: 't2_a1',
      authorName: 'alice',
    });
    expect(bag['content.wordCount']).toBe(3); // "see", url, "좋아요"
    expect(bag['content.imageCount']).toBe(1); // i.imgur.com/x.png
    expect(bag['content.nonAsciiRatio']).toBeGreaterThan(0);
  });

  it('threads author.flairText, zeros post.flair* (post-only), and emits time facts', async () => {
    const bag = await buildCommentFactBag({
      id: 't1_c3',
      body: 'hi',
      parentId: 't3_p1',
      authorId: 't2_a1',
      authorName: 'alice',
      authorFlairText: 'Regular',
    });
    expect(bag['author.flairText']).toBe('Regular');
    // post-only fields are always empty for comments
    expect(bag['post.flairText']).toBe('');
    expect(bag['post.flairCssClass']).toBe('');
    // time facts present and in range
    expect(bag['time.hourOfDay']).toBeGreaterThanOrEqual(0);
    expect(bag['time.hourOfDay']).toBeLessThanOrEqual(23);
  });
});

describe('author facts', () => {
  // On a Reddit-API failure the author looks long-established / high-karma, so
  // restrictive "new account" / "low karma" rules fail SAFE (don't fire on a
  // flood of legit posts) — see SAFE_AUTHOR_DEFAULTS in fact-bag.ts.
  const ESTABLISHED = 1_000_000;
  it('returns fail-safe (looks-established) defaults when getUserByUsername throws', async () => {
    fakeReddit.getUserByUsername.mockRejectedValue(new Error('reddit down'));
    const bag = await buildPostFactBag(POST);
    expect(bag['author.accountAgeHours']).toBe(ESTABLISHED);
    expect(bag['author.totalKarma']).toBe(ESTABLISHED);
    expect(bag['author.subJoinAgeHours']).toBe(ESTABLISHED);
    expect(bag['author.isModerator']).toBe(false);
    expect(bag['author.hasVerifiedEmail']).toBe(false);
  });

  it('returns fail-safe defaults when the user does not exist (null)', async () => {
    fakeReddit.getUserByUsername.mockResolvedValue(null);
    const bag = await buildPostFactBag(POST);
    expect(bag['author.accountAgeHours']).toBe(ESTABLISHED);
    expect(bag['author.totalKarma']).toBe(ESTABLISHED);
  });

  it('derives account age, karma (incl. post/comment split), and mod status from the Reddit API', async () => {
    const created = new Date(Date.now() - 50 * 3_600_000); // 50h old
    fakeReddit.getUserByUsername.mockResolvedValue({ createdAt: created, linkKarma: 30, commentKarma: 70 });
    fakeReddit.getUserKarmaFromCurrentSubreddit.mockResolvedValue({ fromComments: 5, fromPosts: 7 });
    fakeReddit.getModerators.mockResolvedValue(fakeListing([{ username: 'alice' }, { username: 'carol' }]));

    const bag = await buildPostFactBag(POST);
    expect(bag['author.accountAgeHours']).toBe(50);
    expect(bag['author.totalKarma']).toBe(100);
    expect(bag['author.postKarma']).toBe(30);
    expect(bag['author.commentKarma']).toBe(70);
    expect(bag['author.subKarma']).toBe(12); // fromComments + fromPosts
    expect(bag['author.isModerator']).toBe(true);
  });

  it('caches author facts under a sub-scoped key and reuses them', async () => {
    const created = new Date(Date.now() - 10 * 3_600_000);
    fakeReddit.getUserByUsername.mockResolvedValue({ createdAt: created, linkKarma: 1, commentKarma: 1 });
    await buildPostFactBag(POST);
    expect(await fakeRedis.get('testsub:author:t2_a1')).toBeDefined();

    fakeReddit.getUserByUsername.mockClear();
    await buildPostFactBag(POST);
    expect(fakeReddit.getUserByUsername).not.toHaveBeenCalled(); // served from cache
  });

  it('keeps mod status false if the moderator lookup fails', async () => {
    const created = new Date(Date.now() - 10 * 3_600_000);
    fakeReddit.getUserByUsername.mockResolvedValue({ createdAt: created, linkKarma: 1, commentKarma: 1 });
    fakeReddit.getModerators.mockRejectedValue(new Error('forbidden'));
    const bag = await buildPostFactBag(POST);
    expect(bag['author.isModerator']).toBe(false);
  });
});
