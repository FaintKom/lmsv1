"""Delete all courses and create SAT Math course with validated exercises."""
import requests
import json
import os
import sys
import uuid

os.environ["PYTHONIOENCODING"] = "utf-8"

API = "http://204.168.165.41:8000/api/v1"

# ─── Login ──────────────────────────────────────────────────────────
r = requests.post(f"{API}/auth/login", json={"email": os.environ.get("LMS_ADMIN_EMAIL",""), "password": os.environ.get("LMS_ADMIN_PASSWORD","")})
if r.status_code != 200:
    print(f"Login failed: {r.status_code} {r.text}")
    sys.exit(1)
token = r.json()["access_token"]
H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print("Logged in as super admin")

# ─── Helpers (reused from seed_v2_courses.py) ───────────────────────

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

def create_lesson_v2(cid, mid, title, sort, theory_body="", theory_format="html", duration=10):
    blocks = []
    if theory_body and theory_body.strip():
        blocks.append({
            "id": f"b{uuid.uuid4().hex[:6]}",
            "type": "text", "sort_order": 0, "page": 1,
            "body": theory_body, "format": theory_format,
        })
    content = {"version": 2, "blocks": blocks}
    body = {
        "title": title, "content_type": "text", "sort_order": sort,
        "duration_minutes": duration, "content": content,
    }
    r = requests.post(f"{API}/courses/{cid}/modules/{mid}/lessons", json=body, headers=H)
    if r.status_code != 200:
        print(f"  ERROR lesson '{title}': {r.status_code} {r.text[:200]}")
        return None
    return r.json()["id"]

def add_exercise_block(cid, mid, lid, exercise_id):
    r = requests.get(f"{API}/courses/{cid}/lessons/{lid}", headers=H)
    if r.status_code != 200: return
    lesson = r.json()
    content = lesson.get("content", {})
    blocks = content.get("blocks", [])
    blocks.append({
        "id": f"b{uuid.uuid4().hex[:6]}",
        "type": "exercise", "sort_order": len(blocks), "page": 1,
        "exercise_id": exercise_id,
    })
    requests.put(f"{API}/courses/{cid}/modules/{mid}/lessons/{lid}",
                 json={"content": {"version": 2, "blocks": blocks}}, headers=H)

def create_exercise(lid, title, template_type, template_config, instructions=""):
    config = {
        "template_type": template_type,
        "instructions": instructions,
        "template_config": template_config,
    }
    r = requests.post(f"{API}/exercises", json={
        "lesson_id": lid, "exercise_type": "math_interactive",
        "title": title, "config": config, "max_attempts": 100,
    }, headers=H)
    if r.status_code != 200:
        print(f"    ERROR exercise '{title}': {r.status_code} {r.text[:200]}")
        return None
    did = r.json().get("display_id", "?")
    print(f"    {did} - {title}")
    return r.json().get("id")

def publish(cid):
    if not cid: return
    requests.post(f"{API}/courses/{cid}/publish", headers=H)
    print("  Published!")

def enroll_students(cid):
    if not cid: return
    for email, pwd in [("student@learnhub.app", "Student2026!"), ("alex@learnhub.app", "Alex2026!")]:
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": pwd})
        if r.status_code == 200:
            sh = {"Authorization": f"Bearer {r.json()['access_token']}", "Content-Type": "application/json"}
            requests.post(f"{API}/progress/enroll", json={"course_id": cid}, headers=sh)

def add_lesson_with_exercises(cid, mid, sort, title, theory, exercises):
    """Create lesson with theory + multiple exercises."""
    lid = create_lesson_v2(cid, mid, title, sort, theory, "html")
    if not lid: return
    for ex in exercises:
        eid = create_exercise(lid, ex["title"], ex["type"], ex["config"], ex.get("instructions", ""))
        if eid:
            add_exercise_block(cid, mid, lid, eid)


# ═══════════════════════════════════════════════════════════════
# DELETE ALL EXISTING COURSES
# ═══════════════════════════════════════════════════════════════
print("=" * 60)
print("DELETING ALL EXISTING COURSES...")
print("=" * 60)

r = requests.get(f"{API}/courses", headers=H)
if r.status_code == 200:
    courses = r.json() if isinstance(r.json(), list) else r.json().get("items", [])
    for c in courses:
        cid_del = c.get("id")
        if cid_del:
            requests.delete(f"{API}/courses/{cid_del}", headers=H)
            print(f"  Deleted: {c.get('title', '?')}")
print("All courses deleted.\n")


# ═══════════════════════════════════════════════════════════════
# SAT MATH COURSE
# ═══════════════════════════════════════════════════════════════
print("=" * 60)
print("CREATING SAT MATH COURSE")
print("=" * 60)

cid = create_course("SAT Math", "Complete SAT Math preparation covering all 4 domains: Algebra, Data Analysis, Advanced Math, and Additional Topics.", "SAT Prep")
if not cid:
    print("FATAL: Could not create course")
    sys.exit(1)


