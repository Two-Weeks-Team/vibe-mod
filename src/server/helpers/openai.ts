// src/server/helpers/openai.ts
// All things OpenAI for vibe-mod's rule compiler:
//   - callOpenAI()        — single chat/completions request, JSON-mode, ASCII-safe body
//   - isClarification()   — type guard for the {needsClarification, ...} response
//   - unwrapFormString()  — Devvit SELECTION values arrive as `string[]`; coerce to string
//   - readOpenaiModel()   — read the openaiModel SELECTION setting (also array-safe)
//   - estimateTokenCost() — best-effort USD figure for the dashboard cost line
//   - humanizeRule()      — render a compiled Rule as English for the confirm form
//   - summarizeRule()     — 1-line summary suitable for a toast
//   - todayKey()          — UTC date key used by the daily-quota counter
//
// Plus the shared constants (`ALLOW_GUARDED_HELP`, `MAX_CLARIFY_TURNS`,
// `OPENAI_PRICING_USD_PER_TOKEN`) so every form/handler agrees on copy and
// limits.

import { settings } from '@devvit/web/server';
import type { RuleType } from '../../shared/rule-schema';
import { VIBE_MOD_SYSTEM_PROMPT, FEW_SHOT_EXAMPLES } from '../../shared/system-prompt';
import { describeErr } from '../middleware/diagnostics';
import type { PredicateTreeShape } from './rule-validation';

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// Help text shared by the compose form and the clarify modal so both modals
// explain the ban/mute toggle the same way (audit finding #4).
export const ALLOW_GUARDED_HELP =
  "vibe-mod only emits ban/mute when your rule explicitly says 'ban' or 'mute'. This checkbox lets the compile succeed when it does — leave it off for a removes-only rule.";

// Max number of clarification rounds before the server bails with an
// actionable toast (audit finding #5). Round 1 = initial compile. Rounds
// 2-3 = LLM follow-up questions. After round 3, no more modal — the
// moderator gets advice to rephrase concretely.
export const MAX_CLARIFY_TURNS = 3;

// Pricing snapshot for token-cost display (audit finding D). gpt-5.4-mini
// is the default; prices move occasionally so this is best-effort and the
// dashboard shows it as "~$X" rather than a precise figure. Source:
// platform.openai.com/docs/pricing as of 2026-05-14.
export const OPENAI_PRICING_USD_PER_TOKEN: Record<string, { in: number; out: number }> = {
  'gpt-5.4-mini': { in: 0.00000015, out: 0.0000006 },
  'gpt-5.4-nano': { in: 0.0000001, out: 0.0000004 },
  'gpt-5.4': { in: 0.0000025, out: 0.00001 },
};

// Estimate token cost for a (model, in, out) triple. Returns 0 if model
// unknown so we never crash on a future model name.
export function estimateTokenCost(model: string, tokensIn: number, tokensOut: number): number {
  const p = OPENAI_PRICING_USD_PER_TOKEN[model];
  if (!p) return 0;
  return tokensIn * p.in + tokensOut * p.out;
}

// Read the openaiModel SELECTION setting, defensively unwrapping the array
// that Devvit returns even for single-select (PR #39 SELECTION-array root
// cause). Returns the default model name if the setting is missing or the
// plugin RPC is unreachable.
export async function readOpenaiModel(): Promise<string> {
  const DEFAULT = 'gpt-5.4-mini';
  try {
    const raw = await settings.get('openaiModel');
    let unwrapped: unknown = raw;
    if (Array.isArray(raw) && raw.length > 0) unwrapped = raw[0];
    if (typeof unwrapped === 'string' && unwrapped.trim()) return unwrapped.trim();
  } catch (err) {
    console.warn('[vibe-mod] readOpenaiModel: settings.get threw — using default:', describeErr(err));
  }
  return DEFAULT;
}

