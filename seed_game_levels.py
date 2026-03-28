"""
Seed script: creates test game levels for 2D Robot, Math Interactive, and 3D World.

Usage:
  python seed_game_levels.py [--api URL] [--email EMAIL] [--password PASSWORD]

Defaults to Render production backend.
"""

import argparse
import sys
import requests

# ─── Config ──────────────────────────────────────────────────────────

DEFAULT_API = "https://lms-backend-0b8v.onrender.com/api/v1"

# ─── Test Levels ─────────────────────────────────────────────────────

ROBOT_2D_LEVELS = [
    {
        "title": "Робот: Первые шаги",
        "config": {
            "grid_width": 5,
            "grid_height": 5,
            "cells": [
                {"x": 0, "y": 2, "type": "start"},
                {"x": 4, "y": 2, "type": "goal"},
            ],
            "available_blocks": ["move_forward", "turn_left", "turn_right"],
            "win_condition": "reach_goal",
            "difficulty": "beginner",
            "hints": [
                "Робот стоит слева и смотрит вправо. Ему нужно дойти до флажка.",
                "Используй блок 'move forward' 4 раза!",
            ],
            "allow_python": False,
        },
    },
    {
        "title": "Робот: Обход стены",
        "config": {
            "grid_width": 6,
            "grid_height": 6,
            "cells": [
                {"x": 0, "y": 3, "type": "start"},
                {"x": 5, "y": 3, "type": "goal"},
                {"x": 2, "y": 1, "type": "wall"},
                {"x": 2, "y": 2, "type": "wall"},
                {"x": 2, "y": 3, "type": "wall"},
                {"x": 2, "y": 4, "type": "wall"},
            ],
            "available_blocks": ["move_forward", "turn_left", "turn_right"],
            "win_condition": "reach_goal",
            "difficulty": "beginner",
            "hints": [
                "Стена блокирует прямой путь. Обойди её сверху или снизу.",
                "Поверни вверх, обойди стену, потом поверни направо.",
            ],
            "allow_python": False,
        },
    },
    {
        "title": "Робот: Собери звёзды",
        "config": {
            "grid_width": 5,
            "grid_height": 5,
            "cells": [
                {"x": 0, "y": 0, "type": "start"},
                {"x": 2, "y": 0, "type": "item"},
                {"x": 4, "y": 0, "type": "item"},
                {"x": 4, "y": 2, "type": "item"},
                {"x": 4, "y": 4, "type": "item"},
                {"x": 1, "y": 1, "type": "wall"},
                {"x": 1, "y": 2, "type": "wall"},
                {"x": 1, "y": 3, "type": "wall"},
            ],
            "available_blocks": [
                "move_forward", "turn_left", "turn_right",
                "pick_up", "repeat_times", "math_number",
            ],
            "win_condition": "collect_all",
            "difficulty": "intermediate",
            "hints": [
                "Нужно собрать все 4 звезды. Используй 'pick up' когда стоишь на звезде.",
                "Используй цикл 'repeat' чтобы сократить количество блоков.",
            ],
            "allow_python": False,
            "max_blocks": 20,
        },
    },
    {
        "title": "Робот: Лабиринт (Python)",
        "config": {
            "grid_width": 8,
            "grid_height": 8,
            "cells": [
                {"x": 0, "y": 0, "type": "start"},
                {"x": 7, "y": 7, "type": "goal"},
                # Maze walls
                {"x": 1, "y": 0, "type": "wall"}, {"x": 1, "y": 1, "type": "wall"},
                {"x": 1, "y": 2, "type": "wall"}, {"x": 1, "y": 3, "type": "wall"},
                {"x": 3, "y": 2, "type": "wall"}, {"x": 3, "y": 3, "type": "wall"},
                {"x": 3, "y": 4, "type": "wall"}, {"x": 3, "y": 5, "type": "wall"},
                {"x": 3, "y": 6, "type": "wall"},
                {"x": 5, "y": 0, "type": "wall"}, {"x": 5, "y": 1, "type": "wall"},
                {"x": 5, "y": 2, "type": "wall"}, {"x": 5, "y": 3, "type": "wall"},
                {"x": 5, "y": 4, "type": "wall"},
                {"x": 6, "y": 6, "type": "wall"}, {"x": 7, "y": 6, "type": "wall"},
                # Collectibles along the path
                {"x": 0, "y": 4, "type": "item"},
                {"x": 4, "y": 7, "type": "item"},
                {"x": 7, "y": 4, "type": "item"},
            ],
            "available_blocks": [
                "move_forward", "turn_left", "turn_right",
                "pick_up", "repeat_times", "while_not_at_goal",
                "controls_if", "if_wall_ahead", "if_item_here",
                "logic_negate", "math_number",
            ],
            "win_condition": "reach_goal",
            "difficulty": "advanced",
            "hints": [
                "Используй 'while not at goal' и проверяй стены с 'wall ahead?'.",
                "Алгоритм 'правой руки': всегда поворачивай направо, если можно. Если стена — налево.",
            ],
            "allow_python": True,
        },
    },
]

