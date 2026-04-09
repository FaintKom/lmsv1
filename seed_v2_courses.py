"""Recreate all courses in v2 block format on Hetzner server."""
import requests
import json
import os
import sys
import uuid

os.environ["PYTHONIOENCODING"] = "utf-8"

API = "https://204-168-165-41.nip.io/api/v1"

# Login as super admin
r = requests.post(f"{API}/auth/login", json={"email": os.environ.get("LMS_ADMIN_EMAIL",""), "password": os.environ.get("LMS_ADMIN_PASSWORD","")})
if r.status_code != 200:
    print(f"Login failed: {r.status_code} {r.text}")
    sys.exit(1)
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print("Logged in as super admin")


def create_course(title, desc, cat):
    r = requests.post(f"{API}/courses", json={"title": title, "description": desc, "category": cat}, headers=H)
    if r.status_code != 200:
        print(f"  ERROR creating course: {r.status_code} {r.text[:200]}")
        return None
    cid = r.json()["id"]
    print(f"\nCourse: {title} ({cid[:8]})")
    return cid


def create_module(cid, title, sort):
    r = requests.post(f"{API}/courses/{cid}/modules", json={"title": title, "sort_order": sort}, headers=H)
    if r.status_code != 200:
        print(f"  ERROR creating module: {r.status_code} {r.text[:200]}")
        return None
    return r.json()["id"]


def create_lesson_v2(cid, mid, title, sort, theory_body="", theory_format="html", duration=5):
    """Create lesson with v2 block content. Returns lesson_id."""
    blocks = []
    if theory_body and theory_body.strip():
        blocks.append({
            "id": f"b{uuid.uuid4().hex[:6]}",
            "type": "text",
            "sort_order": 0,
            "page": 1,
            "body": theory_body,
            "format": theory_format,
        })

    content = {"version": 2, "blocks": blocks}
    body = {
        "title": title,
        "content_type": "text",  # All v2 lessons use "text" as base type
        "sort_order": sort,
        "duration_minutes": duration,
        "content": content,
    }
    r = requests.post(f"{API}/courses/{cid}/modules/{mid}/lessons", json=body, headers=H)
    if r.status_code != 200:
        print(f"  ERROR creating lesson '{title}': {r.status_code} {r.text[:200]}")
        return None
    return r.json()["id"]


def add_exercise_block(cid, mid, lid, exercise_id):
    """Add an exercise block to an existing lesson's v2 content."""
    # Get current lesson content
    r = requests.get(f"{API}/courses/{cid}/lessons/{lid}", headers=H)
    if r.status_code != 200:
        return
    lesson = r.json()
    content = lesson.get("content", {})
    blocks = content.get("blocks", [])

    # Filter out any existing exercise blocks (from normalization) to avoid duplicates
    non_exercise_blocks = [b for b in blocks if b["type"] != "exercise"]

    # Add exercise block
    non_exercise_blocks.append({
        "id": f"b{uuid.uuid4().hex[:6]}",
        "type": "exercise",
        "sort_order": len(non_exercise_blocks),
        "page": 1,
        "exercise_id": exercise_id,
    })

    # Update lesson content
    new_content = {"version": 2, "blocks": non_exercise_blocks}
    requests.put(
        f"{API}/courses/{cid}/modules/{mid}/lessons/{lid}",
        json={"content": new_content},
        headers=H,
    )


def create_exercise(lid, ex_type, title, config):
    r = requests.post(f"{API}/exercises", json={
        "lesson_id": lid, "exercise_type": ex_type, "title": title, "config": config,
    }, headers=H)
    if r.status_code != 200:
        print(f"    ERROR exercise '{title}': {r.status_code} {r.text[:200]}")
        return None
    did = r.json().get("display_id", "?")
    print(f"    {did} - {title}")
    return r.json().get("id")


def add_test_case(eid, input_data, expected, hidden=False):
    if not eid:
        return
    requests.post(f"{API}/exercises/{eid}/test-cases", json={
        "input": input_data, "expected_output": expected, "is_hidden": hidden,
    }, headers=H)


def publish(cid):
    if not cid:
        return
    requests.post(f"{API}/courses/{cid}/publish", headers=H)
    print("  Published!")


def enroll_students(cid):
    if not cid:
        return
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

with open("scripts/python_pro_course_html_fixed.json", encoding="utf-8") as f:
    py_data = json.load(f)

