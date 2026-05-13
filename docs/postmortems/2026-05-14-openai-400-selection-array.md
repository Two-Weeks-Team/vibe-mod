# Postmortem: OpenAI HTTP 400 — SELECTION-array bug masquerading as Devvit transit corruption

**Date**: 2026-05-14
**Severity**: Production-blocking — `vibe-mod: Compose rule` menu returned `Compiler offline` toast for every click between v0.0.27 and v0.0.40.
**Resolution**: PR #39 (callOpenAI) + PR #40 (submit handler).
**Time to detect**: ~2 hours.
**Time to mitigate**: 7 PRs (#32–#38) of speculative fixes before the diagnostic console.log added in PR #38 surfaced the actual cause; PR #39 fixed it within minutes of that surface.
**End-to-end verification**: 2026-05-14 (KST), Chrome screenshot of toast `'Compiled rule "New-account posts to mod queue". Dry-run started — check Dashboard in 30s.'`

---

## 1. What happened

`callOpenAI` in `src/server/index.ts` read the model via:

```ts
model = ((await settings.get('openaiModel')) as string) || 'gpt-5.4-mini';
```

`openaiModel` is declared in `devvit.json` as a `SELECTION` field. Devvit's `settings.get` returns the value of a `SELECTION` field as a **string array** (e.g. `["gpt-5.4-mini"]`), even for single selection. The `as string` cast silenced TypeScript but did not change the runtime type. We then sent the array straight into the OpenAI request body:

```json
{ "model": ["gpt-5.4-mini"], "response_format": {...}, "messages": [...], "max_completion_tokens": 600 }
```

OpenAI rejected this with `HTTP 400 We could not parse the JSON body of your request`. The error wording suggested a structural JSON problem (e.g. unterminated string, garbled bytes) when the actual issue was a single field of the wrong type. That misleading wording cost us seven rounds of speculative fixes.

## 2. Why probes (a)/(b)/(d)/(e)/(f) all returned 200

The diagnostic probes in `/internal/scheduler/synthetic-compile-probe` (now removed) hardcoded `model: 'gpt-5.4-nano'` (a string literal). Their requests sent `"model": "gpt-5.4-nano"` and OpenAI parsed them fine. The probes therefore ruled out (correctly) every body-shape variable they tested — but never tested the one variable that actually mattered, because they bypassed `settings.get`.

## 3. The misleading evidence trail (PR #32–#38)

| PR | Hypothesis tested | Result | Why it didn't help |
|----|-------------------|--------|---------------------|
| #32 | Multi-message bodies trip Devvit transit | 400 | Body still had `model` array |
| #33 | Non-ASCII chars in source corrupted on the wire | 400 | Same |
| #34 | `reasoning_effort` + `verbosity` combination trips with response_format | 400 | Same |
| #35 | `\n` escape sequences in content trip transit | 400 | Same |
| #36 | String body re-encode corrupts; Uint8Array bypasses | 400 | Same |
| #37 | High `\"` density in content | 400 | Same |
| #38 | Hardcode `gpt-5.4-nano` (probe-verified) | **200** + downstream "unsupported action" | First request whose body had `model: <string>` — OpenAI parsed it. Few-shot was still in PR #37's flattened format so the model produced a malformed action shape, hence the downstream toast. |
| #39 | Unwrap SELECTION array; restore `JSON.stringify(ex.assistant)` few-shot | **200** + valid compile | Root-cause fix. |
| #40 | Same unwrap in submit-handler `llmModel` | **200** + valid compile + correct draft metadata | Coverage of the second occurrence of the same bug. |

## 4. Probe code lifecycle

The diagnostic probe (`/internal/scheduler/synthetic-compile-probe` + `devvit.json` `scheduler.tasks.synthetic-compile-probe`) was developed on the `fix/openai-error-handling` branch (commits `6184502`, `fa64429`, `4d64775`) and **never merged to main**. PRs #32–#40 all forked off `main` (probe-free) so production builds from main never contained the probe. Verification:

```
$ grep -c "synthetic-compile-probe" src/server/index.ts devvit.json
src/server/index.ts:0
devvit.json:0
```

Branch cleanup:

```
$ git push origin --delete fix/openai-error-handling
- [deleted]    fix/openai-error-handling
```

No further removal PR is required because there is nothing in `main` to remove.

## 5. End-to-end production verification

`scripts/chrome-reddit-v3.py` (autonomous via `browser_cookie3` → Playwright):

1. Reddit cookies imported from user's Chrome profile (16 cookies, domain-scoped).
2. r/SocialSeeding overflow menu opened, `vibe-mod: Compose rule` menu item targeted via `page.mouse.click(1322, 436)` on the `<faceplate-menu-item>` host (the Lit shadow-DOM web component is not Playwright-clickable via `locator.click()`).
3. `<faceplate-form>` modal opened, `<textarea name="rule">` filled with `"Send any post from accounts less than 7 days old to the mod queue"`.
4. Submit clicked. After ~2.5s, captured toast:

   > `Compiled rule "New-account posts to mod queue". Dry-run started — check Dashboard in 30s.`

Production logs for the same flow:

```
[vibe-mod] callOpenAI: settings.get(openaiApiKey) ok: { defined: 'string', len: 164 }
[vibe-mod] callOpenAI: openaiModel raw = ["gpt-5.4-mini"] unwrapped = "gpt-5.4-mini"
[vibe-mod] callOpenAI: body chars = 6576
```

No `submit: callOpenAI threw` line, no `HTTP 400` log — the fix is verified end-to-end.

## 6. Lessons

- **Always log the resolved value** of any `settings.get(...)` call that drives an outbound request. The single `console.log('openaiModel raw = ..., unwrapped = ...')` added in PR #38 surfaced the bug in one line.
- **`as string` casts are tech debt** when the runtime type is actually structured. Devvit's `settings.get` should return a discriminated-union type that forces unwrapping at the call site.
- **OpenAI's `could not parse the JSON body` error wording is too generic.** A specific `"Invalid type for parameter 'model': expected string, received array"` would have collapsed the diagnostic loop from 7 rounds to 0.
- **Diagnostic probes that hardcode parameters create blind spots.** Future probes should mirror the production code path (call the same helper) rather than constructing a parallel request shape.

## 7. Codebase residue audit

```
$ grep -rn "as string\b" src/server/ | grep "settings.get" | head
src/server/index.ts:1364:    subKey = ((await settings.get('subredditOpenaiApiKey')) as string) ?? '';
src/server/index.ts:1378:      const globalKey = ((await settings.get('openaiApiKey')) as string) ?? '';
```

`openaiApiKey` and `subredditOpenaiApiKey` are declared as `STRING` (not `SELECTION`) in `devvit.json`, so the `as string` cast is correct for them. No further unwrapping needed.

```
$ grep -n "SELECTION\|\"type\".*\"select" devvit.json | head
src/server/devvit.json:31: ... "type": "SELECTION", "name": "openaiModel" ...
```

`openaiModel` is the only `SELECTION` setting. Both call sites (`callOpenAI` line 1267-1280 and submit-handler line 477-487) unwrap correctly after PR #39 + #40.
