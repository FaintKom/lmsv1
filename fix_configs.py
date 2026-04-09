"""Fix broken exercise configs: targets -> target_points for coordinate_plane."""
import requests
import os
import json
import sys

API = "http://localhost:8000/api/v1"

r = requests.post(f"{API}/auth/login", json={"email": os.environ.get("LMS_ADMIN_EMAIL",""), "password": os.environ.get("LMS_ADMIN_PASSWORD","")})
if r.status_code != 200:
    print(f"Login failed: {r.status_code}")
    sys.exit(1)
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Get all exercises
all_ex = requests.get(f"{API}/exercises?exercise_type=math_interactive&per_page=200", headers=H).json()
items = all_ex.get("items", [])
print(f"Total exercises: {len(items)}")

fixed = 0
for e in items:
    eid = e["id"]
    cfg = e.get("config", {})
    tt = cfg.get("template_type")
    tc = cfg.get("template_config", {})

    needs_fix = False

    # Fix 1: coordinate_plane uses "targets" instead of "target_points"
    if tt == "coordinate_plane" and "targets" in tc and "target_points" not in tc:
        tc["target_points"] = tc.pop("targets")
        needs_fix = True

    # Fix 2: graph_transform uses "parent" instead of "parent_function"
    if tt == "graph_transform" and "parent" in tc and "parent_function" not in tc:
        tc["parent_function"] = tc.pop("parent")
        needs_fix = True

    # Fix 3: equation_solver needs steps array with ids
    if tt == "equation_solver" and "steps" in tc:
        for step in tc["steps"]:
            if "id" not in step:
                step["id"] = f"s{tc['steps'].index(step)+1}"
                needs_fix = True

    if needs_fix:
        cfg["template_config"] = tc
        r = requests.put(f"{API}/exercises/{eid}", json={"config": cfg}, headers=H)
        if r.status_code == 200:
            print(f"  FIXED: {e['title']} [{tt}]")
            fixed += 1
        else:
            print(f"  FAIL: {e['title']} - {r.status_code} {r.text[:100]}")

print(f"\nFixed {fixed} exercises")
