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
    m2_01_booleans,
    m2_02_conditionals,
    m2_03_for_loops,
    m2_04_while_loops,
    m2_05_nested_logic,
    m2_06_project,
    m3_01_lists,
    m3_02_dicts,
    m3_03_tuples_sets,
    m3_04_comprehensions,
    m3_05_sorting,
    m3_06_project,
    m4_01_defining,
    m4_02_arguments,
    m4_03_scope,
    m4_04_lambda,
    m4_05_decorators,
    m4_06_project,
    m5_01_classes,
    m5_02_methods,
    m5_03_inheritance,
    m5_04_dunder,
    m5_05_dataclasses,
    m5_06_project,
    m6_01_files,
    m6_02_json_csv,
    m6_03_exceptions,
    m6_04_modules,
    m6_05_apis,
    m6_06_project,
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
    # Module 2: Making Decisions
    "a1f85c0d-5795-439e-93a8-d05620d27f0d": m2_01_booleans,
    "9733188d-04fe-4f34-8cf2-4c4a54264158": m2_02_conditionals,
    "c7516b1c-6373-4b02-87a6-fede25ebdd76": m2_03_for_loops,
    "3131f535-4b8d-4e4b-8a79-911673f88a2f": m2_04_while_loops,
    "d060e772-1536-4adc-af75-fc338d0503e5": m2_05_nested_logic,
    "c92e730f-3aca-42c7-b117-6aff1b3a82c7": m2_06_project,
    # Module 3: Collections
    "8a12112d-bba5-4c5a-948e-ef863da95a18": m3_01_lists,
    "2e3fe31c-100d-45c8-b25b-33c75a3b262b": m3_02_dicts,
    "d93caf1d-4c6b-490f-8b67-0a98b4f56efc": m3_03_tuples_sets,
    "b392f5f2-3478-4ad3-92ad-caf226209456": m3_04_comprehensions,
    "d78a420c-8637-4859-abfb-fea8a6acf0ab": m3_05_sorting,
    "491f510a-3996-41ca-bbd6-37af48c92f3b": m3_06_project,
    # Module 4: Functions
    "593a6bad-a415-48de-a849-be2a6031a868": m4_01_defining,
    "f34ae1b6-2657-4155-b3b3-4dffeb545f3c": m4_02_arguments,
    "1d1e5eca-fc35-4c75-9a5b-0511cd967dd4": m4_03_scope,
    "0cee107d-a106-47b8-997d-4df3eb9ae3d8": m4_04_lambda,
    "15cccb35-0f12-4d96-9c02-cdc31d6d288a": m4_05_decorators,
    "803a29b9-3855-4719-b62f-77876a9a9975": m4_06_project,
    # Module 5: Object-Oriented Programming
    "0cc2baf0-36f4-43d1-be36-a50c85bf33f9": m5_01_classes,
    "e3638638-a553-41d0-a7e1-1e5d1d03f05f": m5_02_methods,
    "ab36f439-28aa-44fb-95bd-7abc127d0441": m5_03_inheritance,
    "4622c4fe-41e3-45e5-94a3-a8532076170f": m5_04_dunder,
    "a1885f71-ad1f-4851-8741-a5a424ccf19c": m5_05_dataclasses,
    "9d191b59-eae6-4268-8302-7d4c62f80a92": m5_06_project,
    # Module 6: Real-World Python
    "de3580f2-f839-4020-b220-16808c8ff208": m6_01_files,
    "c2b5d64d-c981-4f43-aecc-758d8ad12c03": m6_02_json_csv,
    "0337a45a-7ff2-44a9-a54d-b283cc5b5f20": m6_03_exceptions,
    "d505a2cf-6967-4d35-b1e4-8fc1287c8000": m6_04_modules,
    "def1cac8-1f5d-4733-8588-db4d2c4d2e29": m6_05_apis,
    "1b0c4373-8ca5-4cc5-a159-f9da4af2262c": m6_06_project,
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
