"""Emberhorn Hunt — take the 4 deterministic screenshots via Camoufox.

Reads shots.json, loads each ?shot= URL from the local server, waits for
window.__shotReady, captures console/page errors, and saves a JPEG.
Run with:  TMPDIR=$HOME/tmp python3 shoot.py
"""
import json
import os
import time

from playwright.sync_api import sync_playwright

BIN = os.path.expanduser("~/.cache/camoufox/browsers/official/158.0.1-beta.41-3f2eb1d0/camoufox")
HERE = os.path.expanduser("~/workspace/makefun/best-game-01")
PORT = 8080

shots = json.load(open(os.path.join(HERE, "shots.json")))

with sync_playwright() as p:
    ctx = p.firefox.launch(
        executable_path=BIN,
        headless=True,
        args=["--no-remote"],
    )
    try:
        page = ctx.new_page(viewport={"width": 1280, "height": 720})
        errors = []

        def on_console(msg):
            if msg.type in ("error", "warning"):
                errors.append(f"console.{msg.type}: {msg.text}")

        def on_pageerror(err):
            errors.append(f"pageerror: {err}")

        page.on("console", on_console)
        page.on("pageerror", on_pageerror)

        for shot in shots:
            url = f"http://localhost:{PORT}/{shot['query']}"
            print(f"== {shot['name']} <- {url}", flush=True)
            page.goto(url, wait_until="load", timeout=30000)
            # NOTE: in this Camoufox build, window expandos set by page JS are
            # not visible to Playwright evaluate (fingerprint realm split), so
            # do not wait on window.__shotReady — the shot scene draws
            # synchronously during page load; a fixed settle delay suffices.
            time.sleep(3)
            out = os.path.join(HERE, "screenshots", shot["name"])
            page.screenshot(path=out, type="jpeg", quality=80)
            size = os.path.getsize(out)
            print(f"  saved {out} ({size} bytes)", flush=True)
        print("ERRORS:" if errors else "NO CONSOLE/PAGE ERRORS")
        for e in errors:
            print("  " + e, flush=True)
    finally:
        ctx.close()
print("done")
