# vibe-mod — for developers

```bash
npm install            # installs deps + git hooks (npm ci does NOT work here — esbuild EBADPLATFORM)
npm run typecheck      # tsc --noEmit
npm test               # 236 tests (1 skipped); npm run test:devvit for the @devvit/test harness
npm run acceptance     # G1..G4 exit gates
npm run doctor         # pre-deploy preflight (devvit.json integrity, fetch-domain↔permissions, route parity)
npm run build          # tsc --noEmit && vite build → dist/server/index.cjs (CJS server bundle)
npm run openai:smoketest   # real OpenAI API (needs OPENAI_API_KEY in .env) — model comparison table
npm run dev            # = devvit playtest (needs `devvit login` + `devvit upload` first)
```

| Path | What |
| --- | --- |
| `src/shared/{rule-schema,system-prompt,starter-rules}.ts` | Zod v4 strict schema · gpt-5.4 prompt + few-shot · 6 seed rules |
| `src/server/{evaluator,fact-bag,executor,devvit-helpers}.ts` | deterministic evaluator · fact bag · action executor + audit + undo · `@devvit/web` adapters |
| `src/server/index.ts` + `src/server/routes/*` | Hono entry (re-exports `app`) + menu / form / trigger / scheduler route modules |
| `scripts/{acceptance,devvit-doctor,replay,openai-smoketest}.ts` | the `npm run` tooling |
| `test/` + `vitest.devvit.config.ts` | reusable in-memory Devvit testkit + the official `@devvit/test` config |
| `docs/devvit-setup-guide.md` | how to take this repo to a published Devvit app (wizard → upload → settings → playtest → publish) |
| `docs/architecture.md` | build-time-AI / runtime-determinism design + the by-construction guarantees |
| `assets/icon.png` | the 1024² App Directory icon (`marketingAssets.icon` in `devvit.json`) |

The Devvit runtime (routing/RPC) is verified by `devvit playtest`; everything else is covered by the test
suite + the acceptance gate. CI (`.github/workflows/ci.yml`) runs lint (0 warnings) → format check →
`tsc` → tests (coverage) → `@devvit/test` → acceptance → `vite build` → "server bundle loads" smoke on
every push. Dependabot groups `@devvit/*` updates into one weekly PR.
