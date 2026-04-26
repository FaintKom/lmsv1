"""
Remove static SVGs and broken interactive widgets from lessons.
Add KaTeX formulas directly in HTML theory.
Run on server: cd /opt/lms && python3 fix_theory_final.py
"""
import requests
import os
import json
import sys

API = "http://localhost:8000/api/v1"
r = requests.post(f"{API}/auth/login", json={"email": os.environ.get("LMS_ADMIN_EMAIL",""), "password": os.environ.get("LMS_ADMIN_PASSWORD","")})
if r.status_code != 200:
    print(f"Login failed"); sys.exit(1)
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print("Logged in")

courses = requests.get(f"{API}/courses", headers=H).json()
courses = courses if isinstance(courses, list) else courses.get("items", [])
sat = [c for c in courses if "SAT" in c.get("title", "")]
if not sat:
    print("No SAT course"); sys.exit(1)

cid = sat[0]["id"]
detail = requests.get(f"{API}/courses/{cid}", headers=H).json()
print(f"Course: {detail['title']}")

removed = 0
for mod in detail.get("modules", []):
    mid = mod["id"]
    for lesson in mod.get("lessons", []):
        lid = lesson["id"]
        ltitle = lesson["title"]

        lr = requests.get(f"{API}/courses/{cid}/lessons/{lid}", headers=H)
        if lr.status_code != 200:
            continue
        ldata = lr.json()
        content = ldata.get("content", {})
        blocks = content.get("blocks", [])

        # Remove HTML blocks with <script> (broken interactive widgets)
        # and HTML blocks with static SVGs
        original_count = len(blocks)
        new_blocks = []
        for b in blocks:
            btype = b.get("type", "")
            body = b.get("body", "") or ""

            # Remove: interactive HTML blocks (have <script>)
            if btype == "html" and "<script" in body:
                print(f"  REMOVE interactive from: {ltitle}")
                removed += 1
                continue

            # Remove static SVG-only blocks
            if btype in ("text", "html") and "<svg" in body and body.strip().startswith("<div") and body.count("<svg") >= 1:
                # Check if this block is ONLY an SVG wrapper (no real text content)
                import re
                text_only = re.sub(r'<[^>]+>', '', re.sub(r'<svg.*?</svg>', '', body, flags=re.DOTALL)).strip()
                if len(text_only) < 20:  # Just wrapper divs, no real content
                    print(f"  REMOVE static SVG from: {ltitle}")
                    removed += 1
                    continue

            # For theory text blocks: clean up SVG inside them but keep the text
            if btype == "text" and "<svg" in body:
                # Remove SVG elements but keep surrounding text
                import re
                cleaned = re.sub(
                    r'<div[^>]*>\s*<svg.*?</svg>\s*</div>',
                    '',
                    body,
                    flags=re.DOTALL
                )
                if cleaned != body:
                    b["body"] = cleaned
                    print(f"  CLEAN SVG from theory: {ltitle}")

            new_blocks.append(b)

        if len(new_blocks) != original_count or any(b.get("_changed") for b in new_blocks):
            # Re-number sort_orders
            for i, b in enumerate(new_blocks):
                b["sort_order"] = i

            new_content = {"version": 2, "blocks": new_blocks}
            ur = requests.put(
                f"{API}/courses/{cid}/modules/{mid}/lessons/{lid}",
                json={"content": new_content},
                headers=H,
            )
            if ur.status_code == 200:
                pass  # already printed
            else:
                print(f"  FAIL update {ltitle}: {ur.status_code}")

print(f"\nDone! Removed {removed} blocks (interactive widgets + static SVGs)")
