// src/server/routes/dashboard.ts
// Read-only "vibe-mod: View rules + log" menu (Phase 1.7b reshape — per-rule
// activation moved to the dedicated Manage rules menu). Renders a summary
// of active + draft rule counts, recent audit entries, dry-run previews,
// lifetime token cost, and a 3-step onboarding card on first visit.

import type { Hono } from 'hono';
import { redis } from '@devvit/web/server';
import type { FormField, MenuItemRequest, UiResponse } from '@devvit/web/shared';
import { keys } from '../../shared/redis-keys';
import { type RuleBundleType } from '../../shared/rule-schema';
import { getCurrentSubredditName } from '../devvit-helpers';
import { isCallerModerator } from '../middleware/auth';
import { describeErr } from '../middleware/diagnostics';
import { safeParseBundle } from '../helpers/rule-validation';
import { estimateTokenCost } from '../helpers/openai';
import { detectRuleConflicts, summarizeConflicts } from '../conflict';
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
      // Fetch all audit-entry hashes in parallel (Gemini review MED on PR
      // #45). Sequential hGetAll multiplied Devvit RPC latency by the page
      // size; with 20 entries and ~10ms per call that was a ~200ms tax on
      // every dashboard open.
      const fetched = await Promise.allSettled(
        recentIds.map((m) => redis.hGetAll(keys.auditEntry(subredditName, m.member))),
      );
      for (let i = 0; i < recentIds.length; i++) {
        const settled = fetched[i];
        if (settled.status === 'fulfilled') {
          recent.push({ ...settled.value, id: String(recentIds[i].member) });
        } else {
          console.warn('[vibe-mod] dashboard: redis.hGetAll(entry) failed — skipping:', describeErr(settled.reason));
        }
      }
    } catch (err) {
      rpcOk = false;
      console.warn('[vibe-mod] dashboard: redis.zRange(audit) threw:', describeErr(err));
    }

    // Dry-run results for the draft rules (written by /internal/scheduler/dry-run-replay).
    // Parallel fetch — same rationale as the audit loop above.
    const draftRules = draft?.rules ?? [];
    const dryRunFetches = await Promise.allSettled(draftRules.map((r) => redis.get(keys.dryrun(subredditName, r.id))));
    const dryRunLines: string[] = [];
    for (let i = 0; i < draftRules.length; i++) {
      const r = draftRules[i];
      const settled = dryRunFetches[i];
      if (settled.status === 'rejected') {
        console.warn(`[vibe-mod] dashboard: redis.get(dryrun/${r.id}) failed:`, describeErr(settled.reason));
        continue;
      }
      if (!settled.value) continue;
      try {
        const d = JSON.parse(settled.value) as DryRunResult;
        if (d.status === 'ok') {
          dryRunLines.push(
            `  ${r.id}: would match ${d.matched.length}/${d.sampledPosts} recent post(s)` +
              (d.matched.length ? ` → ${[...new Set(d.matched.flatMap((m) => m.would))].join(', ')}` : ''),
          );
        } else {
          dryRunLines.push(`  ${r.id}: ${d.note ?? 'dry-run unavailable'}`);
        }
      } catch (err) {
        console.warn(`[vibe-mod] dashboard: parse(dryrun/${r.id}) failed:`, describeErr(err));
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

    // Phase 2d UX rework — Devvit renders `disabled paragraph` as a
    // single-line scrolling textarea (multi-line content is hidden behind a
    // tiny viewport), and the form's `description` collapses every \n into
    // a single soft-wrap. Empirically (PR #51 experiment), the only
    // cleanly-rendered multi-line surface is `helpText` on a field — but
    // helpText also collapses \n, so we use `·` as a visible separator.
    //
    // Strategy:
    //   - Short multi-value blocks (counts, token cost, welcome) → one
    //     paragraph field with helpText carrying the inline-wrapped text.
    //   - Long lists (recent actions, dry-run preview) → one field per
    //     item, label = headline, helpText = detail. Capped at 5 items
    //     with a "+N more" hint to keep the modal scrollable.
    const fields: FormField[] = [];

    // helpText is the only Devvit field surface that wraps multi-line text
    // legibly — disabled paragraph defaultValue is single-line truncated.
    // \n still collapses in helpText, so caller passes a pre-joined string
    // (e.g. items separated by `\n  ·  `).
    const addInfoBlock = (name: string, label: string, body: string) => {
      if (!body.trim()) return;
      fields.push({ name, label, type: 'paragraph', defaultValue: '', disabled: true, helpText: body });
    };

    // Per-item helper for long lists. Each item gets its own helpText-body
    // field so the modal is browseable rule-by-rule / action-by-action.
    const addItemBlock = (name: string, label: string, detail: string) => {
      fields.push({ name, label, type: 'paragraph', defaultValue: '', disabled: true, helpText: detail });
    };

    const SEP = '  ·  ';

    if (!rpcOk) {
      addInfoBlock(
        'rpcWarning',
        '⚠ Plugin RPC unreachable',
        'reddit/devvit#258 (OPEN platform bug).' +
          SEP +
          'Persistence is offline; this view reflects what redis would return.',
      );
    }

    if (firstVisit) {
      addInfoBlock(
        'welcome',
        '👋 Welcome to vibe-mod — 3 quick steps',
        '1. We seeded 5 starter rules — see them below.' +
          SEP +
          '2. Open ⋯ → "vibe-mod: Manage rules" to activate one (shadow mode for 24h first).' +
          SEP +
          '3. Open ⋯ → "vibe-mod: Compose rule" to write your own in plain English.',
      );
    }

    if (isEmpty) {
      addInfoBlock(
        'emptyState',
        'No rules yet',
        'Open the subreddit ⋯ menu → "vibe-mod: Compose rule" to write your first rule.',
      );
    }

    addInfoBlock(
      'counts',
      'At a glance',
      `Active rules: ${active?.rules.length ?? 0}` +
        SEP +
        `Draft rules: ${draft?.rules.length ?? 0}` +
        SEP +
        `Recent actions: ${recent.length}`,
    );

    addInfoBlock(
      'tokenCost',
      'Tokens used (lifetime)',
      `${totalIn.toLocaleString()} in / ${totalOut.toLocaleString()} out (~$${totalCost.toFixed(4)} on ${llmModel})`,
    );

    // Multi-rule conflict preview (read-only, non-blocking). Heuristic over
    // active + draft rules: pairs that share a trigger and have opposing
    // dispositions (approve vs remove/ban/queue) or set divergent flair could
    // both fire on the same item. This surfaces them; it does NOT block
    // promotion and is not on the runtime path. See docs/conflict-handling.md
    // for exactly what it does and does not catch.
    const conflicts = detectRuleConflicts([...(active?.rules ?? []), ...(draft?.rules ?? [])]);
    if (conflicts.length > 0) {
      addInfoBlock(
        'conflicts',
        `⚠ ${conflicts.length} potential rule conflict(s)`,
        summarizeConflicts(conflicts, SEP) +
          SEP +
          'Review before promoting — runtime applies all matching rules in order.',
      );
    }

    // Per-rule dry-run preview (top 5). One field per rule so each is
    // browseable on its own row instead of crammed into a single textarea.
    if (draft?.rules?.length) {
      const previewableRules = (draft?.rules ?? []).slice(0, 5);
      for (const r of previewableRules) {
        // Pull the matching dry-run line by rule id. Use startsWith on the
        // trimmed prefix so `r_rule` doesn't accidentally match `r_rule_2`
        // (Gemini review on PR #51). dryRunLines look like "  <id>: ...".
        const prefix = `${r.id}:`;
        const line =
          dryRunLines.find((l) => l.trimStart().startsWith(prefix))?.trim() ?? 'Dry-run pending — re-open in 30s.';
        // Drop the leading "<id>:" since the rule id is already the label.
        const detail = line.startsWith(prefix) ? line.slice(prefix.length).trim() : line;
        addItemBlock(`dryRun_${r.id}`, `📝 ${r.name}`, detail);
      }
      const more = (draft?.rules.length ?? 0) - previewableRules.length;
      if (more > 0) {
        addInfoBlock(
          'dryRunMore',
          '+ more drafts',
          `${more} more draft rule(s) — see "vibe-mod: Manage rules" for the full list.`,
        );
      }
    }

    // Recent actions (top 5). Same per-item shape: one field per action.
    if (recent.length) {
      const previewable = recent.slice(0, 5);
      for (let i = 0; i < previewable.length; i++) {
        const r = previewable[i];
        const headline = `${r.action} (${r.outcome})`;
        const detail = (r.ruleSourceNL ?? '').slice(0, 200) || '(no source NL captured)';
        addItemBlock(`recent_${i}`, headline, detail);
      }
      if (recent.length > previewable.length) {
        addInfoBlock(
          'recentMore',
          '+ more actions',
          `${recent.length - previewable.length} more action(s) in the last 30 days — full audit log retained server-side.`,
        );
      }
    }

    if (firstVisit) {
      fields.push({
        name: 'dismissOnboarding',
        label: 'Dismiss the welcome intro for this sub',
        type: 'boolean',
        defaultValue: false,
        helpText: 'Tick to hide the 3-step intro on future visits.',
      });
    }

    return c.json<UiResponse>({
      showForm: {
        name: 'dashboardForm',
        form: {
          title: 'vibe-mod Dashboard',
          description: 'Read-only summary. Per-rule activation lives in "vibe-mod: Manage rules".',
          // The Cancel button on a Devvit form does NOT trigger the submit
          // handler, so labelling it "Don't show intro again" was actively
          // misleading — clicking it would never actually persist the
          // dismiss flag (Gemini #1 PR #49). The dismissOnboarding
          // boolean toggle above is the real opt-out; submit (Close) sends
          // the form values through to /internal/form/dashboard-action.
          acceptLabel: 'Close',
          cancelLabel: 'Cancel',
          fields,
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
