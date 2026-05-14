"""Robust autonomous verify of vibe-mod: Compose rule menu click.

Strategy:
- Real Chrome user-agent + viewport
- Long hydration wait (15s)
- Try multiple known Devvit menu trigger patterns
- Falls back to clicking "Mod Tools" sidebar entry, then any item containing 'Compose rule'
- Captures screenshots at each step + a full-DOM dump for analysis
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
    STATE.write_text(json.dumps({"cookies": cookies, "origins": []}, indent=2))
    return len(cookies)


async def main():
    n = ensure_cookies()
    print(f"[v2] cookies={n}")
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=HEADLESS,
            args=[
                "--disable-blink-features=AutomationControlled",
            ],
        )
        ctx = await browser.new_context(
            storage_state=str(STATE),
            viewport={"width": 1600, "height": 1000},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
            ),
            locale="en-US",
            timezone_id="America/Los_Angeles",
        )
        page = await ctx.new_page()

        async def shot(name):
            path = AUTH_DIR / f"v2-{name}.png"
            await page.screenshot(path=str(path), full_page=False)
            print(f"[v2]   screenshot {path.name}")

        url_target = "https://www.reddit.com/r/SocialSeeding/"
        print(f"[v2] navigate to {url_target}")
        await page.goto(url_target, wait_until="domcontentloaded", timeout=45000)
        # Long hydration wait — Reddit JS is heavy
        try:
            await page.wait_for_load_state("networkidle", timeout=20000)
        except Exception:
            pass
        await page.wait_for_timeout(8000)
        print(f"[v2] url={page.url} title={await page.title()!r}")
        await shot("01-landing")

        # Save full HTML for offline analysis
        html_path = AUTH_DIR / "v2-page.html"
        html_path.write_text(await page.content())
        print(f"[v2]   wrote {html_path.name} ({html_path.stat().st_size} bytes)")

        # Find all clickable elements (Playwright pierces open shadow DOM)
        btns = page.locator("button, a, [role=button], [role=menuitem]")
        count = await btns.count()
        print(f"[v2] clickables: {count}")

        # Collect labels (aria-label first, then text)
        labels = []
        for i in range(min(count, 400)):
            try:
                el = btns.nth(i)
                lbl = await el.get_attribute("aria-label")
                if not lbl:
                    lbl = (await el.text_content(timeout=200)) or ""
                lbl = lbl.strip()
                if lbl:
                    labels.append((i, lbl[:120]))
            except Exception:
                pass
        # Print mod/vibe/compose related
        related = [(i, l) for i, l in labels if any(kw in l.lower() for kw in ["vibe", "compose", "mod tools", "mod mode", "moderat", "overflow", "more", "..."])]
        print(f"[v2] mod/vibe related ({len(related)}):")
        for i, l in related[:30]:
            print(f"  [{i}] {l!r}")

        # Try clicking 'Mod Tools' or 'Mod Mode' to expose menu
        for label_match in ["Mod Mode", "Mod Tools"]:
            try:
                trg = page.get_by_role("button", name=label_match).or_(page.get_by_text(label_match, exact=True)).first
                if await trg.count():
                    print(f"[v2] click '{label_match}'")
                    await trg.click(timeout=4000)
                    await page.wait_for_timeout(2500)
                    await shot(f"02-after-{label_match.replace(' ', '-').lower()}")
                    break
            except Exception as e:
                print(f"[v2]   click {label_match} failed: {e!r}")

        # Search the page now for our menu item
        compose_locators = [
            page.get_by_role("menuitem", name="vibe-mod: Compose rule"),
            page.get_by_role("button", name="vibe-mod: Compose rule"),
            page.get_by_text("vibe-mod: Compose rule", exact=True),
            page.locator('[aria-label="vibe-mod: Compose rule"]'),
        ]
        clicked = False
        for loc in compose_locators:
            try:
                c = await loc.count()
                if c == 0:
                    continue
                print(f"[v2] found compose menu: {await loc.first.text_content(timeout=2000)!r}; clicking...")
                await loc.first.click(timeout=4000)
                clicked = True
                break
            except Exception as e:
                print(f"[v2]   compose locator failed: {e!r}")
        if not clicked:
            print("[v2] compose menu NOT FOUND directly. Looking inside any open menu/dropdown...")
            # If "Mod Tools" opened a dropdown, items may be in a menu/listbox
            menus = page.locator('[role="menu"], [role="listbox"], faceplate-menu')
            mcnt = await menus.count()
            print(f"[v2] menus open: {mcnt}")
            for i in range(mcnt):
                items = menus.nth(i).locator('[role="menuitem"], button, a')
                icnt = await items.count()
                for j in range(icnt):
                    try:
                        text = (await items.nth(j).text_content(timeout=300)) or ""
                        text = text.strip()
                        if "vibe-mod" in text.lower() or "compose" in text.lower():
                            print(f"[v2]   match in menu[{i}][{j}]: {text!r}")
                            await items.nth(j).click(timeout=4000)
                            clicked = True
                            break
                    except Exception:
                        pass
                if clicked:
                    break

        await shot("03-after-menu-attempt")

        if not clicked:
            print("[v2] FAIL: could not click 'vibe-mod: Compose rule' menu item")
            # Dump every clickable label to disk for later analysis
            (AUTH_DIR / "v2-clickables.txt").write_text(
                "\n".join(f"[{i}] {l}" for i, l in labels)
            )
            print(f"[v2]   wrote v2-clickables.txt with {len(labels)} entries")
            return

        # Wait for form modal and fill
        await page.wait_for_timeout(2500)
        await shot("04-form-open")
        text_input = page.locator("textarea, input[type=text]").first
        try:
            await text_input.fill("Send new accounts to the mod queue", timeout=5000)
            print("[v2] rule filled")
        except Exception as e:
            print(f"[v2] form fill failed: {e!r}")
            return

        submit = page.get_by_role("button", name=lambda s: s and any(k in s.lower() for k in ["submit", "compile", "create"])).first
        try:
            await submit.click(timeout=5000)
            print("[v2] submit clicked")
        except Exception as e:
            print(f"[v2] submit failed: {e!r}")
            return

        # Capture toast (look for various toast container patterns)
        await page.wait_for_timeout(6000)
        await shot("05-after-submit")

        toast_text = ""
        for sel in ['[role="alert"]', '[role="status"]', 'faceplate-toast', '[data-testid*="toast" i]']:
            try:
                loc = page.locator(sel).first
                if await loc.count() == 0:
                    continue
                t = (await loc.inner_text(timeout=2000)).strip()
                if t:
                    toast_text = t
                    print(f"[v2] TOAST via {sel}: {t!r}")
                    break
            except Exception:
                pass

        (AUTH_DIR / "v2-result.json").write_text(json.dumps({"toast": toast_text, "url": page.url}))
        print(f"[v2] DONE toast={toast_text!r}")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
