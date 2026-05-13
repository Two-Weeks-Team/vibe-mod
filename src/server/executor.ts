// server/executor.ts
// Action execution with audit + rollback. Atomic via Redis multi/exec.
// HARD-CODED action whitelist. LLM cannot smuggle new verbs through.

import { reddit, redis, settings } from '@devvit/web/server';
import type { ActionType, RuleType } from '../shared/rule-schema';
import { LIMITS } from '../shared/limits';
import { keys, globalKeys } from '../shared/redis-keys';
import type { Outcome } from '../shared/outcomes';
import { asT1, asT3, getCurrentSubredditName } from './devvit-helpers';

export interface AuditEntry {
  actionId: string;
  ruleId: string;
  ruleSourceNL: string;
  thingId: string; // t3_… or t1_…
  thingType: 'post' | 'comment';
  action: string;
  params: Record<string, unknown>;
  authorName: string;
  ts: number;
  outcome: Outcome;
  errorMessage?: string;
}

export interface ExecutionContext {
  rule: RuleType;
  thingId: string;
  thingType: 'post' | 'comment';
  authorName: string;
  authorId: string;
  isDryRun: boolean; // true when called from /scheduler/dry-run-replay
  isShadowMode: boolean; // true if rule.shadow OR sub.dryRunOnly
}

export async function executeActions(ctx: ExecutionContext): Promise<AuditEntry[]> {
  const audits: AuditEntry[] = [];
  const subName = getCurrentSubredditName();
  const dryRunOnly = (await settings.get('dryRunOnly')) as boolean;
  const effectiveShadow = ctx.isShadowMode || ctx.isDryRun || dryRunOnly;

  // A short-circuit (kill switch / circuit breaker / per-author rate limit)
  // still produces audit rows so the Dashboard shows that a rule *tried* to act.
  const shortCircuit = async (outcome: AuditEntry['outcome']): Promise<AuditEntry[]> => {
    const entries = ctx.rule.then.map((act) => auditEntry(ctx, act.action, act.params, outcome));
    for (const e of entries) await writeAudit(subName, e);
    return entries;
  };

  // Global kill switch (set by an admin menu action or remote ops procedure).
  // Used during beta to halt all action across all installs in seconds.
  // Intentionally NOT sub-scoped — one flag freezes every install.
  if ((await redis.get(globalKeys.betaFreeze())) === '1') return shortCircuit('rate_limited');

  // Per-sub rate-limit circuit breaker (set by the cron scheduler when this
  // sub's actions/hour exceed maxActionsPerHour). Key is sub-scoped to match
  // /internal/scheduler/rate-limit-circuit-breaker.
  if ((await redis.get(keys.circuitOpen(subName))) === '1') return shortCircuit('rate_limited');

  // Per-rule per-author rate limit — atomic "acquire once" prevents the TOCTOU
  // race a plain get-then-set has (audit FIND-10 fix).
  if (ctx.rule.rateLimit?.perAuthor) {
    const window = ctx.rule.rateLimit.perAuthor;
    const ttl = window === '1/min' ? 60 : window === '1/hour' ? 3600 : 86400;
    if (!(await acquireOnce(keys.rateLimit(subName, ctx.rule.id, ctx.authorId), ttl)))
      return shortCircuit('rate_limited');
  }

  // NB: GUARDED actions (ban/mute/permaban) are NOT skipped here — they only
  // reach a stored rule if the mod ticked "Allow ban/mute" at compile time, and
  // they still go through the 24h shadow window and the circuit breaker like any
  // other action, with a 30-day rollback. The compile-time gate (see
  // /internal/form/compose-rule-submit) is the authorization point.
  for (const act of ctx.rule.then) {
    if (effectiveShadow) {
      // Shadow / dry-run-only: record what *would* have happened (no action, no
      // rollback token) so the Dashboard's log shows it — that's the whole point
      // of the 24h shadow window.
      const entry = auditEntry(ctx, act.action, act.params, 'shadow');
      audits.push(entry);
      await writeAudit(subName, entry);
      continue;
    }

    try {
      const reverseParams = await applyAction(act, ctx);
      const entry = auditEntry(ctx, act.action, act.params, 'applied');
      audits.push(entry);
      // Persist audit + rollback token (sub-scoped keys, matching the Dashboard
      // and Undo handlers which read `${sub}:audit`).
      await writeAuditAndRollback(subName, entry, reverseParams);
    } catch (err) {
      const entry = auditEntry(ctx, act.action, act.params, 'error', String(err));
      audits.push(entry);
      await writeAudit(subName, entry);
    }
  }

  return audits;
}

