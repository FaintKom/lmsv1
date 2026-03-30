"""Create test courses on production Render server:
1. SAT Math Exam Prep — all SAT question types
2. Interactive Math Activities — all 16 interactive templates
"""
import requests
import sys
import os
os.environ["PYTHONIOENCODING"] = "utf-8"

API = "https://lms-backend-0b8v.onrender.com/api/v1"

r = requests.post(f"{API}/auth/login", json={"email": "faintkom@gmail.com", "password": "REDACTED_PASSWORD"})
if r.status_code != 200:
    print(f"Login failed: {r.status_code}")
    sys.exit(1)
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print("Logged in")

def create_course(title, desc, category):
    r = requests.post(f"{API}/courses", json={"title": title, "description": desc, "category": category}, headers=H)
    cid = r.json()["id"]
    print(f"Course: {title} ({cid[:8]})")
    return cid

def create_module(course_id, title, sort):
    r = requests.post(f"{API}/courses/{course_id}/modules", json={"title": title, "sort_order": sort}, headers=H)
    return r.json()["id"]

def add(course_id, mod_id, sort, title, ct, et, config):
    r = requests.post(f"{API}/courses/{course_id}/modules/{mod_id}/lessons", json={
        "title": title, "content_type": ct, "sort_order": sort, "duration_minutes": 5,
    }, headers=H)
    lid = r.json()["id"]
    r2 = requests.post(f"{API}/exercises", json={
        "lesson_id": lid, "exercise_type": et, "title": title, "config": config,
    }, headers=H)
    did = r2.json().get("display_id", "?")
    print(f"  {did} - {title}")

def publish(course_id):
    r = requests.post(f"{API}/courses/{course_id}/publish", headers=H)
    print(f"  Published: {r.status_code}")

# ═══════════════════════════════════════════════════════════════
# COURSE 1: SAT Math Exam Prep
# ═══════════════════════════════════════════════════════════════
c1 = create_course("SAT Math Exam Prep", "Complete SAT Math preparation with all question types found on the real exam", "SAT Prep")

m1 = create_module(c1, "Algebra", 0)
add(c1, m1, 0, "Linear Equations", "math_interactive", "math_interactive", {
    "template_type": "multiple_choice_math", "instructions": "",
    "template_config": {"question": "If $3x + 7 = 22$, what is $x$?", "choices": [{"text":"3","correct":False},{"text":"5","correct":True},{"text":"7","correct":False},{"text":"15","correct":False}], "explanation": "$3x = 15$, $x = 5$."},
})
add(c1, m1, 1, "Systems of Equations", "math_interactive", "math_interactive", {
    "template_type": "numeric_input", "instructions": "",
    "template_config": {"question": "Solve: $x + y = 10$ and $2x - y = 5$. What is $x$?", "correct_answers": [5], "tolerance": 0.01, "allow_fraction": True, "allow_decimal": True, "explanation": "Add: $3x = 15 \\Rightarrow x = 5$."},
})
add(c1, m1, 2, "Slope & Intercept", "math_interactive", "math_interactive", {
    "template_type": "multiple_choice_math", "instructions": "",
    "template_config": {"question": "What is the slope of $4x - 2y = 10$?", "choices": [{"text":"2","correct":True},{"text":"-2","correct":False},{"text":"4","correct":False},{"text":"5","correct":False}], "explanation": "$y = 2x - 5$. Slope $= 2$."},
})
add(c1, m1, 3, "Inequalities", "math_interactive", "math_interactive", {
    "template_type": "inequality_graph", "instructions": "Graph and shade: $y \\geq 2x - 1$",
    "template_config": {"slope": 2, "intercept": -1, "operator": ">=", "grid_range": 6, "tolerance": 0.4},
})

