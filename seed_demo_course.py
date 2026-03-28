"""Seed a dedicated demo course with game-level exercises."""
import requests
import json
import sys
import os

os.environ.setdefault("PYTHONIOENCODING", "utf-8")

API = "https://lms-backend-0b8v.onrender.com/api/v1"
COURSE_ID = "04dd0fce-ae1b-4b20-846a-aec927fa7a01"

# Login
r = requests.post(f"{API}/auth/login", json={"email": "faintkom@gmail.com", "password": "REDACTED_PASSWORD"})
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Lesson IDs from creation
EXERCISES = [
    # 2D Robot
    ("50b3dbcd-7a06-4e62-bed8-7975bb1e225b", "robot_2d", "Robot: First Steps", {
        "grid_width": 5, "grid_height": 5,
        "cells": [{"x":0,"y":2,"type":"start"},{"x":4,"y":2,"type":"goal"}],
        "available_blocks": ["move_forward","turn_left","turn_right"],
        "win_condition": "reach_goal", "difficulty": "beginner",
        "hints": ["The robot faces right. Move it to the flag!","Use 'move forward' 4 times!"],
        "allow_python": False,
    }),
    ("87ddc338-eb34-4ad1-a30e-783a06f9c621", "robot_2d", "Robot: Wall Maze", {
        "grid_width": 6, "grid_height": 6,
        "cells": [
            {"x":0,"y":3,"type":"start"},{"x":5,"y":3,"type":"goal"},
            {"x":2,"y":1,"type":"wall"},{"x":2,"y":2,"type":"wall"},
            {"x":2,"y":3,"type":"wall"},{"x":2,"y":4,"type":"wall"},
        ],
        "available_blocks": ["move_forward","turn_left","turn_right"],
        "win_condition": "reach_goal", "difficulty": "beginner",
        "hints": ["The wall blocks the direct path. Go around it!"],
        "allow_python": False,
    }),
    ("ec043e86-9771-46e7-912b-a83fd5550cdd", "robot_2d", "Robot: Collect Stars", {
        "grid_width": 5, "grid_height": 5,
        "cells": [
            {"x":0,"y":0,"type":"start"},
            {"x":2,"y":0,"type":"item"},{"x":4,"y":0,"type":"item"},
            {"x":4,"y":2,"type":"item"},{"x":4,"y":4,"type":"item"},
            {"x":1,"y":1,"type":"wall"},{"x":1,"y":2,"type":"wall"},{"x":1,"y":3,"type":"wall"},
        ],
        "available_blocks": ["move_forward","turn_left","turn_right","pick_up","repeat_times","math_number"],
        "win_condition": "collect_all", "difficulty": "intermediate",
        "hints": ["Collect all 4 stars. Use 'pick up' when on a star."],
        "allow_python": False, "max_blocks": 20,
    }),
    ("80d7530d-4fbc-47bf-9d7f-9ecf632914c9", "robot_2d", "Robot: Labyrinth (Python)", {
        "grid_width": 8, "grid_height": 8,
        "cells": [
            {"x":0,"y":0,"type":"start"},{"x":7,"y":7,"type":"goal"},
            {"x":1,"y":0,"type":"wall"},{"x":1,"y":1,"type":"wall"},{"x":1,"y":2,"type":"wall"},{"x":1,"y":3,"type":"wall"},
            {"x":3,"y":2,"type":"wall"},{"x":3,"y":3,"type":"wall"},{"x":3,"y":4,"type":"wall"},{"x":3,"y":5,"type":"wall"},{"x":3,"y":6,"type":"wall"},
            {"x":5,"y":0,"type":"wall"},{"x":5,"y":1,"type":"wall"},{"x":5,"y":2,"type":"wall"},{"x":5,"y":3,"type":"wall"},{"x":5,"y":4,"type":"wall"},
            {"x":6,"y":6,"type":"wall"},{"x":7,"y":6,"type":"wall"},
            {"x":0,"y":4,"type":"item"},{"x":4,"y":7,"type":"item"},{"x":7,"y":4,"type":"item"},
        ],
        "available_blocks": ["move_forward","turn_left","turn_right","pick_up","repeat_times","while_not_at_goal","controls_if","if_wall_ahead","if_item_here","logic_negate","math_number"],
        "win_condition": "reach_goal", "difficulty": "advanced",
        "hints": ["Use 'while not at goal' with wall checks."],
        "allow_python": True,
    }),

    # Math Interactive
    ("8d6aa84a-fd08-4914-b3fb-36d9b8a26a75", "math_interactive", "Math: Coordinate Plane", {
        "template_type": "coordinate_plane",
        "instructions": "Place the points at the correct positions on the coordinate plane.",
        "template_config": {"target_points": [{"x":3,"y":2},{"x":-2,"y":4},{"x":-1,"y":-3}], "grid_range": 6, "tolerance": 0.5},
    }),
    ("75b220d2-be0d-4fe0-acda-a56e9bcadace", "math_interactive", "Math: Number Line", {
        "template_type": "number_line",
        "instructions": "Place markers at the correct positions on the number line.",
        "template_config": {"range_min": -5, "range_max": 5, "targets": [-3, 1.5, 4], "tick_interval": 1, "tolerance": 0.3},
    }),
    ("1f46172f-7454-43e3-a5e0-ac1a90b0de6c", "math_interactive", "Math: Fractions (Pie)", {
        "template_type": "visual_fractions",
        "instructions": "Shade 3/8 of the pie chart. Click sectors to select them.",
        "template_config": {"target_numerator": 3, "target_denominator": 8, "display_type": "pie"},
    }),
    ("ea5ad41c-0454-48b6-826e-cb29e6eec1c6", "math_interactive", "Math: Fractions (Bar)", {
        "template_type": "visual_fractions",
        "instructions": "Shade 5/12 of the bar.",
        "template_config": {"target_numerator": 5, "target_denominator": 12, "display_type": "bar"},
    }),
    ("5d18b510-46d7-46cc-b452-afc7b5d4e5a2", "math_interactive", "Math: Equation Balance", {
        "template_type": "equation_balance",
        "instructions": "Add numbers to the right side to balance the equation.",
        "template_config": {"left_fixed": [7, 5], "right_fixed": [4], "available_terms": [{"value":3,"label":"3"},{"value":5,"label":"5"},{"value":8,"label":"8"},{"value":2,"label":"2"}]},
    }),
    ("e508091e-758e-4ddb-b255-5ea3d5867caf", "math_interactive", "Math: Arithmetic Puzzle", {
        "template_type": "arithmetic_puzzle",
        "instructions": "Fill in the missing numbers.",
        "template_config": {"equations": [
            {"cells":[{"value":None,"display":"_"},{"value":None,"display":"+"},{"value":3,"display":"3"},{"value":None,"display":"="},{"value":7,"display":"7"}],"answer":4,"blankIndex":0},
            {"cells":[{"value":15,"display":"15"},{"value":None,"display":"-"},{"value":None,"display":"_"},{"value":None,"display":"="},{"value":8,"display":"8"}],"answer":7,"blankIndex":2},
            {"cells":[{"value":None,"display":"_"},{"value":None,"display":"\u00d7"},{"value":6,"display":"6"},{"value":None,"display":"="},{"value":42,"display":"42"}],"answer":7,"blankIndex":0},
        ]},
    }),
    ("5b603061-21f2-4ffa-b65e-df2226b70ced", "math_interactive", "Math: Custom HTML (Equation)", {
        "template_type": "custom_html",
        "instructions": "Solve the equation and enter your answer.",
        "custom_html": '<style>.c{text-align:center;padding:20px;font-family:system-ui}h2{color:#334155;font-size:24px}.eq{font-size:32px;color:#6366f1;margin:24px 0;font-weight:bold}input{font-size:24px;width:80px;text-align:center;border:2px solid #cbd5e1;border-radius:8px;padding:8px}input:focus{border-color:#6366f1;outline:none}button{background:#6366f1;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:16px;cursor:pointer;margin-top:16px}button:hover{background:#4f46e5}.r{margin-top:16px;font-size:18px;font-weight:bold}.ok{color:#22c55e}.no{color:#ef4444}</style><div class="c"><h2>Solve the equation</h2><div class="eq">2x + 5 = 17</div><p>x = <input type="number" id="a" placeholder="?"></p><button onclick="check()">Check</button><div id="r" class="r"></div></div><script>function check(){var v=parseInt(document.getElementById("a").value),e=document.getElementById("r");v===6?(e.className="r ok",e.textContent="Correct! x = 6",window.LMS.reportResult({passed:true,score:1})):(e.className="r no",e.textContent="Wrong. Try again!")}</script>',
    }),

    # 3D World
    ("f2b29566-6da5-4c1e-ad66-e8a1138ac68f", "world_3d", "3D: Find the Exit", {
        "scene_objects": [
            {"id":"goal1","type":"goal","position":{"x":4,"y":0,"z":0},"color":"#22c55e"},
            {"id":"wall1","type":"wall","position":{"x":2,"y":0,"z":-1}},
            {"id":"wall2","type":"wall","position":{"x":2,"y":0,"z":0}},
            {"id":"wall3","type":"wall","position":{"x":2,"y":0,"z":1}},
        ],
        "player_start": {"x":0,"y":0,"z":0,"direction":"east"},
        "available_blocks": ["move_forward","turn_left","turn_right"],
        "win_condition": "reach_goal", "difficulty": "beginner",
        "hints": ["Wall ahead! Go around it."],
        "allow_python": False,
    }),
    ("7b4d7409-ba8d-4195-936c-a17642a50534", "world_3d", "3D: Collect Crystals", {
        "scene_objects": [
            {"id":"c1","type":"collectible","position":{"x":2,"y":0,"z":0},"color":"#f59e0b"},
            {"id":"c2","type":"collectible","position":{"x":0,"y":0,"z":-3},"color":"#f59e0b"},
            {"id":"c3","type":"collectible","position":{"x":4,"y":0,"z":-3},"color":"#f59e0b"},
            {"id":"wall1","type":"wall","position":{"x":1,"y":0,"z":-1}},
            {"id":"wall2","type":"wall","position":{"x":1,"y":0,"z":-2}},
            {"id":"wall3","type":"wall","position":{"x":3,"y":0,"z":-1}},
            {"id":"wall4","type":"wall","position":{"x":3,"y":0,"z":-2}},
        ],
        "player_start": {"x":0,"y":0,"z":0,"direction":"east"},
        "available_blocks": ["move_forward","turn_left","turn_right","pick_up","repeat_times","math_number"],
        "win_condition": "collect_all", "difficulty": "intermediate",
        "hints": ["Collect all 3 crystals using 'pick up'."],
        "allow_python": False,
    }),
    ("2da5026e-e3f8-407e-9649-1a8491fca19b", "world_3d", "3D: Buttons and Doors", {
        "scene_objects": [
            {"id":"goal1","type":"goal","position":{"x":5,"y":0,"z":0},"color":"#22c55e"},
            {"id":"door1","type":"door","position":{"x":3,"y":0,"z":0},"color":"#8b5cf6"},
            {"id":"btn1","type":"button","position":{"x":1,"y":0,"z":-2},"color":"#ef4444","properties":{"doorId":"door1"}},
            {"id":"wall1","type":"wall","position":{"x":3,"y":0,"z":-1}},
            {"id":"wall2","type":"wall","position":{"x":3,"y":0,"z":1}},
        ],
        "player_start": {"x":0,"y":0,"z":0,"direction":"east"},
        "available_blocks": ["move_forward","turn_left","turn_right","interact","if_near_object","controls_if","repeat_times","math_number"],
        "win_condition": "reach_goal", "difficulty": "advanced",
        "hints": ["The door is locked! Find the red button and use 'interact'."],
        "allow_python": True,
    }),
]

created = 0
for lesson_id, ex_type, title, config in EXERCISES:
    r = requests.post(f"{API}/exercises", json={
        "lesson_id": lesson_id,
        "exercise_type": ex_type,
        "title": title,
        "config": config,
    }, headers=H)
    if r.status_code in (200, 201):
        ex = r.json()
        print(f"  [OK] {ex.get('display_id','?')} - {title}")
        created += 1
    else:
        print(f"  [FAIL] {title}: {r.status_code} {r.text[:150]}")

# Publish the course
r = requests.put(f"{API}/courses/{COURSE_ID}", json={"status": "published"}, headers=H)
print(f"\nPublish course: {r.status_code}")
print(f"\nDone! Created {created}/14 exercises in 'Game Levels Demo' course.")
