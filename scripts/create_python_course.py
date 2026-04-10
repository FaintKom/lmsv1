"""Create the Python Programming course structure in the prod database.

Creates the course, 6 modules, and ~36 lessons (6 per module including
a project lesson at the end). Each lesson starts with placeholder
content that will be replaced by the content generator.

Run inside the lms-backend-1 container:
    docker exec -e DB_URL=postgresql://lms:PASS@lms-db-1:5432/lms \
        lms-backend-1 python /app/create_python_course.py
"""
import json
import os
import sys
import uuid
from datetime import datetime, timezone

import psycopg

# The org that owns this course — use the main org from prod
# We'll query it dynamically.

COURSE = {
    "title": "Python Programming",
    "slug": "python-programming",
    "description": "Learn Python from scratch by building real things. Variables, control flow, data structures, functions, OOP, and working with files and APIs — with hands-on exercises that mirror actual developer tasks.",
    "category": "programming",
    "status": "published",
}

MODULES = [
    {
        "title": "First Steps",
        "sort_order": 0,
        "lessons": [
            ("Variables & Data Types", "text", 15),
            ("Strings & F-Strings", "text", 15),
            ("Numbers & Math", "text", 12),
            ("User Input & Type Conversion", "text", 12),
            ("Your First Real Program", "text", 10),
            ("Project: CLI Budget Tracker", "text", 20),
        ],
    },
    {
        "title": "Making Decisions",
        "sort_order": 1,
        "lessons": [
            ("Booleans & Comparisons", "text", 12),
            ("If, Elif, Else", "text", 15),
            ("For Loops & Range", "text", 15),
            ("While Loops & Break/Continue", "text", 15),
            ("Nested Logic & Pattern Matching", "text", 12),
            ("Project: Rock-Paper-Scissors", "text", 20),
        ],
    },
    {
        "title": "Collections",
        "sort_order": 2,
        "lessons": [
            ("Lists & Indexing", "text", 15),
            ("Dictionaries", "text", 15),
            ("Tuples & Sets", "text", 12),
            ("List Comprehensions", "text", 15),
            ("Sorting, Filtering, Mapping", "text", 12),
            ("Project: Contact Book CLI", "text", 25),
        ],
    },
    {
        "title": "Functions",
        "sort_order": 3,
        "lessons": [
            ("Defining Functions", "text", 15),
            ("Arguments & Return Values", "text", 15),
            ("Scope & Closures", "text", 12),
            ("Lambda & Higher-Order Functions", "text", 15),
            ("Decorators", "text", 15),
            ("Project: Password Strength Checker", "text", 20),
        ],
    },
    {
        "title": "Object-Oriented Programming",
        "sort_order": 4,
        "lessons": [
            ("Classes & Objects", "text", 15),
            ("Methods & Properties", "text", 15),
            ("Inheritance & Polymorphism", "text", 15),
            ("Dunder Methods & Operator Overloading", "text", 15),
            ("Dataclasses & Type Hints", "text", 12),
            ("Project: Library Management System", "text", 25),
        ],
    },
    {
        "title": "Real-World Python",
        "sort_order": 5,
        "lessons": [
            ("Reading & Writing Files", "text", 15),
            ("Working with JSON & CSV", "text", 15),
            ("Error Handling & Exceptions", "text", 15),
            ("Modules, Packages & pip", "text", 12),
            ("HTTP Requests & APIs", "text", 15),
            ("Project: Weather Dashboard CLI", "text", 25),
        ],
    },
]


def main():
    db_url = os.environ.get("DB_URL") or os.environ.get("DATABASE_URL", "")
    db_url = db_url.replace("+asyncpg", "")
    if not db_url:
        print("DB_URL not set", file=sys.stderr)
        return 1

    with psycopg.connect(db_url) as conn:
        # Get the first org
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM organizations LIMIT 1")
            org_row = cur.fetchone()
            if not org_row:
                print("No organizations found", file=sys.stderr)
                return 1
            org_id = org_row[0]

        # Check if course already exists
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM courses WHERE slug = %s AND org_id = %s",
                        (COURSE["slug"], org_id))
            existing = cur.fetchone()
            if existing:
                print(f"Course '{COURSE['slug']}' already exists (id={existing[0]}). Skipping.")
                return 0

        # Create course
        course_id = uuid.uuid4()
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO courses (id, org_id, title, slug, description, category, status, is_template, template_version, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, false, 1, %s, %s)""",
                (course_id, org_id, COURSE["title"], COURSE["slug"],
                 COURSE["description"], COURSE["category"], COURSE["status"],
                 datetime.now(timezone.utc), datetime.now(timezone.utc)),
            )
        print(f"Created course: {COURSE['title']} ({course_id})")

        # Create modules and lessons
        total_lessons = 0
        for mod in MODULES:
            module_id = uuid.uuid4()
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO modules (id, course_id, title, sort_order, created_at, updated_at)
                       VALUES (%s, %s, %s, %s, %s, %s)""",
                    (module_id, course_id, mod["title"], mod["sort_order"],
                     datetime.now(timezone.utc), datetime.now(timezone.utc)),
                )

            for i, (title, content_type, duration) in enumerate(mod["lessons"]):
                lesson_id = uuid.uuid4()
                # Placeholder content
                content = json.dumps({
                    "blocks": [{
                        "id": uuid.uuid4().hex[:7],
                        "type": "text",
                        "format": "html",
                        "body": f"<h2>{title}</h2><p>Content coming soon...</p>",
                        "page": 1,
                        "sort_order": 0,
                    }],
                    "version": 2,
                })
                with conn.cursor() as cur:
                    cur.execute(
                        """INSERT INTO lessons (id, module_id, title, content_type, content, sort_order, duration_minutes, created_at, updated_at)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                        (lesson_id, module_id, title, content_type, content, i, duration,
                         datetime.now(timezone.utc), datetime.now(timezone.utc)),
                    )
                total_lessons += 1
                print(f"  {mod['title']} / {title} ({lesson_id})")

        conn.commit()
        print(f"\nDone. {len(MODULES)} modules, {total_lessons} lessons.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
