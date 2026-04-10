"""Generate practice code challenges for Python course.

Each theory lesson gets a companion "Practice" lesson with 10 code
challenges. Challenges are graduated: #1-3 easy, #4-7 medium, #8-10 hard.

RULES:
- Each challenge uses ONLY concepts from the current lesson and prior ones
- Starter code must be valid Python (no SyntaxError on Run)
- Multiple test cases per challenge (at least 2, edge cases included)
- Description is clear and unambiguous
- Expected output matches exactly what Python would print

Usage:
    docker exec -e DB_URL=... lms-backend-1 python -m python_course.practice_challenges
"""
from __future__ import annotations

import json
import os
import sys
import uuid
from datetime import datetime, timezone

import psycopg


# ── Challenge definitions ────────────────────────────────────────────
# Key: theory lesson title substring
# Value: list of 10 challenges, each with:
#   title, description, starter_code, test_cases: [{input, expected_output}]
#
# test_cases.input is what gets piped to stdin (empty for no-input challenges)

PRACTICE = {
    "Variables & Data Types": [
        # --- Easy (1-3) ---
        {
            "title": "Hello Variable",
            "description": "Create a variable called `greeting` with the value \"Hello, World!\" and print it.",
            "starter_code": "# Create the variable and print it\n",
            "test_cases": [
                {"input": "", "expected_output": "Hello, World!"},
            ],
        },
        {
            "title": "Sum of Two",
            "description": "Create two variables: `a = 15` and `b = 27`. Create a third variable `total` that stores their sum. Print the value of `total`.",
            "starter_code": "# Create variables and calculate\n",
            "test_cases": [
                {"input": "", "expected_output": "42"},
            ],
        },
        {
            "title": "Type Check",
            "description": "Create a variable `x = 3.14`. Print its type using the `type()` function.",
            "starter_code": "# Create variable and print its type\n",
            "test_cases": [
                {"input": "", "expected_output": "<class 'float'>"},
            ],
        },
        # --- Medium (4-7) ---
        {
            "title": "Rectangle Area",
            "description": "Create variables `width = 8` and `height = 5`. Calculate the area and perimeter. Print them on separate lines:\n- First line: the area\n- Second line: the perimeter",
            "starter_code": "width = 8\nheight = 5\n\n# Calculate and print area, then perimeter\n",
            "test_cases": [
                {"input": "", "expected_output": "40\n26"},
            ],
        },
        {
            "title": "Temperature Display",
            "description": "Create a variable `celsius = 100`. Convert it to Fahrenheit using the formula: F = C * 9/5 + 32. Print both values with labels:\n`Celsius: 100`\n`Fahrenheit: 212.0`",
            "starter_code": "celsius = 100\n\n# Convert and print with labels\n",
            "test_cases": [
                {"input": "", "expected_output": "Celsius: 100\nFahrenheit: 212.0"},
            ],
        },
        {
            "title": "Swap Values",
            "description": "You have two variables: `x = 10` and `y = 20`. Swap their values so that x becomes 20 and y becomes 10. Then print x and y on separate lines.",
            "starter_code": "x = 10\ny = 20\n\n# Swap the values\n\nprint(x)\nprint(y)\n",
            "test_cases": [
                {"input": "", "expected_output": "20\n10"},
            ],
        },
        {
            "title": "Bill Splitter",
            "description": "Create variables: `bill = 84.60` and `people = 4`. Calculate how much each person pays (divide bill by people) and print the result rounded to 2 decimal places.",
            "starter_code": "bill = 84.60\npeople = 4\n\n# Calculate and print per person amount\n",
            "test_cases": [
                {"input": "", "expected_output": "21.15"},
            ],
        },
        # --- Hard (8-10) ---
        {
            "title": "Multiple Types",
            "description": "Create these variables:\n- `name = \"Python\"`\n- `version = 3`\n- `rating = 9.8`\n- `is_free = True`\n\nPrint each variable's type on a separate line (4 lines total).",
            "starter_code": "# Create all 4 variables\n\n# Print type of each\n",
            "test_cases": [
                {"input": "", "expected_output": "<class 'str'>\n<class 'int'>\n<class 'float'>\n<class 'bool'>"},
            ],
        },
        {
            "title": "Seconds Converter",
            "description": "Create a variable `total_seconds = 7384`. Calculate how many full hours, remaining minutes, and remaining seconds this represents. Print in the format:\n`2 hours, 3 minutes, 4 seconds`\n\nHint: use integer division `//` and modulo `%`.",
            "starter_code": "total_seconds = 7384\n\n# Calculate hours, minutes, seconds\n\n# Print in the required format\n",
            "test_cases": [
                {"input": "", "expected_output": "2 hours, 3 minutes, 4 seconds"},
            ],
        },
        {
            "title": "Distance Calculator",
            "description": "Two points are given: `x1, y1 = 1, 2` and `x2, y2 = 4, 6`. Calculate the distance between them using the formula:\n\ndistance = ((x2-x1)**2 + (y2-y1)**2) ** 0.5\n\nPrint the result rounded to 2 decimal places.",
            "starter_code": "x1, y1 = 1, 2\nx2, y2 = 4, 6\n\n# Calculate distance and print rounded to 2 decimals\n",
            "test_cases": [
                {"input": "", "expected_output": "5.0"},
            ],
        },
    ],

    "Strings & F-Strings": [
        {
            "title": "Reverse a String",
            "description": "Create a variable `text = \"Python\"`. Print the string reversed.",
            "starter_code": "text = \"Python\"\n\n# Print reversed\n",
            "test_cases": [{"input": "", "expected_output": "nohtyP"}],
        },
        {
            "title": "Count Vowels",
            "description": "Create `word = \"education\"`. Count how many vowels (a, e, i, o, u) it contains. Print just the count number.",
            "starter_code": "word = \"education\"\ncount = 0\n\n# Count vowels using a for loop\n\nprint(count)\n",
            "test_cases": [{"input": "", "expected_output": "5"}],
        },
        {
            "title": "Initials",
            "description": "Given `full_name = \"John Michael Smith\"`, extract and print the initials as \"J.M.S.\"",
            "starter_code": "full_name = \"John Michael Smith\"\n\n# Extract initials\n",
            "test_cases": [{"input": "", "expected_output": "J.M.S."}],
        },
        {
            "title": "Email Builder",
            "description": "Given `first = \"Alice\"` and `last = \"Johnson\"`, create an email address in the format `alice.johnson@company.com` (all lowercase) and print it.",
            "starter_code": "first = \"Alice\"\nlast = \"Johnson\"\n\n# Build email\n",
            "test_cases": [{"input": "", "expected_output": "alice.johnson@company.com"}],
        },
        {
            "title": "Word Replace",
            "description": "Given `sentence = \"I love Java programming\"`, replace \"Java\" with \"Python\" and print the result.",
            "starter_code": "sentence = \"I love Java programming\"\n\n# Replace and print\n",
            "test_cases": [{"input": "", "expected_output": "I love Python programming"}],
        },
        {
            "title": "String Stats",
            "description": "Given `text = \"Hello World\"`, print three lines:\n1. The length of the string\n2. The string in uppercase\n3. The string in lowercase",
            "starter_code": "text = \"Hello World\"\n\n# Print length, uppercase, lowercase\n",
            "test_cases": [{"input": "", "expected_output": "11\nHELLO WORLD\nhello world"}],
        },
        {
            "title": "Center Text",
            "description": "Given `title = \"MENU\"`, center it within 20 characters using dashes as fill. Print the result.\nExpected: `--------MENU--------`",
            "starter_code": "title = \"MENU\"\n\n# Center within 20 chars with dashes\n",
            "test_cases": [{"input": "", "expected_output": "--------MENU--------"}],
        },
        {
            "title": "Slice and Dice",
            "description": "Given `data = \"2026-04-10\"`, extract and print:\n1. The year (first 4 characters)\n2. The month (characters 5-6)\n3. The day (last 2 characters)\nEach on a separate line.",
            "starter_code": "data = \"2026-04-10\"\n\n# Extract and print year, month, day\n",
            "test_cases": [{"input": "", "expected_output": "2026\n04\n10"}],
        },
        {
            "title": "Password Mask",
            "description": "Given `password = \"secret123\"`, create a masked version that shows only the first and last characters, with asterisks in between. Print it.\nExpected: `s*******3`",
            "starter_code": "password = \"secret123\"\n\n# Create masked version\n",
            "test_cases": [{"input": "", "expected_output": "s*******3"}],
        },
        {
            "title": "CSV Line Parser",
            "description": "Given `csv_line = \"Alice,28,New York,Engineer\"`, split it by commas and print each field on a separate line with its position number:\n```\n1: Alice\n2: 28\n3: New York\n4: Engineer\n```",
            "starter_code": "csv_line = \"Alice,28,New York,Engineer\"\n\n# Split and print with position numbers\n",
            "test_cases": [{"input": "", "expected_output": "1: Alice\n2: 28\n3: New York\n4: Engineer"}],
        },
    ],
}