MATH_LEVELS = [
    {
        "title": "Математика: Координатная плоскость",
        "config": {
            "template_type": "coordinate_plane",
            "instructions": "Расположи точки на координатной плоскости в правильные позиции.",
            "template_config": {
                "target_points": [
                    {"x": 3, "y": 2},
                    {"x": -2, "y": 4},
                    {"x": -1, "y": -3},
                ],
                "grid_range": 6,
                "tolerance": 0.5,
            },
            "difficulty": "beginner",
        },
    },
    {
        "title": "Математика: Числовая прямая",
        "config": {
            "template_type": "number_line",
            "instructions": "Расположи маркеры на числовой прямой в правильные позиции.",
            "template_config": {
                "range_min": -5,
                "range_max": 5,
                "targets": [-3, 1.5, 4],
                "tick_interval": 1,
                "tolerance": 0.3,
            },
            "difficulty": "beginner",
        },
    },
    {
        "title": "Математика: Дроби (круговая диаграмма)",
        "config": {
            "template_type": "visual_fractions",
            "instructions": "Закрась 3/8 круга. Кликай на секторы, чтобы выделить их.",
            "template_config": {
                "target_numerator": 3,
                "target_denominator": 8,
                "display_type": "pie",
            },
            "difficulty": "beginner",
        },
    },
    {
        "title": "Математика: Дроби (столбцы)",
        "config": {
            "template_type": "visual_fractions",
            "instructions": "Закрась 5/12 полоски.",
            "template_config": {
                "target_numerator": 5,
                "target_denominator": 12,
                "display_type": "bar",
            },
            "difficulty": "intermediate",
        },
    },
    {
        "title": "Математика: Уравновесь весы",
        "config": {
            "template_type": "equation_balance",
            "instructions": "Добавь числа на правую чашу весов, чтобы обе стороны были равны.",
            "template_config": {
                "left_fixed": [7, 5],
                "right_fixed": [4],
                "available_terms": [
                    {"value": 3, "label": "3"},
                    {"value": 5, "label": "5"},
                    {"value": 8, "label": "8"},
                    {"value": 2, "label": "2"},
                ],
            },
            "difficulty": "intermediate",
        },
    },
    {
        "title": "Математика: Арифметический пазл",
        "config": {
            "template_type": "arithmetic_puzzle",
            "instructions": "Заполни пропущенные числа в уравнениях.",
            "template_config": {
                "equations": [
                    {
                        "cells": [
                            {"value": None, "display": "_"},
                            {"value": None, "display": "+"},
                            {"value": 3, "display": "3"},
                            {"value": None, "display": "="},
                            {"value": 7, "display": "7"},
                        ],
                        "answer": 4,
                        "blankIndex": 0,
                    },
                    {
                        "cells": [
                            {"value": 15, "display": "15"},
                            {"value": None, "display": "-"},
                            {"value": None, "display": "_"},
                            {"value": None, "display": "="},
                            {"value": 8, "display": "8"},
                        ],
                        "answer": 7,
                        "blankIndex": 2,
                    },
                    {
                        "cells": [
                            {"value": None, "display": "_"},
                            {"value": None, "display": "\u00d7"},
                            {"value": 6, "display": "6"},
                            {"value": None, "display": "="},
                            {"value": 42, "display": "42"},
                        ],
                        "answer": 7,
                        "blankIndex": 0,
                    },
                    {
                        "cells": [
                            {"value": 56, "display": "56"},
                            {"value": None, "display": "\u00f7"},
                            {"value": None, "display": "_"},
                            {"value": None, "display": "="},
                            {"value": 8, "display": "8"},
                        ],
                        "answer": 7,
                        "blankIndex": 2,
                    },
                ],
            },
            "difficulty": "intermediate",
        },
    },
    {
        "title": "Математика: Кастомное задание (HTML)",
        "config": {
            "template_type": "custom_html",
            "instructions": "Реши уравнение и введи ответ.",
            "custom_html": """
<style>
  .container { text-align: center; padding: 20px; font-family: system-ui; }
  h2 { color: #334155; font-size: 24px; }
  .equation { font-size: 32px; color: #6366f1; margin: 24px 0; font-weight: bold; }
  input { font-size: 24px; width: 80px; text-align: center; border: 2px solid #cbd5e1; border-radius: 8px; padding: 8px; }
  input:focus { border-color: #6366f1; outline: none; }
  button { background: #6366f1; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; margin-top: 16px; }
  button:hover { background: #4f46e5; }
  .result { margin-top: 16px; font-size: 18px; font-weight: bold; }
  .correct { color: #22c55e; }
  .wrong { color: #ef4444; }
</style>
<div class="container">
  <h2>Реши уравнение</h2>
  <div class="equation">2x + 5 = 17</div>
  <p>x = <input type="number" id="answer" placeholder="?"></p>
  <button onclick="check()">Проверить</button>
  <div id="result" class="result"></div>
</div>
<script>
function check() {
  var val = parseInt(document.getElementById('answer').value);
  var el = document.getElementById('result');
  if (val === 6) {
    el.className = 'result correct';
    el.textContent = 'Правильно! x = 6';
    window.LMS.reportResult({ passed: true, score: 1.0 });
  } else {
    el.className = 'result wrong';
    el.textContent = 'Неправильно. Попробуй ещё раз!';
  }
}
</script>
""",
            "difficulty": "intermediate",
        },
    },
]

