// src/server/routes/scheduler.ts
// Scheduler tasks (cron + one-shot):
//   - seed-on-install (one-shot, deferred from on-app-install)
//   - audit-retention (daily, drop entries older than 30 days)
//   - dry-run-replay (one-shot per draft rule, replays recent posts)
//   - shadow-promote-check (15 min, flips shadow → live after window)
//   - rate-limit-circuit-breaker (5 min, opens the per-sub circuit if
//     vibe-mod's own action rate spikes)

import type { Hono } from 'hono';
import {
  reddit,
  redis,
  scheduler as _scheduler,
  settings,
  type TaskRequest,
  type TaskResponse,
} from '@devvit/web/server';
import { LIMITS } from '../../shared/limits';
import { keys } from '../../shared/redis-keys';
import { RuleBundle, type RuleBundleType } from '../../shared/rule-schema';
import { seedStarterRules } from '../../shared/starter-rules';
import { buildPostFactBag } from '../fact-bag';
import { selectMatchingRules } from '../evaluator';
import { getCurrentSubredditName, getCurrentSubredditRef } from '../devvit-helpers';
import { describeErr, snapshotDevvitRuntime } from '../middleware/diagnostics';
import { safeParseBundle } from '../helpers/rule-validation';

void _scheduler; // imported for symmetry; route handlers don't enqueue jobs themselves

// Dry-run preview (hard lock #3 — forced before Activate). When a rule is
// compiled into the draft, this job runs immediately, replays the *last few
// posts* through the draft rule (no actions taken — pure evaluation), and
// writes a `${sub}:dryrun:${ruleId}` summary the Dashboard renders. v0.1
// samples posts only (no `getNewComments` in the SDK); a comment-only rule
// gets a "shadow-mode it to see real comments" note.
export interface DryRunResult {
  ruleId: string;
  ruleSourceNL: string;
  ranAt: number;
  status: 'ok' | 'unavailable';
  note?: string;
  sampledPosts: number;
  matched: Array<{ thingId: string; thingType: 'post'; authorName: string; would: string[] }>;
}