// Resolve the Devvit thing model for this execution context.
async function getThing(ctx: ExecutionContext) {
  return ctx.thingType === 'post'
    ? await reddit.getPostById(asT3(ctx.thingId))
    : await reddit.getCommentById(asT1(ctx.thingId));
}

async function applyAction(act: ActionType, ctx: ExecutionContext): Promise<Record<string, unknown>> {
  switch (act.action) {
    case 'report': {
      const target = await getThing(ctx);
      await reddit.report(target, { reason: act.params.reason });
      return { reverseable: false }; // reports cannot be unsent
    }
    case 'flair': {
      if (ctx.thingType !== 'post') return { reverseable: false };
      const post = await reddit.getPostById(asT3(ctx.thingId));
      const prevFlair = post.flair?.text ?? null;
      // Devvit's correct flair-set API (audit FIND-09 fix).
      // setPostFlair is on the reddit client; takes { subredditName, postId, text, cssClass }.
      const subredditName = getCurrentSubredditName();
      await reddit.setPostFlair({
        subredditName,
        postId: asT3(ctx.thingId),
        text: (act.params as { flairText: string }).flairText,
        cssClass: (act.params as { cssClass?: string }).cssClass,
      });
      return { prevFlair };
    }
    case 'lock': {
      const target = await getThing(ctx);
      await target.lock();
      return { wasLocked: true };
    }
    case 'modqueue': {
      // Move to mod queue = report + leave mod note
      const target = await getThing(ctx);
      await reddit.report(target, { reason: `vibe-mod: ${act.params.note}` });
      return { reverseable: false };
    }
    case 'remove': {
      const target = await getThing(ctx);
      const wasRemoved = (target as { removed?: boolean }).removed ?? false;
      if (!wasRemoved) await target.remove(act.params.spam);
      return { wasRemoved, action: 'remove' };
    }
    case 'ban': {
      // GUARDED — only reached if mod explicitly allowed
      await reddit.banUser({
        username: ctx.authorName,
        subredditName: getCurrentSubredditName(),
        reason: act.params.reason,
        duration: act.params.duration,
      });
      return { action: 'ban', duration: act.params.duration };
    }
    case 'mute': {
      await reddit.muteUser({
        username: ctx.authorName,
        subredditName: getCurrentSubredditName(),
        note: act.params.note,
      });
      return { action: 'mute', duration: act.params.duration };
    }
    case 'permaban': {
      await reddit.banUser({
        username: ctx.authorName,
        subredditName: getCurrentSubredditName(),
        reason: act.params.reason,
      });
      return { action: 'permaban' };
    }
  }
}

export async function rollbackAction(
  subredditName: string,
  actionId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const rollbackJson = await redis.get(keys.rollback(subredditName, actionId));
  if (!rollbackJson) return { ok: false, reason: 'Rollback window expired or never existed' };

  const rollback = JSON.parse(rollbackJson) as { entry: AuditEntry; reverseParams: Record<string, unknown> };
  const { entry } = rollback;

  try {
    if (entry.action === 'remove' && entry.thingType === 'post') {
      const post = await reddit.getPostById(asT3(entry.thingId));
      await post.approve();
    } else if (entry.action === 'remove' && entry.thingType === 'comment') {
      const comment = await reddit.getCommentById(asT1(entry.thingId));
      await comment.approve();
    } else if (entry.action === 'lock') {
      const target =
        entry.thingType === 'post'
          ? await reddit.getPostById(asT3(entry.thingId))
          : await reddit.getCommentById(asT1(entry.thingId));
      await target.unlock();
    } else if (entry.action === 'ban' || entry.action === 'permaban') {
      await reddit.unbanUser(entry.authorName, getCurrentSubredditName());
    } else {
      return { ok: false, reason: `Action "${entry.action}" is not reversible` };
    }

    // Mark rollback consumed
    await redis.del(keys.rollback(subredditName, actionId));
    await redis.hSet(keys.auditEntry(subredditName, actionId), { rolledBack: '1', rolledBackAt: String(Date.now()) });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: String(err) };
  }
}

