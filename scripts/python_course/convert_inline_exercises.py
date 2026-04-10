"""Convert inline text exercises to platform code challenges.

Reads each Python lesson's HTML content, finds exercise cards (the
`exercise()` helper output), extracts title + description, creates
code_challenge exercises in the DB, and removes the exercise section
from the lesson HTML.

The exercise cards follow this pattern:
  <div style="margin:1rem...border-radius:10px">
    <span...>Easy/Medium/Challenge</span>
    <p...font-weight:600">Title</p>
    <div...>Description</div>
    <details>Hint</details>  (optional)
  </div>
"""
from __future__ import annotations

import json
import os
import re
import sys
import uuid
from datetime import datetime, timezone

import psycopg


def extract_exercises_from_html(html: str) -> tuple[list[dict], str]:
    """Extract exercise cards and return (exercises, cleaned_html).

    Returns list of {title, description, level} and HTML with exercise
    section removed.
    """
    exercises = []

    # Find exercise cards by the distinctive pattern
    pattern = re.compile(
        r'<div style="margin:1rem 0;padding:1rem 1\.25rem;border:1px solid rgba\(128,128,128,0\.2\);border-radius:10px">'
        r'.*?<span[^>]*>(Easy|Medium|Challenge)</span>'
        r'.*?font-weight:600">(.*?)</p>'
        r'.*?<div style="font-size:0\.92rem[^"]*">(.*?)</div>'
        r'(?:.*?<details.*?</details>)?'  # optional hint
        r'\s*</div>',
        re.DOTALL
    )

    for m in pattern.finditer(html):
        level = m.group(1).lower()
        title = re.sub(r'<[^>]+>', '', m.group(2)).strip()
        desc_html = m.group(3).strip()
        # Clean HTML tags from description but keep code blocks readable
        desc = re.sub(r'<code>(.*?)</code>', r'`\1`', desc_html)
        desc = re.sub(r'<[^>]+>', '', desc)
        desc = desc.strip()

        exercises.append({
            "title": title,
            "description": desc,
            "level": level,
        })

    # Remove the Practice section + exercise cards + try_it from HTML
    # Remove everything from "Practice</h2>" to right before "Common mistakes" or "Key takeaways" or "What" (next)
    cleaned = re.sub(
        r'<h2[^>]*>Practice</h2>.*?(?=<div style="margin:1\.5rem|<div style="margin:2rem 0 1rem|<div style="margin:2rem 0;padding:1\.25rem|$)',
        '',
        html,
        flags=re.DOTALL
    )

    # Also remove standalone exercise cards not in a Practice section
    cleaned = pattern.sub('', cleaned)

    # Remove orphaned try_it blocks
    cleaned = re.sub(
        r'<p style="margin:1rem 0;padding:0\.75rem[^"]*>.*?</p>',
        '',
        cleaned
    )

    # Clean up multiple blank lines
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

    return exercises, cleaned


def create_code_challenge(conn, lesson_id: str, org_id: str, ex: dict, sort_order: int) -> str:
    """Create a code_challenge exercise from extracted data."""
    ex_id = uuid.uuid4()

    # Generate appropriate starter code based on the exercise
    starter = f"# {ex['title']}\n# {ex['description'][:80]}...\n\n# Write your solution here\n"

    config = {
        "description": ex["description"],
        "language": "python",
        "starter_code": starter,
    }

    with conn.cursor() as cur:
        # Get a display_id
        cur.execute("SELECT slug FROM organizations WHERE id = %s", (org_id,))
        slug = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM exercises WHERE org_id = %s", (org_id,))
        count = cur.fetchone()[0] + 1
        display_id = f"{slug}-E{count:03d}"

        cur.execute(
            """INSERT INTO exercises (id, lesson_id, org_id, display_id, exercise_type, title, config, sort_order, max_attempts, created_at, updated_at)
               VALUES (%s, %s, %s, %s, 'code_challenge', %s, %s, %s, 10, %s, %s)""",
            (ex_id, lesson_id, org_id, display_id, ex["title"], json.dumps(config),
             sort_order, datetime.now(timezone.utc), datetime.now(timezone.utc)),
        )

        # Create a basic test case (empty — teacher fills in later)
        tc_id = uuid.uuid4()
        cur.execute(
            """INSERT INTO test_cases (id, exercise_id, input, expected_output, is_hidden, sort_order, created_at, updated_at)
               VALUES (%s, %s, '', 'TODO', false, 0, %s, %s)""",
            (tc_id, ex_id, datetime.now(timezone.utc), datetime.now(timezone.utc)),
        )

    return str(ex_id)


def main():
    db_url = os.environ.get("DB_URL", "").replace("+asyncpg", "")
    if not db_url:
        print("DB_URL not set", file=sys.stderr)
        return 1

    with psycopg.connect(db_url, autocommit=False) as conn:
        # Get all Python course lessons with content
        with conn.cursor() as cur:
            cur.execute("""
                SELECT l.id, l.title, l.content, c.org_id
                FROM lessons l
                JOIN modules m ON l.module_id = m.id
                JOIN courses c ON m.course_id = c.id
                WHERE c.slug = 'python-programming'
                AND l.title NOT LIKE 'Practice:%'
                ORDER BY m.sort_order, l.sort_order
            """)
            rows = cur.fetchall()

        total_extracted = 0
        total_cleaned = 0

        for lesson_id, title, content, org_id in rows:
            if isinstance(content, str):
                content = json.loads(content)

            blocks = content.get("blocks", [])
            text_block = None
            text_idx = None
            for i, b in enumerate(blocks):
                if b.get("type") == "text":
                    text_block = b
                    text_idx = i
                    break

            if not text_block or not text_block.get("body"):
                continue

            html = text_block["body"]
            exercises, cleaned_html = extract_exercises_from_html(html)

            if not exercises:
                continue

            print(f"\n  {title}:")

            # Create code_challenge exercises
            existing_exercise_count = len([b for b in blocks if b.get("type") == "exercise"])

            for j, ex in enumerate(exercises):
                ex_id = create_code_challenge(
                    conn, str(lesson_id), str(org_id), ex,
                    existing_exercise_count + j + 1
                )
                # Add exercise block to lesson
                blocks.append({
                    "id": uuid.uuid4().hex[:7],
                    "type": "exercise",
                    "exercise_id": ex_id,
                    "page": 1,
                    "sort_order": len(blocks),
                })
                print(f"    ✓ [{ex['level']}] {ex['title']}")
                total_extracted += 1

            # Update text block with cleaned HTML
            blocks[text_idx]["body"] = cleaned_html
            content["blocks"] = blocks

            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE lessons SET content = %s, updated_at = NOW() WHERE id = %s",
                    (json.dumps(content), lesson_id),
                )
            total_cleaned += 1

        conn.commit()
        print(f"\nDone. Extracted {total_extracted} exercises from {total_cleaned} lessons.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
