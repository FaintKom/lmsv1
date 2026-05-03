"""SAT Math Course V4 - Full course with rich theory + all 16 template types."""
import os, sys
os.environ["PYTHONIOENCODING"] = "utf-8"

# Make helpers available globally for module functions
import requests, uuid

API = "https://grasslms.online/api/v1"

r = requests.post(f"{API}/auth/login", json={"email": os.environ.get("LMS_ADMIN_EMAIL",""), "password": os.environ.get("LMS_ADMIN_PASSWORD","")}, verify=False)
if r.status_code != 200:
    print(f"Login failed: {r.status_code} {r.text[:200]}")
    sys.exit(1)
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print("Logged in as super admin")

def create_course(title, desc, cat):
    r = requests.post(f"{API}/courses", json={"title": title, "description": desc, "category": cat}, headers=H, verify=False)
    if r.status_code != 200:
        print(f"  ERROR creating course: {r.status_code} {r.text[:200]}")
        return None
    cid = r.json()["id"]
    print(f"\nCourse: {title} ({cid[:8]})")
    return cid

def create_module(cid, title, sort):
    r = requests.post(f"{API}/courses/{cid}/modules", json={"title": title, "sort_order": sort}, headers=H, verify=False)
    if r.status_code != 200:
        print(f"  ERROR creating module: {r.status_code} {r.text[:200]}")
        return None
    return r.json()["id"]

def create_lesson_v2(cid, mid, title, sort, theory_body="", theory_format="html", duration=10):
    blocks = []
    if theory_body and theory_body.strip():
        blocks.append({"id": f"b{uuid.uuid4().hex[:6]}", "type": "text", "sort_order": 0, "page": 1, "body": theory_body, "format": theory_format})
    content = {"version": 2, "blocks": blocks}
    body = {"title": title, "content_type": "text", "sort_order": sort, "duration_minutes": duration, "content": content}
    r = requests.post(f"{API}/courses/{cid}/modules/{mid}/lessons", json=body, headers=H, verify=False)
    if r.status_code != 200:
        print(f"  ERROR lesson '{title}': {r.status_code} {r.text[:200]}")
        return None
    return r.json()["id"]

def add_exercise_block(cid, mid, lid, exercise_id):
    r = requests.get(f"{API}/courses/{cid}/lessons/{lid}", headers=H, verify=False)
    if r.status_code != 200: return
    lesson = r.json()
    content = lesson.get("content", {})
    blocks = content.get("blocks", [])
    blocks.append({"id": f"b{uuid.uuid4().hex[:6]}", "type": "exercise", "sort_order": len(blocks), "page": 1, "exercise_id": exercise_id})
    requests.put(f"{API}/courses/{cid}/modules/{mid}/lessons/{lid}", json={"content": {"version": 2, "blocks": blocks}}, headers=H, verify=False)

def create_exercise(lid, title, template_type, template_config, instructions=""):
    config = {"template_type": template_type, "instructions": instructions, "template_config": template_config}
    r = requests.post(f"{API}/exercises", json={"lesson_id": lid, "exercise_type": "math_interactive", "title": title, "config": config, "max_attempts": 100}, headers=H, verify=False)
    if r.status_code != 200:
        print(f"    ERROR exercise '{title}': {r.status_code} {r.text[:200]}")
        return None
    did = r.json().get("display_id", "?")
    print(f"    {did} - {title}")
    return r.json().get("id")

def publish(cid):
    if not cid: return
    requests.post(f"{API}/courses/{cid}/publish", headers=H, verify=False)
    print("  Published!")

def enroll_students(cid):
    if not cid: return
    for email, pwd in [("student@grasslms.online", "Student2026!"), ("alex@grasslms.online", "Alex2026!")]:
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": pwd}, verify=False)
        if r.status_code == 200:
            sh = {"Authorization": f"Bearer {r.json()['access_token']}", "Content-Type": "application/json"}
            requests.post(f"{API}/progress/enroll", json={"course_id": cid}, headers=sh, verify=False)

def add_lesson_with_exercises(cid, mid, sort, title, theory, exercises):
    lid = create_lesson_v2(cid, mid, title, sort, theory, "html")
    if not lid: return
    for ex in exercises:
        eid = create_exercise(lid, ex["title"], ex["type"], ex["config"], ex.get("instructions", ""))
        if eid:
            add_exercise_block(cid, mid, lid, eid)

# Import modules
from module1_heart_of_algebra import create_module_1
from seed_sat_math_v3_modules234 import create_module_2, create_module_3, create_module_4

# Inject helpers into module scopes
import module1_heart_of_algebra as _m1
import seed_sat_math_v3_modules234 as _m234
for _mod in [_m1, _m234]:
    _mod.create_module = create_module
    _mod.add_lesson_with_exercises = add_lesson_with_exercises

# ═══════════════════════════════════════════════════════════════
# DELETE ALL EXISTING COURSES
# ═══════════════════════════════════════════════════════════════
print("=" * 60)
print("DELETING ALL EXISTING COURSES...")
print("=" * 60)

r = requests.get(f"{API}/courses", headers=H, verify=False)
if r.status_code == 200:
    courses = r.json() if isinstance(r.json(), list) else r.json().get("items", [])
    for c in courses:
        cid_del = c.get("id")
        if cid_del:
            requests.delete(f"{API}/courses/{cid_del}", headers=H, verify=False)
            print(f"  Deleted: {c.get('title', '?')}")
print("All courses deleted.\n")

# ═══════════════════════════════════════════════════════════════
# CREATE SAT MATH COURSE
# ═══════════════════════════════════════════════════════════════
print("=" * 60)
print("CREATING SAT MATH V4 COURSE")
print("=" * 60)

cid = create_course("SAT Math", "Complete SAT Math preparation with interactive exercises, KaTeX-rendered formulas, JSXGraph visualizations, and step-by-step problem solving across all 4 SAT domains.", "SAT Prep")
if not cid:
    print("FATAL: Could not create course")
    sys.exit(1)

create_module_1(cid)
create_module_2(cid)
create_module_3(cid)
create_module_4(cid)

publish(cid)
enroll_students(cid)

print("\n" + "=" * 60)
print("SAT MATH V5 COURSE CREATED!")
print("  4 modules, 22 lessons, ~83 exercises")
print("  All 16 interactive template types")
print("  KaTeX formulas + 20 JSXGraph/JS interactive widgets")
print("=" * 60)
