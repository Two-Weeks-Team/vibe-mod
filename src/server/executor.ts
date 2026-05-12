// server/executor.ts
// Action execution with audit + rollback. Atomic via Redis multi/exec.
// HARD-CODED action whitelist. LLM cannot smuggle new verbs through.

import { reddit, settings } from '@devvit/web/server';
import { redis } from '@devvit/redis';
import { SAFE_ACTIONS, GUARDED_ACTIONS, type ActionType, type RuleType } from '../shared/rule-schema';

const ROLLBACK_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface AuditEntry {
  actionId: string;
  ruleId: string;
  ruleSourceNL: string;
  thingId: string;       // t3_… or t1_…
  thingType: 'post' | 'comment';
  action: string;
  params: Record<string, unknown>;
  authorName: string;
  ts: number;
  outcome: 'applied' | 'shadow' | 'rate_limited' | 'guarded_skip' | 'error';
  errorMessage?: string;
}

export interface ExecutionContext {
  rule: RuleType;
  thingId: string;
  thingType: 'post' | 'comment';
  authorName: string;
  authorId: string;
  isDryRun: boolean;       // true when called from /scheduler/dry-run-replay
  isShadowMode: boolean;   // true if rule.shadow OR sub.dryRunOnly
}

export async function executeActions(ctx: ExecutionContext): Promise<AuditEntry[]> {
  const audits: AuditEntry[] = [];
  const dryRunOnly = (await settings.get('dryRunOnly')) as boolean;
  const effectiveShadow = ctx.isShadowMode || ctx.isDryRun || dryRunOnly;

  // Global kill switch (set by an admin menu action or remote ops procedure).
  // Used during beta to halt all action across all installs in seconds.
  const killSwitch = await redis.get('circuit:beta_freeze');
  if (killSwitch === '1') {
    return ctx.rule.then.map(act => auditEntry(ctx, act.action, act.params, 'rate_limited'));
  }

  // Per-sub rate-limit circuit breaker (set by cron scheduler when actions/hour
  // exceed maxActionsPerHour). Skip if open.
  const breakerOpen = await redis.get('circuit:open');
  if (breakerOpen === '1') {
    return ctx.rule.then.map(act => auditEntry(ctx, act.action, act.params, 'rate_limited'));
  }

  // Per-rule per-author rate limit — atomic set NX prevents TOCTOU race
  // (audit FIND-10 fix).
  if (ctx.rule.rateLimit?.perAuthor) {
    const window = ctx.rule.rateLimit.perAuthor;
    const ttl = window === '1/min' ? 60 : window === '1/hour' ? 3600 : 86400;
    const subName = await import('@devvit/web/server').then(m => m.reddit.getCurrentSubredditName()).catch(() => 'unknown');
    const key = `${subName}:ratelimit:${ctx.rule.id}:${ctx.authorId}`;
    // Atomic check-and-set: if already exists, return without acting
    // (Devvit's redis client may not expose SET NX directly — emulate via
    // watch+multi+exec for atomicity.)
    const setNxLike = await trySetIfNotExists(key, '1', ttl);
    if (!setNxLike) {
      return ctx.rule.then.map(act => auditEntry(ctx, act.action, act.params, 'rate_limited'));
    }
  }

  for (const act of ctx.rule.then) {
    // GUARDED actions skip silently unless explicitly allowed. v0.1: never auto-fires.
    if ((GUARDED_ACTIONS as readonly string[]).includes(act.action) && !effectiveShadow) {
      audits.push(auditEntry(ctx, act.action, act.params, 'guarded_skip'));
      continue;
    }

    if (effectiveShadow) {
      audits.push(auditEntry(ctx, act.action, act.params, 'shadow'));
      continue;
    }

    // Execute + write audit + write rollback token atomically
    try {
      const reverseParams = await applyAction(act, ctx);
      const entry = auditEntry(ctx, act.action, act.params, 'applied');
      audits.push(entry);

      // Persist audit + rollback token
      await writeAuditAndRollback(entry, reverseParams);
    } catch (err) {
      audits.push(auditEntry(ctx, act.action, act.params, 'error', String(err)));
    }
  }

  return audits;
}

