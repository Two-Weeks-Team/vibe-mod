#!/usr/bin/env tsx
// scripts/acceptance.ts
// Runnable encoding of the Day-1 → Day-4 exit gates from HANDOFF.md.
//
// Usage:  npm run acceptance
//
// Each gate is a list of named checks. A gate passes only if every check passes.
// The script prints a report and exits 1 if any gate fails — wire it into CI and
// the pre-record checklist so "is vibe-mod demo-ready?" has a yes/no answer.
//
// These are STATIC + UNIT checks (config↔code consistency, schema validity, the
// vitest suite). The live-playtest gates (menu actually renders, OpenAI compile
// round-trips) still need `npm run dev` against a playtest sub — those are noted
// as MANUAL at the end and are not auto-asserted here.

import * as fs from 'node:fs';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { dirname, join } from 'node:path';
import { FactPaths, SAFE_ACTIONS, GUARDED_ACTIONS } from '../src/shared/rule-schema';
import { VIBE_MOD_SYSTEM_PROMPT, FEW_SHOT_EXAMPLES } from '../src/shared/system-prompt';
import { seedStarterRules, STARTER_RULE_IDS } from '../src/shared/starter-rules';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const exists = (p: string) => existsSync(join(ROOT, p));

type Check = { name: string; run: () => void };
type Gate = { id: string; title: string; checks: Check[] };

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

// ── Shared parsed artifacts ────────────────────────────────────────────────────
const devvit = JSON.parse(read('devvit.json')) as {
  $schema?: string;
  permissions: { http?: { domains?: string[] } };
  menu: { items: Array<{ endpoint: string; forUserType?: string; location?: string[] }> };
  forms: Record<string, string>;
  triggers: Record<string, string>;
  scheduler: { tasks: Record<string, { endpoint: string; cron?: string }> };
};
const pkg = JSON.parse(read('package.json')) as {
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
};
// Concatenate every .ts file under src/server/ so the route-defined check
// works after Phase 2b's module split (handlers moved out of index.ts into
// src/server/routes/*.ts and src/server/helpers/*.ts).
const serverTs = (() => {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) files.push(full);
    }
  };
  walk(path.resolve(ROOT, 'src/server'));
  return files.map((f) => fs.readFileSync(f, 'utf8')).join('\n\n//── file boundary ──//\n\n');
})();
const indexTs = serverTs; // legacy alias — older checks still reference it

const routeDefined = (path: string) => serverTs.includes(`'${path}'`) || serverTs.includes(`"${path}"`);

// ── Gate 1 — Day 1: setup + first menu shown ──────────────────────────────────
const gate1: Gate = {
  id: 'G1',
  title: 'Day 1 — Devvit app wired (permissions, menus, deps)',
  checks: [
    {
      name: 'devvit.json declares api.openai.com under permissions.http.domains',
      run: () =>
        assert(
          devvit.permissions.http?.domains?.includes('api.openai.com'),
          'api.openai.com missing from http.domains (most common Day-1 fail)',
        ),
    },
    {
      name: 'devvit.json declares the three moderator menu items',
      run: () => {
        const eps = devvit.menu.items.map((m) => m.endpoint);
        for (const want of ['/internal/menu/compose-rule', '/internal/menu/dashboard', '/internal/menu/undo-action']) {
          assert(eps.includes(want), `menu item ${want} not declared`);
        }
      },
    },
    {
      name: 'every declared menu endpoint has a matching route in index.ts',
      run: () => {
        for (const m of devvit.menu.items)
          assert(routeDefined(m.endpoint), `menu endpoint ${m.endpoint} has no app.post() route`);
      },
    },
    {
      name: 'every form endpoint declared in devvit.json has a matching route in index.ts',
      run: () => {
        for (const [name, ep] of Object.entries(devvit.forms))
          assert(routeDefined(ep), `form "${name}" → ${ep} has no app.post() route`);
      },
    },
    {
      name: 'devvit.json has a $schema and well-formed scheduler cron strings',
      run: () => {
        assert(
          devvit.$schema?.includes('developers.reddit.com/schema'),
          'devvit.json is missing the $schema reference',
        );
        for (const [name, task] of Object.entries(devvit.scheduler.tasks)) {
          if (task.cron !== undefined) {
            assert(
              task.cron.trim().split(/\s+/).length === 5,
              `scheduler task "${name}" cron "${task.cron}" is not a 5-field expression`,
            );
          }
        }
      },
    },
    {
      name: 'runtime deps present: @devvit/web, hono, zod',
      run: () => {
        for (const dep of ['@devvit/web', 'hono', 'zod'])
          assert(pkg.dependencies[dep], `dependency ${dep} missing from package.json`);
      },
    },
  ],
};

// ── Gate 2 — Day 2: OpenAI compile path + prompt in sync with schema ──────────
const gate2: Gate = {
  id: 'G2',
  title: 'Day 2 — Rule compiler (prompt ↔ schema in sync, examples valid)',
  checks: [
    {
      name: 'system prompt lists every fact path from the schema',
      run: () => {
        for (const f of FactPaths)
          assert(VIBE_MOD_SYSTEM_PROMPT.includes(f), `system prompt is missing fact path ${f}`);
      },
    },
    {
      name: 'system prompt lists every safe + guarded action verb',
      run: () => {
        for (const a of [...SAFE_ACTIONS, ...GUARDED_ACTIONS])
          assert(VIBE_MOD_SYSTEM_PROMPT.includes(a), `system prompt is missing action verb ${a}`);
      },
    },
    {
      name: 'callOpenAI requests JSON-object responses (deterministic compile)',
      run: () =>
        assert(
          indexTs.includes(`response_format`) && indexTs.includes(`json_object`),
          'callOpenAI does not pin response_format: json_object',
        ),
    },
    {
      name: 'few-shot examples are present (>=2 rules, >=1 clarification) and self-consistent',
      run: () => {
        const ruleEx = FEW_SHOT_EXAMPLES.filter((e) => !('needsClarification' in e.assistant));
        const clarEx = FEW_SHOT_EXAMPLES.filter((e) => 'needsClarification' in e.assistant);
        assert(ruleEx.length >= 2, 'need at least 2 rule examples');
        assert(clarEx.length >= 1, 'need at least 1 clarification example');
        for (const ex of ruleEx)
          assert(ex.assistant.sourceNL === ex.user, `example "${ex.user}" does not copy input verbatim into sourceNL`);
      },
    },
  ],
};

