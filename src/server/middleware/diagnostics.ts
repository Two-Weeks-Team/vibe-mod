// src/server/middleware/diagnostics.ts
// Production errors stringify as "Error: undefined undefined: undefined"
// because the underlying Devvit/Twirp error envelope has undefined fields.
// `describeErr` pulls the real shape (name/code/message/stack/keys/ctor)
// so we can see what actually failed.
//
// `snapshotDevvitRuntime` reports whether the plugin config + ALS metadata
// are present at request time — the same diagnostic that proved
// reddit/devvit#258 is in the plugin RPC layer (RedisClient.js:584-590,
// `getDevvitConfig().use(...)`), not in our Hono adapter.

export function describeErr(err: unknown): Record<string, unknown> {
  if (err == null) return { value: err };
  if (typeof err !== 'object') return { type: typeof err, value: String(err) };
  const e = err as Record<string, unknown> & { constructor?: { name?: string }; stack?: string };
  const keys = Object.getOwnPropertyNames(err as object);
  return {
    name: (e as { name?: unknown }).name,
    code: (e as { code?: unknown }).code,
    message: (e as { message?: unknown }).message,
    detail: (e as { detail?: unknown }).detail,
    cause: (e as { cause?: unknown }).cause,
    stack: typeof e.stack === 'string' ? e.stack.split('\n').slice(0, 6).join('\n') : undefined,
    ctor: e.constructor?.name,
    keys,
  };
}

export function snapshotDevvitRuntime(): Record<string, unknown> {
  const g = globalThis as { devvit?: { config?: unknown; metadataProvider?: () => unknown } };
  const hasConfig = !!g.devvit?.config;
  const hasMetaProvider = typeof g.devvit?.metadataProvider === 'function';
  let metaSample: unknown;
  let metaKeyCount: number | undefined;
  try {
    if (hasMetaProvider) {
      const m = g.devvit!.metadataProvider!();
      if (m && typeof m === 'object') {
        const ks = Object.keys(m as object);
        metaKeyCount = ks.length;
        // Pick only safe, short fields to avoid spilling tokens.
        metaSample = ks.slice(0, 6);
      }
    }
  } catch (err) {
    metaSample = `metadataProvider() threw: ${describeErr(err)['message'] ?? 'unknown'}`;
  }
  return { hasConfig, hasMetaProvider, metaKeyCount, metaSample };
}