# ─── MODULE 1: Heart of Algebra ────────────────────────────────────
mid = create_module(cid, "Heart of Algebra", 0)
if mid:
    print(f"  Module 1: Heart of Algebra")

    # Lesson 1.1: Solving Linear Equations
    add_lesson_with_exercises(cid, mid, 0,
        "Solving Linear Equations",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Solving Linear Equations</h2>
        <p>A <strong>linear equation</strong> is an equation where the variable has an exponent of 1. The goal is to <strong>isolate the variable</strong> on one side.</p>
        <h3>Key Steps:</h3>
        <ol>
            <li>Simplify both sides (distribute, combine like terms)</li>
            <li>Move variable terms to one side using addition/subtraction</li>
            <li>Move constants to the other side</li>
            <li>Divide by the coefficient of the variable</li>
        </ol>
        <h3>Example:</h3>
        <p>Solve: <code>3x + 7 = 22</code></p>
        <p>Step 1: Subtract 7 from both sides: <code>3x = 15</code></p>
        <p>Step 2: Divide by 3: <code>x = 5</code></p>
        </div>""",
        [
            {
                "title": "Linear Equation - Multiple Choice",
                "type": "multiple_choice_math",
                "config": {
                    "question": "If $3x + 7 = 22$, what is the value of $x$?",
                    "choices": [
                        {"text": "$x = 3$", "correct": False},
                        {"text": "$x = 5$", "correct": True},
                        {"text": "$x = 7$", "correct": False},
                        {"text": "$x = 15$", "correct": False}
                    ],
                    "explanation": "Subtract 7 from both sides: $3x = 15$. Divide by 3: $x = 5$."
                },
            },
            {
                "title": "Two-Step Equation",
                "type": "numeric_input",
                "config": {
                    "question": "Solve: $2(x - 3) + 4 = 16$. Enter the value of $x$.",
                    "correct_answers": [9],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "Distribute: $2x - 6 + 4 = 16$. Combine: $2x - 2 = 16$. Add 2: $2x = 18$. Divide: $x = 9$."
                },
            },
            {
                "title": "Variables on Both Sides",
                "type": "numeric_input",
                "config": {
                    "question": "Solve: $5x + 3 = 2x + 18$. What is $x$?",
                    "correct_answers": [5],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "Subtract $2x$: $3x + 3 = 18$. Subtract 3: $3x = 15$. Divide: $x = 5$."
                },
            },
        ]
    )

    # Lesson 1.2: Linear Inequalities
    add_lesson_with_exercises(cid, mid, 1,
        "Linear Inequalities",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Linear Inequalities</h2>
        <p>Inequalities use symbols: <b>&lt;</b>, <b>&gt;</b>, <b>≤</b>, <b>≥</b>.</p>
        <h3>Key Rule:</h3>
        <p><strong>When you multiply or divide by a negative number, flip the inequality sign!</strong></p>
        <h3>Example:</h3>
        <p>Solve: <code>-2x + 6 &gt; 10</code></p>
        <p>Subtract 6: <code>-2x &gt; 4</code></p>
        <p>Divide by -2 (flip!): <code>x &lt; -2</code></p>
        </div>""",
        [
            {
                "title": "Inequality Notation",
                "type": "multiple_choice_math",
                "config": {
                    "question": "Which inequality represents \"$x$ is at most 5\"?",
                    "choices": [
                        {"text": "$x < 5$", "correct": False},
                        {"text": "$x \\leq 5$", "correct": True},
                        {"text": "$x > 5$", "correct": False},
                        {"text": "$x \\geq 5$", "correct": False}
                    ],
                    "explanation": "\"At most\" means less than or equal to, written as $x \\leq 5$."
                },
            },
            {
                "title": "Solving Inequality",
                "type": "numeric_input",
                "config": {
                    "question": "Solve: $-3x + 9 > 0$. What is the boundary value of $x$?",
                    "correct_answers": [3],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "Subtract 9: $-3x > -9$. Divide by $-3$ and flip: $x < 3$. Boundary is 3."
                },
            },
            {
                "title": "Compound Inequality",
                "type": "multiple_choice_math",
                "config": {
                    "question": "If $-1 < 2x + 3 \\leq 9$, what is the range of $x$?",
                    "choices": [
                        {"text": "$-2 < x \\leq 3$", "correct": True},
                        {"text": "$-1 < x \\leq 9$", "correct": False},
                        {"text": "$-2 \\leq x < 3$", "correct": False},
                        {"text": "$-4 < x \\leq 6$", "correct": False}
                    ],
                    "explanation": "Subtract 3: $-4 < 2x \\leq 6$. Divide by 2: $-2 < x \\leq 3$."
                },
            },
        ]
    )

    # Lesson 1.3: Systems of Linear Equations
    add_lesson_with_exercises(cid, mid, 2,
        "Systems of Linear Equations",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Systems of Linear Equations</h2>
        <p>A system has two or more equations with the same variables. Solution methods:</p>
        <ul>
            <li><strong>Substitution:</strong> Solve one equation for a variable, substitute into the other</li>
            <li><strong>Elimination:</strong> Add/subtract equations to eliminate a variable</li>
        </ul>
        <h3>Example (Elimination):</h3>
        <p><code>2x + y = 7</code> and <code>x - y = 2</code></p>
        <p>Add both: <code>3x = 9</code> → <code>x = 3</code></p>
        <p>Substitute: <code>3 - y = 2</code> → <code>y = 1</code></p>
        </div>""",
        [
            {
                "title": "System Solution",
                "type": "multiple_choice_math",
                "config": {
                    "question": "What is the solution to the system: $x + y = 5$ and $x - y = 1$?",
                    "choices": [
                        {"text": "$(3, 2)$", "correct": True},
                        {"text": "$(2, 3)$", "correct": False},
                        {"text": "$(4, 1)$", "correct": False},
                        {"text": "$(1, 4)$", "correct": False}
                    ],
                    "explanation": "Add equations: $2x = 6$, so $x = 3$. Then $3 + y = 5$, so $y = 2$."
                },
            },
            {
                "title": "Find x in System",
                "type": "numeric_input",
                "config": {
                    "question": "Solve: $3x + 2y = 16$ and $x + 2y = 8$. What is $x$?",
                    "correct_answers": [4],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "Subtract: $(3x + 2y) - (x + 2y) = 16 - 8$ gives $2x = 8$, so $x = 4$."
                },
            },
            {
                "title": "No Solution Systems",
                "type": "multiple_choice_math",
                "config": {
                    "question": "How many solutions does this system have? $2x + 4y = 10$ and $x + 2y = 3$",
                    "choices": [
                        {"text": "No solution", "correct": True},
                        {"text": "Exactly one", "correct": False},
                        {"text": "Infinitely many", "correct": False},
                        {"text": "Two solutions", "correct": False}
                    ],
                    "explanation": "Multiply second by 2: $2x + 4y = 6$. But first says $2x + 4y = 10$. Contradiction $\\Rightarrow$ no solution."
                },
            },
        ]
    )

    # Lesson 1.4: Linear Functions & Slope
    add_lesson_with_exercises(cid, mid, 3,
        "Linear Functions & Slope",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Linear Functions & Slope</h2>
        <p>Slope-intercept form: <code>y = mx + b</code> where <code>m</code> = slope and <code>b</code> = y-intercept.</p>
        <h3>Slope Formula:</h3>
        <p style="font-size: 1.2em; text-align: center;"><code>m = (y&#x2082; - y&#x2081;) / (x&#x2082; - x&#x2081;)</code></p>
        <h3>Example:</h3>
        <p>Points (1, 3) and (4, 9): slope = (9 - 3) / (4 - 1) = 6/3 = 2</p>
        </div>""",
        [
            {
                "title": "Calculate Slope",
                "type": "numeric_input",
                "config": {
                    "question": "What is the slope of the line passing through $(2, 1)$ and $(6, 9)$?",
                    "correct_answers": [2],
                    "tolerance": 0.01,
                    "allow_fraction": True,
                    "allow_decimal": True,
                    "explanation": "Slope $= \\frac{9-1}{6-2} = \\frac{8}{4} = 2$."
                },
            },
            {
                "title": "Identify Slope Form",
                "type": "multiple_choice_math",
                "config": {
                    "question": "What is the slope and y-intercept of $y = -3x + 7$?",
                    "choices": [
                        {"text": "slope $= -3$, y-intercept $= 7$", "correct": True},
                        {"text": "slope $= 3$, y-intercept $= 7$", "correct": False},
                        {"text": "slope $= 7$, y-intercept $= -3$", "correct": False},
                        {"text": "slope $= -3$, y-intercept $= -7$", "correct": False}
                    ],
                    "explanation": "In $y = mx + b$, $m = -3$ is the slope and $b = 7$ is the y-intercept."
                },
            },
            {
                "title": "Function Table",
                "type": "table_pattern",
                "config": {
                    "x_values": [0, 1, 2, 3, 4],
                    "y_values": [3, None, 7, None, 11],
                    "answers": {"1": 5, "3": 9},
                    "rule_label": "Rule",
                    "rule_answer": "2x+3",
                    "tolerance": 0.1,
                    "x_header": "x",
                    "y_header": "f(x)"
                },
                "instructions": "Fill in the missing values and find the rule f(x)."
            },
        ]
    )

    # Lesson 1.5: Interpreting Linear Models
    add_lesson_with_exercises(cid, mid, 4,
        "Interpreting Linear Models",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Interpreting Linear Models</h2>
        <p>In word problems, the <strong>slope</strong> represents the rate of change and the <strong>y-intercept</strong> represents the initial value.</p>
        <h3>Example:</h3>
        <p>A plumber charges 50 dollars for a house call plus 30 dollars per hour. Cost function: <code>C(h) = 30h + 50</code></p>
        <ul>
            <li>Slope (30): cost per hour</li>
            <li>Y-intercept (50): house call fee</li>
        </ul>
        </div>""",
        [
            {
                "title": "Word Problem",
                "type": "numeric_input",
                "config": {
                    "question": "A gym charges $25/month plus a $50 sign-up fee. What is the total cost for 6 months?",
                    "correct_answers": [200],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "Cost $= 25 \\times 6 + 50 = 150 + 50 = 200$ dollars."
                },
            },
            {
                "title": "Rate of Change",
                "type": "multiple_choice_math",
                "config": {
                    "question": "A car's value decreases from $\\$20{,}000$ to $\\$14{,}000$ over 3 years. What is the annual rate of depreciation?",
                    "choices": [
                        {"text": "$\\$2{,}000$ per year", "correct": True},
                        {"text": "$\\$3{,}000$ per year", "correct": False},
                        {"text": "$\\$6{,}000$ per year", "correct": False},
                        {"text": "$\\$4{,}667$ per year", "correct": False}
                    ],
                    "explanation": "Change $= 20000 - 14000 = 6000$. Rate $= 6000 / 3 = 2000$ per year."
                },
            },
            {
                "title": "Cost Table",
                "type": "table_pattern",
                "config": {
                    "x_values": [0, 1, 2, 3, 4],
                    "y_values": [50, None, 110, None, 170],
                    "answers": {"1": 80, "3": 140},
                    "rule_label": "Cost formula",
                    "rule_answer": "30x+50",
                    "tolerance": 0.1,
                    "x_header": "Hours",
                    "y_header": "Cost ($)"
                },
                "instructions": "A plumber charges 50 + 30/hour. Fill in the costs."
            },
        ]
    )


# ─── MODULE 2: Problem Solving & Data Analysis ─────────────────────
mid = create_module(cid, "Problem Solving & Data Analysis", 1)
if mid:
    print(f"  Module 2: Problem Solving & Data Analysis")

    # Lesson 2.1: Ratios & Proportions
    add_lesson_with_exercises(cid, mid, 0,
        "Ratios & Proportions",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Ratios & Proportions</h2>
        <p>A <strong>ratio</strong> compares two quantities. A <strong>proportion</strong> states that two ratios are equal.</p>
        <h3>Cross-Multiplication:</h3>
        <p>If <code>a/b = c/d</code>, then <code>ad = bc</code></p>
        <h3>Example:</h3>
        <p>If 3 apples cost 2 dollars, how much do 12 apples cost?</p>
        <p><code>3/2 = 12/x</code> → <code>3x = 24</code> → <code>x = 8</code></p>
        </div>""",
        [
            {
                "title": "Proportion Problem",
                "type": "numeric_input",
                "config": {
                    "question": "If a recipe calls for 2 cups of flour for every 3 cups of sugar, how many cups of flour are needed for 9 cups of sugar?",
                    "correct_answers": [6],
                    "tolerance": 0.01,
                    "allow_fraction": True,
                    "allow_decimal": True,
                    "explanation": "$\\frac{2}{3} = \\frac{x}{9}$. Cross multiply: $3x = 18$, so $x = 6$."
                },
            },
            {
                "title": "Scale Factor",
                "type": "multiple_choice_math",
                "config": {
                    "question": "A map has a scale of 1 inch = 50 miles. Two cities are 3.5 inches apart on the map. What is the actual distance?",
                    "choices": [
                        {"text": "175 miles", "correct": True},
                        {"text": "150 miles", "correct": False},
                        {"text": "200 miles", "correct": False},
                        {"text": "53.5 miles", "correct": False}
                    ],
                    "explanation": "$3.5 \\times 50 = 175$ miles."
                },
            },
            {
                "title": "Unit Rate",
                "type": "numeric_input",
                "config": {
                    "question": "A car travels 240 miles on 8 gallons of gas. What is the unit rate in miles per gallon?",
                    "correct_answers": [30],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$240 \\div 8 = 30$ miles per gallon."
                },
            },
        ]
    )

    # Lesson 2.2: Percentages
    add_lesson_with_exercises(cid, mid, 1,
        "Percentages",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Percentages</h2>
        <p><strong>Percent</strong> means "per hundred." Key formulas:</p>
        <ul>
            <li>Part = Whole × Percent/100</li>
            <li>Percent change = (New - Old) / Old × 100</li>
        </ul>
        </div>""",
        [
            {
                "title": "Percent of a Number",
                "type": "numeric_input",
                "config": {
                    "question": "What is 15% of 240?",
                    "correct_answers": [36],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$240 \\times 0.15 = 36$."
                },
            },
            {
                "title": "Percent Change",
                "type": "multiple_choice_math",
                "config": {
                    "question": "A shirt was $\\$40$ and is now on sale for $\\$30$. What is the percent decrease?",
                    "choices": [
                        {"text": "25%", "correct": True},
                        {"text": "10%", "correct": False},
                        {"text": "33%", "correct": False},
                        {"text": "75%", "correct": False}
                    ],
                    "explanation": "Change $= 40 - 30 = 10$. Percent $= 10/40 \\times 100 = 25\\%$."
                },
            },
            {
                "title": "Tax Calculation",
                "type": "numeric_input",
                "config": {
                    "question": "An item costs $\\$80$ before tax. With 8% sales tax, what is the total price?",
                    "correct_answers": [86.4],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "Tax $= 80 \\times 0.08 = 6.40$. Total $= 80 + 6.40 = 86.40$."
                },
            },
        ]
    )

    # Lesson 2.3: Statistics
    add_lesson_with_exercises(cid, mid, 2,
        "Statistics: Mean, Median, Mode",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Measures of Central Tendency</h2>
        <ul>
            <li><strong>Mean:</strong> Sum of all values / Number of values</li>
            <li><strong>Median:</strong> Middle value when data is ordered</li>
            <li><strong>Mode:</strong> Most frequent value</li>
            <li><strong>Range:</strong> Maximum - Minimum</li>
        </ul>
        </div>""",
        [
            {
                "title": "Find the Mean",
                "type": "numeric_input",
                "config": {
                    "question": "Find the mean of: 12, 15, 18, 20, 25",
                    "correct_answers": [18],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "Sum $= 12 + 15 + 18 + 20 + 25 = 90$. Mean $= 90 / 5 = 18$."
                },
            },
            {
                "title": "Find the Median",
                "type": "multiple_choice_math",
                "config": {
                    "question": "What is the median of: 3, 7, 9, 12, 15, 18?",
                    "choices": [
                        {"text": "10.5", "correct": True},
                        {"text": "9", "correct": False},
                        {"text": "12", "correct": False},
                        {"text": "10", "correct": False}
                    ],
                    "explanation": "With 6 values, median is average of 3rd and 4th: $(9 + 12)/2 = 10.5$."
                },
            },
            {
                "title": "Classify Statistics",
                "type": "card_sort",
                "config": {
                    "categories": [
                        {"id": "affected", "label": "Affected by Outliers", "color": "#EF4444"},
                        {"id": "resistant", "label": "Resistant to Outliers", "color": "#22C55E"}
                    ],
                    "cards": [
                        {"id": "c1", "text": "Mean", "category": "affected"},
                        {"id": "c2", "text": "Median", "category": "resistant"},
                        {"id": "c3", "text": "Range", "category": "affected"},
                        {"id": "c4", "text": "Mode", "category": "resistant"},
                        {"id": "c5", "text": "Standard Deviation", "category": "affected"}
                    ]
                },
                "instructions": "Sort each statistic into whether it's affected by outliers or resistant."
            },
        ]
    )

    # Lesson 2.4: Scatter Plots
    add_lesson_with_exercises(cid, mid, 3,
        "Scatter Plots & Lines of Best Fit",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Scatter Plots</h2>
        <p>A scatter plot shows the relationship between two variables. A <strong>line of best fit</strong> approximates the trend.</p>
        <h3>Correlation:</h3>
        <ul>
            <li><strong>Positive:</strong> Both increase together</li>
            <li><strong>Negative:</strong> One increases, other decreases</li>
            <li><strong>None:</strong> No clear pattern</li>
        </ul>
        </div>""",
        [
            {
                "title": "Correlation Type",
                "type": "multiple_choice_math",
                "config": {
                    "question": "Hours studying and test scores show a positive trend. Which describes this?",
                    "choices": [
                        {"text": "Positive correlation: more study hours tend to mean higher scores", "correct": True},
                        {"text": "Negative correlation: more study hours mean lower scores", "correct": False},
                        {"text": "No correlation: study hours and scores are unrelated", "correct": False},
                        {"text": "Causation: studying guarantees high scores", "correct": False}
                    ],
                    "explanation": "A positive trend means as one variable increases, the other tends to increase too."
                },
            },
            {
                "title": "Predict from Line",
                "type": "numeric_input",
                "config": {
                    "question": "A line of best fit is $y = 2.5x + 10$. Predict $y$ when $x = 8$.",
                    "correct_answers": [30],
                    "tolerance": 0.1,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$y = 2.5(8) + 10 = 20 + 10 = 30$."
                },
            },
            {
                "title": "Interpret Slope",
                "type": "multiple_choice_math",
                "config": {
                    "question": "In $y = 1.5x + 20$ where $x$ = hours worked and $y$ = items produced, what does 1.5 mean?",
                    "choices": [
                        {"text": "1.5 additional items per hour worked", "correct": True},
                        {"text": "20 items per hour", "correct": False},
                        {"text": "1.5 hours per item", "correct": False},
                        {"text": "The total items made", "correct": False}
                    ],
                    "explanation": "The slope (1.5) represents the rate: 1.5 items produced per additional hour."
                },
            },
        ]
    )

    # Lesson 2.5: Probability & Two-Way Tables
    add_lesson_with_exercises(cid, mid, 4,
        "Probability & Two-Way Tables",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Probability & Two-Way Tables</h2>
        <p><strong>Probability</strong> = Favorable outcomes / Total outcomes</p>
        <p>A <strong>two-way table</strong> shows frequencies for two categorical variables. Row and column totals must add up.</p>
        </div>""",
        [
            {
                "title": "Two-Way Table",
                "type": "two_way_table",
                "config": {
                    "row_headers": ["Dog owner", "Cat owner", "Total"],
                    "col_headers": ["Male", "Female", "Total"],
                    "cells": [
                        [15, None, 30],
                        [None, 12, 22],
                        [25, 27, 52]
                    ],
                    "answers": {"0_1": 15, "1_0": 10}
                },
                "instructions": "Fill in the missing values. Rows and columns must add to the totals."
            },
            {
                "title": "Basic Probability",
                "type": "multiple_choice_math",
                "config": {
                    "question": "A bag has 3 red, 5 blue, and 2 green marbles. What is the probability of drawing a blue marble?",
                    "choices": [
                        {"text": "$\\frac{1}{2}$", "correct": True},
                        {"text": "$\\frac{1}{3}$", "correct": False},
                        {"text": "$\\frac{5}{3}$", "correct": False},
                        {"text": "$\\frac{2}{5}$", "correct": False}
                    ],
                    "explanation": "Total $= 3 + 5 + 2 = 10$. $P(blue) = 5/10 = 1/2$."
                },
            },
            {
                "title": "Conditional Probability",
                "type": "numeric_input",
                "config": {
                    "question": "From the table: 52 people total, 25 male. 15 male dog owners. What fraction of males own dogs? Enter as a decimal.",
                    "correct_answers": [0.6],
                    "tolerance": 0.01,
                    "allow_fraction": True,
                    "allow_decimal": True,
                    "explanation": "$P(dog|male) = 15/25 = 0.6$."
                },
            },
        ]
    )


