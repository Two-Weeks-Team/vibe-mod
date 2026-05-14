"""Autonomous verification that v0.0.34's `vibe-mod: Compose rule` menu click
flows end-to-end on r/SocialSeeding. Uses the user's existing Chrome reddit
session via browser_cookie3 (read-only, domain-scoped).

Outputs the toast text + screenshots to playwright/.auth/ + /tmp/.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from pathlib import Path

import browser_cookie3
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
AUTH_DIR = ROOT / "playwright" / ".auth"
STATE = AUTH_DIR / "reddit-com.json"
SCREENSHOT_DIR = ROOT / "playwright" / ".auth"
HEADLESS = os.environ.get("HEADLESS", "1") == "1"


def extract_reddit_cookies() -> dict:
    """Read reddit.com cookies from user's Chrome and write Playwright storageState."""
    cj = browser_cookie3.chrome(domain_name="reddit.com")
    cookies = []
    for c in cj:
        cookies.append(
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
        )
    state = {"cookies": cookies, "origins": []}
    AUTH_DIR.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, indent=2))
    print(f"[verify] wrote {STATE} cookies={len(cookies)}")
    return state


async def main():
    state = extract_reddit_cookies()
    if not state["cookies"]:
        print("[verify] FAIL: zero reddit cookies extracted -- user not logged in to reddit.com in Chrome")
        sys.exit(2)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=HEADLESS)
        ctx = await browser.new_context(
            storage_state=str(STATE),
            viewport={"width": 1440, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/130.0.0.0 Safari/537.36"
            ),
        )
        page = await ctx.new_page()

        async def shot(name: str):
            path = SCREENSHOT_DIR / f"{name}.png"
            await page.screenshot(path=str(path), full_page=False)
            print(f"[verify] screenshot {path}")

        # Capture console + network for post-mortem
        console_msgs = []
        page.on("console", lambda msg: console_msgs.append(f"{msg.type}: {msg.text}"))

        print("[verify] navigating to r/SocialSeeding ...")
        await page.goto("https://www.reddit.com/r/SocialSeeding/", wait_until="domcontentloaded", timeout=45000)
        try:
            await page.wait_for_load_state("networkidle", timeout=20000)
        except Exception:
            pass

        title = await page.title()
        url = page.url
        body_preview = (await page.content())[:1500]
        logged_in_hint = "Log In" not in body_preview[:2000] and "Sign Up" not in body_preview[:2000]
        print(f"[verify] title='{title}' url='{url}' logged_in_hint={logged_in_hint}")
        await shot("01-sub-landing")

        if "login" in url.lower() or "sign-in" in url.lower():
            print("[verify] FAIL: redirected to login -- session cookies invalid")
            sys.exit(3)

        # Reddit new UI: mod tools menu lives in the sub header / right rail.
        # Common entry points: button labelled "Mod Tools" or a shield icon.
        # We try several selectors; we also try the kebab/more menu pattern
        # which exposes Devvit menu items under "More".
        candidates = [
            'button:has-text("Mod Tools")',
            'a:has-text("Mod Tools")',
            'role=button[name="Mod Tools"]',
            'shreddit-async-loader >> internal:has-text="Mod Tools"',
            '[aria-label="Moderation"]',
            'button[aria-label*="overflow" i]',
            'button:has-text("...")',
            'faceplate-tracker:has-text("vibe-mod: Compose rule")',
            'text="vibe-mod: Compose rule"',
        ]

        opened = False
        for sel in candidates:
            try:
                loc = page.locator(sel).first
                if await loc.count() == 0:
                    continue
                print(f"[verify] trying selector: {sel}")
                await loc.click(timeout=4000)
                opened = True
                await page.wait_for_timeout(800)
                break
            except Exception as e:
                print(f"[verify]   selector failed: {sel} -- {type(e).__name__}: {e}")
                continue

        await shot("02-after-mod-tools-click")

        # Now look for the menu item
        item_selectors = [
            'text="vibe-mod: Compose rule"',
            'role=menuitem[name="vibe-mod: Compose rule"]',
            'role=button[name="vibe-mod: Compose rule"]',
            '[aria-label="vibe-mod: Compose rule"]',
            'button:has-text("vibe-mod: Compose rule")',
            'a:has-text("vibe-mod: Compose rule")',
            'li:has-text("vibe-mod: Compose rule")',
        ]
        menu_clicked = False
        for sel in item_selectors:
            try:
                loc = page.locator(sel).first
                if await loc.count() == 0:
                    continue
                print(f"[verify] clicking menu item via: {sel}")
                await loc.click(timeout=4000)
                menu_clicked = True
                await page.wait_for_timeout(1500)
                break
            except Exception as e:
                print(f"[verify]   menu selector failed: {sel} -- {type(e).__name__}")
                continue

        await shot("03-after-menu-click")

        if not menu_clicked:
            # Fallback: dump the DOM around mod-related controls so we can adjust
            print("[verify] could not find 'vibe-mod: Compose rule' menu item directly. Dumping mod menu candidates ...")
            buttons = await page.locator('button, [role="button"], [role="menuitem"]').all_text_contents()
            mod_related = [b for b in buttons if b and ("mod" in b.lower() or "vibe" in b.lower())]
            print(f"[verify]   {len(buttons)} clickable; mod/vibe-related texts (up to 30): {mod_related[:30]}")
            sys.exit(4)

        # Form should appear. Look for an input/textarea.
        textarea_selectors = [
            'textarea',
            'role=textbox',
            'input[type="text"]',
        ]
        rule_entered = False
        for sel in textarea_selectors:
            try:
                loc = page.locator(sel).first
                if await loc.count() == 0:
                    continue
                print(f"[verify] filling rule via: {sel}")
                await loc.fill("Send new accounts to the mod queue")
                rule_entered = True
                break
            except Exception:
                continue

        await shot("04-form-filled")

        if not rule_entered:
            print("[verify] could not locate rule input. Snapshot of page ...")
            sys.exit(5)

        # Submit
        submit_selectors = [
            'role=button[name=/submit|compile|create/i]',
            'button:has-text("Submit")',
            'button:has-text("Compile")',
            'button[type="submit"]',
        ]
        for sel in submit_selectors:
            try:
                loc = page.locator(sel).first
                if await loc.count() == 0:
                    continue
                print(f"[verify] clicking submit via: {sel}")
                await loc.click(timeout=4000)
                break
            except Exception:
                continue

        # Wait for toast (Reddit alert/notification region)
        await page.wait_for_timeout(4000)
        await shot("05-after-submit")

        toast_selectors = [
            '[role="alert"]',
            '[role="status"]',
            'faceplate-toast',
            '.toast',
            '[data-testid*="toast" i]',
        ]
        toast_text = ""
        for sel in toast_selectors:
            try:
                loc = page.locator(sel).first
                if await loc.count() == 0:
                    continue
                t = (await loc.inner_text(timeout=3000)).strip()
                if t:
                    toast_text = t
                    print(f"[verify] toast captured via {sel}: {t!r}")
                    break
            except Exception:
                continue

        if not toast_text:
            print("[verify] no toast text captured (selectors exhausted)")

        with open("/tmp/chrome-verify-result.json", "w") as f:
            json.dump(
                {
                    "url": page.url,
                    "title": title,
                    "logged_in_hint": logged_in_hint,
                    "toast": toast_text,
                    "console_tail": console_msgs[-50:],
                },
                f,
                indent=2,
                ensure_ascii=False,
            )

        await browser.close()
        print(f"[verify] DONE toast={toast_text!r}")


if __name__ == "__main__":
    asyncio.run(main())