WORLD_3D_LEVELS = [
    {
        "title": "3D Мир: Найди выход",
        "config": {
            "scene_objects": [
                {"id": "goal1", "type": "goal", "position": {"x": 4, "y": 0, "z": 0}, "color": "#22c55e"},
                {"id": "wall1", "type": "wall", "position": {"x": 2, "y": 0, "z": -1}},
                {"id": "wall2", "type": "wall", "position": {"x": 2, "y": 0, "z": 0}},
                {"id": "wall3", "type": "wall", "position": {"x": 2, "y": 0, "z": 1}},
            ],
            "player_start": {"x": 0, "y": 0, "z": 0, "direction": "east"},
            "available_blocks": ["move_forward", "turn_left", "turn_right"],
            "win_condition": "reach_goal",
            "difficulty": "beginner",
            "hints": [
                "Стена впереди! Обойди её сверху или снизу.",
                "Поверни на север, пройди, поверни на восток, обойди стену.",
            ],
            "allow_python": False,
        },
    },
    {
        "title": "3D Мир: Собери кристаллы",
        "config": {
            "scene_objects": [
                {"id": "c1", "type": "collectible", "position": {"x": 2, "y": 0, "z": 0}, "color": "#f59e0b"},
                {"id": "c2", "type": "collectible", "position": {"x": 0, "y": 0, "z": -3}, "color": "#f59e0b"},
                {"id": "c3", "type": "collectible", "position": {"x": 4, "y": 0, "z": -3}, "color": "#f59e0b"},
                {"id": "wall1", "type": "wall", "position": {"x": 1, "y": 0, "z": -1}},
                {"id": "wall2", "type": "wall", "position": {"x": 1, "y": 0, "z": -2}},
                {"id": "wall3", "type": "wall", "position": {"x": 3, "y": 0, "z": -1}},
                {"id": "wall4", "type": "wall", "position": {"x": 3, "y": 0, "z": -2}},
            ],
            "player_start": {"x": 0, "y": 0, "z": 0, "direction": "east"},
            "available_blocks": [
                "move_forward", "turn_left", "turn_right",
                "pick_up", "repeat_times", "math_number",
            ],
            "win_condition": "collect_all",
            "difficulty": "intermediate",
            "hints": [
                "Нужно собрать все 3 кристалла. Используй 'pick up' рядом с кристаллом.",
                "Планируй маршрут так, чтобы обойти стены и собрать все кристаллы.",
            ],
            "allow_python": False,
        },
    },
    {
        "title": "3D Мир: Кнопки и двери",
        "config": {
            "scene_objects": [
                {"id": "goal1", "type": "goal", "position": {"x": 5, "y": 0, "z": 0}, "color": "#22c55e"},
                {"id": "door1", "type": "door", "position": {"x": 3, "y": 0, "z": 0}, "color": "#8b5cf6"},
                {"id": "btn1", "type": "button", "position": {"x": 1, "y": 0, "z": -2}, "color": "#ef4444",
                 "properties": {"doorId": "door1"}},
                {"id": "wall1", "type": "wall", "position": {"x": 3, "y": 0, "z": -1}},
                {"id": "wall2", "type": "wall", "position": {"x": 3, "y": 0, "z": 1}},
            ],
            "player_start": {"x": 0, "y": 0, "z": 0, "direction": "east"},
            "available_blocks": [
                "move_forward", "turn_left", "turn_right",
                "interact", "if_near_object",
                "controls_if", "repeat_times", "math_number",
            ],
            "win_condition": "reach_goal",
            "difficulty": "advanced",
            "hints": [
                "Дверь заперта! Найди красную кнопку и нажми 'interact'.",
                "Кнопка на севере. Подойди к ней и используй 'interact', потом вернись к двери.",
            ],
            "allow_python": True,
        },
    },
]