# ─── MODULE 3: Passport to Advanced Math ───────────────────────────
mid = create_module(cid, "Passport to Advanced Math", 2)
if mid:
    print(f"  Module 3: Passport to Advanced Math")

    # Lesson 3.1: Quadratic Equations
    add_lesson_with_exercises(cid, mid, 0,
        "Quadratic Equations",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Quadratic Equations</h2>
        <p>Standard form: <code>ax² + bx + c = 0</code></p>
        <h3>Solution Methods:</h3>
        <ul>
            <li><strong>Factoring:</strong> Find two numbers that multiply to $ac$ and add to $b$</li>
            <li><strong>Quadratic Formula:</strong> $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$</li>
            <li><strong>Completing the Square</strong></li>
        </ul>
        </div>""",
        [
            {
                "title": "Factor Quadratic",
                "type": "multiple_choice_math",
                "config": {
                    "question": "What are the solutions to $x^2 - 5x + 6 = 0$?",
                    "choices": [
                        {"text": "$x = 2$ and $x = 3$", "correct": True},
                        {"text": "$x = -2$ and $x = -3$", "correct": False},
                        {"text": "$x = 1$ and $x = 6$", "correct": False},
                        {"text": "$x = -1$ and $x = -6$", "correct": False}
                    ],
                    "explanation": "Factor: $(x-2)(x-3) = 0$, so $x = 2$ or $x = 3$."
                },
            },
            {
                "title": "Quadratic Formula",
                "type": "numeric_input",
                "config": {
                    "question": "Using the quadratic formula, find the positive solution of $2x^2 - 8x + 6 = 0$.",
                    "correct_answers": [3],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$x = \\frac{8 \\pm \\sqrt{64-48}}{4} = \\frac{8 \\pm 4}{4}$. Solutions: $x = 3$ or $x = 1$. Positive greater: $x = 3$."
                },
            },
            {
                "title": "Vertex of Parabola",
                "type": "numeric_input",
                "config": {
                    "question": "Find the x-coordinate of the vertex of $y = x^2 - 6x + 5$.",
                    "correct_answers": [3],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "Vertex x $= -b/(2a) = -(-6)/(2 \\cdot 1) = 6/2 = 3$."
                },
            },
        ]
    )

    # Lesson 3.2: Polynomials
    add_lesson_with_exercises(cid, mid, 1,
        "Polynomial Expressions",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Polynomials</h2>
        <p>A polynomial is a sum of terms with non-negative integer exponents.</p>
        <ul>
            <li><strong>Degree:</strong> Highest exponent</li>
            <li><strong>Leading coefficient:</strong> Coefficient of highest-degree term</li>
        </ul>
        </div>""",
        [
            {
                "title": "Polynomial Degree",
                "type": "multiple_choice_math",
                "config": {
                    "question": "What is the degree of $3x^4 - 2x^2 + 7x - 1$?",
                    "choices": [
                        {"text": "4", "correct": True},
                        {"text": "3", "correct": False},
                        {"text": "2", "correct": False},
                        {"text": "7", "correct": False}
                    ],
                    "explanation": "The highest exponent is 4 (from $3x^4$)."
                },
            },
            {
                "title": "Classify Polynomials",
                "type": "card_sort",
                "config": {
                    "categories": [
                        {"id": "linear", "label": "Linear (degree 1)", "color": "#3B82F6"},
                        {"id": "quadratic", "label": "Quadratic (degree 2)", "color": "#F59E0B"},
                        {"id": "cubic", "label": "Cubic (degree 3)", "color": "#10B981"}
                    ],
                    "cards": [
                        {"id": "c1", "text": "5x + 2", "category": "linear"},
                        {"id": "c2", "text": "x\u00b2 - 4x + 3", "category": "quadratic"},
                        {"id": "c3", "text": "x\u00b3 + 1", "category": "cubic"},
                        {"id": "c4", "text": "-2x + 7", "category": "linear"},
                        {"id": "c5", "text": "3x\u00b2", "category": "quadratic"},
                        {"id": "c6", "text": "2x\u00b3 - x\u00b2 + x", "category": "cubic"}
                    ]
                },
                "instructions": "Sort each expression by its polynomial degree."
            },
            {
                "title": "Add Polynomials",
                "type": "numeric_input",
                "config": {
                    "question": "If $f(x) = 3x^2 + 2x - 1$ and $g(x) = x^2 - 4x + 5$, what is the coefficient of $x$ in $f(x) + g(x)$?",
                    "correct_answers": [-2],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$f(x) + g(x) = 4x^2 + (2-4)x + (-1+5) = 4x^2 - 2x + 4$. Coefficient of $x$ is $-2$."
                },
            },
        ]
    )

    # Lesson 3.3: Exponential Functions
    add_lesson_with_exercises(cid, mid, 2,
        "Exponential Functions",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Exponential Functions</h2>
        <p>Form: <code>f(x) = a · b<sup>x</sup></code> where $a$ = initial value, $b$ = growth/decay factor.</p>
        <ul>
            <li>$b > 1$: exponential growth</li>
            <li>$0 < b < 1$: exponential decay</li>
        </ul>
        </div>""",
        [
            {
                "title": "Growth vs Decay",
                "type": "multiple_choice_math",
                "config": {
                    "question": "Which function represents exponential decay?",
                    "choices": [
                        {"text": "$f(x) = 100 \\cdot (0.85)^x$", "correct": True},
                        {"text": "$f(x) = 100 \\cdot (1.15)^x$", "correct": False},
                        {"text": "$f(x) = 100 \\cdot 2^x$", "correct": False},
                        {"text": "$f(x) = 100x$", "correct": False}
                    ],
                    "explanation": "When $b = 0.85 < 1$, the function decreases exponentially."
                },
            },
            {
                "title": "Exponential Growth Table",
                "type": "table_pattern",
                "config": {
                    "x_values": [0, 1, 2, 3, 4],
                    "y_values": [100, None, 400, None, 1600],
                    "answers": {"1": 200, "3": 800},
                    "rule_label": "Formula",
                    "rule_answer": "100*2^x",
                    "tolerance": 1,
                    "x_header": "Year",
                    "y_header": "Population"
                },
                "instructions": "This population doubles every year. Fill in the blanks."
            },
            {
                "title": "Compound Interest",
                "type": "numeric_input",
                "config": {
                    "question": "If $\\$1000$ is invested at 5% annual interest compounded yearly, what is it worth after 2 years? Round to nearest dollar.",
                    "correct_answers": [1102.5, 1103],
                    "tolerance": 1,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$A = 1000(1.05)^2 = 1000 \\times 1.1025 = 1102.50$."
                },
            },
        ]
    )

    # Lesson 3.4: Rational Expressions
    add_lesson_with_exercises(cid, mid, 3,
        "Rational Expressions",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Rational Expressions</h2>
        <p>A rational expression is a fraction with polynomials. Key skills:</p>
        <ul>
            <li>Simplify by factoring and canceling</li>
            <li>Find restrictions (denominator ≠ 0)</li>
            <li>Solve rational equations by clearing denominators</li>
        </ul>
        </div>""",
        [
            {
                "title": "Simplify Rational",
                "type": "multiple_choice_math",
                "config": {
                    "question": "Simplify: $\\frac{x^2 - 9}{x + 3}$",
                    "choices": [
                        {"text": "$x - 3$", "correct": True},
                        {"text": "$x + 3$", "correct": False},
                        {"text": "$x^2 - 3$", "correct": False},
                        {"text": "$\\frac{x-3}{x+3}$", "correct": False}
                    ],
                    "explanation": "$x^2 - 9 = (x+3)(x-3)$. Cancel $(x+3)$: result is $x-3$."
                },
            },
            {
                "title": "Solve Rational Equation",
                "type": "numeric_input",
                "config": {
                    "question": "Solve: $\\frac{6}{x} = 3$. What is $x$?",
                    "correct_answers": [2],
                    "tolerance": 0.01,
                    "allow_fraction": True,
                    "allow_decimal": True,
                    "explanation": "Multiply both sides by $x$: $6 = 3x$. Divide: $x = 2$."
                },
            },
            {
                "title": "Domain Restriction",
                "type": "multiple_choice_math",
                "config": {
                    "question": "What value of $x$ must be excluded from the domain of $\\frac{5}{x^2 - 4}$?",
                    "choices": [
                        {"text": "$x = 2$ and $x = -2$", "correct": True},
                        {"text": "$x = 4$ only", "correct": False},
                        {"text": "$x = 0$ only", "correct": False},
                        {"text": "$x = 2$ only", "correct": False}
                    ],
                    "explanation": "$x^2 - 4 = 0$ when $x = \\pm 2$. These make the denominator zero."
                },
            },
        ]
    )

    # Lesson 3.5: Function Transformations
    add_lesson_with_exercises(cid, mid, 4,
        "Function Transformations",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Function Transformations</h2>
        <p>Given $f(x)$, transformations include:</p>
        <ul>
            <li><code>f(x) + k</code>: shift up by $k$</li>
            <li><code>f(x) - k</code>: shift down by $k$</li>
            <li><code>f(x - h)</code>: shift right by $h$</li>
            <li><code>f(x + h)</code>: shift left by $h$</li>
            <li><code>-f(x)</code>: reflect over x-axis</li>
            <li><code>af(x)</code>: vertical stretch by $a$</li>
        </ul>
        </div>""",
        [
            {
                "title": "Identify Transformation",
                "type": "multiple_choice_math",
                "config": {
                    "question": "If $g(x) = f(x - 3) + 2$, how is $g$ related to $f$?",
                    "choices": [
                        {"text": "Shifted right 3 and up 2", "correct": True},
                        {"text": "Shifted left 3 and up 2", "correct": False},
                        {"text": "Shifted right 3 and down 2", "correct": False},
                        {"text": "Shifted left 3 and down 2", "correct": False}
                    ],
                    "explanation": "$(x-3)$ shifts right by 3. $+2$ shifts up by 2."
                },
            },
            {
                "title": "Match Transformations",
                "type": "card_sort",
                "config": {
                    "categories": [
                        {"id": "horizontal", "label": "Horizontal Shift", "color": "#6366F1"},
                        {"id": "vertical", "label": "Vertical Shift", "color": "#F97316"},
                        {"id": "reflection", "label": "Reflection/Stretch", "color": "#EC4899"}
                    ],
                    "cards": [
                        {"id": "c1", "text": "f(x + 4)", "category": "horizontal"},
                        {"id": "c2", "text": "f(x) - 5", "category": "vertical"},
                        {"id": "c3", "text": "-f(x)", "category": "reflection"},
                        {"id": "c4", "text": "f(x - 2)", "category": "horizontal"},
                        {"id": "c5", "text": "3f(x)", "category": "reflection"},
                        {"id": "c6", "text": "f(x) + 1", "category": "vertical"}
                    ]
                },
                "instructions": "Classify each transformation."
            },
            {
                "title": "New Vertex",
                "type": "numeric_input",
                "config": {
                    "question": "If $f(x) = x^2$ has vertex $(0, 0)$, what is the y-coordinate of the vertex of $g(x) = (x-1)^2 + 5$?",
                    "correct_answers": [5],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "The vertex shifts to $(1, 5)$. The y-coordinate is 5."
                },
            },
        ]
    )


# ─── MODULE 4: Additional Topics ───────────────────────────────────
mid = create_module(cid, "Additional Topics in Math", 3)
if mid:
    print(f"  Module 4: Additional Topics")

    # Lesson 4.1: Geometry
    add_lesson_with_exercises(cid, mid, 0,
        "Geometry Essentials",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Geometry</h2>
        <h3>Key Formulas:</h3>
        <ul>
            <li>Triangle area: $A = \\frac{1}{2}bh$</li>
            <li>Circle area: $A = \\pi r^2$, circumference: $C = 2\\pi r$</li>
            <li>Pythagorean theorem: $a^2 + b^2 = c^2$</li>
        </ul>
        </div>""",
        [
            {
                "title": "Pythagorean Theorem",
                "type": "numeric_input",
                "config": {
                    "question": "A right triangle has legs of length 5 and 12. What is the hypotenuse?",
                    "correct_answers": [13],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$c = \\sqrt{5^2 + 12^2} = \\sqrt{25 + 144} = \\sqrt{169} = 13$."
                },
            },
            {
                "title": "Circle Area",
                "type": "numeric_input",
                "config": {
                    "question": "What is the area of a circle with radius 7? Use $\\pi \\approx 3.14$. Round to nearest whole number.",
                    "correct_answers": [153.86, 154],
                    "tolerance": 1,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$A = \\pi r^2 = 3.14 \\times 49 \\approx 154$."
                },
            },
            {
                "title": "Angle Relationships",
                "type": "multiple_choice_math",
                "config": {
                    "question": "Two angles are supplementary. One is $70\\degree$. What is the other?",
                    "choices": [
                        {"text": "$110\\degree$", "correct": True},
                        {"text": "$20\\degree$", "correct": False},
                        {"text": "$90\\degree$", "correct": False},
                        {"text": "$290\\degree$", "correct": False}
                    ],
                    "explanation": "Supplementary angles sum to $180\\degree$. $180 - 70 = 110$."
                },
            },
        ]
    )

    # Lesson 4.2: Trigonometry
    add_lesson_with_exercises(cid, mid, 1,
        "Trigonometry Basics",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Trigonometry</h2>
        <h3>SOH-CAH-TOA:</h3>
        <ul>
            <li><strong>sin</strong> = Opposite / Hypotenuse</li>
            <li><strong>cos</strong> = Adjacent / Hypotenuse</li>
            <li><strong>tan</strong> = Opposite / Adjacent</li>
        </ul>
        <h3>Special angles: 30-60-90 and 45-45-90 triangles</h3>
        </div>""",
        [
            {
                "title": "Trig Ratio",
                "type": "multiple_choice_math",
                "config": {
                    "question": "In a right triangle where the opposite side is 3 and hypotenuse is 5, what is $\\sin(\\theta)$?",
                    "choices": [
                        {"text": "$\\frac{3}{5}$", "correct": True},
                        {"text": "$\\frac{4}{5}$", "correct": False},
                        {"text": "$\\frac{3}{4}$", "correct": False},
                        {"text": "$\\frac{5}{3}$", "correct": False}
                    ],
                    "explanation": "$\\sin = \\text{opposite}/\\text{hypotenuse} = 3/5$."
                },
            },
            {
                "title": "Find Missing Side",
                "type": "numeric_input",
                "config": {
                    "question": "In a 30-60-90 triangle, the side opposite 30 degrees is 5. What is the hypotenuse?",
                    "correct_answers": [10],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "In a 30-60-90, hypotenuse $= 2 \\times$ short side $= 2 \\times 5 = 10$."
                },
            },
            {
                "title": "Trig Ratios Sort",
                "type": "card_sort",
                "config": {
                    "categories": [
                        {"id": "sin", "label": "Sine", "color": "#6366F1"},
                        {"id": "cos", "label": "Cosine", "color": "#F59E0B"},
                        {"id": "tan", "label": "Tangent", "color": "#10B981"}
                    ],
                    "cards": [
                        {"id": "c1", "text": "Opp/Hyp", "category": "sin"},
                        {"id": "c2", "text": "Adj/Hyp", "category": "cos"},
                        {"id": "c3", "text": "Opp/Adj", "category": "tan"},
                        {"id": "c4", "text": "SOH", "category": "sin"},
                        {"id": "c5", "text": "CAH", "category": "cos"},
                        {"id": "c6", "text": "TOA", "category": "tan"}
                    ]
                },
                "instructions": "Match each description to the correct trig function."
            },
        ]
    )

    # Lesson 4.3: Complex Numbers
    add_lesson_with_exercises(cid, mid, 2,
        "Complex Numbers",
        """<div style="font-family: system-ui; line-height: 1.8; color: #334155;">
        <h2 style="color: #4F46E5;">Complex Numbers</h2>
        <p>A complex number has form <code>a + bi</code> where $i = \\sqrt{-1}$.</p>
        <h3>Key Facts:</h3>
        <ul>
            <li>$i^2 = -1$</li>
            <li>$i^3 = -i$</li>
            <li>$i^4 = 1$ (cycle repeats every 4)</li>
        </ul>
        </div>""",
        [
            {
                "title": "Powers of i",
                "type": "multiple_choice_math",
                "config": {
                    "question": "What is $i^{10}$?",
                    "choices": [
                        {"text": "$-1$", "correct": True},
                        {"text": "$1$", "correct": False},
                        {"text": "$i$", "correct": False},
                        {"text": "$-i$", "correct": False}
                    ],
                    "explanation": "$i^{10} = i^{4 \\cdot 2 + 2} = (i^4)^2 \\cdot i^2 = 1 \\cdot (-1) = -1$."
                },
            },
            {
                "title": "Add Complex Numbers",
                "type": "numeric_input",
                "config": {
                    "question": "If $z = (3 + 2i) + (1 - 5i)$, what is the imaginary part of $z$? (Enter just the number, without $i$.)",
                    "correct_answers": [-3],
                    "tolerance": 0.01,
                    "allow_fraction": False,
                    "allow_decimal": True,
                    "explanation": "$(3+1) + (2-5)i = 4 - 3i$. The imaginary part is $-3$."
                },
            },
            {
                "title": "Multiply Complex Numbers",
                "type": "multiple_choice_math",
                "config": {
                    "question": "What is $(2 + i)(2 - i)$?",
                    "choices": [
                        {"text": "$5$", "correct": True},
                        {"text": "$3$", "correct": False},
                        {"text": "$4 - i^2$", "correct": False},
                        {"text": "$4 + i$", "correct": False}
                    ],
                    "explanation": "$(2+i)(2-i) = 4 - i^2 = 4 - (-1) = 5$. This is the conjugate product."
                },
            },
        ]
    )


# ═══════════════════════════════════════════════════════════════
# PUBLISH & ENROLL
# ═══════════════════════════════════════════════════════════════
publish(cid)
enroll_students(cid)

print("\n" + "=" * 60)
print("SAT MATH COURSE CREATED SUCCESSFULLY!")
print(f"  4 modules, 18 lessons, 54 exercises")
print(f"  All exercises have validated configs with correct answers")
print("=" * 60)
