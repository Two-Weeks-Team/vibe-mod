// test/setup.ts
// Global vitest setup. Loaded once before all test files (see vitest.config.ts).
//
// Responsibilities:
//   - Guarantee `globalThis.crypto.getRandomValues` exists (executor.ts depends
//     on it for action IDs). Node ≥20 ships the Web Crypto API globally, but we
//     assert it loudly so a future runtime regression fails fast instead of
//     producing undefined behaviour.
//   - Default-mock the Devvit SDK modules so individual test files only need to
//     override the handful of calls they care about. Per-test overrides use
//     `vi.mocked(...)` against the same module instances.

import { vi, beforeEach } from 'vitest';

if (typeof globalThis.crypto?.getRandomValues !== 'function') {
  throw new Error('test environment is missing Web Crypto — run on Node >=20');
}

// ──────────────────────────────────────────────────────────────────────────────
// In-memory Redis stand-in. Implements just enough of the @devvit/redis surface
// that vibe-mod touches: get/set/del/expire, zAdd/zRange/zCount/zRemRangeByScore,
// hSet/hGetAll, and the watch→multi→exec transaction shape (executed eagerly —
// good enough for single-threaded tests).
// ──────────────────────────────────────────────────────────────────────────────
export interface FakeRedis {
  store: Map<string, string>;
  hashes: Map<string, Record<string, string>>;
  zsets: Map<string, Array<{ member: string; score: number }>>;
  get: (k: string) => Promise<string | undefined>;
  set: (k: string, v: string) => Promise<void>;
  del: (k: string) => Promise<void>;
  expire: (k: string, _ttl: number) => Promise<void>;
  hSet: (k: string, fields: Record<string, string>) => Promise<void>;
  hGetAll: (k: string) => Promise<Record<string, string>>;
  zAdd: (k: string, entry: { member: string; score: number }) => Promise<void>;
  zRange: (
    k: string,
    start: number,
    stop: number,
    opts?: { by?: 'rank' | 'score'; reverse?: boolean },
  ) => Promise<Array<{ member: string; score: number }>>;
  zCount: (k: string, min: number, max: number | '+inf') => Promise<number>;
  zRemRangeByScore: (k: string, min: number, max: number) => Promise<void>;
  watch: (k: string) => Promise<FakeTxn>;
}
export interface FakeTxn {
  multi: () => Promise<void>;
  discard: () => Promise<void>;
  exec: () => Promise<void>;
  get: (k: string) => Promise<string | undefined>;
  set: (k: string, v: string) => Promise<void>;
  expire: (k: string, ttl: number) => Promise<void>;
  hSet: (k: string, fields: Record<string, string>) => Promise<void>;
  zAdd: (k: string, entry: { member: string; score: number }) => Promise<void>;
}

export function makeFakeRedis(): FakeRedis {
  const store = new Map<string, string>();
  const hashes = new Map<string, Record<string, string>>();
  const zsets = new Map<string, Array<{ member: string; score: number }>>();

  const base = {
    store,
    hashes,
    zsets,
    get: async (k: string) => store.get(k),
    set: async (k: string, v: string) => void store.set(k, v),
    del: async (k: string) => {
      store.delete(k);
      hashes.delete(k);
      zsets.delete(k);
    },
    expire: async () => {},
    hSet: async (k: string, fields: Record<string, string>) => {
      hashes.set(k, { ...(hashes.get(k) ?? {}), ...fields });
    },
    hGetAll: async (k: string) => ({ ...(hashes.get(k) ?? {}) }),
    zAdd: async (k: string, entry: { member: string; score: number }) => {
      const arr = zsets.get(k) ?? [];
      arr.push(entry);
      zsets.set(k, arr);
    },
    zRange: async (
      k: string,
      start: number,
      stop: number,
      opts?: { by?: 'rank' | 'score'; reverse?: boolean },
    ) => {
      let arr = [...(zsets.get(k) ?? [])].sort((a, b) => a.score - b.score);
      if (opts?.by === 'score') {
        arr = arr.filter((e) => e.score >= start && e.score <= stop);
      } else {
        if (opts?.reverse) arr.reverse();
        const end = stop < 0 ? arr.length : stop + 1;
        arr = arr.slice(start, end);
        return arr;
      }
      return arr;
    },
    zCount: async (k: string, min: number, max: number | '+inf') => {
      const hi = max === '+inf' ? Infinity : max;
      return (zsets.get(k) ?? []).filter((e) => e.score >= min && e.score <= hi).length;
    },
    zRemRangeByScore: async (k: string, min: number, max: number) => {
      zsets.set(k, (zsets.get(k) ?? []).filter((e) => !(e.score >= min && e.score <= max)));
    },
  };

  const watch = async (_k: string): Promise<FakeTxn> => ({
    multi: async () => {},
    discard: async () => {},
    exec: async () => {},
    get: base.get,
    set: base.set,
    expire: base.expire,
    hSet: base.hSet,
    zAdd: base.zAdd,
  });

  return { ...base, watch };
}

