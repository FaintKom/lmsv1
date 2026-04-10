"""Create real exercises for Python course lessons.

Each lesson gets 2-4 exercises of mixed types:
- code_challenge: sandbox runs Python, checks output
- quiz: multiple choice about concepts
- true_false: True/False about pitfalls
- fill_blanks: complete the code
- ordering: arrange code lines
- matching: connect terms to definitions
- categorize: sort items into groups

Exercises are linked to lessons via the `exercises` table and also
added as exercise-blocks in the lesson's content JSONB.

Usage:
    docker exec -e DB_URL=postgresql://lms:PASS@lms-db-1:5432/lms \
        lms-backend-1 python -m python_course.create_exercises
"""
from __future__ import annotations

import json
import os
import sys
import uuid
from datetime import datetime, timezone

import psycopg

# ── Exercise definitions per lesson ──────────────────────────────────
# Each entry: (lesson_title_substring, exercises_list)
# Each exercise: {type, title, config}
#
# config varies by type:
# - code_challenge: {description, language, starter_code, test_cases: [{input, expected_output}]}
# - quiz: {questions: [{question, options: [{text, is_correct}]}]}
# - true_false: {questions: [{statement, correct_answer: bool}]}
# - fill_blanks: {template, blanks: [{position, answer}]}
# - ordering: {items: [str], correct_order: [int]}
# - matching: {pairs: [{left, right}]}
# - categorize: {categories: [{name, items: [str]}]}

