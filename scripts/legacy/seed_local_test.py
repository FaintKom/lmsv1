"""Create local test course with all interactive exercise types."""
import requests
import sys
import os
os.environ["PYTHONIOENCODING"] = "utf-8"

API = "http://localhost:8000/api/v1"

# Login
r = requests.post(f"{API}/auth/login", json={"email": os.environ.get("LMS_ADMIN_EMAIL",""), "password": os.environ.get("LMS_ADMIN_PASSWORD","")})
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print("Logged in as admin")

# Create student
r = requests.post(f"{API}/admin/users", json={
    "email": "student@test.com", "password": "Student123!",
    "full_name": "Test Student", "role": "student"
}, headers=H)
if r.status_code == 200:
    student_id = r.json()["id"]
    print(f"Student created: student@test.com / Student123!")
else:
    r2 = requests.post(f"{API}/auth/login", json={"email": "student@test.com", "password": "Student123!"})
    if r2.status_code == 200:
        student_id = r2.json()["user"]["id"]
        print(f"Student exists: student@test.com / Student123!")
    else:
        print(f"Failed to create/find student: {r.text[:100]}")
        sys.exit(1)

# Create course
r = requests.post(f"{API}/courses", json={
    "title": "Interactive Test Course",
    "description": "All interactive exercise types for testing",
    "category": "Testing",
}, headers=H)
course_id = r.json()["id"]
print(f"Course: {course_id[:8]}")

# Modules
mods = []
for i, name in enumerate(["2D Robot Levels", "Math Templates", "SAT Prep"]):
    r = requests.post(f"{API}/courses/{course_id}/modules", json={"title": name, "sort_order": i}, headers=H)
    mods.append(r.json()["id"])
    print(f"  Module: {name}")

def add_exercise(mod_idx, sort, title, content_type, ex_type, config):
    r = requests.post(f"{API}/courses/{course_id}/modules/{mods[mod_idx]}/lessons", json={
        "title": title, "content_type": content_type, "sort_order": sort, "duration_minutes": 5,
    }, headers=H)
    lid = r.json()["id"]
    r2 = requests.post(f"{API}/exercises", json={
        "lesson_id": lid, "exercise_type": ex_type, "title": title, "config": config,
    }, headers=H)
    did = r2.json().get("display_id", "?")
    print(f"    {did} - {title}")

# === Module 0: Robot ===
add_exercise(0, 0, "Robot: Easy Path", "robot_2d", "robot_2d", {
    "grid_width": 5, "grid_height": 5,
    "cells": [{"x":0,"y":2,"type":"start"},{"x":4,"y":2,"type":"goal"}],
    "available_blocks": ["move_up","move_down","move_left","move_right"],
    "win_condition": "reach_goal", "difficulty": "beginner",
    "target_steps": 4, "optimal_blocks": 4,
    "hints": ["Just go right 4 times!"],
})

add_exercise(0, 1, "Robot: Wall Detour", "robot_2d", "robot_2d", {
    "grid_width": 6, "grid_height": 6,
    "cells": [
        {"x":0,"y":3,"type":"start"},{"x":5,"y":3,"type":"goal"},
        {"x":2,"y":1,"type":"wall"},{"x":2,"y":2,"type":"wall"},
        {"x":2,"y":3,"type":"wall"},{"x":2,"y":4,"type":"wall"},
    ],
    "available_blocks": ["move_up","move_down","move_left","move_right"],
    "win_condition": "reach_goal", "difficulty": "beginner",
    "target_steps": 8, "optimal_blocks": 8,
    "hints": ["Go around the wall from above or below"],
})

add_exercise(0, 2, "Robot: Star Collector", "robot_2d", "robot_2d", {
    "grid_width": 5, "grid_height": 5,
    "cells": [
        {"x":0,"y":0,"type":"start"},
        {"x":2,"y":0,"type":"item"},{"x":4,"y":0,"type":"item"},
        {"x":4,"y":2,"type":"item"},{"x":4,"y":4,"type":"item"},
        {"x":1,"y":1,"type":"wall"},{"x":1,"y":2,"type":"wall"},
    ],
    "available_blocks": ["move_up","move_down","move_left","move_right","pick_up","repeat_times","math_number"],
    "win_condition": "collect_all", "difficulty": "intermediate",
    "target_steps": 12, "optimal_blocks": 8,
    "hints": ["Collect all 4 stars!", "Use repeat blocks"],
    "max_blocks": 15,
})