// ──────────────────────────────────────────────────────────────────────────────
// Devvit `Listing<T>` stand-in. Production code only calls `.all()`.
// ──────────────────────────────────────────────────────────────────────────────
export function fakeListing<T>(items: T[]): { all: () => Promise<T[]> } {
  return { all: async () => items };
}

// ──────────────────────────────────────────────────────────────────────────────
// Mutable Devvit doubles. Test files import these to script per-case behaviour.
// Shapes track @devvit/web@0.12.x:
//   - `getCurrentSubreddit()` → `{ id: t5_…, name }` (there is no getCurrentSubredditName)
//   - `getModerators()` → Listing<User> (call `.all()`)
//   - `getUserKarmaFromCurrentSubreddit(name)` → `{ fromComments?, fromPosts? }`
//   - reporting is `reddit.report(thing, { reason })` (not `thing.report(...)`)
//   - modmail uses `modMail.createModNotification({ subject, bodyMarkdown, subredditId })`
// ──────────────────────────────────────────────────────────────────────────────
export const fakeRedis = makeFakeRedis();

export const fakeReddit = {
  getCurrentSubreddit: vi.fn(async () => ({ id: 't5_testsub' as `t5_${string}`, name: 'testsub' })),
  getCurrentUser: vi.fn(async () => ({ id: 't2_caller', username: 'caller' }) as { id: string; username: string } | undefined),
  getUserByUsername: vi.fn(async (_name: string) => null as unknown),
  getUserKarmaFromCurrentSubreddit: vi.fn(async () => ({ fromComments: 0, fromPosts: 0 }) as { fromComments?: number; fromPosts?: number }),
  getModerators: vi.fn(async (_opts: { subredditName: string }) => fakeListing([] as Array<{ username: string }>)),
  getPostById: vi.fn(),
  getCommentById: vi.fn(),
  report: vi.fn(async () => ({}) as unknown),
  setPostFlair: vi.fn(async () => {}),
  banUser: vi.fn(async () => {}),
  muteUser: vi.fn(async () => {}),
  unbanUser: vi.fn(async () => {}),
  modMail: { createModNotification: vi.fn(async () => 'modmail_conv_1') },
};

export const fakeSettings = {
  get: vi.fn(async (_k: string) => undefined as unknown),
};

export const fakeScheduler = {
  runJob: vi.fn(async (_job: unknown) => 'job_1'),
};

// OpenAI HTTP double — `callOpenAI` does `fetch('https://api.openai.com/...')`.
export const fakeFetch = vi.fn();
globalThis.fetch = fakeFetch as unknown as typeof fetch;

/** Minimal OpenAI chat-completions Response double carrying `body` as JSON content. */
export function openaiResponse(body: unknown, usage = { prompt_tokens: 100, completion_tokens: 50 }) {
  return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(body) } }], usage }) };
}
/** OpenAI failure Response double. */
export function openaiError(status = 503) {
  return { ok: false, status, json: async () => ({ error: { message: 'upstream' } }) };
}

vi.mock('@devvit/redis', () => ({ redis: fakeRedis }));
vi.mock('@devvit/web/server', () => ({
  reddit: fakeReddit,
  settings: fakeSettings,
  scheduler: fakeScheduler,
}));

// Reset all doubles between tests so state never leaks across cases.
beforeEach(() => {
  fakeRedis.store.clear();
  fakeRedis.hashes.clear();
  fakeRedis.zsets.clear();
  vi.clearAllMocks();
  fakeReddit.getCurrentSubreddit.mockResolvedValue({ id: 't5_testsub', name: 'testsub' });
  fakeReddit.getCurrentUser.mockResolvedValue({ id: 't2_caller', username: 'caller' });
  fakeReddit.getUserByUsername.mockResolvedValue(null);
  fakeReddit.getUserKarmaFromCurrentSubreddit.mockResolvedValue({ fromComments: 0, fromPosts: 0 });
  fakeReddit.getModerators.mockResolvedValue(fakeListing([]));
  fakeReddit.modMail.createModNotification.mockResolvedValue('modmail_conv_1');
  fakeScheduler.runJob.mockResolvedValue('job_1');
  fakeSettings.get.mockResolvedValue(undefined);
  fakeFetch.mockReset();
});
