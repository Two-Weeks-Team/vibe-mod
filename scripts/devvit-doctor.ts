#!/usr/bin/env tsx
// scripts/devvit-doctor.ts
// Pre-flight for "is this Devvit app ready to build / playtest / publish?".
//
//   npm run doctor
//
// HARD checks (exit 1 on failure): devvit.json is well-formed; every external
// host the server code fetch()es is declared under permissions.http.domains;
// node satisfies package.json engines.
// SOFT checks (warn only): Devvit CLI logged in; .devvit-app-id present; the
// other tooling files exist. Soft because they depend on the human having done
// the wizard / `devvit login`.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const exists = (p: string) => existsSync(join(ROOT, p));

let hard = 0;
let soft = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`);
const warn = (m: string) => {
  soft++;
  console.log(`  ⚠ ${m}`);
};
const fail = (m: string) => {
  hard++;
  console.log(`  ✗ ${m}`);
};

// ── devvit.json ────────────────────────────────────────────────────────────────
console.log('devvit.json');
let devvit: {
  $schema?: string;
  name?: string;
  version?: string;
  permissions?: { http?: { enable?: boolean; domains?: string[] }; reddit?: unknown; redis?: unknown };
  menu?: { items?: Array<{ endpoint?: string }> };
  forms?: Record<string, string>;
  triggers?: Record<string, string>;
  scheduler?: { tasks?: Record<string, { endpoint?: string; cron?: string }> };
} | null = null;
try {
  devvit = JSON.parse(read('devvit.json'));
  ok('parses');
} catch (e) {
  fail(`does not parse: ${e instanceof Error ? e.message : String(e)}`);
}
if (devvit) {
  if (devvit.$schema) ok(`$schema set (${devvit.$schema})`);
  else warn('$schema not set — add "https://developers.reddit.com/schema/config-file.v1.json" for editor validation');
  if (devvit.name) ok(`name: ${devvit.name}`);
  else fail('name missing');
  if (devvit.version) ok(`version: ${devvit.version}`);
  else fail('version missing');
  if (devvit.permissions) ok('permissions block present');
  else fail('permissions block missing');
}

// ── fetch() hosts vs permissions.http.domains ─────────────────────────────────
console.log('\nHTTP fetch domains');
const declared = new Set(devvit?.permissions?.http?.domains ?? []);
const fetched = new Set<string>();
function walk(dir: string) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (['node_modules', 'dist', '.devvit', 'coverage', '.git'].includes(name)) continue;
    const st = statSync(join(ROOT, rel));
    if (st.isDirectory()) walk(rel);
    else if (/\.(ts|tsx|js|mjs)$/.test(name) && !name.endsWith('.test.ts')) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      for (const m of src.matchAll(/fetch\(\s*[`'"]https?:\/\/([^/`'"]+)/g)) fetched.add(m[1]);
    }
  }
}
if (exists('src')) walk('src');
if (fetched.size === 0) ok('no external fetch() calls in src/');
for (const host of fetched) {
  if (declared.has(host)) ok(`${host} — fetched and declared`);
  else fail(`${host} — fetch()ed in src/ but NOT in permissions.http.domains (Devvit will block it)`);
}
for (const host of declared) {
  if (!fetched.has(host))
    warn(`${host} — declared in permissions.http.domains but never fetched (dead allowlist entry?)`);
}

// ── route ↔ devvit.json wiring (mirrors acceptance G1, kept here for the preflight) ──
console.log('\nRoute wiring');
if (exists('src/server/index.ts')) {
  const indexTs = read('src/server/index.ts');
  const routeDefined = (p: string) => indexTs.includes(`'${p}'`) || indexTs.includes(`"${p}"`);
  const eps = [
    ...(devvit?.menu?.items ?? []).map((m) => m.endpoint),
    ...Object.values(devvit?.forms ?? {}),
    ...Object.values(devvit?.triggers ?? {}),
    ...Object.values(devvit?.scheduler?.tasks ?? {}).map((t) => t.endpoint),
  ].filter((x): x is string => !!x);
  let bad = 0;
  for (const ep of eps) {
    if (!routeDefined(ep)) {
      fail(`${ep} declared in devvit.json but has no app.post() route in index.ts`);
      bad++;
    }
  }
  if (bad === 0) ok(`all ${eps.length} declared endpoints have routes`);
} else {
  warn('src/server/index.ts not found — skipping route check');
}

// ── node engine ────────────────────────────────────────────────────────────────
console.log('\nRuntime');
try {
  const pkg = JSON.parse(read('package.json')) as { engines?: { node?: string } };
  const want = pkg.engines?.node;
  const have = process.versions.node;
  if (!want) warn('package.json has no engines.node');
  else {
    // Compare major.minor.patch. Only handles a single ">=x.y.z" floor — fine
    // for the engines fields we write; not a full semver-range parser.
    const parts = (v: string) =>
      v
        .replace(/[^\d.]/g, '')
        .split('.')
        .map((n) => Number(n) || 0);
    const min = parts(want);
    const cur = parts(have);
    let cmp = 0;
    for (let i = 0; i < 3 && cmp === 0; i++) cmp = (cur[i] ?? 0) - (min[i] ?? 0);
    if (cmp >= 0) ok(`node ${have} satisfies engines.node "${want}"`);
    else fail(`node ${have} does NOT satisfy engines.node "${want}"`);
  }
} catch {
  fail('could not read package.json');
}

// ── Devvit CLI / app id (soft) ────────────────────────────────────────────────
console.log('\nDevvit CLI');
try {
  const who = execFileSync('npx', ['devvit', 'whoami'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
  ok(`logged in: ${who.split('\n').pop()}`);
} catch {
  warn('not logged in — run `npx devvit login` before `npm run dev` / `upload` / `publish`');
}
if (exists('.devvit-app-id')) ok('.devvit-app-id present');
else
  warn('.devvit-app-id not found — run the Devvit "Mod Tool" wizard at https://developers.reddit.com/new (creates it)');

// ── tooling files (soft) ──────────────────────────────────────────────────────
console.log('\nTooling');
for (const f of [
  '.nvmrc',
  'eslint.config.js',
  '.prettierrc.json',
  '.github/workflows/ci.yml',
  'scripts/acceptance.ts',
]) {
  if (exists(f)) ok(f);
  else warn(`${f} missing`);
}

// ── verdict ────────────────────────────────────────────────────────────────────
console.log('');
if (hard > 0) {
  console.log(`✗ doctor: ${hard} hard issue(s), ${soft} warning(s) — fix the hard issues before building.`);
  process.exit(1);
}
console.log(`✓ doctor: 0 hard issues, ${soft} warning(s).`);
process.exit(0);