m2 = create_module(c1, "Advanced Math", 1)
add(c1, m2, 0, "Quadratic Equations", "math_interactive", "math_interactive", {
    "template_type": "multiple_choice_math", "instructions": "",
    "template_config": {"question": "What are the solutions to $x^2 - 5x + 6 = 0$?", "choices": [{"text":"$x=2$ and $x=3$","correct":True},{"text":"$x=-2$ and $x=-3$","correct":False},{"text":"$x=1$ and $x=6$","correct":False},{"text":"$x=-1$ and $x=-6$","correct":False}], "explanation": "$(x-2)(x-3)=0$."},
})
add(c1, m2, 1, "Function Graphs", "math_interactive", "math_interactive", {
    "template_type": "function_graph", "instructions": "Match the quadratic function by adjusting parameters.",
    "template_config": {"function_type": "quadratic", "target_params": {"a": 1, "b": -2, "c": -3}, "grid_range": 6, "show_target": True, "tolerance": 0.3},
})
add(c1, m2, 2, "Graph Transformations", "math_interactive", "math_interactive", {
    "template_type": "graph_transform", "instructions": "Apply transformations to match the target.",
    "template_config": {"parent_function": "x^2", "target_h": 2, "target_v": -3, "target_a": 1, "grid_range": 6, "tolerance": 0.3},
})
add(c1, m2, 3, "Equation Solving Steps", "math_interactive", "math_interactive", {
    "template_type": "equation_solver", "instructions": "Solve step by step.",
    "template_config": {"initial_left": "2x + 8", "initial_right": "20", "final_answer": "x = 6",
        "steps": [{"id":"s1","action":"sub8","actionLabel":"Subtract 8 from both sides","resultLeft":"2x","resultRight":"12"},
                  {"id":"s2","action":"div2","actionLabel":"Divide both sides by 2","resultLeft":"x","resultRight":"6"}]},
})

m3 = create_module(c1, "Data Analysis", 2)
add(c1, m3, 0, "Scatter Plot Analysis", "math_interactive", "math_interactive", {
    "template_type": "scatter_plot", "instructions": "Draw the best-fit line through the data points.",
    "template_config": {"points": [{"x":1,"y":3},{"x":2,"y":4},{"x":3,"y":5.5},{"x":4,"y":6},{"x":5,"y":8},{"x":6,"y":9}], "x_label":"Hours Studied","y_label":"Score","x_range":[0,7],"y_range":[0,11],"mode":"best_fit","target_slope":1.2,"target_intercept":1.5,"tolerance":0.4},
})
add(c1, m3, 1, "Two-Way Tables", "math_interactive", "math_interactive", {
    "template_type": "two_way_table", "instructions": "Fill in the missing values. Rows and columns must add to totals.",
    "template_config": {"row_headers":["Bus","Car","Total"],"col_headers":["Morning","Afternoon","Total"],"cells":[[12,None,20],[None,10,15],[20,None,35]],"answers":{"r0c1":8,"r1c0":8,"r2c1":15}},
})
add(c1, m3, 2, "Probability (Venn Diagram)", "math_interactive", "math_interactive", {
    "template_type": "venn_diagram", "instructions": "Fill in the missing regions.",
    "template_config": {"set_a_label":"Math","set_b_label":"Science","total":40,"regions":{"a_only":12,"b_only":None,"intersection":8,"neither":None},"answers":{"b_only":10,"neither":10}},
})

m4 = create_module(c1, "Geometry & Trig", 3)
add(c1, m4, 0, "Triangle & Circle", "math_interactive", "math_interactive", {
    "template_type": "numeric_input", "instructions": "",
    "template_config": {"question": "A circle has radius $5$. What is its area? (Use $\\pi \\approx 3.14$)", "correct_answers": [78.5, 78.54], "tolerance": 0.1, "allow_decimal": True, "allow_fraction": False, "explanation": "$A = \\pi r^2 = \\pi(25) \\approx 78.54$."},
})
add(c1, m4, 1, "Pythagorean Theorem", "math_interactive", "math_interactive", {
    "template_type": "numeric_input", "instructions": "",
    "template_config": {"question": "Right triangle: one leg is $6$, hypotenuse is $10$. What is the other leg?", "correct_answers": [8], "tolerance": 0.01, "allow_decimal": True, "allow_fraction": False, "explanation": "$b^2 = 10^2 - 6^2 = 64$. $b = 8$."},
})
add(c1, m4, 2, "Trigonometry", "math_interactive", "math_interactive", {
    "template_type": "multiple_choice_math", "instructions": "",
    "template_config": {"question": "What is $\\sin(30°)$?", "choices": [{"text":"$\\frac{1}{2}$","correct":True},{"text":"$\\frac{\\sqrt{3}}{2}$","correct":False},{"text":"$\\frac{\\sqrt{2}}{2}$","correct":False},{"text":"$1$","correct":False}], "explanation": "$\\sin(30°) = \\frac{1}{2}$."},
})