// Normalize a Devvit form value that may arrive as `string` or `string[]`
// (SELECTION fields return arrays even for single-select — see PR #39
// SELECTION-array root cause). Returns the trimmed first non-empty string,
// or ''.
export function unwrapFormString(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw)) {
    for (const v of raw) {
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return '';
}

export function isClarification(
  obj: unknown,
): obj is { needsClarification: true; question: string; suggestedAnswers?: string[] } {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as { needsClarification?: unknown; question?: unknown; suggestedAnswers?: unknown };
  if (o.needsClarification !== true) return false;
  if (typeof o.question !== 'string' || !o.question.trim()) return false;
  return true;
}

// 1-line summary of a compiled rule, suitable for a toast. Goes inside a
// Devvit toast (~200 char budget) so it must stay short. Format:
//   → onPostSubmit: modqueue (when /author<24h/)
export function summarizeRule(r: RuleType): string {
  const triggers = r.on
    .map((t) =>
      t
        .replace(/^on/, '')
        .replace(/Submit$/, '')
        .toLowerCase(),
    )
    .join('+');
  const actions = [...new Set(r.then.map((a) => a.action))].join('+');
  return `→ ${triggers}: ${actions}`;
}

// Convert a compiled Rule into a human-readable English description for the
// compose-confirm form (audit finding #2). Renders trigger names, the
// PredicateTree as bulleted boolean logic, and the action list. Pure
// function — same input always renders the same output, matching the
// "deterministic" promise in README §0.
export function humanizeRule(r: RuleType): string {
  const triggerLabel = (t: string): string =>
    t === 'onPostSubmit'
      ? 'a new post is submitted'
      : t === 'onCommentSubmit'
        ? 'a new comment is submitted'
        : t === 'onPostReport'
          ? 'a post is reported'
          : t === 'onCommentReport'
            ? 'a comment is reported'
            : t;
  const predicateLabel = (tree: unknown, indent = '  '): string => {
    if (!tree || typeof tree !== 'object') return `${indent}(empty)`;
    const t = tree as PredicateTreeShape & { value?: unknown };
    if (Array.isArray(t.all)) {
      const inner = t.all.map((c) => predicateLabel(c, indent + '  ')).join('\n');
      return `${indent}ALL of:\n${inner}`;
    }
    if (Array.isArray(t.any)) {
      const inner = t.any.map((c) => predicateLabel(c, indent + '  ')).join('\n');
      return `${indent}ANY of:\n${inner}`;
    }
    if (t.not) return `${indent}NOT ${predicateLabel(t.not, '').trim()}`;
    // Truncate long array / object values so the confirm form's
    // compiledSummary doesn't bloat to thousands of characters when a
    // rule uses `op: in` against a long allowlist (CodeRabbit review,
    // PR #44).
    const valueStr = JSON.stringify(t.value);
    const display = valueStr.length > 100 ? valueStr.slice(0, 97) + '...' : valueStr;
    return `${indent}${t.fact} ${t.op} ${display}`;
  };
  const actionLabel = (a: { action: string; params?: Record<string, unknown> }): string => {
    const p = a.params ?? {};
    if (a.action === 'modqueue') return `send to mod queue (note: "${p.note ?? ''}")`;
    if (a.action === 'remove') return `remove (spam: ${p.spam ? 'yes' : 'no'})`;
    if (a.action === 'flair') return `set flair to "${p.flairText ?? ''}"`;
    if (a.action === 'lock') return `lock the thread`;
    if (a.action === 'report') return `report (reason: "${p.reason ?? ''}")`;
    if (a.action === 'ban')
      return `BAN user${p.duration ? ` for ${p.duration}d` : ' permanently'} (reason: "${p.reason ?? ''}")`;
    if (a.action === 'mute') return `MUTE user for ${p.duration ?? '?'}h`;
    if (a.action === 'permaban') return `PERMABAN user (reason: "${p.reason ?? ''}")`;
    return a.action;
  };
  const triggers = r.on.map(triggerLabel).join(' OR ');
  const conditions = predicateLabel(r.when as PredicateTreeShape);
  const actions = r.then.map((a) => '  - ' + actionLabel(a)).join('\n');
  const rateLimit = r.rateLimit?.perAuthor ? `\nRate limit: ${r.rateLimit.perAuthor} per author.` : '';
  return [`When ${triggers}, IF:`, conditions, `THEN:`, actions, rateLimit].filter(Boolean).join('\n');
}

export async function callOpenAI(
  userRule: string,
  clarificationAnswer?: string,
): Promise<{ json: unknown; tokensIn: number; tokensOut: number }> {
  // Local-only mock AI provider (gated, opt-in). When
  //   VIBE_MOD_AI_PROVIDER=mock
  // is set in the build environment (e.g. local playtest / replay), return a
  // deterministic fake compiled rule without calling settings.get or fetch.
  // Devvit Reddit runtime never sets this var, so production behaviour is
  // unchanged. Useful for testing the compose flow against a real-shaped
  // rule when plugin RPC is unreachable.
  if (process.env.VIBE_MOD_AI_PROVIDER === 'mock') {
    console.warn('[vibe-mod] callOpenAI: VIBE_MOD_AI_PROVIDER=mock — returning fake compiled rule');
    return {
      json: {
        id: 'r_mock_demo',
        name: 'Mock compiled rule (demo)',
        sourceNL: userRule.slice(0, 200),
        on: ['onPostSubmit'],
        when: { all: [{ fact: 'author.accountAgeHours', op: 'lt', value: 72 }] },
        then: [{ action: 'modqueue', params: { note: 'mock-demo' } }],
      },
      tokensIn: 0,
      tokensOut: 0,
    };
  }

  // BYOK preference: sub-scope override key beats developer global key.
  // settings.get can throw "undefined undefined: undefined" when Devvit's
  // plugin RPC sidecar is unreachable. Treat *optional* BYOK failure as a
  // warning only (per user-reviewed patch direction); fall through to the
  // required global key. Skip the global-key lookup entirely when BYOK is
  // present to save one RPC. The clarification answer is referenced below.
  let subKey = '';
  try {
    subKey = ((await settings.get('subredditOpenaiApiKey')) as string) ?? '';
  } catch (err) {
    console.warn(
      '[vibe-mod] callOpenAI: settings.get(subredditOpenaiApiKey) threw — continuing without BYOK:',
      describeErr(err),
    );
  }

  let apiKey = subKey.trim();
  let settingsRpcDown = false;
  let globalKeyLength = 0;
  if (!apiKey) {
    try {
      const globalKey = ((await settings.get('openaiApiKey')) as string) ?? '';
      // Diagnostic per docs Q2 — typeof + length is safe to log; the *value*
      // is never logged. Tells us whether the secret is set, whether it
      // returned a string (vs undefined for a missing schema field), and
      // its length (which we can eyeball-compare to a typical OpenAI key
      // length). NEVER log the value itself.
      globalKeyLength = globalKey.length;
      console.log('[vibe-mod] callOpenAI: settings.get(openaiApiKey) ok:', {
        defined: typeof globalKey,
        len: globalKey.length,
      });
      apiKey = globalKey.trim();
    } catch (err) {
      settingsRpcDown = true;
      console.warn('[vibe-mod] callOpenAI: settings.get(openaiApiKey) threw:', describeErr(err));
    }
  }

  // Official-docs-sanctioned local fallback. Per Devvit docs
  // (capabilities/server/settings-and-secrets.mdx): "Local environment
  // variables and .env files are read during playtesting only." Reddit
  // production runtime does NOT set process.env.OPENAI_API_KEY, so the
  // fallback is a no-op there. In local `devvit playtest` it picks up the
  // .env value, which lets the compose flow work without round-tripping
  // through Devvit's plugin RPC.
  if (!apiKey) {
    const envKey = (process.env.OPENAI_API_KEY ?? '').trim();
    if (envKey) {
      console.warn('[vibe-mod] callOpenAI: settings.get returned no key — falling back to .env (playtest only).');
      apiKey = envKey;
    }
  }

  if (!apiKey) {
    if (settingsRpcDown) throw new Error('no_key_plugin_rpc');
    throw new Error('no_key');
  }
  void globalKeyLength; // referenced for type-narrowing; we already logged it above

  // 2026-05-14: ROOT CAUSE of PR #32-#37 "could not parse JSON body" in
  // prod. `settings.get('openaiModel')` on a SELECTION-type field returns
  // a string ARRAY (e.g. `["gpt-5.4-mini"]`), not a string. We were sending
  // the array straight into the request body as `"model": ["gpt-5.4-mini"]`
  // — which OpenAI rejected as unparseable JSON for the `model` field. PR
  // #38 only worked around this by hardcoding `gpt-5.4-nano`. Real fix:
  // unwrap. (Production proof in v0.0.39 logs:
  //   [vibe-mod] callOpenAI: settings.get(openaiModel) = ["gpt-5.4-mini"])
  const model = await readOpenaiModel();
  console.log('[vibe-mod] callOpenAI: model =', model);

  // Single user message containing system instructions, few-shot examples,
  // and the user rule (+ optional clarification), all inline. See
  // docs/postmortems/2026-05-14-openai-400-selection-array.md and PR #32-#41
  // for the full rationale; the short version is that Devvit's HTTP plugin
  // reliably trips on `chat/completions` bodies that combine (a) ≥ ~7 KB,
  // (b) multiple messages, and (c) JSON-escape sequences from nested
  // `JSON.stringify` of few-shot `assistant` content. Keeping everything in
  // one user message keeps us on probe(f) — the largest known transit-safe
  // shape (5610 B single user content, returned 200 in production 3 times).
  const clarif = clarificationAnswer?.trim().slice(0, 500);
  const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
  const exampleBlock = (ex: (typeof FEW_SHOT_EXAMPLES)[number], i: number): string =>
    `EXAMPLE ${i + 1} INPUT: ${collapse(ex.user)} EXAMPLE ${i + 1} OUTPUT: ${JSON.stringify(ex.assistant)}`;
  const compositeContent = [
    'SYSTEM INSTRUCTIONS:',
    collapse(VIBE_MOD_SYSTEM_PROMPT),
    'EXAMPLES:',
    ...FEW_SHOT_EXAMPLES.map(exampleBlock),
    'TASK INPUT:',
    collapse(userRule.slice(0, 1000)),
    ...(clarif ? ['TASK CLARIFICATION:', collapse(clarif)] : []),
    'OUTPUT (strict JSON object only, no prose):',
  ].join(' ');
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: compositeContent },
  ];

  // Build the body, then escape every non-ASCII character as a JSON \uXXXX
  // sequence. OpenAI returned HTTP 400 "We could not parse the JSON body of
  // your request" against the obvious `JSON.stringify(...)` form when the
  // payload contained system-prompt em-dashes / arrows (≈ / — / →) — likely
  // a Devvit HTTP-plugin UTF-8 corner case on the wire. The escape form is
  // 7-bit ASCII, still strictly valid JSON, and any compliant parser
  // (including OpenAI's) decodes it back to the same Unicode characters.
  const rawBody = JSON.stringify({
    model,
    response_format: { type: 'json_object' },
    messages,
    max_completion_tokens: 600,
  });
  // Match every non-ASCII char (>= 0x80). The explicit \u escapes are used
  // because the previous form embedded the literal U+0080 and U+FFFF
  // characters in the regex, which review tooling renders as /[-<box>]/ and
  // mistakes for "matches only `-`" (Gemini review HIGH on PR #45).
  // Behaviour is unchanged — every BMP non-ASCII codepoint still
  // becomes \uXXXX.
  const asciiSafeBody = rawBody.replace(
    /[\u0080-\uFFFF]/g,
    (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'),
  );

  console.log('[vibe-mod] callOpenAI: body chars =', asciiSafeBody.length);
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: asciiSafeBody,
  });

  if (!resp.ok) {
    let errBody = '';
    try {
      errBody = (await resp.text()).slice(0, 1000);
    } catch {
      /* nothing */
    }
    console.warn(`[vibe-mod] callOpenAI: HTTP ${resp.status} ${resp.statusText} body:`, errBody);
    throw new Error(`openai_${resp.status}`);
  }
  const data = (await resp.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const content = data.choices[0]?.message?.content ?? '{}';
  return {
    json: JSON.parse(content),
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
  };
}