def main():
    parser = argparse.ArgumentParser(description="Seed game levels into LMS")
    parser.add_argument("--api", default=DEFAULT_API, help="API base URL")
    parser.add_argument("--email", default="faintkom@gmail.com", help="Login email")
    parser.add_argument("--password", default="REDACTED_PASSWORD", help="Login password")
    parser.add_argument("--lesson-id", help="Lesson ID to attach exercises to (auto-detected if not set)")
    args = parser.parse_args()

    api = args.api.rstrip("/")

    # Login
    print(f"Logging in to {api}...")
    r = requests.post(f"{api}/auth/login", json={"email": args.email, "password": args.password})
    if r.status_code != 200:
        print(f"Login failed: {r.status_code} {r.text[:200]}")
        sys.exit(1)

    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print("Logged in successfully!")

    # Find a lesson to attach exercises to
    lesson_id = args.lesson_id
    if not lesson_id:
        print("Looking for an existing lesson...")
        r = requests.get(f"{api}/courses", headers=headers)
        if r.status_code == 200:
            courses = r.json()
            items = courses.get("items", courses) if isinstance(courses, dict) else courses
            for course in (items if isinstance(items, list) else []):
                cid = course.get("id")
                if not cid:
                    continue
                r2 = requests.get(f"{api}/courses/{cid}", headers=headers)
                if r2.status_code == 200:
                    course_data = r2.json()
                    modules = course_data.get("modules", [])
                    for mod in modules:
                        lessons = mod.get("lessons", [])
                        if lessons:
                            lesson_id = lessons[0]["id"]
                            print(f"Using lesson: {lessons[0].get('title', lesson_id)} (course: {course.get('title', cid)})")
                            break
                if lesson_id:
                    break

    if not lesson_id:
        print("No lessons found. Creating exercises without a lesson is not supported.")
        print("Please create a course with at least one lesson first, then re-run with --lesson-id")
        sys.exit(1)

    # Create exercises
    created = 0

    print("\n--- 2D Robot Levels ---")
    for level in ROBOT_2D_LEVELS:
        r = requests.post(f"{api}/exercises", json={
            "lesson_id": lesson_id,
            "exercise_type": "robot_2d",
            "title": level["title"],
            "config": level["config"],
        }, headers=headers)
        if r.status_code in (200, 201):
            ex = r.json()
            print(f"  [OK] {ex.get('display_id', '?')} - {level['title']}")
            created += 1
        else:
            print(f"  [FAIL] {level['title']}: {r.status_code} {r.text[:120]}")

    print("\n--- Math Interactive Levels ---")
    for level in MATH_LEVELS:
        r = requests.post(f"{api}/exercises", json={
            "lesson_id": lesson_id,
            "exercise_type": "math_interactive",
            "title": level["title"],
            "config": level["config"],
        }, headers=headers)
        if r.status_code in (200, 201):
            ex = r.json()
            print(f"  [OK] {ex.get('display_id', '?')} - {level['title']}")
            created += 1
        else:
            print(f"  [FAIL] {level['title']}: {r.status_code} {r.text[:120]}")

    print("\n--- 3D World Levels ---")
    for level in WORLD_3D_LEVELS:
        r = requests.post(f"{api}/exercises", json={
            "lesson_id": lesson_id,
            "exercise_type": "world_3d",
            "title": level["title"],
            "config": level["config"],
        }, headers=headers)
        if r.status_code in (200, 201):
            ex = r.json()
            print(f"  [OK] {ex.get('display_id', '?')} - {level['title']}")
            created += 1
        else:
            print(f"  [FAIL] {level['title']}: {r.status_code} {r.text[:120]}")

    print(f"\nDone! Created {created} game levels.")


if __name__ == "__main__":
    main()