cid = create_course(
    "Python Programming PRO",
    "Complete Python course: from print() to OOP. 10 modules with theory, examples, and coding challenges.",
    "Programming"
)

if cid:
    modules = py_data.get("modules", [])
    for mi, mod in enumerate(modules):
        mid = create_module(cid, mod["title"], mi)
        if not mid:
            continue
        print(f"  Module {mi+1}: {mod['title']}")

        for li, lesson in enumerate(mod.get("lessons", [])):
            # Get theory content
            content_body = lesson.get("content", {}).get("body", "") if isinstance(lesson.get("content"), dict) else ""
            if not content_body:
                content_body = lesson.get("theory", "")

            content_format = "html" if content_body and ("<div" in content_body or "<h2" in content_body) else "markdown"

            lid = create_lesson_v2(cid, mid, lesson["title"], li, content_body, content_format)
            if not lid:
                continue

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
                if eid:
                    add_exercise_block(cid, mid, lid, eid)
                    for tc in ex.get("test_cases", []):
                        add_test_case(eid, tc.get("input", ""), tc.get("expected_output", ""), tc.get("is_hidden", False))

    publish(cid)
    enroll_students(cid)


# ═══════════════════════════════════════════════════════════════
# COURSE 2: SAT Math PRO
# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("SAT MATH PRO")
print("=" * 60)

with open("sat_math_pro_course_html_fixed.json", encoding="utf-8") as f:
    sat_data = json.load(f)

course_info = sat_data.get("course", sat_data)
sat_modules = course_info.get("modules", [])

cid = create_course(
    "SAT Math PRO",
    "Complete SAT Math preparation. 8 modules covering all 4 SAT domains with theory, formulas, and practice.",
    "SAT Prep"
)

if cid:
    for mi, mod in enumerate(sat_modules):
        mid = create_module(cid, mod["title"], mi)
        if not mid:
            continue
        print(f"  Module {mi+1}: {mod['title']}")

        for li, lesson in enumerate(mod.get("lessons", [])):
            theory = lesson.get("theory", "")
            fmt = "html" if theory and ("<div" in theory or "<h2" in theory) else "markdown"

            lid = create_lesson_v2(cid, mid, lesson["title"], li, theory, fmt)
            if not lid:
                continue

            # Create math exercise
            ex_type = lesson.get("exercise_type", "multiple_choice_math")
            ex_config = lesson.get("exercise_config", {})
            eid = create_exercise(lid, "math_interactive", lesson["title"], {
                "template_type": ex_type,
                "instructions": "",
                "template_config": ex_config,
            })
            if eid:
                add_exercise_block(cid, mid, lid, eid)

    publish(cid)
    enroll_students(cid)


# ═══════════════════════════════════════════════════════════════
# COURSE 3: Visual Programming with Robot PRO
# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("VISUAL PROGRAMMING WITH ROBOT PRO")
print("=" * 60)

with open("docs/course-robot-pro-html_fixed.json", encoding="utf-8") as f:
    robot_data = json.load(f)

robot_modules = robot_data if isinstance(robot_data, list) else robot_data.get("modules", [])

cid = create_course(
    "Visual Programming with Robot PRO",
    "Learn programming through a grid-based robot. 8 modules from sequences to Python. 30 interactive levels.",
    "Programming"
)

if cid:
    for mi, mod in enumerate(robot_modules):
        mid = create_module(cid, mod["title"], mi)
        if not mid:
            continue
        print(f"  Module {mi+1}: {mod['title']}")

        levels = mod.get("levels", mod.get("lessons", []))
        for li, level in enumerate(levels):
            theory = level.get("theory", "")
            fmt = "html" if theory and ("<div" in theory or "<h2" in theory) else "markdown"

            lid = create_lesson_v2(cid, mid, level["title"], li, theory, fmt, duration=5)
            if not lid:
                continue

            config = level.get("config", {})
            if config:
                eid = create_exercise(lid, "robot_2d", level["title"], config)
                if eid:
                    add_exercise_block(cid, mid, lid, eid)

    publish(cid)
    enroll_students(cid)


# ═══════════════════════════════════════════════════════════════
# COURSE 4 & 5: Algebra + Interactive Math (from seed_demo_course)
# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("ALGEBRA FUNDAMENTALS & INTERACTIVE MATH")
print("=" * 60)

