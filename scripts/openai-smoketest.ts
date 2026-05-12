#!/usr/bin/env tsx
// scripts/openai-smoketest.ts
// Hits the *real* OpenAI API with vibe-mod's actual system prompt + few-shot
// examples and a handful of representative moderator rules, then validates each
// response against the Rule schema (or detects the clarification escape hatch).
// Verifies the prompt ↔ schema ↔ model triad — the one thing the mocked route
// tests can't: does the model exist, honour response_format: json_object, and
// emit schema-valid rules from this prompt? Reports per-call latency, token
// usage and a $ estimate, and (with OPENAI_MODELS) compares several models.
//
//   OPENAI_API_KEY=sk-...  npm run openai:smoketest
//   OPENAI_MODEL=gpt-5.4-mini  npm run openai:smoketest                       # one model
//   OPENAI_MODELS=gpt-5.4-nano,gpt-5.4-mini,gpt-4.1-mini  npm run openai:smoketest   # compare
//
// The key is read from $OPENAI_API_KEY, or — if not set — from a git-ignored
// `.env` at the repo root. Never commit a key; don't paste it into chat.
//
// NOT part of `npm run check` / CI (needs a real key).
//
// IMPORTANT: the default request config below mirrors `callOpenAI` in
// src/server/index.ts (response_format: json_object, reasoning_effort: 'none',
// verbosity: 'low', max_completion_tokens: 600, no temperature). Env vars
// REASONING_EFFORT / VERBOSITY / MAX_COMPLETION_TOKENS override for experiments.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { VIBE_MOD_SYSTEM_PROMPT, FEW_SHOT_EXAMPLES } from '../src/shared/system-prompt';
import { Rule, checkTreeDepth, type RuleType } from '../src/shared/rule-schema';