EXERCISES = [
    # ── Module 1: First Steps ──
    ("Variables & Data Types", [
        {
            "type": "code_challenge",
            "title": "Tip Calculator",
            "config": {
                "description": "Create variables `meal_cost = 52.50`, `tip_rate = 0.18`, and `people = 3`. Calculate and print the tip amount, total bill, and cost per person — each on its own line, rounded to 2 decimal places.",
                "language": "python",
                "starter_code": "# Create your variables here\nmeal_cost = 52.50\ntip_rate = 0.18\npeople = 3\n\n# Calculate\ntip = \ntotal = \nper_person = \n\n# Print results\n",
                "test_cases": [
                    {"input": "", "expected_output": "9.45\n61.95\n20.65"},
                ],
            },
        },
        {
            "type": "categorize",
            "title": "Sort by Data Type",
            "config": {
                "categories": [
                    {"name": "str", "items": ["\"hello\"", "'42'", "\"True\""]},
                    {"name": "int", "items": ["42", "-7", "0"]},
                    {"name": "float", "items": ["3.14", "-0.5", "1.0"]},
                    {"name": "bool", "items": ["True", "False"]},
                ],
            },
        },
        {
            "type": "true_false",
            "title": "Variable Facts",
            "config": {
                "questions": [
                    {"statement": "In Python, you must declare a variable's type before using it.", "correct_answer": False},
                    {"statement": "Variable names are case-sensitive: `Name` and `name` are different.", "correct_answer": True},
                    {"statement": "A variable name can start with a number.", "correct_answer": False},
                    {"statement": "x = 5; then x = 'hello' is valid Python.", "correct_answer": True},
                ],
            },
        },
    ]),

    ("Strings & F-Strings", [
        {
            "type": "code_challenge",
            "title": "Email Generator",
            "config": {
                "description": "Given `first_name = 'Alice'` and `last_name = 'Smith'`, generate and print an email address in the format: `alice.smith@company.com` (all lowercase).",
                "language": "python",
                "starter_code": "first_name = 'Alice'\nlast_name = 'Smith'\n\n# Generate email (all lowercase)\nemail = \nprint(email)\n",
                "test_cases": [
                    {"input": "", "expected_output": "alice.smith@company.com"},
                ],
            },
        },
        {
            "type": "fill_blanks",
            "title": "Complete the F-String",
            "config": {
                "template": "name = 'Bob'\nage = 25\nresult = f'{___} is {___} years old'\nprint(result)",
                "blanks": [
                    {"position": 0, "answer": "name"},
                    {"position": 1, "answer": "age"},
                ],
            },
        },
        {
            "type": "matching",
            "title": "String Methods",
            "config": {
                "pairs": [
                    {"left": ".upper()", "right": "Convert to uppercase"},
                    {"left": ".strip()", "right": "Remove whitespace from both ends"},
                    {"left": ".split(',')", "right": "Break into a list at commas"},
                    {"left": ".replace('a', 'b')", "right": "Substitute characters"},
                    {"left": ".startswith('http')", "right": "Check prefix, return bool"},
                ],
            },
        },
    ]),

    ("Numbers & Math", [
        {
            "type": "code_challenge",
            "title": "BMI Calculator",
            "config": {
                "description": "Given `weight_kg = 70` and `height_m = 1.75`, calculate BMI using the formula: BMI = weight / height². Print the result rounded to 1 decimal place.",
                "language": "python",
                "starter_code": "weight_kg = 70\nheight_m = 1.75\n\n# Calculate BMI\nbmi = \nprint(round(bmi, 1))\n",
                "test_cases": [
                    {"input": "", "expected_output": "22.9"},
                ],
            },
        },
        {
            "type": "quiz",
            "title": "Integer vs Float Division",
            "config": {
                "questions": [
                    {
                        "question": "What does `7 // 2` return in Python?",
                        "options": [
                            {"text": "3", "is_correct": True},
                            {"text": "3.5", "is_correct": False},
                            {"text": "4", "is_correct": False},
                            {"text": "3.0", "is_correct": False},
                        ],
                    },
                    {
                        "question": "What does `7 % 2` return?",
                        "options": [
                            {"text": "1", "is_correct": True},
                            {"text": "3", "is_correct": False},
                            {"text": "0", "is_correct": False},
                            {"text": "3.5", "is_correct": False},
                        ],
                    },
                ],
            },
        },
    ]),

    ("User Input & Type Conversion", [
        {
            "type": "code_challenge",
            "title": "Age Calculator",
            "config": {
                "description": "Given `birth_year = '1998'` (a string, as if from input()). Convert it to int, calculate the age assuming current year is 2026, and print: `You are 28 years old`.",
                "language": "python",
                "starter_code": "birth_year = '1998'  # simulating input()\n\n# Convert and calculate\n\n# Print result\n",
                "test_cases": [
                    {"input": "", "expected_output": "You are 28 years old"},
                ],
            },
        },
        {
            "type": "ordering",
            "title": "Order the Input Pattern",
            "config": {
                "items": [
                    "name = input('Name: ')",
                    "age = int(input('Age: '))",
                    "height = float(input('Height (m): '))",
                    "print(f'{name} is {age}, height {height}m')",
                ],
                "correct_order": [0, 1, 2, 3],
            },
        },
    ]),

    ("If, Elif, Else", [
        {
            "type": "code_challenge",
            "title": "Grade Calculator",
            "config": {
                "description": "Given `score = 85`, print the letter grade:\n- 90+ → 'A'\n- 80-89 → 'B'\n- 70-79 → 'C'\n- 60-69 → 'D'\n- Below 60 → 'F'",
                "language": "python",
                "starter_code": "score = 85\n\n# Determine grade\n\n# Print the grade letter\n",
                "test_cases": [
                    {"input": "", "expected_output": "B"},
                ],
            },
        },
        {
            "type": "true_false",
            "title": "Conditional Logic",
            "config": {
                "questions": [
                    {"statement": "In Python, `elif` is short for `else if`.", "correct_answer": True},
                    {"statement": "You can have multiple `else` blocks in one if-elif chain.", "correct_answer": False},
                    {"statement": "`if x = 5:` is valid Python syntax.", "correct_answer": False},
                    {"statement": "An if block without else will crash if the condition is False.", "correct_answer": False},
                ],
            },
        },
    ]),

    ("For Loops & Range", [
        {
            "type": "code_challenge",
            "title": "Sum of Multiples",
            "config": {
                "description": "Print the sum of all multiples of 3 between 1 and 50 (inclusive). Use a for loop with range().",
                "language": "python",
                "starter_code": "# Calculate sum of multiples of 3 from 1 to 50\ntotal = 0\n\n\nprint(total)\n",
                "test_cases": [
                    {"input": "", "expected_output": "408"},
                ],
            },
        },
        {
            "type": "code_challenge",
            "title": "Star Pyramid",
            "config": {
                "description": "Print a right-aligned pyramid of stars with 5 rows:\n```\n    *\n   **\n  ***\n ****\n*****\n```",
                "language": "python",
                "starter_code": "# Print a right-aligned star pyramid, 5 rows\nfor i in range(1, 6):\n    pass  # replace this\n",
                "test_cases": [
                    {"input": "", "expected_output": "    *\n   **\n  ***\n ****\n*****"},
                ],
            },
        },
    ]),

    ("Lists & Indexing", [
        {
            "type": "code_challenge",
            "title": "Top 3 Scores",
            "config": {
                "description": "Given `scores = [45, 92, 78, 100, 63, 88, 95]`, find and print the top 3 scores in descending order, one per line.",
                "language": "python",
                "starter_code": "scores = [45, 92, 78, 100, 63, 88, 95]\n\n# Find and print top 3\n",
                "test_cases": [
                    {"input": "", "expected_output": "100\n95\n92"},
                ],
            },
        },
        {
            "type": "matching",
            "title": "List Operations",
            "config": {
                "pairs": [
                    {"left": "list.append(x)", "right": "Add x to end"},
                    {"left": "list.pop()", "right": "Remove and return last item"},
                    {"left": "list.insert(0, x)", "right": "Add x at beginning"},
                    {"left": "list[1:4]", "right": "Slice from index 1 to 3"},
                    {"left": "len(list)", "right": "Number of items"},
                ],
            },
        },
    ]),

    ("Dictionaries", [
        {
            "type": "code_challenge",
            "title": "Word Counter",
            "config": {
                "description": "Given `text = 'the cat sat on the mat the cat'`, count how many times each word appears and print each word and count alphabetically:\n```\ncat: 2\nmat: 1\non: 1\nsat: 1\nthe: 3\n```",
                "language": "python",
                "starter_code": "text = 'the cat sat on the mat the cat'\n\n# Count words\n\n# Print alphabetically\n",
                "test_cases": [
                    {"input": "", "expected_output": "cat: 2\nmat: 1\non: 1\nsat: 1\nthe: 3"},
                ],
            },
        },
    ]),

    ("List Comprehensions", [
        {
            "type": "code_challenge",
            "title": "Data Cleanup",
            "config": {
                "description": "Given `raw = [' Alice ', 'bob', '', 'CHARLIE', ' ', 'diana']`, use a single list comprehension to produce a cleaned list: strip whitespace, capitalize each name, skip empty strings. Print each name on its own line.",
                "language": "python",
                "starter_code": "raw = [' Alice ', 'bob', '', 'CHARLIE', ' ', 'diana']\n\n# Clean in one comprehension\ncleaned = \n\nfor name in cleaned:\n    print(name)\n",
                "test_cases": [
                    {"input": "", "expected_output": "Alice\nBob\nCharlie\nDiana"},
                ],
            },
        },
    ]),

    ("Defining Functions", [
        {
            "type": "code_challenge",
            "title": "Greeting Function",
            "config": {
                "description": "Write a function `greet(name, greeting='Hello')` that returns a string like `'Hello, Alice!'`. Then call it twice:\n1. `greet('Alice')` → print result\n2. `greet('Bob', 'Hi')` → print result",
                "language": "python",
                "starter_code": "def greet(name, greeting='Hello'):\n    pass  # implement this\n\nprint(greet('Alice'))\nprint(greet('Bob', 'Hi'))\n",
                "test_cases": [
                    {"input": "", "expected_output": "Hello, Alice!\nHi, Bob!"},
                ],
            },
        },
    ]),

    ("Classes & Objects", [
        {
            "type": "code_challenge",
            "title": "BankAccount Class",
            "config": {
                "description": "Create a `BankAccount` class with:\n- `__init__(self, owner, balance=0)`\n- `deposit(amount)` — adds to balance\n- `withdraw(amount)` — subtracts (only if sufficient funds, else print 'Insufficient funds')\n- `__str__` returns `'Owner: {owner}, Balance: ${balance}'`\n\nThen run the test code below.",
                "language": "python",
                "starter_code": "class BankAccount:\n    pass  # implement\n\nacc = BankAccount('Alice', 100)\nacc.deposit(50)\nacc.withdraw(30)\nprint(acc)\nacc.withdraw(200)\n",
                "test_cases": [
                    {"input": "", "expected_output": "Owner: Alice, Balance: $120\nInsufficient funds"},
                ],
            },
        },
    ]),

    ("Error Handling & Exceptions", [
        {
            "type": "code_challenge",
            "title": "Safe Division",
            "config": {
                "description": "Write a function `safe_divide(a, b)` that returns `a / b` rounded to 2 decimal places. If b is 0, return the string `'Cannot divide by zero'`. If either argument isn't a number, return `'Invalid input'`.\n\nPrint the results of the three test calls.",
                "language": "python",
                "starter_code": "def safe_divide(a, b):\n    pass  # implement with try/except\n\nprint(safe_divide(10, 3))\nprint(safe_divide(5, 0))\nprint(safe_divide('x', 2))\n",
                "test_cases": [
                    {"input": "", "expected_output": "3.33\nCannot divide by zero\nInvalid input"},
                ],
            },
        },
    ]),
]