async function applyAction(act: ActionType, ctx: ExecutionContext): Promise<Record<string, unknown>> {
  switch (act.action) {
    case 'report': {
      const target = ctx.thingType === 'post'
        ? await reddit.getPostById(ctx.thingId)
        : await reddit.getCommentById(ctx.thingId);
      await target.report({ reason: act.params.reason });
      return { reverseable: false };  // reports cannot be unsent
    }
    case 'flair': {
      if (ctx.thingType !== 'post') return { reverseable: false };
      const post = await reddit.getPostById(ctx.thingId);
      const prevFlair = post.flair?.text ?? null;
      // Devvit's correct flair-set API (audit FIND-09 fix).
      // setPostFlair is on the reddit client; takes { subredditName, postId, text, cssClass }.
      const subredditName = await reddit.getCurrentSubredditName();
      await reddit.setPostFlair({
        subredditName,
        postId: ctx.thingId,
        text: (act.params as { flairText: string }).flairText,
        cssClass: (act.params as { cssClass?: string }).cssClass,
      });
      return { prevFlair };
    }
    case 'lock': {
      if (ctx.thingType === 'post') {
        const post = await reddit.getPostById(ctx.thingId);
        await post.lock();
      } else {
        const comment = await reddit.getCommentById(ctx.thingId);
        await comment.lock();
      }
      return { wasLocked: true };
    }
    case 'modqueue': {
      // Move to mod queue = report + leave mod note
      const target = ctx.thingType === 'post'
        ? await reddit.getPostById(ctx.thingId)
        : await reddit.getCommentById(ctx.thingId);
      await target.report({ reason: `vibe-mod: ${act.params.note}` });
      return { reverseable: false };
    }
    case 'remove': {
      const target = ctx.thingType === 'post'
        ? await reddit.getPostById(ctx.thingId)
        : await reddit.getCommentById(ctx.thingId);
      const wasRemoved = (target as { removed?: boolean }).removed ?? false;
      if (!wasRemoved) await target.remove(act.params.spam);
      return { wasRemoved, action: 'remove' };
    }
    case 'ban': {
      // GUARDED — only reached if mod explicitly allowed
      await reddit.banUser({
        username: ctx.authorName,
        subredditName: (await reddit.getCurrentSubredditName()) as string,
        reason: act.params.reason,
        duration: act.params.duration,
      });
      return { action: 'ban', duration: act.params.duration };
    }
    case 'mute': {
      await reddit.muteUser({
        username: ctx.authorName,
        subredditName: (await reddit.getCurrentSubredditName()) as string,
        note: act.params.note,
      });
      return { action: 'mute', duration: act.params.duration };
    }
    case 'permaban': {
      await reddit.banUser({
        username: ctx.authorName,
        subredditName: (await reddit.getCurrentSubredditName()) as string,
        reason: act.params.reason,
      });
      return { action: 'permaban' };
    }
  }
}

export async function rollbackAction(actionId: string): Promise<{ ok: boolean; reason?: string }> {
  const rollbackJson = await redis.get(`rollback:${actionId}`);
  if (!rollbackJson) return { ok: false, reason: 'Rollback window expired or never existed' };

  const rollback = JSON.parse(rollbackJson) as { entry: AuditEntry; reverseParams: Record<string, unknown> };
  const { entry } = rollback;

  try {
    if (entry.action === 'remove' && entry.thingType === 'post') {
      const post = await reddit.getPostById(entry.thingId);
      await post.approve();
    } else if (entry.action === 'remove' && entry.thingType === 'comment') {
      const comment = await reddit.getCommentById(entry.thingId);
      await comment.approve();
    } else if (entry.action === 'lock') {
      const target = entry.thingType === 'post'
        ? await reddit.getPostById(entry.thingId)
        : await reddit.getCommentById(entry.thingId);
      await target.unlock();
    } else if (entry.action === 'ban' || entry.action === 'permaban') {
      const subredditName = (await reddit.getCurrentSubredditName()) as string;
      await reddit.unbanUser(entry.authorName, subredditName);
    } else {
      return { ok: false, reason: `Action "${entry.action}" is not reversible` };
    }

    // Mark rollback consumed
    await redis.del(`rollback:${actionId}`);
    await redis.hSet(`audit:${actionId}`, { rolledBack: '1', rolledBackAt: String(Date.now()) });
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
  const suffix = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `a_${Date.now()}_${suffix}`;
}

// Atomic check-and-set replacement for SET NX (audit FIND-10 fix).
async function trySetIfNotExists(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const txn = await redis.watch(key);
  const existing = await redis.get(key);
  if (existing !== null && existing !== undefined) {
    await txn.discard();
    return false;
  }
  await txn.multi();
  await txn.set(key, value);
  await txn.expire(key, ttlSeconds);
  await txn.exec();
  return true;
}

function auditEntry(ctx: ExecutionContext, action: string, params: Record<string, unknown>, outcome: AuditEntry['outcome'], errorMessage?: string): AuditEntry {
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

async function writeAuditAndRollback(entry: AuditEntry, reverseParams: Record<string, unknown>): Promise<void> {
  // Use transaction so audit + rollback are atomic
  const watchKey = `audit:${entry.actionId}`;
  const txn = await redis.watch(watchKey);
  await txn.multi();

  // ZSET for time-ordered listing
  await txn.zAdd('audit', { member: entry.actionId, score: entry.ts });

  // Hash for audit detail
  await txn.hSet(`audit:${entry.actionId}`, {
    ruleId: entry.ruleId,
    ruleSourceNL: entry.ruleSourceNL,
    thingId: entry.thingId,
    thingType: entry.thingType,
    action: entry.action,
    params: JSON.stringify(entry.params),
    authorName: entry.authorName,
    ts: String(entry.ts),
    outcome: entry.outcome,
  });

  // String key with TTL for rollback token (auto-expires at 30d)
  await txn.set(`rollback:${entry.actionId}`, JSON.stringify({ entry, reverseParams }));
  await txn.expire(`rollback:${entry.actionId}`, ROLLBACK_TTL_SECONDS);

  await txn.exec();
}