// ── Load the key: env first, then a git-ignored .env ──────────────────────────
function loadEnvFile(): void {
  if (process.env.OPENAI_API_KEY) return;
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnvFile();

const API_KEY = process.env.OPENAI_API_KEY?.trim();
const MODELS = (process.env.OPENAI_MODELS?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-5.4-nano')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
// Request tuning — DEFAULTS MATCH callOpenAI() in src/server/index.ts. Override
// via env to experiment. `none` reasoning (gpt-5.4 family value; older models
// use `minimal`) suits this mechanical NL→JSON task: fast, no token-budget burn.
// Set REASONING_EFFORT='' to omit the param entirely.
const REASONING_EFFORT =
  process.env.REASONING_EFFORT === '' ? undefined : process.env.REASONING_EFFORT?.trim() || 'none'; // none | low | medium | high | xhigh
const VERBOSITY = process.env.VERBOSITY === '' ? undefined : process.env.VERBOSITY?.trim() || 'low'; // low | medium | high
const MAX_COMPLETION_TOKENS = Number(process.env.MAX_COMPLETION_TOKENS) || 600;

if (!API_KEY) {
  console.error(
    'No OPENAI_API_KEY. Set it in your shell (`export OPENAI_API_KEY=sk-...`) or in a .env file at the repo root.',
  );
  process.exit(2);
}

// ── Test cases: a mix of "should compile" and "should ask for clarification" ──
type Case = { rule: string; expect: 'rule' | 'clarification' };
const CASES: Case[] = [
  {
    rule: 'If a brand-new account (less than a day old) posts within 3 hours of joining the sub, send it to the mod queue',
    expect: 'rule',
  },
  { rule: 'Remove posts that contain discord.gg links from accounts with under 50 karma', expect: 'rule' },
  {
    rule: 'If a post title is at least 12 characters and more than 70% capital letters, add the flair "Edit your title?"',
    expect: 'rule',
  },
  { rule: 'Report comments over 60 characters where more than 90% of the letters are uppercase', expect: 'rule' },
  {
    rule: 'Send to the mod queue any post linking to a known URL shortener (bit.ly, tinyurl.com, t.co)',
    expect: 'rule',
  },
  // intentionally ambiguous → should trip the clarification path
  { rule: 'Auto-approve anyone who has been around here long enough', expect: 'clarification' },
  { rule: 'Crack down on low-effort posts', expect: 'clarification' },
];

type ApiResult =
  | { kind: 'rule'; rule: RuleType; tokensIn: number; tokensOut: number; ms: number }
  | { kind: 'clarification'; question: string; tokensIn: number; tokensOut: number; ms: number }
  | { kind: 'invalid'; raw: unknown; reason: string; tokensIn: number; tokensOut: number; ms: number }
  | { kind: 'http_error'; status: number; code?: string; message?: string; ms: number };

async function compile(model: string, userRule: string): Promise<ApiResult> {
  // Mirrors callOpenAI() in src/server/index.ts.
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: VIBE_MOD_SYSTEM_PROMPT },
  ];
  for (const ex of FEW_SHOT_EXAMPLES) {
    messages.push({ role: 'user', content: ex.user });
    messages.push({ role: 'assistant', content: JSON.stringify(ex.assistant) });
  }
  messages.push({ role: 'user', content: userRule });

  const body: Record<string, unknown> = {
    model,
    response_format: { type: 'json_object' },
    messages,
    max_completion_tokens: MAX_COMPLETION_TOKENS,
  };
  if (REASONING_EFFORT) body.reasoning_effort = REASONING_EFFORT;
  if (VERBOSITY) body.verbosity = VERBOSITY;

  const t0 = performance.now();
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    let code: string | undefined;
    let message: string | undefined;
    try {
      const err = (await resp.json()) as { error?: { code?: string; message?: string; type?: string } };
      code = err.error?.code ?? err.error?.type;
      message = err.error?.message;
    } catch {
      /* body wasn't JSON */
    }
    return { kind: 'http_error', status: resp.status, code, message, ms: performance.now() - t0 };
  }

  const data = (await resp.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const ms = performance.now() - t0;
  const tokensIn = data.usage?.prompt_tokens ?? 0;
  const tokensOut = data.usage?.completion_tokens ?? 0;
  let parsed: unknown;
  try {
    parsed = JSON.parse(data.choices[0]?.message?.content ?? '{}');
  } catch (e) {
    return {
      kind: 'invalid',
      raw: data.choices[0]?.message?.content,
      reason: `not JSON: ${e instanceof Error ? e.message : String(e)}`,
      tokensIn,
      tokensOut,
      ms,
    };
  }
  if (
    parsed &&
    typeof parsed === 'object' &&
    (parsed as { needsClarification?: boolean }).needsClarification === true
  ) {
    return {
      kind: 'clarification',
      question: String((parsed as { question?: string }).question ?? ''),
      tokensIn,
      tokensOut,
      ms,
    };
  }
  try {
    const augmented = {
      ...(parsed as object),
      createdAt: Date.now(),
      createdBy: 't2_smoketest',
      enabled: true,
      shadow: true,
    };
    const rule = Rule.parse(augmented);
    checkTreeDepth(rule.when as Parameters<typeof checkTreeDepth>[0]);
    return { kind: 'rule', rule, tokensIn, tokensOut, ms };
  } catch (e) {
    return {
      kind: 'invalid',
      raw: parsed,
      reason: e instanceof Error ? e.message : String(e),
      tokensIn,
      tokensOut,
      ms,
    };
  }
}

// gpt-5.4-nano list price (developers.openai.com/api/docs/pricing) — adjust if you change MODEL.
const PRICE_PER_M = { in: 0.05, out: 0.4 }; // USD per 1M tokens

type ModelSummary = {
  model: string;
  pass: number;
  total: number;
  tokensIn: number;
  tokensOut: number;
  ms: number[];
  fatal: boolean;
};