add_exercise(0, 3, "Robot: Python Mode", "robot_2d", "robot_2d", {
    "grid_width": 6, "grid_height": 6,
    "cells": [
        {"x":0,"y":0,"type":"start"},{"x":5,"y":5,"type":"goal"},
        {"x":2,"y":0,"type":"wall"},{"x":2,"y":1,"type":"wall"},{"x":2,"y":2,"type":"wall"},
        {"x":3,"y":3,"type":"wall"},{"x":3,"y":4,"type":"wall"},{"x":3,"y":5,"type":"wall"},
        {"x":1,"y":3,"type":"item"},{"x":4,"y":2,"type":"item"},
    ],
    "available_blocks": ["move_up","move_down","move_left","move_right","pick_up","repeat_times","while_not_at_goal","controls_if","if_wall_ahead","if_item_here","math_number","logic_negate"],
    "win_condition": "reach_goal", "difficulty": "advanced",
    "target_steps": 15, "optimal_blocks": 10,
    "hints": ["Try Python mode!"], "allow_python": True,
})

# === Module 1: Math Templates ===
add_exercise(1, 0, "Coordinate Plane", "math_interactive", "math_interactive", {
    "template_type": "coordinate_plane",
    "instructions": "Drag points A, B, C to the correct positions.",
    "template_config": {"target_points": [{"x":3,"y":2},{"x":-2,"y":4},{"x":1,"y":-3}], "grid_range": 6, "tolerance": 0.5},
})

add_exercise(1, 1, "Number Line", "math_interactive", "math_interactive", {
    "template_type": "number_line",
    "instructions": "Place markers at -3, 1.5, and 4.",
    "template_config": {"range_min": -5, "range_max": 5, "targets": [-3, 1.5, 4], "tick_interval": 1, "tolerance": 0.3},
})

add_exercise(1, 2, "Fractions (Pie)", "math_interactive", "math_interactive", {
    "template_type": "visual_fractions",
    "instructions": "Shade 3/8 of the pie.",
    "template_config": {"target_numerator": 3, "target_denominator": 8, "display_type": "pie"},
})

add_exercise(1, 3, "Equation Balance", "math_interactive", "math_interactive", {
    "template_type": "equation_balance",
    "instructions": "Balance: 7 + 5 = 4 + ?",
    "template_config": {"left_fixed": [7, 5], "right_fixed": [4],
        "available_terms": [{"value":3,"label":"3"},{"value":5,"label":"5"},{"value":8,"label":"8"},{"value":2,"label":"2"}]},
})

add_exercise(1, 4, "Arithmetic Puzzle", "math_interactive", "math_interactive", {
    "template_type": "arithmetic_puzzle",
    "instructions": "Fill in the missing numbers.",
    "template_config": {"equations": [
        {"cells":[{"value":None,"display":"_"},{"value":None,"display":"+"},{"value":3,"display":"3"},{"value":None,"display":"="},{"value":7,"display":"7"}],"answer":4,"blankIndex":0},
        {"cells":[{"value":15,"display":"15"},{"value":None,"display":"-"},{"value":None,"display":"_"},{"value":None,"display":"="},{"value":8,"display":"8"}],"answer":7,"blankIndex":2},
    ]},
})

add_exercise(1, 5, "Function Graph (Linear)", "math_interactive", "math_interactive", {
    "template_type": "function_graph",
    "instructions": "Match the green dashed line by adjusting slope and y-intercept.",
    "template_config": {"function_type": "linear", "target_params": {"m": 2, "b": -1}, "grid_range": 6, "show_target": True, "tolerance": 0.3},
})

add_exercise(1, 6, "Function Graph (Quadratic)", "math_interactive", "math_interactive", {
    "template_type": "function_graph",
    "instructions": "Match the quadratic function.",
    "template_config": {"function_type": "quadratic", "target_params": {"a": 1, "b": 0, "c": -2}, "grid_range": 6, "show_target": True, "tolerance": 0.3},
})

add_exercise(1, 7, "Equation Solver", "math_interactive", "math_interactive", {
    "template_type": "equation_solver",
    "instructions": "Solve step by step.",
    "template_config": {
        "initial_left": "3x + 9", "initial_right": "24", "final_answer": "x = 5",
        "steps": [
            {"id":"s1","action":"sub9","actionLabel":"Subtract 9 from both sides","resultLeft":"3x","resultRight":"15"},
            {"id":"s2","action":"div3","actionLabel":"Divide both sides by 3","resultLeft":"x","resultRight":"5"},
        ],
    },
})

