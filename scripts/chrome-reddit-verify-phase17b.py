"""Production verification of Phase 1.7b/c new UI surfaces.

Covers the new flows that PR #43, #44, #45 introduced — none of which were
previously round-tripped through Devvit's actual runtime:

  1. Compose with an ambiguous input → Clarify modal renders **select** field
     (was paragraph) + clarificationTurn=2 hidden carrier.
  2. Pick a suggested option → Re-compile → **composeConfirmForm** opens
     with the humanizeRule output rendered as English.
  3. Click "Save + run dry-run preview" → success toast.
  4. Open dashboard → onboarding card + token cost line visible.
  5. Open new "vibe-mod: Manage rules" menu → group-field-per-rule renders
     with action select.
  6. (Optional) Apply Delete on the new rule → manageDeleteConfirmForm
     opens → Confirm → deletion toast.

Each step writes a screenshot + a JSON record. End-of-run summary is
written to playwright/.auth/verify-phase17b-result.json.

Pre-req: user has run `npx devvit upload` so the latest code is installed
on r/SocialSeeding. Cookie source is the same as chrome-reddit-v3.py
(browser_cookie3 reads the user's Chrome reddit.com cookies).
"""

from __future__ import annotations

import asyncio
import json
import os
import re as _re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import browser_cookie3
from playwright.async_api import async_playwright, Page

ROOT = Path(__file__).resolve().parent.parent
AUTH_DIR = ROOT / "playwright" / ".auth"
STATE = AUTH_DIR / "reddit-com.json"
HEADLESS = os.environ.get("HEADLESS", "1") == "1"
SUB = os.environ.get("REDDIT_SUB", "SocialSeeding")
# Ambiguous input designed to trigger the clarify path on the first compile.
COMPOSE_INPUT = os.environ.get(
    "VERIFY_INPUT",
    "Send to mod queue posts from brand-new accounts under 50 chars",
)


@dataclass
class StepResult:
    name: str
    passed: bool
    detail: str = ""
    screenshot: Optional[str] = None
    extra: dict = field(default_factory=dict)


@dataclass
class RunReport:
    sub: str
    input: str
    steps: list[StepResult] = field(default_factory=list)

    def add(self, step: StepResult) -> None:
        self.steps.append(step)
        marker = "PASS" if step.passed else "FAIL"
        print(f"[verify] {marker}  {step.name}  — {step.detail}")

    def overall(self) -> bool:
        return all(s.passed for s in self.steps)


def ensure_cookies() -> int:
    cj = browser_cookie3.chrome(domain_name="reddit.com")
    cookies = [
        {
            "name": c.name,
            "value": c.value,
            "domain": c.domain if c.domain.startswith(".") else "." + c.domain,
            "path": c.path or "/",
            "expires": float(c.expires) if c.expires else -1,
            "httpOnly": False,
            "secure": bool(c.secure),
            "sameSite": "Lax",
        }
        for c in cj
    ]
    AUTH_DIR.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps({"cookies": cookies, "origins": []}, indent=2))
    return len(cookies)


async def click_overflow_menu_item(page: Page, label: str) -> bool:
    """Open the subreddit-level overflow menu and click the item with the
    given visible text. Returns True on success."""
    overflow = page.get_by_role("button", name="Open overflow menu").first
    if await overflow.count() == 0:
        return False
    await overflow.click(timeout=4000)
    await page.wait_for_timeout(1500)
    spans = page.get_by_text(label, exact=True)
    n = await spans.count()
    target = None
    for i in range(n):
        try:
            if await spans.nth(i).is_visible():
                target = spans.nth(i)
                break
        except Exception:
            pass
    if target is None:
        return False
    box = await target.evaluate(
        """el => {
          let t = el.closest('[role="menuitem"]') || el.closest('button') || el.closest('a');
          if (!t) {
            const li = el.closest('li');
            if (li) t = li.querySelector('[role="menuitem"], button, a');
          }
          if (!t) t = el;
          t.scrollIntoView({ block: 'center', behavior: 'instant' });
          const r = t.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }"""
    )
    cx = box["x"] + box["width"] / 2
    cy = box["y"] + box["height"] / 2
    await page.mouse.move(cx, cy)
    await page.wait_for_timeout(120)
    await page.mouse.click(cx, cy)
    await page.wait_for_timeout(2000)
    return True