async function runModel(model: string): Promise<ModelSummary> {
  console.log(`════════ ${model} ════════\n`);
  const s: ModelSummary = { model, pass: 0, total: CASES.length, tokensIn: 0, tokensOut: 0, ms: [], fatal: false };
  for (const c of CASES) {
    process.stdout.write(`• "${c.rule.slice(0, 64)}${c.rule.length > 64 ? '…' : ''}"\n`);
    let r: ApiResult;
    try {
      r = await compile(model, c.rule);
    } catch (e) {
      console.log(`    ✗ request threw: ${e instanceof Error ? e.message : String(e)}\n`);
      continue;
    }
    if (r.kind === 'http_error') {
      const billingCodes = ['insufficient_quota', 'billing_not_active', 'account_deactivated'];
      const fatal =
        r.status === 401 || r.status === 403 || r.code === 'model_not_found' || billingCodes.includes(r.code ?? '');
      const hint =
        r.status === 404 || r.status === 403 || r.code === 'model_not_found'
          ? `  → model "${model}" not available to this key`
          : r.status === 401
            ? '  → invalid API key'
            : billingCodes.includes(r.code ?? '')
              ? '  → OpenAI account billing is not active — add a payment method at platform.openai.com/account/billing'
              : r.status === 429
                ? '  → rate-limited — wait and re-run'
                : '';
      console.log(
        `    ✗ HTTP ${r.status}${r.code ? ` (${r.code})` : ''}${r.message ? ` — ${r.message}` : ''}${hint}\n`,
      );
      if (fatal) {
        s.fatal = true;
        console.log('Skipping remaining cases for this model.\n');
        break;
      }
      continue;
    }
    s.tokensIn += r.tokensIn;
    s.tokensOut += r.tokensOut;
    s.ms.push(r.ms);
    const ok =
      (r.kind === 'rule' && c.expect === 'rule') || (r.kind === 'clarification' && c.expect === 'clarification');
    if (ok) s.pass++;
    const mark = ok ? '✓' : '✗';
    const t = `${Math.round(r.ms)}ms`;
    if (r.kind === 'rule')
      console.log(
        `    ${mark} ${t}  rule  id=${r.rule.id}  on=[${r.rule.on.join(',')}]  then=[${r.rule.then.map((a) => a.action).join(',')}]  (in ${r.tokensIn}/out ${r.tokensOut})${c.expect !== 'rule' ? '  ← expected clarification' : ''}`,
      );
    else if (r.kind === 'clarification')
      console.log(
        `    ${mark} ${t}  clarification: "${r.question.slice(0, 80)}"  (in ${r.tokensIn}/out ${r.tokensOut})${c.expect !== 'clarification' ? '  ← expected a rule' : ''}`,
      );
    else
      console.log(
        `    ✗ ${t}  invalid — ${r.reason}  (in ${r.tokensIn}/out ${r.tokensOut})\n        raw: ${JSON.stringify(r.raw).slice(0, 240)}`,
      );
    console.log('');
  }
  const cost = (s.tokensIn / 1_000_000) * PRICE_PER_M.in + (s.tokensOut / 1_000_000) * PRICE_PER_M.out;
  const med = s.ms.length ? [...s.ms].sort((a, b) => a - b)[Math.floor(s.ms.length / 2)] : 0;
  console.log(
    `  → ${s.pass}/${s.total} as expected  ·  latency median ${Math.round(med)}ms (min ${Math.round(Math.min(...s.ms, 0))} / max ${Math.round(Math.max(...s.ms, 0))})  ·  tokens ${s.tokensIn} in / ${s.tokensOut} out  ·  ≈ $${cost.toFixed(5)} (at gpt-5.4-nano list price)\n`,
  );
  return s;
}

(async () => {
  const results: ModelSummary[] = [];
  for (const m of MODELS) results.push(await runModel(m));

  if (results.length > 1) {
    console.log('════════ comparison ════════');
    console.log('model'.padEnd(22) + 'pass'.padEnd(8) + 'median'.padEnd(10) + 'max'.padEnd(10) + 'avg out tok');
    for (const r of results) {
      const med = r.ms.length ? [...r.ms].sort((a, b) => a - b)[Math.floor(r.ms.length / 2)] : 0;
      const avgOut = r.ms.length ? Math.round(r.tokensOut / r.ms.length) : 0;
      console.log(
        r.model.padEnd(22) +
          `${r.pass}/${r.total}`.padEnd(8) +
          `${Math.round(med)}ms`.padEnd(10) +
          `${r.ms.length ? Math.round(Math.max(...r.ms)) : 0}ms`.padEnd(10) +
          `${avgOut}${r.fatal ? '  (unavailable)' : ''}`,
      );
    }
    console.log('');
  }

  const anyFail = results.some((r) => r.pass < r.total || r.fatal);
  process.exit(anyFail ? 1 : 0);
})();