export function registerSchedulerRoutes(app: Hono): void {
  // Seeds 5 starter draft rules + an empty active bundle on first install.
  // Idempotent: if a draft / active already exists we don't clobber it.
  app.post('/internal/scheduler/seed-on-install', async (c) => {
    await c.req.json<TaskRequest>().catch(() => null);
    try {
      const subredditName = getCurrentSubredditName();
      const activeKey = keys.rulesActive(subredditName);
      if (!(await redis.get(activeKey))) {
        const emptyActive: RuleBundleType = {
          schemaVersion: '1.0.0',
          bundleVersion: 1,
          compiledAt: Date.now(),
          llmModel: 'seed',
          llmTokensIn: 0,
          llmTokensOut: 0,
          rules: [],
        };
        await redis.set(activeKey, JSON.stringify(emptyActive));
      }
      const draftKey = keys.rulesDraft(subredditName);
      if (!(await redis.get(draftKey))) {
        await redis.set(draftKey, JSON.stringify(seedStarterRules(Date.now())));
      }
    } catch (err) {
      console.error('[vibe-mod] seed-on-install failed (non-fatal — mod can still compose):', err);
    }
    return c.json<TaskResponse>({ status: 'ok' });
  });

  app.post('/internal/scheduler/audit-retention', async (c) => {
    await c.req.json<TaskRequest>();
    // Best-effort — plugin RPC may be down (reddit/devvit#258). The scheduler
    // retries every 24h regardless; if redis is unreachable the gateway just
    // sees a 200 (no-op) instead of an error every tick.
    try {
      const subredditName = getCurrentSubredditName();
      const auditKey = keys.audit(subredditName);
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

      const toDelete = await redis.zRange(auditKey, 0, cutoff, { by: 'score' });
      for (const m of toDelete) {
        await redis.del(keys.auditEntry(subredditName, m.member));
      }
      await redis.zRemRangeByScore(auditKey, 0, cutoff);
    } catch (err) {
      console.warn('[vibe-mod] scheduler/audit-retention: plugin RPC failed:', describeErr(err));
    }
    return c.json<TaskResponse>({ status: 'ok' });
  });

  app.post('/internal/scheduler/dry-run-replay', async (c) => {
    const body = await c.req.json<TaskRequest<{ ruleId: string; subredditName: string }>>();
    const ruleId = body.data?.ruleId;
    const sub = getCurrentSubredditName();
    if (!ruleId) return c.json<TaskResponse>({ status: 'ok' });

    const result: DryRunResult = {
      ruleId,
      ruleSourceNL: '',
      ranAt: Date.now(),
      status: 'ok',
      sampledPosts: 0,
      matched: [],
    };
    try {
      const draftJson = await redis.get(keys.rulesDraft(sub));
      const rule = draftJson ? RuleBundle.parse(JSON.parse(draftJson)).rules.find((r) => r.id === ruleId) : undefined;
      if (!rule) {
        result.status = 'unavailable';
        result.note = `Rule ${ruleId} is no longer in the draft.`;
      } else {
        result.ruleSourceNL = rule.sourceNL;
        const postTrigger = rule.on.includes('onPostSubmit')
          ? 'onPostSubmit'
          : rule.on.includes('onPostReport')
            ? 'onPostReport'
            : null;
        if (!postTrigger) {
          result.status = 'unavailable';
          result.note =
            'This rule listens to comment events. v0.1 dry-run replays recent posts only — activate it (shadow mode is ON by default) to see how it behaves on real comments.';
        } else {
          const posts = await reddit.getNewPosts({ subredditName: sub, limit: LIMITS.DRY_RUN_SAMPLE }).all();
          for (const p of posts) {
            result.sampledPosts++;
            const facts = await buildPostFactBag(
              {
                id: p.id,
                title: p.title,
                body: p.body ?? '',
                url: p.url,
                nsfw: p.nsfw,
                isSpoiler: p.spoiler, // PostV2 calls it isSpoiler
                authorId: p.authorId ?? 't2_unknown',
                authorName: p.authorName,
              },
              p.numberOfReports ?? 0,
            );
            if (selectMatchingRules([rule], postTrigger, facts).length > 0) {
              result.matched.push({
                thingId: p.id,
                thingType: 'post',
                authorName: p.authorName,
                would: rule.then.map((a) => a.action),
              });
            }
          }
        }
      }
    } catch (err) {
      result.status = 'unavailable';
      result.note = `Dry-run replay couldn't complete (${String(err).slice(0, 120)}). Activate in shadow mode to observe live behaviour instead.`;
    }

    try {
      await redis.set(keys.dryrun(sub, ruleId), JSON.stringify(result));
      await redis.expire(keys.dryrun(sub, ruleId), LIMITS.DRY_RUN_TTL_SECONDS);
    } catch (err) {
      console.warn('[vibe-mod] scheduler/dry-run-replay: redis.set(result) failed:', describeErr(err));
    }
    return c.json<TaskResponse>({ status: 'ok' });
  });

  app.post('/internal/scheduler/shadow-promote-check', async (c) => {
    await c.req.json<TaskRequest>();
    const subredditName = getCurrentSubredditName();
    let shadowHours = 24;
    try {
      shadowHours = ((await settings.get('shadowDurationHours')) as number) ?? 24;
    } catch (err) {
      console.warn(
        '[vibe-mod] scheduler/shadow-promote-check: settings.get threw — using default 24h:',
        describeErr(err),
      );
    }
    if (shadowHours <= 0) return c.json<TaskResponse>({ status: 'ok' });

    let bundle: RuleBundleType | null = null;
    try {
      bundle = safeParseBundle(await redis.get(keys.rulesActive(subredditName)), 'shadow-promote-check');
    } catch (err) {
      console.warn('[vibe-mod] scheduler/shadow-promote-check: redis.get failed:', describeErr(err));
      return c.json<TaskResponse>({ status: 'ok' });
    }
    if (!bundle) return c.json<TaskResponse>({ status: 'ok' });

    const now = Date.now();
    const cutoff = shadowHours * 3_600_000;

    let changed = false;
    for (const r of bundle.rules) {
      const since = r.activatedAt ?? r.createdAt;
      if (r.shadow && now - since >= cutoff) {
        r.shadow = false;
        changed = true;
      }
    }
    if (changed) {
      try {
        await redis.set(keys.rulesActive(subredditName), JSON.stringify(bundle));
      } catch (err) {
        console.warn('[vibe-mod] scheduler/shadow-promote-check: redis.set failed:', describeErr(err));
      }
    }
    return c.json<TaskResponse>({ status: 'ok' });
  });

  app.post('/internal/scheduler/rate-limit-circuit-breaker', async (c) => {
    await c.req.json<TaskRequest>();
    const runtime = snapshotDevvitRuntime();
    console.log('[vibe-mod] scheduler/rate-limit enter:', { runtime });
    const { id: subredditId, name: subredditName } = getCurrentSubredditRef();
    let maxPerHour = 100;
    try {
      const v = (await settings.get('maxActionsPerHour')) as number | undefined;
      if (typeof v === 'number') maxPerHour = v;
      console.log('[vibe-mod] scheduler/rate-limit: settings.get OK, maxPerHour=', maxPerHour);
    } catch (err) {
      console.warn('[vibe-mod] scheduler/rate-limit: settings.get threw:', describeErr(err));
    }
    const oneHourAgo = Date.now() - 3_600_000;

    // FIND-04 fix: count audit entries in the last-hour SCORE window, not all-time.
    let recentCount = 0;
    try {
      const auditKey = keys.audit(subredditName);
      recentCount = (await redis.zRange(auditKey, oneHourAgo, Number.MAX_SAFE_INTEGER, { by: 'score' })).length;
    } catch (err) {
      console.warn('[vibe-mod] scheduler/rate-limit: redis.zRange(audit) threw — skipping check:', describeErr(err));
      return c.json<TaskResponse>({ status: 'ok' });
    }

    if (recentCount > maxPerHour) {
      try {
        await redis.set(keys.circuitOpen(subredditName), '1');
        await redis.expire(keys.circuitOpen(subredditName), 600);
      } catch (err) {
        console.warn('[vibe-mod] scheduler/rate-limit: redis.set(circuitOpen) failed:', describeErr(err));
      }

      try {
        await reddit.modMail.createModNotification({
          subject: '🚨 vibe-mod auto-paused',
          bodyMarkdown: `vibe-mod took ${recentCount} actions in the last hour, exceeding your ${maxPerHour} threshold. All rules paused for 10 min. Review your rules in the Dashboard.`,
          subredditId,
        });
      } catch (err) {
        console.warn('[vibe-mod] modmail send failed:', err);
      }
    }
    return c.json<TaskResponse>({ status: 'ok' });
  });
}
