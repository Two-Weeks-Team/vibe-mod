// test/setup.ts
// Per-project vitest setup (see vitest.config.ts → setupFiles). Thin layer over
// the reusable ./devvit-testkit:
//   - instantiate the doubles with vibe-mod's playtest identities
//   - vi.mock the Devvit modules to those instances
//   - reset state between tests
// Re-exports the doubles + helpers so test files can `import { fakeRedis, ... } from '../../test/setup'`.

import { vi, beforeEach } from 'vitest';
import {
  makeFakeRedis,
  makeFakeReddit,
  makeFakeSettings,
  makeFakeScheduler,
  makeFakeContext,
  installFakeFetch,
  assertWebCrypto,
} from './devvit-testkit';

export { fakeListing, openaiResponse, openaiError } from './devvit-testkit';
export type { FakeRedis, FakeTxn, FakeReddit, FakeContext } from './devvit-testkit';

assertWebCrypto();

// vibe-mod's playtest sub is `testsub`; the caller acting in tests is `caller`.
export const fakeRedis = makeFakeRedis();
export const fakeReddit = makeFakeReddit('testsub');
export const fakeSettings = makeFakeSettings();
export const fakeScheduler = makeFakeScheduler();
export const fakeContext = makeFakeContext('testsub');
export const fakeFetch = installFakeFetch();

// vibe-mod imports `reddit`/`redis`/`settings`/`scheduler`/`context` all from `@devvit/web/server`.
vi.mock('@devvit/web/server', () => ({
  reddit: fakeReddit,
  redis: fakeRedis,
  settings: fakeSettings,
  scheduler: fakeScheduler,
  context: fakeContext,
}));

// Reset all doubles between tests so state never leaks across cases.
beforeEach(() => {
  fakeRedis.store.clear();
  fakeRedis.hashes.clear();
  fakeRedis.zsets.clear();
  vi.clearAllMocks();
  // clearAllMocks only wipes call history — re-establish every default *implementation*
  // here so a `.mockResolvedValue(...)` / `.mockImplementation(...)` in one test can't
  // leak into the next. (getPostById/getCommentById have no factory default → mockReset.)
  fakeReddit.getPostById.mockReset();
  fakeReddit.getCommentById.mockReset();
  fakeReddit.getCurrentSubreddit.mockResolvedValue({ id: 't5_testsub', name: 'testsub' });
  fakeReddit.getCurrentUser.mockResolvedValue({ id: 't2_caller', username: 'caller' });
  fakeReddit.getUserByUsername.mockResolvedValue(null);
  fakeReddit.getUserKarmaFromCurrentSubreddit.mockResolvedValue({ fromComments: 0, fromPosts: 0 });
  fakeReddit.getModerators.mockResolvedValue({ all: async () => [] });
  fakeReddit.getNewPosts.mockReturnValue({ all: async () => [] });
  fakeReddit.report.mockResolvedValue({});
  fakeReddit.setPostFlair.mockResolvedValue(undefined);
  fakeReddit.banUser.mockResolvedValue(undefined);
  fakeReddit.muteUser.mockResolvedValue(undefined);
  fakeReddit.unbanUser.mockResolvedValue(undefined);
  fakeReddit.modMail.createModNotification.mockResolvedValue('modmail_conv_1');
  fakeScheduler.runJob.mockResolvedValue('job_1');
  fakeSettings.get.mockResolvedValue(undefined);
  fakeFetch.mockReset();
  Object.assign(fakeContext, makeFakeContext('testsub'));
});
