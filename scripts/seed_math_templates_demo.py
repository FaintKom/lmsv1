"""Populate (or create) "Exercise Types Demo" course with one example
math_interactive exercise per template type, so the methodist / new user
opening the demo course can immediately see every template rendered with
a real puzzle.

Usage:
    LMS_ADMIN_EMAIL=... LMS_ADMIN_PASSWORD=... \
        BASE_URL=https://grasslms.online/api/v1 \
        python scripts/seed_math_templates_demo.py

Defaults BASE_URL to https://grasslms.online/api/v1 if unset.

Run as super_admin or admin. Idempotent: if the course or module already
exists, the script reuses them; if a lesson for a given template type
already has a math_interactive exercise, the script updates its config
to the sample defined here instead of creating a duplicate.
"""

from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("BASE_URL", "https://grasslms.online/api/v1").rstrip("/")
EMAIL = os.environ.get("LMS_ADMIN_EMAIL", "")
PASSWORD = os.environ.get("LMS_ADMIN_PASSWORD", "")

CTX = ssl.create_default_context()


def api(method: str, path: str, token: str | None = None, data: dict | None = None) -> dict | list:
    url = BASE + path
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        resp = urllib.request.urlopen(req, context=CTX, timeout=30)
        text = resp.read().decode()
        return json.loads(text) if text else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"ERROR {e.code} on {method} {path}: {err_body[:400]}", file=sys.stderr)
        raise


# ─── Sample configs per template ───────────────────────────────────────
#
# Each entry shapes the inner `template_config` carried inside
# config.template_config (see math-editor.tsx). The outer
# config.template_type plus config.instructions is set separately.

