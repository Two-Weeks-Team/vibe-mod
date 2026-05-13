// test/devvit-testkit.ts
// Reusable test doubles for Devvit "Web" apps (@devvit/web@0.12.x): an
// in-memory Redis, the Reddit client surface a mod tool typically touches,
// settings/scheduler stubs, and an OpenAI `fetch` double.
//
// This file has NO project-specific knowledge — it's meant to be copied (or
// extracted into a shared `@<org>/devvit-testkit` package) when you start the
// next mod. `test/setup.ts` is the thin, per-project layer that instantiates
// these, wires `vi.mock(...)`, and resets state between tests.

import { vi } from 'vitest';

// ──────────────────────────────────────────────────────────────────────────────
// In-memory Redis stand-in. Covers the @devvit/redis surface a mod tool uses:
// get/set/del/expire, zAdd/zRange (by rank or score)/zCount/zRemRangeByScore,
// hSet/hGetAll, and the watch→multi→exec transaction shape (executed eagerly —
// fine for single-threaded tests).
// ──────────────────────────────────────────────────────────────────────────────
export interface FakeRedis {
  store: Map<string, string>;
  hashes: Map<string, Record<string, string>>;
  zsets: Map<string, Array<{ member: string; score: number }>>;
  get: (k: string) => Promise<string | undefined>;
  set: (k: string, v: string, opts?: { nx?: boolean; xx?: boolean; expiration?: Date }) => Promise<void>;
  del: (k: string) => Promise<void>;
  expire: (k: string, ttl: number) => Promise<void>;
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
    // Honour SET NX/XX so the production `acquireOnce()` helper (idempotency,
    // per-author rate limit) behaves the same here. (TTL is not modelled — the
    // fake never expires keys; tests that care about expiry use @devvit/test.)
    set: async (k: string, v: string, opts?: { nx?: boolean; xx?: boolean }) => {
      if (opts?.nx && store.has(k)) return;
      if (opts?.xx && !store.has(k)) return;
      store.set(k, v);
    },
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
      // Real Redis ZADD updates the score of an existing member, not a duplicate.
      const arr = (zsets.get(k) ?? []).filter((e) => e.member !== entry.member);
      arr.push(entry);
      zsets.set(k, arr);
    },
    zRange: async (k: string, start: number, stop: number, opts?: { by?: 'rank' | 'score'; reverse?: boolean }) => {
      const arr = [...(zsets.get(k) ?? [])].sort((a, b) => a.score - b.score);
      if (opts?.reverse) arr.reverse();
      if (opts?.by === 'score') {
        // start/stop are score bounds (low..high); honour them regardless of order.
        const [lo, hi] = start <= stop ? [start, stop] : [stop, start];
        return arr.filter((e) => e.score >= lo && e.score <= hi);
      }
      // by rank (default): start/stop are indices into the (possibly reversed) array.
      const end = stop < 0 ? arr.length : stop + 1;
      return arr.slice(start, end);
    },
    zCount: async (k: string, min: number, max: number | '+inf') => {
      const hi = max === '+inf' ? Infinity : max;
      return (zsets.get(k) ?? []).filter((e) => e.score >= min && e.score <= hi).length;
    },
    zRemRangeByScore: async (k: string, min: number, max: number) => {
      zsets.set(
        k,
        (zsets.get(k) ?? []).filter((e) => !(e.score >= min && e.score <= max)),
      );
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
// Devvit `Listing<T>` stand-in. Production code generally only calls `.all()`.
// ──────────────────────────────────────────────────────────────────────────────
export function fakeListing<T>(items: T[]): { all: () => Promise<T[]> } {
  return { all: async () => items };
}

// ──────────────────────────────────────────────────────────────────────────────
// Reddit client double. Shapes track @devvit/web@0.12.x:
//   - getCurrentSubreddit() → { id: t5_…, name }   (there is no getCurrentSubredditName)
//   - getModerators() → Listing<User>              (call `.all()`)
//   - getUserKarmaFromCurrentSubreddit(name) → { fromComments?, fromPosts? }
//   - reporting is reddit.report(thing, { reason })  (not thing.report(...))
//   - modmail uses modMail.createModNotification({ subject, bodyMarkdown, subredditId })
// `subName` lets each project pick its playtest-sub identity.
// ──────────────────────────────────────────────────────────────────────────────
export function makeFakeReddit(subName = 'testsub', subId = `t5_${subName}` as `t5_${string}`) {
  return {
    getCurrentSubreddit: vi.fn(async () => ({ id: subId, name: subName })),
    getCurrentUser: vi.fn(
      async () => ({ id: 't2_caller', username: 'caller' }) as { id: string; username: string } | undefined,
    ),
    getUserByUsername: vi.fn(async (_name: string) => null as unknown),
    getUserKarmaFromCurrentSubreddit: vi.fn(
      async () => ({ fromComments: 0, fromPosts: 0 }) as { fromComments?: number; fromPosts?: number },
    ),
    getModerators: vi.fn(async (_opts: { subredditName: string }) => fakeListing([] as Array<{ username: string }>)),
    getNewPosts: vi.fn((_opts: { subredditName?: string; limit?: number }) =>
      fakeListing([] as Array<Record<string, unknown>>),
    ),
    getPostById: vi.fn(),
    getCommentById: vi.fn(),
    report: vi.fn(async () => ({}) as unknown),
    setPostFlair: vi.fn(async () => {}),
    banUser: vi.fn(async () => {}),
    muteUser: vi.fn(async () => {}),
    unbanUser: vi.fn(async () => {}),
    modMail: { createModNotification: vi.fn(async () => 'modmail_conv_1') },
  };
}
export type FakeReddit = ReturnType<typeof makeFakeReddit>;

export function makeFakeSettings() {
  return { get: vi.fn(async (_k: string) => undefined as unknown) };
}
export function makeFakeScheduler() {
  return { runJob: vi.fn(async (_job: unknown) => 'job_1') };
}

/**
 * Mutable stand-in for `@devvit/web/server`'s request-scoped `context`
 * (`subredditName`/`subredditId`/`postId`/`commentId`/`userId`/`appName`).
 * Tests can mutate it (e.g. `fakeContext.postId = 't3_x'`) — `setup.ts` resets it each test.
 */
export function makeFakeContext(subName = 'testsub', subId = `t5_${subName}` as `t5_${string}`) {
  return {
    subredditId: subId,
    subredditName: subName,
    postId: undefined as `t3_${string}` | undefined,
    commentId: undefined as `t1_${string}` | undefined,
    userId: 't2_caller' as `t2_${string}` | undefined,
    appName: 'vibe-mod',
    metadata: {} as Record<string, unknown>,
  };
}
export type FakeContext = ReturnType<typeof makeFakeContext>;

// ──────────────────────────────────────────────────────────────────────────────
// HTTP `fetch` double (for LLM / external API calls). Returns the mock so the
// caller can `.mockResolvedValue(openaiResponse(...))` per test.
// ──────────────────────────────────────────────────────────────────────────────
export function installFakeFetch() {
  const fakeFetch = vi.fn();
  globalThis.fetch = fakeFetch as unknown as typeof fetch;
  return fakeFetch;
}

/** Minimal OpenAI chat-completions Response double carrying `body` as JSON content. */
export function openaiResponse(body: unknown, usage = { prompt_tokens: 100, completion_tokens: 50 }) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(body) } }], usage }),
  };
}
/** An OpenAI failure Response double. */
export function openaiError(status = 503) {
  return { ok: false, status, json: async () => ({ error: { message: 'upstream' } }) };
}

/** Fail loudly if the runtime lacks Web Crypto (executor action-id generation needs it). */
export function assertWebCrypto(): void {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('test environment is missing Web Crypto — run on Node >=20');
  }
}