publish(c1)

# ═══════════════════════════════════════════════════════════════
# COURSE 2: Interactive Math Activities (all 16 templates)
# ═══════════════════════════════════════════════════════════════
c2 = create_course("Interactive Math Activities", "Explore all 16 interactive math exercise types with hands-on practice", "Math")

m5 = create_module(c2, "Visual Math", 0)
add(c2, m5, 0, "Coordinate Plane", "math_interactive", "math_interactive", {
    "template_type": "coordinate_plane", "instructions": "Drag each point to the correct position.",
    "template_config": {"target_points": [{"x":3,"y":2},{"x":-2,"y":4},{"x":1,"y":-3}], "grid_range": 6, "tolerance": 0.5},
})
add(c2, m5, 1, "Number Line", "math_interactive", "math_interactive", {
    "template_type": "number_line", "instructions": "Place markers at the target positions.",
    "template_config": {"range_min": -5, "range_max": 5, "targets": [-3, 1.5, 4], "tick_interval": 1, "tolerance": 0.3},
})
add(c2, m5, 2, "Visual Fractions", "math_interactive", "math_interactive", {
    "template_type": "visual_fractions", "instructions": "Shade 3/8 of the pie.",
    "template_config": {"target_numerator": 3, "target_denominator": 8, "display_type": "pie"},
})
add(c2, m5, 3, "Equation Balance", "math_interactive", "math_interactive", {
    "template_type": "equation_balance", "instructions": "Add terms to balance the equation.",
    "template_config": {"left_fixed": [7, 5], "right_fixed": [4], "available_terms": [{"value":3,"label":"3"},{"value":5,"label":"5"},{"value":8,"label":"8"},{"value":2,"label":"2"}]},
})

m6 = create_module(c2, "Data & Patterns", 1)
add(c2, m6, 0, "Scatter Plot", "math_interactive", "math_interactive", {
    "template_type": "scatter_plot", "instructions": "Draw the best-fit line.",
    "template_config": {"points": [{"x":1,"y":2},{"x":2,"y":3.5},{"x":3,"y":5},{"x":4,"y":5.5},{"x":5,"y":7},{"x":6,"y":8}],"x_label":"x","y_label":"y","x_range":[0,7],"y_range":[0,10],"mode":"best_fit","target_slope":1.1,"target_intercept":1.2,"tolerance":0.4},
})
add(c2, m6, 1, "Two-Way Table", "math_interactive", "math_interactive", {
    "template_type": "two_way_table", "instructions": "Fill in missing cells.",
    "template_config": {"row_headers":["Boys","Girls","Total"],"col_headers":["Soccer","Basketball","Total"],"cells":[[12,None,25],[None,10,23],[20,None,48]],"answers":{"r0c1":13,"r1c0":13,"r2c1":28}},
})
add(c2, m6, 2, "Card Sort", "math_interactive", "math_interactive", {
    "template_type": "card_sort", "instructions": "Drag each expression to the correct category.",
    "template_config": {"categories":[{"id":"linear","label":"Linear","color":"#4C97FF"},{"id":"quadratic","label":"Quadratic","color":"#FF8C1A"},{"id":"exponential","label":"Exponential","color":"#40BF4A"}],
        "cards":[{"id":"c1","text":"y = 3x - 7","category":"linear"},{"id":"c2","text":"y = x\u00b2 + 2x","category":"quadratic"},{"id":"c3","text":"y = 2(3)^x","category":"exponential"},{"id":"c4","text":"y = -4x","category":"linear"},{"id":"c5","text":"y = (x-3)\u00b2","category":"quadratic"},{"id":"c6","text":"y = 100(0.5)^x","category":"exponential"}]},
})
add(c2, m6, 3, "Table Pattern", "math_interactive", "math_interactive", {
    "template_type": "table_pattern", "instructions": "Complete the table and find the rule.",
    "template_config": {"x_values":[1,2,3,4,5,6],"y_values":[3,5,None,9,None,13],"rule_label":"Rule: f(x) =","rule_answer":"2x+1","answers":{"2":7,"4":11}},
})