TEMPLATES: list[tuple[str, str, str, dict]] = [
    (
        "coordinate_plane",
        "Plot points on the coordinate plane",
        "Drag each point to its target coordinates.",
        {
            "target_points": [
                {"x": 3, "y": 2, "label": "A"},
                {"x": -2, "y": 4, "label": "B"},
                {"x": -1, "y": -3, "label": "C"},
            ],
            "grid_range": 6,
            "tolerance": 0.5,
        },
    ),
    (
        "number_line",
        "Mark numbers on the number line",
        "Drag each marker to its correct position on the number line.",
        {"targets": [3, 7, -2], "tick_interval": 1, "tolerance": 0.3, "range": [-5, 10]},
    ),
    (
        "visual_fractions",
        "Select the fraction 3/8",
        "Click on parts of the shape until you have shaded 3 out of 8 equal pieces.",
        {"target_numerator": 3, "target_denominator": 8, "display_type": "pie"},
    ),
    (
        "equation_balance",
        "Balance the equation",
        "Drag terms onto the scale until both sides balance.",
        {
            "left_fixed": [5],
            "right_fixed": [2],
            "available_terms": [
                {"value": 1, "label": "1"},
                {"value": 2, "label": "2"},
                {"value": 3, "label": "3"},
            ],
        },
    ),
    (
        "arithmetic_puzzle",
        "Fill in the missing number",
        "Compute the missing operand so the arithmetic statement is true.",
        {
            "rows": [
                {"operands": [7, None], "operator": "+", "result": 12},
                {"operands": [15, 3], "operator": "-", "result": None},
                {"operands": [None, 4], "operator": "*", "result": 24},
            ]
        },
    ),
    (
        "function_graph",
        "Match the quadratic curve",
        "Adjust the coefficients until the blue curve matches the target.",
        {
            "function_type": "quadratic",
            "target_params": {"a": 1, "b": -2, "c": -3},
            "grid_range": 6,
            "tolerance": 0.3,
        },
    ),
    (
        "equation_solver",
        "Solve 2x + 4 = 10",
        "Choose the right operation at each step until x is isolated.",
        {
            "equation_config": {
                "equation": "2x + 4 = 10",
                "steps": [
                    {"operation": "subtract", "operand": 4, "result": "2x = 6"},
                    {"operation": "divide", "operand": 2, "result": "x = 3"},
                ],
                "final_answer": 3,
            }
        },
    ),
    (
        "multiple_choice_math",
        "Pythagorean theorem",
        "Choose the correct value of the hypotenuse.",
        {
            "question": "In a right triangle with legs 3 and 4, what is the length of the hypotenuse?",
            "choices": [
                {"id": "a", "text": "5", "is_correct": True},
                {"id": "b", "text": "7", "is_correct": False},
                {"id": "c", "text": "12", "is_correct": False},
                {"id": "d", "text": "25", "is_correct": False},
            ],
            "explanation": "By the Pythagorean theorem, c² = a² + b² = 9 + 16 = 25, so c = 5.",
        },
    ),
    (
        "numeric_input",
        "Enter the result of 47 × 23",
        "Compute the product and enter the result.",
        {"correct_answer": 1081, "tolerance": 0, "format": "integer"},
    ),
    (
        "scatter_plot",
        "Estimate the line of best fit",
        "Drag the line so it minimises the distance to all points.",
        {
            "points": [
                {"x": 1, "y": 2},
                {"x": 2, "y": 3.5},
                {"x": 3, "y": 5},
                {"x": 4, "y": 6.2},
                {"x": 5, "y": 7.8},
                {"x": 6, "y": 9},
            ],
            "x_label": "Hours studied",
            "y_label": "Score",
            "x_range": [0, 7],
            "y_range": [0, 10],
            "target_slope": 1.4,
            "target_intercept": 0.6,
            "tolerance": 0.5,
        },
    ),
    (
        "two_way_table",
        "Fill in the missing values",
        "Use row + column totals to find the missing cells.",
        {
            "row_headers": ["Boys", "Girls", "Total"],
            "col_headers": ["Soccer", "Basketball", "Total"],
            "cells": [
                [12, None, 20],
                [None, 11, 18],
                [19, None, 38],
            ],
            "answers": {"0_1": 8, "1_0": 7, "2_1": 19},
        },
    ),
    (
        "card_sort",
        "Sort the expressions",
        "Drag each card into the correct category.",
        {
            "categories": [
                {"id": "linear", "label": "Linear"},
                {"id": "quadratic", "label": "Quadratic"},
                {"id": "cubic", "label": "Cubic"},
            ],
            "cards": [
                {"id": "c1", "text": "2x + 3", "category": "linear"},
                {"id": "c2", "text": "x² - 4", "category": "quadratic"},
                {"id": "c3", "text": "x³ + 1", "category": "cubic"},
                {"id": "c4", "text": "5 - x", "category": "linear"},
                {"id": "c5", "text": "3x² + x", "category": "quadratic"},
            ],
        },
    ),
    (
        "table_pattern",
        "Complete the function table",
        "Find the missing y values and state the rule.",
        {
            "x_values": [1, 2, 3, 4, 5, 6],
            "y_values": [3, 5, None, 9, None, 13],
            "rule_label": "y =",
            "rule_answer": "2x + 1",
            "x_header": "x",
            "y_header": "y",
        },
    ),
    (
        "inequality_graph",
        "Graph y >= 2x - 1",
        "Adjust the line and shade the solution region.",
        {
            "operator": ">=",
            "target_slope": 2,
            "target_intercept": -1,
            "grid_range": 6,
            "tolerance": 0.4,
        },
    ),
    (
        "graph_transform",
        "Match the parabola",
        "Apply shifts and stretches to f(x) = x² until the curve matches.",
        {
            "parent_function": "x^2",
            "target_transform": {"shift_x": 1, "shift_y": -2, "stretch": 1},
            "grid_range": 6,
            "tolerance": 0.3,
        },
    ),
    (
        "venn_diagram",
        "Fill in the Venn diagram",
        "Use the given totals to compute each region.",
        {
            "set_a_label": "Soccer",
            "set_b_label": "Basketball",
            "regions": {"a_only": None, "both": 4, "b_only": None, "neither": 5},
            "totals": {"a": 12, "b": 9, "universe": 22},
            "answers": {"a_only": 8, "b_only": 5},
        },
    ),
]


# ─── Driver ────────────────────────────────────────────────────────────


