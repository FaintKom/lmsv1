"""Upload 3 PRO courses to Hetzner server with theory + exercises."""
import requests
import json
import os
import sys

os.environ["PYTHONIOENCODING"] = "utf-8"

API = "https://204-168-165-41.nip.io/api/v1"

# Login
r = requests.post(f"{API}/auth/login", json={"email": "faintkom@gmail.com", "password": "REDACTED_PASSWORD"})
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print("Logged in")

def create_course(title, desc, cat):
    r = requests.post(f"{API}/courses", json={"title": title, "description": desc, "category": cat}, headers=H)
    cid = r.json()["id"]
    print(f"\nCourse: {title} ({cid[:8]})")
    return cid

def create_module(cid, title, sort):
    r = requests.post(f"{API}/courses/{cid}/modules", json={"title": title, "sort_order": sort}, headers=H)
    return r.json()["id"]

def create_lesson(cid, mid, title, content_type, sort, content=None, duration=5):
    body = {"title": title, "content_type": content_type, "sort_order": sort, "duration_minutes": duration}
    if content:
        body["content"] = content
    r = requests.post(f"{API}/courses/{cid}/modules/{mid}/lessons", json=body, headers=H)
    return r.json()["id"]

def create_exercise(lid, ex_type, title, config):
    r = requests.post(f"{API}/exercises", json={
        "lesson_id": lid, "exercise_type": ex_type, "title": title, "config": config,
    }, headers=H)
    did = r.json().get("display_id", "?")
    print(f"    {did} - {title}")
    return r.json().get("id")

def add_test_case(eid, input_data, expected, hidden=False):
    requests.post(f"{API}/exercises/{eid}/test-cases", json={
        "input": input_data, "expected_output": expected, "is_hidden": hidden,
    }, headers=H)

def publish(cid):
    requests.post(f"{API}/courses/{cid}/publish", headers=H)
    print("  Published!")

def enroll_students(cid):
    for email, pwd in [("student@learnhub.app", "Student2026!"), ("alex@learnhub.app", "Alex2026!")]:
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": pwd})
        if r.status_code == 200:
            sh = {"Authorization": f"Bearer {r.json()['access_token']}", "Content-Type": "application/json"}
            requests.post(f"{API}/progress/enroll", json={"course_id": cid}, headers=sh)

# ═══════════════════════════════════════════════════════════════
# COURSE 1: Python Programming PRO
# ═══════════════════════════════════════════════════════════════
print("=" * 60)
print("PYTHON PROGRAMMING PRO")
print("=" * 60)

with open("scripts/python_pro_course_html.json", encoding="utf-8") as f:
    py_data = json.load(f)

cid = create_course(
    "Python Programming PRO",
    "Complete Python course: from print() to OOP. 10 modules with theory, examples, and coding challenges.",
    "Programming"
)

modules = py_data.get("modules", [])
for mi, mod in enumerate(modules):
    mid = create_module(cid, mod["title"], mi)
    print(f"  Module {mi+1}: {mod['title']}")

    for li, lesson in enumerate(mod.get("lessons", [])):
        # Create theory lesson
        content_body = lesson.get("content", {}).get("body", "")
        if not content_body:
            content_body = lesson.get("theory", "")

        content_format = lesson.get("content", {}).get("format", "markdown") if isinstance(lesson.get("content"), dict) else "markdown"
        if content_body and ("<div" in content_body or "<h2" in content_body):
            content_format = "html"
        content = {"body": content_body, "format": content_format} if content_body else None

        lid = create_lesson(cid, mid, lesson["title"], "code_challenge", li, content)

        # Create exercise
        ex = lesson.get("exercise", {})
        if ex:
            ex_type = ex.get("exercise_type", "code_challenge")
            config = ex.get("config", {})
            if not config:
                config = {
                    "language": "python",
                    "starter_code": ex.get("starter_code", "# Write your code here\n"),
                    "solution_code": ex.get("solution_code", ""),
                }

            eid = create_exercise(lid, ex_type, ex.get("title", lesson["title"]), config)

            # Add test cases
            if eid:
                for tc in ex.get("test_cases", []):
                    add_test_case(
                        eid,
                        tc.get("input", ""),
                        tc.get("expected_output", ""),
                        tc.get("is_hidden", False)
                    )

publish(cid)
enroll_students(cid)

# ═══════════════════════════════════════════════════════════════
# COURSE 2: SAT Math PRO
# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("SAT MATH PRO")
print("=" * 60)

with open("sat_math_pro_course_html.json", encoding="utf-8") as f:
    sat_data = json.load(f)

course_info = sat_data.get("course", sat_data)
sat_modules = course_info.get("modules", [])

cid = create_course(
    "SAT Math PRO",
    "Complete SAT Math preparation. 8 modules covering all 4 SAT domains with theory, formulas, and practice.",
    "SAT Prep"
)

for mi, mod in enumerate(sat_modules):
    mid = create_module(cid, mod["title"], mi)
    print(f"  Module {mi+1}: {mod['title']}")

    for li, lesson in enumerate(mod.get("lessons", [])):
        theory = lesson.get("theory", "")
        fmt = "html" if theory and ("<div" in theory or "<h2" in theory) else "markdown"
        content = {"body": theory, "format": fmt} if theory else None

        lid = create_lesson(cid, mid, lesson["title"], "math_interactive", li, content)

        # Create math exercise
        ex_type = lesson.get("exercise_type", "multiple_choice_math")
        ex_config = lesson.get("exercise_config", {})

        create_exercise(lid, "math_interactive", lesson["title"], {
            "template_type": ex_type,
            "instructions": "",
            "template_config": ex_config,
        })

publish(cid)
enroll_students(cid)

# ═══════════════════════════════════════════════════════════════
# COURSE 3: Visual Programming with Robot PRO
# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("VISUAL PROGRAMMING WITH ROBOT PRO")
print("=" * 60)

with open("docs/course-robot-pro-html.json", encoding="utf-8") as f:
    robot_data = json.load(f)

robot_modules = robot_data if isinstance(robot_data, list) else robot_data.get("modules", [])

cid = create_course(
    "Visual Programming with Robot PRO",
    "Learn programming through a grid-based robot. 8 modules from sequences to Python. 30 interactive levels.",
    "Programming"
)

for mi, mod in enumerate(robot_modules):
    mid = create_module(cid, mod["title"], mi)
    print(f"  Module {mi+1}: {mod['title']}")

    levels = mod.get("levels", mod.get("lessons", []))
    for li, level in enumerate(levels):
        theory = level.get("theory", "")
        fmt = "html" if theory and ("<div" in theory or "<h2" in theory) else "markdown"
        content = {"body": theory, "format": fmt} if theory else None

        lid = create_lesson(cid, mid, level["title"], "robot_2d", li, content, duration=5)

        # Create robot exercise
        config = level.get("config", {})
        if config:
            create_exercise(lid, "robot_2d", level["title"], config)

publish(cid)
enroll_students(cid)

print("\n" + "=" * 60)
print("ALL 3 PRO COURSES CREATED!")
print("=" * 60)