# Import from seed_demo_course data
# These were simpler courses — recreate with basic structure

# Algebra Fundamentals
cid = create_course(
    "Algebra Fundamentals",
    "Core algebra skills: equations, functions, and graphing. Perfect for grades 8-10.",
    "Mathematics"
)

if cid:
    # Module 1: Linear Equations
    mid = create_module(cid, "Linear Equations", 0)
    if mid:
        print(f"  Module 1: Linear Equations")
        for li, (title, template) in enumerate([
            ("Solving One-Step Equations", "equation_balance"),
            ("Solving Two-Step Equations", "equation_balance"),
            ("Variables on Both Sides", "equation_balance"),
        ]):
            lid = create_lesson_v2(cid, mid, title, li,
                f"<h2>{title}</h2><p>In this lesson you will learn how to solve {title.lower()}. Practice with the interactive exercise below.</p>",
                "html")
            if lid:
                eid = create_exercise(lid, "math_interactive", title, {
                    "template_type": template,
                    "instructions": f"Solve the equation step by step.",
                    "template_config": {},
                })
                if eid:
                    add_exercise_block(cid, mid, lid, eid)

    # Module 2: Functions
    mid = create_module(cid, "Functions & Graphing", 1)
    if mid:
        print(f"  Module 2: Functions & Graphing")
        for li, (title, template) in enumerate([
            ("Introduction to Functions", "coordinate_plane"),
            ("Graphing Linear Functions", "function_graphing"),
        ]):
            lid = create_lesson_v2(cid, mid, title, li,
                f"<h2>{title}</h2><p>Learn about {title.lower()} through interactive visualizations.</p>",
                "html")
            if lid:
                eid = create_exercise(lid, "math_interactive", title, {
                    "template_type": template,
                    "instructions": f"Complete the {title.lower()} exercise.",
                    "template_config": {},
                })
                if eid:
                    add_exercise_block(cid, mid, lid, eid)

    publish(cid)
    enroll_students(cid)

# Interactive Math Activities
cid = create_course(
    "Interactive Math Activities",
    "Explore all 16 interactive math exercise types with hands-on practice.",
    "Math"
)

if cid:
    math_types = [
        ("Arithmetic & Numbers", [
            ("Arithmetic Puzzles", "arithmetic_puzzle"),
            ("Number Line", "number_line"),
            ("Visual Fractions", "visual_fractions"),
        ]),
        ("Algebra & Equations", [
            ("Equation Balance", "equation_balance"),
            ("Card Sorting", "card_sorting"),
            ("Table Patterns", "table_pattern"),
        ]),
        ("Graphing & Coordinates", [
            ("Coordinate Plane", "coordinate_plane"),
            ("Function Graphing", "function_graphing"),
            ("Graph Transformations", "graph_transformation"),
            ("Inequality Graphing", "inequality_graphing"),
        ]),
        ("Data & Statistics", [
            ("Scatter Plot", "scatter_plot"),
            ("Two-Way Tables", "two_way_table"),
            ("Venn Diagrams", "venn_diagram"),
            ("Multiple Choice Math", "multiple_choice_math"),
            ("Numeric Input", "numeric_input"),
        ]),
    ]

    for mi, (mod_title, exercises) in enumerate(math_types):
        mid = create_module(cid, mod_title, mi)
        if not mid:
            continue
        print(f"  Module {mi+1}: {mod_title}")

        for li, (title, template) in enumerate(exercises):
            lid = create_lesson_v2(cid, mid, title, li,
                f"<h2>{title}</h2><p>Practice {title.lower()} with this interactive exercise.</p>",
                "html")
            if lid:
                eid = create_exercise(lid, "math_interactive", title, {
                    "template_type": template,
                    "instructions": f"Complete the {title.lower()} activity.",
                    "template_config": {},
                })
                if eid:
                    add_exercise_block(cid, mid, lid, eid)

                # Add a second exercise variant
                eid2 = create_exercise(lid, "math_interactive", f"{title} (Practice)", {
                    "template_type": template,
                    "instructions": f"Try another {title.lower()} problem.",
                    "template_config": {},
                })
                if eid2:
                    add_exercise_block(cid, mid, lid, eid2)

    publish(cid)
    enroll_students(cid)


print("\n" + "=" * 60)
print("ALL 5 COURSES RECREATED IN V2 FORMAT!")
print("=" * 60)