def get_org_id(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT org_id FROM courses WHERE slug = 'python-programming' LIMIT 1")
        row = cur.fetchone()
        return row[0] if row else None


TYPE_PREFIX = {
    "quiz": "Q", "code_challenge": "C", "matching": "M",
    "ordering": "O", "fill_blanks": "FB", "true_false": "T",
    "categorize": "G", "file_upload": "FU",
}

_display_counters: dict[str, int] = {}


def next_display_id(conn, org_id, ex_type):
    """Generate next display_id like 'org-slug-C001'."""
    key = f"{org_id}:{ex_type}"
    if key not in _display_counters:
        # Get org slug
        with conn.cursor() as cur:
            cur.execute("SELECT slug FROM organizations WHERE id = %s", (org_id,))
            slug = (cur.fetchone() or ["org"])[0]
        prefix = TYPE_PREFIX.get(ex_type, "X")
        # Count existing
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM exercises WHERE org_id = %s AND exercise_type = %s",
                (org_id, ex_type),
            )
            count = cur.fetchone()[0]
        _display_counters[key] = count
        _display_counters[f"{key}:slug"] = slug
        _display_counters[f"{key}:prefix"] = prefix

    _display_counters[key] += 1
    slug = _display_counters[f"{key}:slug"]
    prefix = _display_counters[f"{key}:prefix"]
    return f"{slug}-{prefix}{_display_counters[key]:03d}"