// Cryptographically random action ID (replaces Math.random() — audit FIND-05 fix).
// Devvit serverless runs on Node, so globalThis.crypto.getRandomValues is available.
function newActionId(): string {
  const bytes = new Uint8Array(9);
  globalThis.crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `a_${Date.now()}_${suffix}`;
}

// "Acquire once": SET key=<unique token> NX with a TTL, then read it back — if
// the stored value is our token, this call won the race; otherwise the key was
// already held. Correct regardless of what `redis.set` returns on an NX miss
// (the previous watch/multi/exec version never checked exec()'s result, so a
// genuine concurrent race still double-acquired — audit FIND-10 / gap-analysis).
export async function acquireOnce(key: string, ttlSeconds: number): Promise<boolean> {
  const token = `${Date.now()}.${globalThis.crypto.getRandomValues(new Uint32Array(1))[0]}`;
  await redis.set(key, token, { nx: true, expiration: new Date(Date.now() + ttlSeconds * 1000) });
  return (await redis.get(key)) === token;
}

function auditEntry(
  ctx: ExecutionContext,
  action: string,
  params: Record<string, unknown>,
  outcome: Outcome,
  errorMessage?: string,
): AuditEntry {
  return {
    actionId: newActionId(),
    ruleId: ctx.rule.id,
    ruleSourceNL: ctx.rule.sourceNL,
    thingId: ctx.thingId,
    thingType: ctx.thingType,
    action,
    params,
    authorName: ctx.authorName,
    ts: Date.now(),
    outcome,
    errorMessage,
  };
}

// Append one audit row: a member in the time-ordered `${sub}:audit` ZSet plus a
// detail hash with a 30-day TTL (so detail self-expires even if the daily
// audit-retention cron is delayed or its zRange page-caps on a busy sub —
// gap-analysis: otherwise these hashes leak unbounded → Redis quota). Used for
// every outcome (shadow / applied / rate_limited / error) so the Dashboard log
// reflects what each rule did or would have done.
async function writeAudit(subName: string, entry: AuditEntry): Promise<void> {
  const txn = await redis.watch(keys.auditEntry(subName, entry.actionId));
  await txn.multi();
  await txn.zAdd(keys.audit(subName), { member: entry.actionId, score: entry.ts });
  await txn.hSet(keys.auditEntry(subName, entry.actionId), {
    ruleId: entry.ruleId,
    ruleSourceNL: entry.ruleSourceNL,
    thingId: entry.thingId,
    thingType: entry.thingType,
    action: entry.action,
    params: JSON.stringify(entry.params),
    authorName: entry.authorName,
    ts: String(entry.ts),
    outcome: entry.outcome,
    ...(entry.errorMessage ? { errorMessage: entry.errorMessage.slice(0, 300) } : {}),
  });
  await txn.expire(keys.auditEntry(subName, entry.actionId), LIMITS.AUDIT_TTL_SECONDS);
  await txn.exec();
}

// Applied actions additionally get a rollback token (auto-expires at 30d — set
// atomically via the `expiration` option so a failed EXPIRE can't leave the
// token TTL-less, like acquireOnce above).
async function writeAuditAndRollback(
  subName: string,
  entry: AuditEntry,
  reverseParams: Record<string, unknown>,
): Promise<void> {
  await writeAudit(subName, entry);
  await redis.set(keys.rollback(subName, entry.actionId), JSON.stringify({ entry, reverseParams }), {
    expiration: new Date(Date.now() + LIMITS.ROLLBACK_TTL_SECONDS * 1000),
  });
}
