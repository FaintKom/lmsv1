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
    # ─── coordinate_plane ────────────────────────────────────────────
    (
        "coordinate_plane",
        "Coordinate Plane #1 — three points in different quadrants",
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
        "coordinate_plane",
        "Coordinate Plane #2 — vertices of a triangle",
        "Place points A, B, C so they form the given triangle.",
        {
            "target_points": [
                {"x": 0, "y": 4, "label": "A"},
                {"x": -3, "y": -2, "label": "B"},
                {"x": 3, "y": -2, "label": "C"},
            ],
            "grid_range": 5,
            "tolerance": 0.4,
        },
    ),
    # ─── number_line ────────────────────────────────────────────────
    (
        "number_line",
        "Number Line #1 — small positive integers",
        "Drag each marker to its position on the number line.",
        {"targets": [3, 7, -2], "tick_interval": 1, "tolerance": 0.3, "range": [-5, 10]},
    ),
    (
        "number_line",
        "Number Line #2 — fractions and decimals",
        "Place 0.5, 1.25, and 2.75 on the number line.",
        {"targets": [0.5, 1.25, 2.75], "tick_interval": 0.25, "tolerance": 0.1, "range": [0, 4]},
    ),
    # ─── visual_fractions ───────────────────────────────────────────
    (
        "visual_fractions",
        "Visual Fractions #1 — 3/8 of a pie",
        "Click on slices to shade 3 out of 8 equal pieces.",
        {"target_numerator": 3, "target_denominator": 8, "display_type": "pie"},
    ),
    (
        "visual_fractions",
        "Visual Fractions #2 — 5/6 of a bar",
        "Click on bar segments to shade 5 out of 6 equal pieces.",
        {"target_numerator": 5, "target_denominator": 6, "display_type": "bar"},
    ),
    # ─── equation_balance ───────────────────────────────────────────
    (
        "equation_balance",
        "Equation Balance #1 — small numbers",
        "Drag terms onto the scale until both sides balance: 5 = 2 + ?",
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
        "equation_balance",
        "Equation Balance #2 — two-step",
        "Make 10 = 4 + ? + ? using only twos and threes.",
        {
            "left_fixed": [10],
            "right_fixed": [4],
            "available_terms": [
                {"value": 2, "label": "2"},
                {"value": 3, "label": "3"},
                {"value": 5, "label": "5"},
            ],
        },
    ),
    # ─── arithmetic_puzzle ──────────────────────────────────────────
    (
        "arithmetic_puzzle",
        "Arithmetic Puzzle #1 — mixed operations",
        "Compute the missing operand so each row is true.",
        {
            "rows": [
                {"operands": [7, None], "operator": "+", "result": 12},
                {"operands": [15, 3], "operator": "-", "result": None},
                {"operands": [None, 4], "operator": "*", "result": 24},
            ]
        },
    ),
    (
        "arithmetic_puzzle",
        "Arithmetic Puzzle #2 — division focus",
        "Fill in the missing numbers in these division facts.",
        {
            "rows": [
                {"operands": [None, 6], "operator": "/", "result": 7},
                {"operands": [56, None], "operator": "/", "result": 8},
                {"operands": [None, 9], "operator": "/", "result": 5},
            ]
        },
    ),
    # ─── function_graph ─────────────────────────────────────────────
    (
        "function_graph",
        "Function Graph #1 — quadratic x² - 2x - 3",
        "Adjust a, b, c until the blue curve matches the target.",
        {
            "function_type": "quadratic",
            "target_params": {"a": 1, "b": -2, "c": -3},
            "grid_range": 6,
            "tolerance": 0.3,
        },
    ),
    (
        "function_graph",
        "Function Graph #2 — linear y = -0.5x + 1",
        "Adjust slope and intercept to match the dashed line.",
        {
            "function_type": "linear",
            "target_params": {"m": -0.5, "b": 1},
            "grid_range": 5,
            "tolerance": 0.2,
        },
    ),
    # ─── equation_solver ────────────────────────────────────────────
    (
        "equation_solver",
        "Equation Solver #1 — 2x + 4 = 10",
        "Pick the right operation at each step until x is isolated.",
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
        "equation_solver",
        "Equation Solver #2 — 3(x - 2) = 12",
        "Solve a multi-step equation step by step.",
        {
            "equation_config": {
                "equation": "3(x - 2) = 12",
                "steps": [
                    {"operation": "divide", "operand": 3, "result": "x - 2 = 4"},
                    {"operation": "add", "operand": 2, "result": "x = 6"},
                ],
                "final_answer": 6,
            }
        },
    ),
    # ─── multiple_choice_math ───────────────────────────────────────
    (
        "multiple_choice_math",
        "Multiple Choice #1 — Pythagorean theorem",
        "Choose the correct length of the hypotenuse.",
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
        "multiple_choice_math",
        "Multiple Choice #2 — quadratic roots",
        "Which value is a root of the equation?",
        {
            "question": "What are the roots of x² - 5x + 6 = 0?",
            "choices": [
                {"id": "a", "text": "x = 1 and x = 6", "is_correct": False},
                {"id": "b", "text": "x = 2 and x = 3", "is_correct": True},
                {"id": "c", "text": "x = -2 and x = -3", "is_correct": False},
                {"id": "d", "text": "x = 5 and x = 6", "is_correct": False},
            ],
            "explanation": "Factor: (x − 2)(x − 3) = 0 → x = 2 or x = 3.",
        },
    ),
    # ─── numeric_input ──────────────────────────────────────────────
    (
        "numeric_input",
        "Numeric Input #1 — multiply 47 × 23",
        "Compute the product and enter the result.",
        {"correct_answer": 1081, "tolerance": 0, "format": "integer"},
    ),
    (
        "numeric_input",
        "Numeric Input #2 — decimal sum",
        "Add 0.75 + 1.125 and enter the result rounded to 3 decimal places.",
        {"correct_answer": 1.875, "tolerance": 0.001, "format": "decimal"},
    ),
    # ─── scatter_plot ───────────────────────────────────────────────
    (
        "scatter_plot",
        "Scatter Plot #1 — line of best fit",
        "Drag the line so it minimises distance to all points.",
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
        "scatter_plot",
        "Scatter Plot #2 — negative correlation",
        "Find a line that fits the inversely-related data.",
        {
            "points": [
                {"x": 1, "y": 9},
                {"x": 2, "y": 7.8},
                {"x": 3, "y": 6},
                {"x": 4, "y": 4.5},
                {"x": 5, "y": 3.2},
                {"x": 6, "y": 1.8},
            ],
            "x_label": "Hours of TV",
            "y_label": "Sleep (h)",
            "x_range": [0, 7],
            "y_range": [0, 10],
            "target_slope": -1.4,
            "target_intercept": 10.2,
            "tolerance": 0.6,
        },
    ),
    # ─── two_way_table ──────────────────────────────────────────────
    (
        "two_way_table",
        "Two-Way Table #1 — sports preference",
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
        "two_way_table",
        "Two-Way Table #2 — transport survey",
        "Complete the frequency table.",
        {
            "row_headers": ["Adults", "Teens", "Total"],
            "col_headers": ["Bus", "Bike", "Car", "Total"],
            "cells": [
                [None, 14, 22, 50],
                [9, None, 11, 30],
                [23, 24, None, 80],
            ],
            "answers": {"0_0": 14, "1_1": 10, "2_2": 33},
        },
    ),
    # ─── card_sort ──────────────────────────────────────────────────
    (
        "card_sort",
        "Card Sort #1 — classify polynomials",
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
        "card_sort",
        "Card Sort #2 — prime vs composite vs neither",
        "Sort the integers by primality.",
        {
            "categories": [
                {"id": "prime", "label": "Prime"},
                {"id": "composite", "label": "Composite"},
                {"id": "neither", "label": "Neither"},
            ],
            "cards": [
                {"id": "n1", "text": "2", "category": "prime"},
                {"id": "n2", "text": "9", "category": "composite"},
                {"id": "n3", "text": "1", "category": "neither"},
                {"id": "n4", "text": "11", "category": "prime"},
                {"id": "n5", "text": "15", "category": "composite"},
                {"id": "n6", "text": "0", "category": "neither"},
            ],
        },
    ),
    # ─── table_pattern ──────────────────────────────────────────────
    (
        "table_pattern",
        "Table Pattern #1 — y = 2x + 1",
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
        "table_pattern",
        "Table Pattern #2 — y = x²",
        "Complete the table of squares and state the rule.",
        {
            "x_values": [0, 1, 2, 3, 4, 5],
            "y_values": [0, 1, None, 9, None, 25],
            "rule_label": "y =",
            "rule_answer": "x^2",
            "x_header": "x",
            "y_header": "y",
        },
    ),
    # ─── inequality_graph ───────────────────────────────────────────
    (
        "inequality_graph",
        "Inequality Graph #1 — y >= 2x - 1",
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
        "inequality_graph",
        "Inequality Graph #2 — y < -x + 3 (strict, dashed)",
        "Use a dashed line and shade below it.",
        {
            "operator": "<",
            "target_slope": -1,
            "target_intercept": 3,
            "grid_range": 6,
            "tolerance": 0.4,
        },
    ),
    # ─── graph_transform ────────────────────────────────────────────
    (
        "graph_transform",
        "Graph Transformations #1 — parabola shift",
        "Apply shifts and stretches to f(x) = x² until the curve matches.",
        {
            "parent_function": "x^2",
            "target_transform": {"shift_x": 1, "shift_y": -2, "stretch": 1},
            "grid_range": 6,
            "tolerance": 0.3,
        },
    ),
    (
        "graph_transform",
        "Graph Transformations #2 — absolute value reflect",
        "Reflect and shift f(x) = |x| to match the target.",
        {
            "parent_function": "abs(x)",
            "target_transform": {"shift_x": -2, "shift_y": 3, "stretch": -1},
            "grid_range": 6,
            "tolerance": 0.3,
        },
    ),
    # ─── venn_diagram ───────────────────────────────────────────────
    (
        "venn_diagram",
        "Venn Diagram #1 — sports clubs",
        "Use the given totals to compute each region.",
        {
            "set_a_label": "Soccer",
            "set_b_label": "Basketball",
            "regions": {"a_only": None, "both": 4, "b_only": None, "neither": 5},
            "totals": {"a": 12, "b": 9, "universe": 22},
            "answers": {"a_only": 8, "b_only": 5},
        },
    ),
    (
        "venn_diagram",
        "Venn Diagram #2 — language students",
        "Fill in the missing region counts.",
        {
            "set_a_label": "Spanish",
            "set_b_label": "French",
            "regions": {"a_only": None, "both": 6, "b_only": None, "neither": 8},
            "totals": {"a": 17, "b": 13, "universe": 30},
            "answers": {"a_only": 11, "b_only": 7},
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
