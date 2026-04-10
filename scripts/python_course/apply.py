"""Apply Python course lesson content to the database.

Like SAT rework apply.py — reads existing lessons, replaces the text
block body, preserves exercise blocks.

Usage on server:
    docker exec -e DB_URL=postgresql://lms:PASS@lms-db-1:5432/lms \
        lms-backend-1 python -m python_course.apply
"""
from __future__ import annotations

import json
import os
import sys

import psycopg

from . import (
    m1_01_variables,
    m1_02_strings,
    m1_03_numbers,
    m1_04_input,
    m1_05_first_program,
    m1_06_project,
)

# lesson_id -> builder module
LESSONS = {
    # Module 1: First Steps
    "a86de6da-bca3-48ce-8386-ee59e90b69cb": m1_01_variables,
    "d0306da5-68d3-4c49-a22a-5fd823631bc9": m1_02_strings,
    "a76d89f1-4bee-4a39-9c28-c56eb015940b": m1_03_numbers,
    "304114a8-d6fc-49c0-a9de-8396aae70ee1": m1_04_input,
    "786a3034-5748-4606-b4d4-1b7cbe9fd14c": m1_05_first_program,
    "044ed27b-a88e-4585-81b9-b5a892ed49a0": m1_06_project,
}


def rewrite(conn, lesson_id: str, builder) -> None:
    with conn.cursor() as cur:
        cur.execute("SELECT content, title FROM lessons WHERE id = %s", (lesson_id,))
        row = cur.fetchone()
        if row is None:
            print(f"  ! lesson {lesson_id} not found", file=sys.stderr)
            return
        content, title = row

    if isinstance(content, str):
        content = json.loads(content)

    blocks = list(content.get("blocks", []))
    new_html = builder.build()

    text_idx = None
    for i, b in enumerate(blocks):
        if b.get("type") == "text":
            text_idx = i
            break

    if text_idx is not None:
        blocks[text_idx]["body"] = new_html
        blocks[text_idx]["format"] = "html"
    else:
        import uuid
        blocks.insert(0, {
            "id": uuid.uuid4().hex[:7],
            "type": "text", "format": "html",
            "body": new_html, "page": 1, "sort_order": 0,
        })

    new_content = {"blocks": blocks, "version": content.get("version", 2)}
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE lessons SET content = %s, updated_at = NOW() WHERE id = %s",
            (json.dumps(new_content), lesson_id),
        )
    print(f"  ✓ {title} ({lesson_id[:8]}…) — {len(new_html)} chars")


def main() -> int:
    db_url = os.environ.get("DB_URL") or os.environ.get("DATABASE_URL", "")
    db_url = db_url.replace("+asyncpg", "")
    if not db_url:
        print("DB_URL not set", file=sys.stderr)
        return 1

    with psycopg.connect(db_url, autocommit=False) as conn:
        for lid, builder in LESSONS.items():
            rewrite(conn, lid, builder)
        conn.commit()
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
