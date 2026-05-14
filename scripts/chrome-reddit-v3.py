"""Autonomous Chrome verification of vibe-mod: Compose rule menu click.

Uses browser_cookie3 to import the user's Reddit cookies into Playwright,
clicks the subreddit-level overflow menu, locates 'vibe-mod: Compose rule',
fires a real mouse click via page coords, fills the textarea, submits,
and waits up to 20 seconds for the toast.
"""

from __future__ import annotations

import asyncio
import json
import os
import re as _re
from pathlib import Path

import browser_cookie3
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
AUTH_DIR = ROOT / "playwright" / ".auth"
STATE = AUTH_DIR / "reddit-com.json"
HEADLESS = os.environ.get("HEADLESS", "1") == "1"


def ensure_cookies():
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


async def main():
    print(f"[v3] cookies={ensure_cookies()}")
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

        async def shot(name):
            await page.screenshot(path=str(AUTH_DIR / f"v3-{name}.png"))
            print(f"[v3]   shot v3-{name}.png")

        await page.goto("https://www.reddit.com/r/SocialSeeding/", wait_until="domcontentloaded", timeout=45000)
        try:
            await page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass
        await page.wait_for_timeout(6000)
        await shot("01-landing")

        overflow = page.get_by_role("button", name="Open overflow menu").first
        if await overflow.count() == 0:
            print("[v3] FAIL: 'Open overflow menu' button not found")
            return
        print("[v3] clicking 'Open overflow menu'")
        await overflow.click(timeout=4000)
        await page.wait_for_timeout(1800)
        await shot("02-overflow-open")

        # Find the visible 'vibe-mod: Compose rule' span (Reddit pre-renders
        # multiple copies; only one is in the currently-open dropdown).
        all_spans = page.get_by_text("vibe-mod: Compose rule", exact=True)
        total = await all_spans.count()
        print(f"[v3] 'vibe-mod: Compose rule' occurrences: {total}")
        compose_span = None
        for i in range(total):
            try:
                if await all_spans.nth(i).is_visible():
                    compose_span = all_spans.nth(i)
                    print(f"[v3]   visible one is index {i}")
                    break
            except Exception:
                pass
        if compose_span is None:
            print("[v3] no VISIBLE compose item found")
            return

        # The menu item is a Lit web component (<faceplate-menu-item>). The
        # standard Playwright click() reports 'not visible' due to CSS
        # transforms; click via page.mouse coords on the <li> wrapper.
        box_info = await compose_span.evaluate(
            """el => {
              let target = el.closest('[role=\"menuitem\"]') || el.closest('button') || el.closest('a');
              if (!target) {
                const li = el.closest('li');
                if (li) target = li.querySelector('[role=\"menuitem\"], button, a');
              }
              if (!target) target = el;
              target.scrollIntoView({ block: 'center', behavior: 'instant' });
              const r = target.getBoundingClientRect();
              return { x: r.x, y: r.y, width: r.width, height: r.height, tag: target.tagName, role: target.getAttribute('role') };
            }"""
        )
        print(f"[v3]   bbox: {box_info}")
        cx = box_info["x"] + box_info["width"] / 2
        cy = box_info["y"] + box_info["height"] / 2
        print(f"[v3]   mouse.click({cx:.0f}, {cy:.0f})")
        await page.mouse.move(cx, cy)
        await page.wait_for_timeout(150)
        await page.mouse.click(cx, cy)
        await page.wait_for_timeout(2500)

        modal = page.locator('faceplate-form').first
        await modal.wait_for(state="visible", timeout=8000)
        print("[v3] faceplate-form visible")
        await shot("03-modal")

        rule_input = modal.locator("textarea").first
        await rule_input.wait_for(state="visible", timeout=8000)
        await rule_input.fill(
            "Send any post from accounts less than 7 days old to the mod queue", timeout=5000
        )
        print("[v3] filled rule")
        await shot("04-form-filled")

        submit_btn = modal.get_by_role(
            "button", name=_re.compile(r"submit|compile|create rule|save|continue", _re.I)
        )
        sc = await submit_btn.count()
        print(f"[v3] submit buttons matching: {sc}")
        if sc:
            await submit_btn.first.click(timeout=5000)
            print("[v3] submit clicked")
        else:
            await rule_input.press("Enter")
            print("[v3] pressed Enter as submit")

        # Devvit compose can take 10-15s while OpenAI compiles. Probe every
        # 2.5s for a toast.
        toast = ""
        for n in range(8):
            await page.wait_for_timeout(2500)
            await shot(f"05-after-submit-{n}")
            for sel in ['faceplate-toast', '[role="alert"]', '[role="status"]']:
                try:
                    loc = page.locator(sel).first
                    if await loc.count() == 0:
                        continue
                    t = (await loc.inner_text(timeout=800)).strip()
                    if t and len(t) < 600 and any(
                        kw in t.lower()
                        for kw in ["compiled rule", "compiled", "rejected", "error", "offline", "queued", "draft", "saved", "supported", "rate-limit", "ban", "mute", "dry-run"]
                    ):
                        toast = t
                        print(f"[v3] TOAST iter={n} ({sel}): {t!r}")
                        break
                except Exception:
                    pass
            if toast:
                break

        (AUTH_DIR / "v3-result.json").write_text(
            json.dumps({"toast": toast, "url": page.url})
        )
        print(f"[v3] DONE toast={toast!r}")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