async def dump_form(page: Page) -> dict:
    """Snapshot the visible Devvit form (faceplate-form). Returns shape:
      { title, description, dialogText, fields: [{name, type, defaultValue, options}] }
    Devvit's modal markup doesn't expose a stable `<h2>` for the title or
    `[slot="description"]`, so the test logic prefers `dialogText` (full
    dialog text-content) + field-name signals over the formal title/desc.
    """
    return await page.evaluate(
        """() => {
          const form = document.querySelector('faceplate-form');
          if (!form) return { error: 'no faceplate-form' };
          const out = { title: '', description: '', dialogText: '', acceptLabel: '', cancelLabel: '', fields: [] };
          const root = form.closest('faceplate-dialog') || form.closest('shreddit-dialog') || form.parentElement;
          if (root) {
            // Best-effort title — try a handful of common selectors.
            const h2 = root.querySelector('h2, [slot="title"], [data-testid="dialog-title"]');
            if (h2) out.title = (h2.innerText || h2.textContent || '').trim();
            const desc = root.querySelector('[slot="description"], .description');
            if (desc) out.description = (desc.innerText || desc.textContent || '').trim().slice(0, 600);
            // Always capture the full dialog text — onboarding cards / token
            // cost lines / "Welcome" greetings show up here even when there's
            // no formal description slot.
            out.dialogText = (root.innerText || root.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 2000);
            const accept = root.querySelector('button[type="submit"], [data-form-accept], faceplate-button[type="submit"]');
            if (accept) out.acceptLabel = (accept.innerText || accept.textContent || '').trim();
            const cancel = root.querySelectorAll('button, faceplate-button');
            for (const b of cancel) {
              const t = (b.innerText || b.textContent || '').trim().toLowerCase();
              if (t.includes('cancel') || t.includes("don't show")) { out.cancelLabel = b.innerText.trim(); break; }
            }
          }
          // Fields — Devvit renders each field as a labelled group with an input/select/textarea inside.
          const blocks = form.querySelectorAll('[data-field-name], faceplate-form-field, .field-row');
          if (blocks.length === 0) {
            // Fallback — every form control with a name.
            const named = form.querySelectorAll('[name]');
            for (const n of named) {
              out.fields.push({
                name: n.getAttribute('name'),
                type: n.tagName.toLowerCase(),
                defaultValue: (n.value || n.textContent || '').slice(0, 200),
                disabled: n.disabled === true || n.hasAttribute('disabled'),
              });
            }
          } else {
            for (const b of blocks) {
              const name = b.getAttribute('data-field-name') || (b.querySelector('[name]') ? b.querySelector('[name]').getAttribute('name') : '');
              const ctrl = b.querySelector('select, textarea, input, faceplate-select, faceplate-radio-group, faceplate-checkbox');
              const tag = ctrl ? ctrl.tagName.toLowerCase() : '';
              let opts = [];
              if (tag === 'select') {
                opts = [...ctrl.querySelectorAll('option')].map(o => ({label: o.textContent.trim(), value: o.value}));
              } else if (tag === 'faceplate-select') {
                opts = [...ctrl.querySelectorAll('option, faceplate-listbox-item')].map(o => ({label: (o.textContent || '').trim(), value: o.getAttribute('value') || ''}));
              }
              out.fields.push({ name, type: tag, options: opts, defaultValue: ctrl ? (ctrl.value || ctrl.textContent || '').slice(0, 200) : '', disabled: ctrl && (ctrl.disabled || ctrl.hasAttribute('disabled')) });
            }
          }
          return out;
        }"""
    )


async def submit_form(page: Page, button_text_re: str = r"compile|recompile|save|apply|confirm|submit") -> bool:
    btn = page.locator('faceplate-form').first.get_by_role(
        "button", name=_re.compile(button_text_re, _re.I)
    )
    n = await btn.count()
    if n == 0:
        return False
    try:
        await btn.first.click(timeout=5000)
        return True
    except Exception:
        return False


