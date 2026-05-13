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
    expect(bag['content.isLinkPost']).toBe(false); // never applies to comments
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
});

describe('author facts', () => {
  it('returns safe defaults when getUserByUsername throws', async () => {
    fakeReddit.getUserByUsername.mockRejectedValue(new Error('reddit down'));
    const bag = await buildPostFactBag(POST);
    expect(bag['author.accountAgeHours']).toBe(0);
    expect(bag['author.totalKarma']).toBe(0);
    expect(bag['author.isModerator']).toBe(false);
    expect(bag['author.hasVerifiedEmail']).toBe(false);
  });

  it('returns safe defaults when the user does not exist (null)', async () => {
    fakeReddit.getUserByUsername.mockResolvedValue(null);
    const bag = await buildPostFactBag(POST);
    expect(bag['author.accountAgeHours']).toBe(0);
  });

  it('derives account age, karma, and mod status from the Reddit API', async () => {
    const created = new Date(Date.now() - 50 * 3_600_000); // 50h old
    fakeReddit.getUserByUsername.mockResolvedValue({ createdAt: created, linkKarma: 30, commentKarma: 70 });
    fakeReddit.getUserKarmaFromCurrentSubreddit.mockResolvedValue({ fromComments: 5, fromPosts: 7 });
    fakeReddit.getModerators.mockResolvedValue(fakeListing([{ username: 'alice' }, { username: 'carol' }]));

    const bag = await buildPostFactBag(POST);
    expect(bag['author.accountAgeHours']).toBe(50);
    expect(bag['author.totalKarma']).toBe(100);
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
