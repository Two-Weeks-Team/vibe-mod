// src/server/routes/dashboard.ts
// Read-only "vibe-mod: View rules + log" menu (Phase 1.7b reshape — per-rule
// activation moved to the dedicated Manage rules menu). Renders a summary
// of active + draft rule counts, recent audit entries, dry-run previews,
// lifetime token cost, and a 3-step onboarding card on first visit.

import type { Hono } from 'hono';
import { redis } from '@devvit/web/server';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import { keys } from '../../shared/redis-keys';
import { type RuleBundleType } from '../../shared/rule-schema';
import { getCurrentSubredditName } from '../devvit-helpers';
import { isCallerModerator } from '../middleware/auth';
import { describeErr } from '../middleware/diagnostics';
import { safeParseBundle } from '../helpers/rule-validation';
import { estimateTokenCost } from '../helpers/openai';
import type { DryRunResult } from './scheduler';

export function registerDashboardRoutes(app: Hono): void {
  app.post('/internal/menu/dashboard', async (c) => {
    await c.req.json<MenuItemRequest>();
    if (!(await isCallerModerator())) {
      return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
    }

    const subredditName = getCurrentSubredditName();
    let rpcOk = true;
    let active: RuleBundleType | null = null;
    let draft: RuleBundleType | null = null;
    try {
      active = safeParseBundle(await redis.get(keys.rulesActive(subredditName)), 'dashboard/active');
      draft = safeParseBundle(await redis.get(keys.rulesDraft(subredditName)), 'dashboard/draft');
    } catch (err) {
      rpcOk = false;
      console.warn('[vibe-mod] dashboard: redis.get(rules) threw:', describeErr(err));
    }

    const recent: Array<Record<string, string>> = [];
    try {
      const auditKey = keys.audit(subredditName);
      const recentIds = await redis.zRange(auditKey, 0, 19, { by: 'rank', reverse: true });
      for (const m of recentIds) {
        const h = await redis.hGetAll(keys.auditEntry(subredditName, m.member));
        recent.push({ ...h, id: String(m.member) });
      }
    } catch (err) {
      rpcOk = false;
      console.warn('[vibe-mod] dashboard: redis.zRange(audit) threw:', describeErr(err));
    }

    // Dry-run results for the draft rules (written by /internal/scheduler/dry-run-replay).
    const dryRunLines: string[] = [];
    for (const r of draft?.rules ?? []) {
      try {
        const raw = await redis.get(keys.dryrun(subredditName, r.id));
        if (!raw) continue;
        const d = JSON.parse(raw) as DryRunResult;
        if (d.status === 'ok') {
          dryRunLines.push(
            `  ${r.id}: would match ${d.matched.length}/${d.sampledPosts} recent post(s)` +
              (d.matched.length ? ` → ${[...new Set(d.matched.flatMap((m) => m.would))].join(', ')}` : ''),
          );
        } else {
          dryRunLines.push(`  ${r.id}: ${d.note ?? 'dry-run unavailable'}`);
        }
      } catch (err) {
        console.warn(`[vibe-mod] dashboard: redis.get(dryrun/${r.id}) threw:`, describeErr(err));
      }
    }

    // Token usage snapshot — sum across both bundles.
    const totalIn = (active?.llmTokensIn ?? 0) + (draft?.llmTokensIn ?? 0);
    const totalOut = (active?.llmTokensOut ?? 0) + (draft?.llmTokensOut ?? 0);
    const llmModel = active?.llmModel ?? draft?.llmModel ?? 'gpt-5.4-mini';
    const totalCost = estimateTokenCost(llmModel, totalIn, totalOut);

    // Onboarding card (audit Tier-3 #C) — show on first dashboard visit, then
    // hide once dismissed. Best-effort Redis read; if it fails we fall back
    // to "show" (better than silently hiding the intro).
    let firstVisit = true;
    try {
      firstVisit = !(await redis.get(keys.onboardingDismissed(subredditName)));
    } catch (err) {
      console.warn('[vibe-mod] dashboard: redis.get(onboarding) threw:', describeErr(err));
    }
    const totalRules = (active?.rules.length ?? 0) + (draft?.rules.length ?? 0);
    const isEmpty = totalRules === 0 && recent.length === 0;

    const summary = [
      ...(rpcOk
        ? []
        : [
            '⚠ Plugin RPC unreachable (reddit/devvit#258 — OPEN platform bug).',
            'Persistence is offline; this view reflects what redis would return.',
            '',
          ]),
      ...(firstVisit
        ? [
            '👋 Welcome to vibe-mod. 3 quick steps:',
            '   1. We seeded 5 starter rules — see them below.',
            '   2. Open ⋯ → "vibe-mod: Manage rules" to activate one (shadow mode for 24h first).',
            '   3. Open ⋯ → "vibe-mod: Compose rule" to write your own in plain English.',
            '',
          ]
        : []),
      ...(isEmpty
        ? ['No rules yet — open the subreddit ⋯ menu → "vibe-mod: Compose rule" to write your first rule.', '']
        : []),
      `Active rules: ${active?.rules.length ?? 0}`,
      `Draft rules: ${draft?.rules.length ?? 0}`,
      `Recent actions: ${recent.length}`,
      `Tokens used (lifetime): ${totalIn.toLocaleString()} in / ${totalOut.toLocaleString()} out (~$${totalCost.toFixed(4)} on ${llmModel}).`,
      ...(dryRunLines.length ? ['', 'Dry-run preview (draft rules):', ...dryRunLines] : []),
      '',
      'Recent actions:',
      ...recent.slice(0, 10).map((r) => `  ${r.action} (${r.outcome}) — ${(r.ruleSourceNL ?? '').slice(0, 60)}…`),
    ].join('\n');

    return c.json<UiResponse>({
      showForm: {
        name: 'dashboardForm',
        form: {
          title: 'vibe-mod Dashboard',
          description: summary,
          acceptLabel: 'Close',
          cancelLabel: firstVisit ? "Don't show intro again" : 'Cancel',
          fields: firstVisit
            ? [
                {
                  name: 'dismissOnboarding',
                  label: 'Dismiss the welcome intro for this sub',
                  type: 'boolean',
                  defaultValue: false,
                  helpText: 'Tick to hide the 3-step intro on future visits.',
                },
              ]
            : [],
        },
      },
    });
  });

  // Dashboard form submit. Read-only (Phase 1.7b) — handles only the optional
  // onboarding-dismiss flag.
  app.post('/internal/form/dashboard-action', async (c) => {
    if (!(await isCallerModerator())) {
      return c.json<UiResponse>({ showToast: { text: 'Only moderators can use this.', appearance: 'neutral' } });
    }

    const { dismissOnboarding } = await c.req.json<{ dismissOnboarding?: boolean }>();
    if (dismissOnboarding) {
      const subredditName = getCurrentSubredditName();
      try {
        await redis.set(keys.onboardingDismissed(subredditName), '1');
      } catch (err) {
        console.warn('[vibe-mod] dashboard: redis.set(onboarding) threw:', describeErr(err));
      }
      return c.json<UiResponse>({ showToast: 'Welcome intro dismissed.' });
    }
    return c.json<UiResponse>({ showToast: 'Closed.' });
  });
}
