#!/usr/bin/env tsx
// scripts/openai-smoketest.ts
// Hits the *real* OpenAI API with vibe-mod's actual system prompt + few-shot
// examples and a handful of representative moderator rules, then validates each
// response against the Rule schema (or detects the clarification escape hatch).
// Verifies the prompt ↔ schema ↔ model triad — the one thing the mocked route
// tests can't: does `gpt-5.4-nano` exist, honour response_format: json_object,
// and emit schema-valid rules from this prompt? Also reports token usage / $.
//
//   OPENAI_API_KEY=sk-...  npm run openai:smoketest
//   OPENAI_MODEL=gpt-5.4-mini  npm run openai:smoketest        # override the model
//
// The key is read from the OPENAI_API_KEY env var, or — if not set — from a
// `.env` file in the repo root (which is git-ignored). Never commit a key, and
// don't paste it into chat: put it in `.env` or `export` it in your shell.
//
// NOTE: this is intentionally NOT part of `npm run check` or CI — it costs a few
// fractions of a cent per run and needs a real key.
//
// IMPORTANT: keep the request payload below in sync with `callOpenAI` in
// src/server/index.ts (same model default, response_format, max_completion_tokens).

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
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
const MODEL = process.env.OPENAI_MODEL?.trim() || 'gpt-5.4-nano';

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
    // explicit numeric threshold → should compile against content.title.upperCaseRatio
    rule: 'If a post title is at least 12 characters and more than 70% capital letters, add the flair "Edit your title?"',
    expect: 'rule',
  },
  { rule: 'Report comments that are over 60 characters and almost entirely uppercase', expect: 'rule' },
  {
    rule: 'Send to the mod queue any post linking to a known URL shortener (bit.ly, tinyurl.com, t.co)',
    expect: 'rule',
  },
  // intentionally ambiguous → should trip the clarification path
  { rule: 'Auto-approve anyone who has been around here long enough', expect: 'clarification' },
  { rule: 'Crack down on low-effort posts', expect: 'clarification' },
];

type ApiResult =
  | { kind: 'rule'; rule: RuleType; tokensIn: number; tokensOut: number }
  | { kind: 'clarification'; question: string; tokensIn: number; tokensOut: number }
  | { kind: 'invalid'; raw: unknown; reason: string; tokensIn: number; tokensOut: number }
  | { kind: 'http_error'; status: number; code?: string; message?: string };

async function compile(userRule: string): Promise<ApiResult> {
  // Mirrors callOpenAI() in src/server/index.ts.
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: VIBE_MOD_SYSTEM_PROMPT },
  ];
  for (const ex of FEW_SHOT_EXAMPLES) {
    messages.push({ role: 'user', content: ex.user });
    messages.push({ role: 'assistant', content: JSON.stringify(ex.assistant) });
  }
  messages.push({ role: 'user', content: userRule });

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages,
      // Newer OpenAI models (gpt-5.x family) require max_completion_tokens, not max_tokens.
      max_completion_tokens: 700,
    }),
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
    return { kind: 'http_error', status: resp.status, code, message };
  }

  const data = (await resp.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
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
    return { kind: 'rule', rule, tokensIn, tokensOut };
  } catch (e) {
    return { kind: 'invalid', raw: parsed, reason: e instanceof Error ? e.message : String(e), tokensIn, tokensOut };
  }
}

// gpt-5.4-nano list price (developers.openai.com/api/docs/pricing) — adjust if you change MODEL.
const PRICE_PER_M = { in: 0.05, out: 0.4 }; // USD per 1M tokens

(async () => {
  console.log(`OpenAI smoke test — model: ${MODEL}\n`);
  let pass = 0;
  let fail = 0;
  let totIn = 0;
  let totOut = 0;

  for (const c of CASES) {
    process.stdout.write(`• "${c.rule.slice(0, 70)}${c.rule.length > 70 ? '…' : ''}"\n`);
    let r: ApiResult;
    try {
      r = await compile(c.rule);
    } catch (e) {
      console.log(`    ✗ request threw: ${e instanceof Error ? e.message : String(e)}\n`);
      fail++;
      continue;
    }
    if (r.kind === 'http_error') {
      const billingCodes = ['insufficient_quota', 'billing_not_active', 'account_deactivated'];
      const fatal = r.status === 401 || r.code === 'model_not_found' || billingCodes.includes(r.code ?? '');
      const hint =
        r.status === 404 || r.code === 'model_not_found'
          ? `  → model "${MODEL}" not available to this key (try OPENAI_MODEL=gpt-5-mini, or check the exact model name)`
          : r.status === 401
            ? '  → invalid API key'
            : billingCodes.includes(r.code ?? '')
              ? '  → OpenAI account billing is not active — add a payment method at platform.openai.com/account/billing (the key is fine; the account just is not enabled for API use yet)'
              : r.status === 429
                ? '  → rate-limited — wait and re-run, or raise your usage limits'
                : '';
      console.log(
        `    ✗ HTTP ${r.status}${r.code ? ` (${r.code})` : ''}${r.message ? ` — ${r.message}` : ''}${hint}\n`,
      );
      fail++;
      // No point hammering the API if it's a key/model/billing problem rather than a transient blip.
      if (fatal) {
        console.log('Aborting remaining cases — fix the above and re-run.\n');
        break;
      }
      continue;
    }
    totIn += r.tokensIn;
    totOut += r.tokensOut;
    const ok =
      (r.kind === 'rule' && c.expect === 'rule') || (r.kind === 'clarification' && c.expect === 'clarification');
    if (ok) pass++;
    else fail++;
    const mark = ok ? '✓' : '✗';
    if (r.kind === 'rule')
      console.log(
        `    ${mark} rule  id=${r.rule.id}  on=[${r.rule.on.join(',')}]  then=[${r.rule.then.map((a) => a.action).join(',')}]  (in ${r.tokensIn} / out ${r.tokensOut})${c.expect !== 'rule' ? '  ← expected clarification' : ''}`,
      );
    else if (r.kind === 'clarification')
      console.log(
        `    ${mark} clarification: "${r.question.slice(0, 90)}"  (in ${r.tokensIn} / out ${r.tokensOut})${c.expect !== 'clarification' ? '  ← expected a rule' : ''}`,
      );
    else
      console.log(
        `    ✗ invalid output — ${r.reason}\n        raw: ${JSON.stringify(r.raw).slice(0, 300)}  (in ${r.tokensIn} / out ${r.tokensOut})`,
      );
    console.log('');
  }

  const cost = (totIn / 1_000_000) * PRICE_PER_M.in + (totOut / 1_000_000) * PRICE_PER_M.out;
  console.log('────────────────────────────────────────────────────────');
  console.log(
    `${pass}/${CASES.length} cases as expected.  tokens: ${totIn} in / ${totOut} out  ≈ $${cost.toFixed(5)} (at ${MODEL} list price)`,
  );
  console.log('────────────────────────────────────────────────────────');
  process.exit(fail > 0 ? 1 : 0);
})();