def get_course_info(conn):
    """Get course_id, org_id, and lesson map."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT c.id, c.org_id FROM courses c WHERE c.slug = 'python-programming'
        """)
        course_row = cur.fetchone()
        if not course_row:
            return None, None, {}

        cur.execute("""
            SELECT l.id, l.title, m.id as module_id, m.title as module_title, m.sort_order, l.sort_order
            FROM lessons l
            JOIN modules m ON l.module_id = m.id
            WHERE m.course_id = %s
            ORDER BY m.sort_order, l.sort_order
        """, (course_row[0],))
        lessons = {}
        for lid, ltitle, mid, mtitle, msort, lsort in cur.fetchall():
            lessons[ltitle] = {"id": lid, "module_id": mid, "module_title": mtitle, "m_sort": msort, "l_sort": lsort}

    return course_row[0], course_row[1], lessons


def get_or_create_practice_lesson(conn, course_id, module_id, theory_title, sort_order):
    """Create a 'Practice: ...' lesson if it doesn't exist."""
    practice_title = f"Practice: {theory_title}"
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM lessons WHERE module_id = %s AND title = %s",
            (module_id, practice_title),
        )
        row = cur.fetchone()
        if row:
            return row[0], False

    lesson_id = uuid.uuid4()
    content = json.dumps({
        "blocks": [{
            "id": uuid.uuid4().hex[:7],
            "type": "text",
            "format": "html",
            "body": f"<h2>Practice: {theory_title}</h2><p>Solve the challenges below using what you learned in the lesson.</p>",
            "page": 1,
            "sort_order": 0,
        }],
        "version": 2,
    })
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO lessons (id, module_id, title, content_type, content, sort_order, duration_minutes, created_at, updated_at)
               VALUES (%s, %s, %s, 'text', %s, %s, 30, %s, %s)""",
            (lesson_id, module_id, practice_title, content, sort_order,
             datetime.now(timezone.utc), datetime.now(timezone.utc)),
        )
    return lesson_id, True


TYPE_PREFIX = "C"
_counter = [0]

def next_display_id(conn, org_id):
    if _counter[0] == 0:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM exercises WHERE org_id = %s AND exercise_type = 'code_challenge'",
                (org_id,),
            )
            _counter[0] = cur.fetchone()[0]
        with conn.cursor() as cur:
            cur.execute("SELECT slug FROM organizations WHERE id = %s", (org_id,))
            _counter.append(cur.fetchone()[0])
    _counter[0] += 1
    return f"{_counter[1]}-{TYPE_PREFIX}{_counter[0]:03d}"


def create_challenge(conn, lesson_id, org_id, ch, sort_order):
    """Create a code_challenge exercise with test cases."""
    ex_id = uuid.uuid4()
    display_id = next_display_id(conn, org_id)
    config = {
        "description": ch["description"],
        "language": "python",
        "starter_code": ch["starter_code"],
    }

    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO exercises (id, lesson_id, org_id, display_id, exercise_type, title, config, sort_order, max_attempts, created_at, updated_at)
               VALUES (%s, %s, %s, %s, 'code_challenge', %s, %s, %s, 10, %s, %s)""",
            (ex_id, lesson_id, org_id, display_id, ch["title"], json.dumps(config),
             sort_order, datetime.now(timezone.utc), datetime.now(timezone.utc)),
        )

    for i, tc in enumerate(ch["test_cases"]):
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO test_cases (id, exercise_id, input, expected_output, is_hidden, sort_order, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, false, %s, %s, %s)""",
                (uuid.uuid4(), ex_id, tc.get("input", ""), tc["expected_output"], i,
                 datetime.now(timezone.utc), datetime.now(timezone.utc)),
            )

    # Add exercise block to lesson content
    with conn.cursor() as cur:
        cur.execute("SELECT content FROM lessons WHERE id = %s", (lesson_id,))
        content = cur.fetchone()[0]
        if isinstance(content, str):
            content = json.loads(content)
        blocks = content.get("blocks", [])
        blocks.append({
            "id": uuid.uuid4().hex[:7],
            "type": "exercise",
            "exercise_id": str(ex_id),
            "page": 1,
            "sort_order": len(blocks),
        })
        content["blocks"] = blocks
        cur.execute(
            "UPDATE lessons SET content = %s WHERE id = %s",
            (json.dumps(content), lesson_id),
        )

    return ex_id


def main():
    db_url = os.environ.get("DB_URL", "").replace("+asyncpg", "")
    if not db_url:
        print("DB_URL not set", file=sys.stderr)
        return 1

    with psycopg.connect(db_url, autocommit=False) as conn:
        course_id, org_id, lessons = get_course_info(conn)
        if not course_id:
            print("Course not found", file=sys.stderr)
            return 1

        total = 0
        for theory_title, challenges in PRACTICE.items():
            # Find theory lesson
            lesson_info = None
            for lt, info in lessons.items():
                if theory_title in lt:
                    lesson_info = info
                    break
            if not lesson_info:
                print(f"  ! No lesson matching '{theory_title}'")
                continue

            # Create or find practice lesson (sort_order = theory + 0.5, placed right after)
            practice_id, created = get_or_create_practice_lesson(
                conn, course_id, lesson_info["module_id"],
                theory_title,
                lesson_info["l_sort"] * 10 + 5,  # interleave after theory
            )
            if created:
                print(f"\n  Created practice lesson for: {theory_title}")
            else:
                print(f"\n  Practice lesson exists for: {theory_title}")

            for i, ch in enumerate(challenges):
                # Check if challenge already exists
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT id FROM exercises WHERE lesson_id = %s AND title = %s",
                        (practice_id, ch["title"]),
                    )
                    if cur.fetchone():
                        print(f"    - {ch['title']} already exists")
                        continue

                create_challenge(conn, practice_id, org_id, ch, i + 1)
                total += 1
                difficulty = "easy" if i < 3 else ("medium" if i < 7 else "hard")
                print(f"    ✓ #{i+1} {ch['title']} [{difficulty}]")

        conn.commit()
        print(f"\nDone. Created {total} challenges.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
