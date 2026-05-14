"""Quick dashboard capture — open r/SocialSeeding, click "View rules + log",
take a fullscreen screenshot. Used for the multi-line A/B experiment
(branch experiment/multiline-helptext) where the dashboard renders the
same content twice (defaultValue vs helpText) so we can compare side by
side in the PNG.
"""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path

import browser_cookie3
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
AUTH_DIR = ROOT / "playwright" / ".auth"
STATE = AUTH_DIR / "reddit-com.json"
SUB = os.environ.get("REDDIT_SUB", "SocialSeeding")


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


async def click_overflow_menu_item(page, label: str) -> bool:
    overflow = page.get_by_role("button", name="Open overflow menu").first
    if await overflow.count() == 0:
        return False
    await overflow.click(timeout=4_000)
    await page.wait_for_timeout(1_500)
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
    await page.wait_for_timeout(2_000)
    return True


async def main() -> None:
    print(f"[dash] cookies={ensure_cookies()}  sub={SUB}")
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled", "--start-maximized"],
        )
        ctx = await browser.new_context(
            storage_state=str(STATE),
            viewport={"width": 1600, "height": 2400},  # tall + sharp at DPR 2
            device_scale_factor=2,
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
            ),
            locale="en-US",
        )
        page = await ctx.new_page()
        await page.goto(f"https://www.reddit.com/r/{SUB}/", wait_until="domcontentloaded", timeout=45_000)
        try:
            await page.wait_for_load_state("networkidle", timeout=15_000)
        except Exception:
            pass
        await page.wait_for_timeout(4_000)
        ok = await click_overflow_menu_item(page, "vibe-mod: View rules + log")
        if not ok:
            print("[dash] FAIL: could not click View rules + log")
            await browser.close()
            return
        await page.locator('faceplate-form').first.wait_for(state="visible", timeout=10_000)
        await page.wait_for_timeout(2_000)
        # Full-page screenshot first (overall context) then a tight crop of
        # the modal dialog so the A/B labels are legible.
        full = AUTH_DIR / "experiment-dashboard-ab-full.png"
        await page.screenshot(path=str(full), full_page=True)
        print(f"[dash] full PNG: {full.relative_to(ROOT)}")

        # The dialog itself — find a sensible parent and take its bounding-box
        # screenshot for a sharp, scrollable-by-itself capture.
        dialog = page.locator('faceplate-dialog, shreddit-dialog').first
        if await dialog.count() > 0:
            modal = AUTH_DIR / "experiment-dashboard-ab-modal.png"
            try:
                # Force scroll-to-top so the upper sections show first.
                await page.evaluate("() => { const d = document.querySelector('faceplate-dialog, shreddit-dialog'); if (d) d.scrollTop = 0; }")
                await dialog.screenshot(path=str(modal), scale="device")
                print(f"[dash] modal PNG: {modal.relative_to(ROOT)}")
            except Exception as e:
                print(f"[dash] modal screenshot fallback: {e}")
                await page.locator('faceplate-form').first.screenshot(path=str(modal), scale="device")
                print(f"[dash] form PNG (fallback): {modal.relative_to(ROOT)}")
        # Also dump the form for inspection.
        dump = await page.evaluate(
            """() => {
              const form = document.querySelector('faceplate-form');
              if (!form) return null;
              const fields = [];
              for (const el of form.querySelectorAll('[data-field-name]')) {
                const name = el.getAttribute('data-field-name');
                const ctrl = el.querySelector('input, textarea, select, faceplate-textarea-input, faceplate-switch-input');
                const help = el.querySelector('faceplate-form-helper-text, .help-text, [data-help]');
                fields.push({
                  name,
                  ctrlTag: ctrl ? ctrl.tagName.toLowerCase() : '',
                  visibleHeight: el.getBoundingClientRect().height,
                  helpText: help ? (help.textContent || '').trim().slice(0, 120) : null,
                });
              }
              return { fields };
            }"""
        )
        (AUTH_DIR / "experiment-dashboard-ab.json").write_text(json.dumps(dump, indent=2))
        print(f"[dash] JSON: {(AUTH_DIR / 'experiment-dashboard-ab.json').relative_to(ROOT)}")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