def create_exercise(conn, lesson_id, org_id, ex_def, sort_order):
    """Create an exercise row and return its ID."""
    ex_id = uuid.uuid4()
    ex_type = ex_def["type"]
    title = ex_def["title"]
    config = ex_def["config"]
    display_id = next_display_id(conn, org_id, ex_type)

    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO exercises (id, lesson_id, org_id, display_id, exercise_type, title, config, sort_order, max_attempts, created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 10, %s, %s)""",
            (ex_id, lesson_id, org_id, display_id, ex_type, title, json.dumps(config),
             sort_order, datetime.now(timezone.utc), datetime.now(timezone.utc)),
        )

    # For code_challenge, also create test_cases if present
    if ex_type == "code_challenge" and "test_cases" in config:
        for i, tc in enumerate(config["test_cases"]):
            tc_id = uuid.uuid4()
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO test_cases (id, exercise_id, input, expected_output, is_hidden, sort_order, created_at, updated_at)
                       VALUES (%s, %s, %s, %s, false, %s, %s, %s)""",
                    (tc_id, ex_id, tc.get("input", ""), tc["expected_output"], i,
                     datetime.now(timezone.utc), datetime.now(timezone.utc)),
                )

    return ex_id


def add_exercise_block_to_lesson(conn, lesson_id, exercise_id, sort_order):
    """Add an exercise block to the lesson's content JSONB."""
    with conn.cursor() as cur:
        cur.execute("SELECT content FROM lessons WHERE id = %s", (lesson_id,))
        row = cur.fetchone()
        if not row:
            return

    content = row[0]
    if isinstance(content, str):
        content = json.loads(content)

    blocks = content.get("blocks", [])
    blocks.append({
        "id": uuid.uuid4().hex[:7],
        "type": "exercise",
        "exercise_id": str(exercise_id),
        "page": 1,
        "sort_order": len(blocks),
    })
    content["blocks"] = blocks

    with conn.cursor() as cur:
        cur.execute(
            "UPDATE lessons SET content = %s, updated_at = NOW() WHERE id = %s",
            (json.dumps(content), lesson_id),
        )


def main():
    db_url = os.environ.get("DB_URL") or os.environ.get("DATABASE_URL", "")
    db_url = db_url.replace("+asyncpg", "")
    if not db_url:
        print("DB_URL not set", file=sys.stderr)
        return 1

    with psycopg.connect(db_url, autocommit=False) as conn:
        org_id = get_org_id(conn)
        if not org_id:
            print("Course not found", file=sys.stderr)
            return 1

        # Get all lesson IDs by title
        with conn.cursor() as cur:
            cur.execute("""
                SELECT l.id, l.title FROM lessons l
                JOIN modules m ON l.module_id = m.id
                JOIN courses c ON m.course_id = c.id
                WHERE c.slug = 'python-programming'
            """)
            lessons = {row[1]: row[0] for row in cur.fetchall()}

        total_created = 0
        for title_sub, exercises in EXERCISES:
            # Find lesson by substring match
            lesson_id = None
            for lt, lid in lessons.items():
                if title_sub in lt:
                    lesson_id = lid
                    break

            if not lesson_id:
                print(f"  ! No lesson matching '{title_sub}'", file=sys.stderr)
                continue

            for i, ex_def in enumerate(exercises):
                # Check if exercise already exists
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT id FROM exercises WHERE lesson_id = %s AND title = %s",
                        (lesson_id, ex_def["title"]),
                    )
                    if cur.fetchone():
                        print(f"  - {ex_def['title']} already exists, skipping")
                        continue

                ex_id = create_exercise(conn, lesson_id, org_id, ex_def, i + 1)
                add_exercise_block_to_lesson(conn, lesson_id, ex_id, i + 1)
                total_created += 1
                print(f"  ✓ {title_sub} / {ex_def['title']} ({ex_def['type']})")

        conn.commit()
        print(f"\nDone. Created {total_created} exercises.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