// ── Gate 3 — Day 3: rollback + dry-run + log UI ───────────────────────────────
const gate3: Gate = {
  id: 'G3',
  title: 'Day 3 — Rollback, dry-run replay, dashboard log',
  checks: [
    {
      name: 'executor exports rollbackAction()',
      run: () =>
        assert(
          /export\s+async\s+function\s+rollbackAction/.test(read('src/server/executor.ts')),
          'rollbackAction not exported from executor.ts',
        ),
    },
    {
      name: 'undo-action menu route exists and calls rollbackAction',
      run: () =>
        assert(
          routeDefined('/internal/menu/undo-action') && indexTs.includes('rollbackAction('),
          'undo route missing or does not call rollbackAction',
        ),
    },
    {
      name: 'dry-run-replay scheduler task is declared AND has a route',
      run: () => {
        const ep = devvit.scheduler.tasks['dry-run-replay']?.endpoint;
        assert(ep, 'dry-run-replay task not declared in devvit.json');
        assert(routeDefined(ep), `dry-run-replay endpoint ${ep} has no route`);
      },
    },
    {
      name: 'dashboard menu route exists (recent-actions log)',
      run: () => assert(routeDefined('/internal/menu/dashboard'), 'dashboard route missing'),
    },
    {
      name: 'shadow-promote-check scheduler task is declared AND has a route (24h shadow → live)',
      run: () => {
        const ep = devvit.scheduler.tasks['shadow-promote-check']?.endpoint;
        assert(ep, 'shadow-promote-check task not declared');
        assert(routeDefined(ep), `shadow-promote-check endpoint ${ep} has no route`);
      },
    },
  ],
};

// ── Gate 4 — Day 4: hardening, starter rules, tests, ToS/Privacy ──────────────
const gate4: Gate = {
  id: 'G4',
  title: 'Day 4 — Hardening: starter rules, unit suite, ToS/Privacy',
  checks: [
    {
      name: 'seedStarterRules() produces a schema-valid bundle of 5 SAFE-action rules',
      run: () => {
        const bundle = seedStarterRules(1_700_000_000_000); // throws if invalid
        assert(bundle.rules.length === 5, `expected 5 starter rules, got ${bundle.rules.length}`);
        assert(
          JSON.stringify(bundle.rules.map((r) => r.id)) === JSON.stringify(STARTER_RULE_IDS),
          'starter rule ids drifted',
        );
        for (const r of bundle.rules) {
          assert(r.shadow === true, `starter rule ${r.id} is not shadow:true`);
          for (const act of r.then)
            assert(
              (SAFE_ACTIONS as readonly string[]).includes(act.action),
              `starter rule ${r.id} uses non-SAFE action ${act.action}`,
            );
        }
      },
    },
    {
      name: 'onAppInstall trigger seeds the starter rules',
      run: () => assert(indexTs.includes('seedStarterRules('), 'on-app-install does not call seedStarterRules()'),
    },
    {
      name: 'ToS and Privacy docs exist',
      run: () => {
        assert(exists('docs/tos.md'), 'docs/tos.md missing');
        assert(exists('docs/privacy.md'), 'docs/privacy.md missing');
      },
    },
    {
      name: 'project typechecks (tsc --noEmit, strict)',
      run: () => {
        execFileSync('npx', ['tsc', '--noEmit'], { cwd: ROOT, stdio: 'pipe' });
      },
    },
    {
      name: 'unit + integration test suite passes (vitest run)',
      run: () => {
        execFileSync('npx', ['vitest', 'run', '--reporter=dot'], { cwd: ROOT, stdio: 'pipe' });
      },
    },
  ],
};

// ── Runner ────────────────────────────────────────────────────────────────────
const GATES = [gate1, gate2, gate3, gate4];

let failed = 0;
for (const gate of GATES) {
  let gateOk = true;
  const lines: string[] = [];
  for (const check of gate.checks) {
    try {
      check.run();
      lines.push(`    ✓ ${check.name}`);
    } catch (err) {
      gateOk = false;
      lines.push(`    ✗ ${check.name}\n        → ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (!gateOk) failed++;
  console.log(`${gateOk ? '✅' : '❌'} ${gate.id}  ${gate.title}`);
  console.log(lines.join('\n'));
  console.log('');
}

const passedGates = GATES.length - failed;
console.log(`Acceptance: ${passedGates}/${GATES.length} gates passed.`);
console.log('\nMANUAL (require `npm run dev` against a playtest sub — not auto-checked):');
console.log('  • "vibe-mod: Compose rule" menu item renders, form opens with "Compiles used today: N / 50"');
console.log('  • Real OpenAI compile round-trips a draft rule and a dry-run job is scheduled');
console.log('  • Undo on a removed post restores it (rollback round-trip)');
console.log('  • `devvit build` succeeds against the wizard-generated app id (.devvit-app-id)');
if (failed > 0) process.exit(1);
process.exit(0);