def main() -> int:
    if not EMAIL or not PASSWORD:
        print("Set LMS_ADMIN_EMAIL and LMS_ADMIN_PASSWORD", file=sys.stderr)
        return 1

    print(f"BASE_URL = {BASE}")

    auth = api("POST", "/auth/login", data={"email": EMAIL, "password": PASSWORD})
    token = auth["access_token"]
    print(f"Logged in as {EMAIL}")

    # Find or create "Exercise Types Demo" course
    courses = api("GET", "/courses", token=token)
    if isinstance(courses, dict) and "results" in courses:
        courses = courses["results"]
    demo = next(
        (c for c in courses if c.get("title", "").lower() == "exercise types demo"),
        None,
    )
    if demo is None:
        demo = api(
            "POST",
            "/courses",
            token=token,
            data={
                "title": "Exercise Types Demo",
                "description": "One example of every supported exercise template. Browse, copy, adapt.",
                "category": "Demo",
                "is_template": True,
            },
        )
        print(f"Created demo course {demo['id']}")
    else:
        print(f"Using existing demo course {demo['id']}")

    course_id = demo["id"]

    # Find or create "Math Templates" module
    full = api("GET", f"/courses/{course_id}", token=token)
    modules = full.get("modules") or []
    module = next(
        (m for m in modules if (m.get("title") or "").lower() == "math templates"),
        None,
    )
    if module is None:
        module = api(
            "POST",
            f"/courses/{course_id}/modules",
            token=token,
            data={"title": "Math Templates"},
        )
        print(f"Created module {module['id']}")
    else:
        print(f"Using existing module {module['id']}")
    module_id = module["id"]

    # Re-fetch to pick up lessons inside this module
    full = api("GET", f"/courses/{course_id}", token=token)
    module = next(m for m in full.get("modules") or [] if m["id"] == module_id)
    existing_lessons = {(l.get("title") or "").lower(): l for l in module.get("lessons") or []}

    # For each template: lesson + math_interactive exercise with sample config
    created = updated = 0
    for tpl_type, lesson_title, instructions, tpl_cfg in TEMPLATES:
        lesson_key = lesson_title.lower()
        if lesson_key in existing_lessons:
            lesson = existing_lessons[lesson_key]
        else:
            lesson = api(
                "POST",
                f"/courses/{course_id}/modules/{module_id}/lessons",
                token=token,
                data={
                    "title": lesson_title,
                    "content_type": "text",
                    "content": {"version": 2, "blocks": []},
                    "duration_minutes": 10,
                },
            )
        lesson_id = lesson["id"]

        # Does this lesson already have a math_interactive exercise?
        exs = api("GET", f"/exercises/by-lesson/{lesson_id}", token=token)
        ex = next(
            (e for e in exs or [] if e.get("exercise_type") == "math_interactive"),
            None,
        )
        payload_config = {
            "template_type": tpl_type,
            "instructions": instructions,
            "template_config": tpl_cfg,
        }
        if ex:
            api(
                "PATCH",
                f"/exercises/{ex['id']}",
                token=token,
                data={"title": lesson_title, "config": payload_config},
            )
            updated += 1
            print(f"  · updated {tpl_type} ({lesson_title})")
        else:
            new = api(
                "POST",
                "/exercises",
                token=token,
                data={
                    "lesson_id": lesson_id,
                    "exercise_type": "math_interactive",
                    "title": lesson_title,
                    "config": payload_config,
                },
            )
            # Attach the new exercise as a v2 block on the lesson so it
            # renders in the WYSIWYG editor and the student lesson view.
            blocks = [
                {
                    "id": f"block_math_{new['id'][:8]}",
                    "type": "exercise",
                    "sort_order": 0,
                    "page": 1,
                    "exercise_id": new["id"],
                }
            ]
            api(
                "PUT",
                f"/courses/{course_id}/modules/{module_id}/lessons/{lesson_id}/",
                token=token,
                data={
                    "title": lesson_title,
                    "content": {"version": 2, "blocks": blocks},
                    "duration_minutes": 10,
                },
            )
            created += 1
            print(f"  + created {tpl_type} ({lesson_title})")

    print(f"\nDone. Created {created}, updated {updated} (of {len(TEMPLATES)} templates).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