m7 = create_module(c2, "Graphs & Functions", 2)
add(c2, m7, 0, "Function Graph (Linear)", "math_interactive", "math_interactive", {
    "template_type": "function_graph", "instructions": "Match the target line.",
    "template_config": {"function_type": "linear", "target_params": {"m": 2, "b": -1}, "grid_range": 6, "show_target": True, "tolerance": 0.3},
})
add(c2, m7, 1, "Function Graph (Quadratic)", "math_interactive", "math_interactive", {
    "template_type": "function_graph", "instructions": "Match the quadratic function.",
    "template_config": {"function_type": "quadratic", "target_params": {"a": 1, "b": 0, "c": -2}, "grid_range": 6, "show_target": True, "tolerance": 0.3},
})
add(c2, m7, 2, "Inequality Graph", "math_interactive", "math_interactive", {
    "template_type": "inequality_graph", "instructions": "Graph and shade: $y \\geq x - 2$",
    "template_config": {"slope": 1, "intercept": -2, "operator": ">=", "grid_range": 6, "tolerance": 0.4},
})
add(c2, m7, 3, "Graph Transformations", "math_interactive", "math_interactive", {
    "template_type": "graph_transform", "instructions": "Apply transformations to match the target.",
    "template_config": {"parent_function": "x^2", "target_h": -1, "target_v": 2, "target_a": 1, "grid_range": 6, "tolerance": 0.3},
})

m8 = create_module(c2, "Problem Solving", 3)
add(c2, m8, 0, "Arithmetic Puzzle", "math_interactive", "math_interactive", {
    "template_type": "arithmetic_puzzle", "instructions": "Fill in the missing numbers.",
    "template_config": {"equations": [
        {"cells":[{"value":None,"display":"_"},{"value":None,"display":"+"},{"value":5,"display":"5"},{"value":None,"display":"="},{"value":12,"display":"12"}],"answer":7,"blankIndex":0},
        {"cells":[{"value":18,"display":"18"},{"value":None,"display":"-"},{"value":None,"display":"_"},{"value":None,"display":"="},{"value":11,"display":"11"}],"answer":7,"blankIndex":2},
    ]},
})
add(c2, m8, 1, "Equation Solver", "math_interactive", "math_interactive", {
    "template_type": "equation_solver", "instructions": "Solve step by step.",
    "template_config": {"initial_left": "4x + 12", "initial_right": "28", "final_answer": "x = 4",
        "steps": [{"id":"s1","action":"sub12","actionLabel":"Subtract 12 from both sides","resultLeft":"4x","resultRight":"16"},
                  {"id":"s2","action":"div4","actionLabel":"Divide both sides by 4","resultLeft":"x","resultRight":"4"}]},
})
add(c2, m8, 2, "Venn Diagram", "math_interactive", "math_interactive", {
    "template_type": "venn_diagram", "instructions": "Fill in the missing values.",
    "template_config": {"set_a_label":"Basketball","set_b_label":"Soccer","total":50,"regions":{"a_only":None,"b_only":15,"intersection":10,"neither":None},"answers":{"a_only":18,"neither":7}},
})
add(c2, m8, 3, "Multiple Choice (SAT)", "math_interactive", "math_interactive", {
    "template_type": "multiple_choice_math", "instructions": "",
    "template_config": {"question": "If $2x + 5 = 17$, what is $x$?", "choices": [{"text":"4","correct":False},{"text":"6","correct":True},{"text":"8","correct":False},{"text":"12","correct":False}], "explanation": "$2x = 12$, $x = 6$."},
})

publish(c2)
print("\nDone! Both courses created and published.")