async def wait_for_toast(page: Page, timeout_ms: int = 25_000) -> str:
    """Poll for a faceplate-toast / role=alert / role=status. Returns the
    text or '' on timeout."""
    deadline = timeout_ms
    waited = 0
    while waited < deadline:
        await page.wait_for_timeout(2000)
        waited += 2000
        for sel in ['faceplate-toast', '[role="alert"]', '[role="status"]']:
            try:
                loc = page.locator(sel).first
                if await loc.count() == 0:
                    continue
                t = (await loc.inner_text(timeout=800)).strip()
                if t and len(t) < 800:
                    return t
            except Exception:
                pass
    return ''


async def main() -> None:
    print(f"[verify] cookies={ensure_cookies()}  sub={SUB}  input={COMPOSE_INPUT!r}")
    report = RunReport(sub=SUB, input=COMPOSE_INPUT)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=HEADLESS,
            args=["--disable-blink-features=AutomationControlled"],
        )
        ctx = await browser.new_context(
            storage_state=str(STATE),
            viewport={"width": 1600, "height": 1000},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
            ),
            locale="en-US",
        )
        page = await ctx.new_page()

        async def shot(name: str) -> str:
            path = AUTH_DIR / f"verify-{name}.png"
            await page.screenshot(path=str(path), full_page=False)
            return str(path.relative_to(ROOT))

        # ── 0 · land ────────────────────────────────────────────────────
        await page.goto(f"https://www.reddit.com/r/{SUB}/", wait_until="domcontentloaded", timeout=45_000)
        try:
            await page.wait_for_load_state("networkidle", timeout=15_000)
        except Exception:
            pass
        await page.wait_for_timeout(5_000)
        report.add(StepResult("land", True, page.url, await shot("00-land")))

        # ── 1 · open Compose rule ───────────────────────────────────────
        ok = await click_overflow_menu_item(page, "vibe-mod: Compose rule")
        report.add(StepResult("compose-menu-click", ok, "clicked overflow → Compose rule", await shot("01-after-compose-click")))
        if not ok:
            (AUTH_DIR / "verify-phase17b-result.json").write_text(
                json.dumps({"sub": SUB, "input": COMPOSE_INPUT, "overall": False, "steps": [s.__dict__ for s in report.steps]}, indent=2)
            )
            await browser.close()
            return

        await page.locator('faceplate-form').first.wait_for(state="visible", timeout=10_000)
        compose_form = await dump_form(page)
        report.add(StepResult("compose-form-rendered", True, f"fields={[f['name'] for f in compose_form.get('fields', [])]}", await shot("02-compose-form"), {"form": compose_form}))

        # ── 2 · fill + submit ───────────────────────────────────────────
        ta = page.locator('faceplate-form').first.locator('textarea').first
        await ta.fill(COMPOSE_INPUT, timeout=5_000)
        await shot("03-input-filled")
        sent = await submit_form(page, r"compile|preview|submit")
        report.add(StepResult("compose-submit", sent, "clicked Compile + Preview"))

        # Wait for either a Clarify modal (next form) or a Confirm form (if
        # input was deterministic) or a toast (error). 20s max.
        await page.wait_for_timeout(8_000)
        clarify_form = await dump_form(page)
        await shot("04-after-submit")

        # ── 3 · expect Clarify (with select field) ──────────────────────
        # Devvit doesn't expose a stable title node, so detect by field-name
        # signals: clarificationTurn (state-carrier added by Phase 1.7b) is
        # present iff the server returned the clarify modal.
        field_names = {f.get('name', '') for f in clarify_form.get('fields', [])}
        is_clarify = 'clarificationTurn' in field_names
        select_fields = [f for f in clarify_form.get('fields', []) if 'select' in (f.get('type') or '')]
        clarify_pass = is_clarify and len(select_fields) > 0
        # Bonus: the dialog text should contain the "(Round X of N)" prefix
        # from the prompt.
        dlg = (clarify_form.get('dialogText') or '').lower()
        round_visible = 'round' in dlg and 'of' in dlg
        report.add(StepResult(
            "clarify-renders-select",
            clarify_pass,
            f"is_clarify={is_clarify} select_fields={[f['name'] for f in select_fields]} round_visible={round_visible}",
            extra={"form": clarify_form, "round_visible": round_visible},
        ))

        if not clarify_pass:
            # The model didn't ask for clarification on this input — the
            # Confirm form should have opened directly. Fall through to
            # confirm-form check.
            print(f"[verify] no clarify modal — assuming confirm path.")
        else:
            # Pick a suggested option via direct DOM mutation (the Devvit
            # `faceplate-select` Lit element doesn't respond to a vanilla
            # locator.click, but assigning .value + dispatching change/input
            # events drives the same code path the human click would).
            picker_result = {}
            try:
                picker_result = await page.evaluate(
                    """() => {
                      const form = document.querySelector('faceplate-form');
                      if (!form) return { ok: false, reason: 'no faceplate-form' };
                      // Find the named clarificationAnswer wrapper, then any
                      // control inside it.
                      const wrap = form.querySelector('[data-field-name="clarificationAnswer"], faceplate-form-field[name="clarificationAnswer"], [name="clarificationAnswer"]');
                      const inspect = (el) => ({
                        tag: el.tagName.toLowerCase(),
                        name: el.getAttribute('name') || '',
                        role: el.getAttribute('role') || '',
                        valueAttr: el.getAttribute('value') || '',
                        valueProp: el.value !== undefined ? String(el.value) : '',
                      });
                      const found = [];
                      // Scan inside the wrap (or form root if wrap not found)
                      // for ANY interactive control.
                      const scope = wrap || form;
                      const ctls = scope.querySelectorAll('select, faceplate-select, faceplate-radio-group, faceplate-listbox-button, [role="combobox"], [role="listbox"], [role="radiogroup"], button, faceplate-radio-input');
                      for (const c of ctls) found.push(inspect(c));
                      // Also list any visible options in the document (Devvit may
                      // render them as siblings of the select once expanded).
                      const opts = [...document.querySelectorAll('option, faceplate-listbox-item, faceplate-radio-input, [role="option"]')]
                        .map(o => ({ tag: o.tagName.toLowerCase(), text: (o.textContent || '').trim().slice(0, 60), value: o.getAttribute('value') || '' }));
                      // Attempt 1 — pick the SECOND option of the first
                      // matching native <select>, falling back to the first.
                      let picked = null;
                      const native = scope.querySelector('select');
                      if (native) {
                        const options = [...native.querySelectorAll('option')];
                        if (options.length > 0) {
                          const target = options[options.length > 1 ? 1 : 0];
                          native.value = target.value;
                          native.dispatchEvent(new Event('input', { bubbles: true }));
                          native.dispatchEvent(new Event('change', { bubbles: true }));
                          picked = { method: 'native-select', value: target.value, text: (target.textContent || '').trim() };
                        }
                      }
                      // Attempt 2 — radio-group / listbox: click the first option-like child.
                      if (!picked) {
                        const opt = scope.querySelector('faceplate-radio-input, faceplate-listbox-item, [role="option"]');
                        if (opt) {
                          opt.click();
                          picked = { method: 'option-click', value: opt.getAttribute('value') || '', text: (opt.textContent || '').trim() };
                        }
                      }
                      return { ok: !!picked, picked, found, opts: opts.slice(0, 8) };
                    }"""
                )
            except Exception as e:
                picker_result = {"ok": False, "exception": str(e)}

            report.add(StepResult(
                "clarify-select-pick",
                bool(picker_result.get('ok')),
                f"picked={picker_result.get('picked')} controls_seen={len(picker_result.get('found', []))} opts_seen={len(picker_result.get('opts', []))}",
                extra={"picker": picker_result},
            ))

            # Mark PASS when we successfully drove some select-like control.
            # The form's defaultValue already pre-selects opts[0], so even
            # if our picker only reaffirmed it the next compile will see
            # this value — that's still a real round-trip.
            if 'clarify-select-pick' not in {s.name for s in report.steps}:
                report.add(StepResult(
                    "clarify-select-pick",
                    bool(picker_ok),
                    f"picker_ok={picker_ok} picked_value={picked_val!r}",
                ))

            await shot("05-clarify-picked")
            recompiled = await submit_form(page, r"recompile|re-compile|compile")
            report.add(StepResult("clarify-recompile-submit", recompiled, "clicked Re-compile"))
            await page.wait_for_timeout(8_000)
            await shot("06-after-recompile")

        # ── 4 · expect Confirm form ─────────────────────────────────────
        confirm_form = await dump_form(page)
        confirm_fields = {f.get('name', '') for f in confirm_form.get('fields', [])}
        is_confirm = 'compiledSummary' in confirm_fields and 'serializedRule' in confirm_fields
        report.add(StepResult(
            "confirm-form-renders",
            is_confirm,
            f"compiledSummary+serializedRule present? {is_confirm}; fields={list(confirm_fields)}",
            await shot("07-confirm-form"),
            {"form": confirm_form},
        ))

        if is_confirm:
            saved = await submit_form(page, r"save|run dry-run|preview")
            report.add(StepResult("confirm-save-click", saved, "clicked Save"))
            toast_after_save = await wait_for_toast(page, timeout_ms=20_000)
            report.add(StepResult(
                "save-toast-success",
                'compiled rule' in toast_after_save.lower() or 'success' in toast_after_save.lower(),
                f"toast={toast_after_save!r}",
                await shot("08-after-save"),
                {"toast": toast_after_save},
            ))

        # ── 5 · Dashboard onboarding + token cost ──────────────────────
        try:
            await page.keyboard.press("Escape")
        except Exception:
            pass
        await page.wait_for_timeout(2_000)
        ok2 = await click_overflow_menu_item(page, "vibe-mod: View rules + log")
        report.add(StepResult("dashboard-menu-click", ok2, "clicked View rules + log", await shot("09-after-dashboard-click")))
        if ok2:
            await page.locator('faceplate-form').first.wait_for(state="visible", timeout=10_000)
            dash_form = await dump_form(page)
            # Devvit puts the description into the dialog body text, not into
            # any single labelled element. Use dialogText (full text content
            # of the dialog) as the source of truth.
            dlg_text = (dash_form.get('dialogText') or '').lower()
            has_onboarding = 'welcome to vibe-mod' in dlg_text or '3 quick steps' in dlg_text
            has_empty_state = 'no rules yet' in dlg_text
            has_token_cost = 'tokens used' in dlg_text and ('gpt-5.4' in dlg_text or 'gpt-5' in dlg_text)
            report.add(StepResult(
                "dashboard-onboarding-or-empty",
                has_onboarding or has_empty_state,
                f"onboarding={has_onboarding} empty_state={has_empty_state}",
                await shot("10-dashboard-form"),
                {"form": dash_form},
            ))
            report.add(StepResult(
                "dashboard-token-cost",
                has_token_cost,
                f"token_line_present={has_token_cost}",
                extra={"dlg_excerpt": dlg_text[:600]},
            ))

        # ── 6 · Manage rules menu ──────────────────────────────────────
        try:
            await page.keyboard.press("Escape")
        except Exception:
            pass
        await page.wait_for_timeout(2_000)
        ok3 = await click_overflow_menu_item(page, "vibe-mod: Manage rules")
        report.add(StepResult("manage-menu-click", ok3, "clicked Manage rules", await shot("11-after-manage-click")))
        if ok3:
            try:
                await page.locator('faceplate-form').first.wait_for(state="visible", timeout=10_000)
                manage_form = await dump_form(page)
                fields = manage_form.get('fields', [])
                action_selects = [f for f in fields if (f.get('name') or '').startswith('action_')]
                report.add(StepResult(
                    "manage-renders-per-rule-select",
                    len(action_selects) > 0,
                    f"action_*_count={len(action_selects)} all_field_names={[f['name'] for f in fields[:10]]}...",
                    await shot("12-manage-form"),
                    {"form": manage_form, "action_count": len(action_selects)},
                ))
            except Exception as e:
                # Empty-state toast is also acceptable (no rules yet).
                report.add(StepResult("manage-renders-per-rule-select", False, f"exception: {e}"))

        # ── 7 · summary ────────────────────────────────────────────────
        result_path = AUTH_DIR / "verify-phase17b-result.json"
        result_path.write_text(json.dumps({
            "sub": SUB,
            "input": COMPOSE_INPUT,
            "overall": report.overall(),
            "steps": [s.__dict__ for s in report.steps],
        }, indent=2))
        print(f"[verify] DONE  overall={report.overall()}  result={result_path.relative_to(ROOT)}")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