# === Module 2: SAT Prep ===
add_exercise(2, 0, "SAT: Multiple Choice", "math_interactive", "math_interactive", {
    "template_type": "multiple_choice_math",
    "instructions": "",
    "template_config": {
        "question": "If 2x + 5 = 17, what is the value of x?",
        "choices": [{"text":"4","correct":False},{"text":"6","correct":True},{"text":"8","correct":False},{"text":"12","correct":False}],
        "explanation": "Subtract 5: 2x = 12. Divide by 2: x = 6.",
        "standard": "SAT.Algebra",
    },
})

add_exercise(2, 1, "SAT: Grid-in", "math_interactive", "math_interactive", {
    "template_type": "numeric_input",
    "instructions": "",
    "template_config": {
        "question": "A rectangle has a perimeter of 28. If its length is 8, what is its width?",
        "correct_answers": [6], "tolerance": 0.01,
        "allow_fraction": True, "allow_decimal": True,
        "explanation": "P = 2(l+w). 28 = 2(8+w). 14 = 8+w. w = 6.",
        "hint": "Perimeter = 2(length + width)",
        "standard": "SAT.Geometry",
    },
})

add_exercise(2, 2, "SAT: Quadratic MC", "math_interactive", "math_interactive", {
    "template_type": "multiple_choice_math",
    "instructions": "",
    "template_config": {
        "question": "What are the solutions to x^2 - 5x + 6 = 0?",
        "choices": [
            {"text":"x = 2 and x = 3","correct":True},
            {"text":"x = -2 and x = -3","correct":False},
            {"text":"x = 1 and x = 6","correct":False},
            {"text":"x = -1 and x = -6","correct":False},
        ],
        "explanation": "Factor: (x-2)(x-3) = 0. So x = 2 or x = 3.",
        "standard": "SAT.Advanced Math",
    },
})

add_exercise(2, 3, "SAT: Fraction Grid-in", "math_interactive", "math_interactive", {
    "template_type": "numeric_input",
    "instructions": "",
    "template_config": {
        "question": "If 3/4 of a number is 18, what is the number?",
        "correct_answers": [24], "tolerance": 0.01,
        "allow_fraction": True, "allow_decimal": True,
        "explanation": "(3/4)x = 18. x = 18 * (4/3) = 24.",
        "standard": "SAT.Problem Solving",
    },
})

add_exercise(2, 4, "Custom HTML Exercise", "math_interactive", "math_interactive", {
    "template_type": "custom_html",
    "instructions": "Solve the equation.",
    "custom_html": '<style>.c{text-align:center;padding:20px;font-family:system-ui}h2{color:#334155;font-size:24px}.eq{font-size:32px;color:#6366f1;margin:24px 0;font-weight:bold}input{font-size:24px;width:80px;text-align:center;border:2px solid #cbd5e1;border-radius:8px;padding:8px}input:focus{border-color:#6366f1;outline:none}button{background:#6366f1;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:16px;cursor:pointer;margin-top:16px}button:hover{background:#4f46e5}.r{margin-top:16px;font-size:18px;font-weight:bold}.ok{color:#22c55e}.no{color:#ef4444}</style><div class="c"><h2>Solve</h2><div class="eq">5x - 3 = 22</div><p>x = <input type="number" id="a" placeholder="?"></p><button onclick="check()">Check</button><div id="r" class="r"></div></div><script>function check(){var v=parseInt(document.getElementById("a").value),e=document.getElementById("r");v===5?(e.className="r ok",e.textContent="Correct!",window.LMS.reportResult({passed:true,score:1})):(e.className="r no",e.textContent="Try again!")}</script>',
})

# Publish
r = requests.put(f"{API}/courses/{course_id}", json={"status": "published"}, headers=H)
print(f"\nPublished: {r.status_code}")

# Enroll student
r = requests.post(f"{API}/courses/{course_id}/enroll", json={"student_id": student_id}, headers=H)
print(f"Enrolled student: {r.status_code}")

print(f"\n{'='*50}")
print(f"Course ready at http://localhost:3000")
print(f"Student login: student@test.com / Student123!")
print("Admin login: (set via LMS_ADMIN_EMAIL / LMS_ADMIN_PASSWORD)")
print(f"{'='*50}")
