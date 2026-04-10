"""Apply rewritten SAT Math lessons to the database.

Reads each lesson's existing content blocks, replaces ONLY the first
text block (sort_order 0) with new HTML, and keeps every exercise
block intact so we don't accidentally orphan any practice questions.

Designed to run inside the lms-backend-1 container on the Hetzner
prod server, where DATABASE_URL points at lms-db-1. The script uses
psycopg (sync, no asyncpg) to keep dependencies tiny.

Usage on the server:
    docker cp scripts/sat_rework lms-backend-1:/app/sat_rework
    docker exec -e DB_URL=postgresql://lms:PASS@lms-db-1:5432/lms \\
        lms-backend-1 python -m sat_rework.apply
"""
from __future__ import annotations

import json
import os
import sys
import uuid

import psycopg

from . import (
    lesson_01_solving_linear,
    lesson_02_inequalities,
    lesson_03_systems,
    lesson_04_slope,
    lesson_05_graphing,
    lesson_06_interpreting,
    lesson_07_ratios,
    lesson_08_percentages,
    lesson_09_statistics,
    lesson_10_scatter,
    lesson_11_probability,
    lesson_12_quadratics,
    lesson_13_parabolas,
    lesson_14_polynomials,
    lesson_15_exponentials,
    lesson_16_transformations,
    lesson_17_geometry,
    lesson_18_circles,
    lesson_19_trigonometry,
    lesson_20_complex,
    lesson_21_volume,
)

LESSONS = {
    # Heart of Algebra (module 1)
    "91c0b5e8-20bf-4480-8399-07bd07a5a116": lesson_01_solving_linear,
    "57579ab4-4f49-4de1-a15d-fd18a0e0d6e0": lesson_02_inequalities,
    "da687813-5b42-4d3a-a931-6a63c57cdff1": lesson_03_systems,
    "a42753e2-15e0-40d5-bc83-b9ddfe85eb3f": lesson_04_slope,
    "baaeeddc-18c0-4cd6-a184-43d49edac550": lesson_05_graphing,
    "57326861-a2b7-458a-bf69-bcccc6badf5e": lesson_06_interpreting,
    # Problem Solving & Data Analysis (module 2)
    "e9313003-8de0-45da-814e-14ec7081b6b8": lesson_07_ratios,
    "f25b0f87-6e0e-469e-912e-161d29fadccc": lesson_08_percentages,
    "192b8be2-a05d-4d25-8eae-0d0fe34c021c": lesson_09_statistics,
    "24ec483b-60be-4fb2-bcea-c60c398abb56": lesson_10_scatter,
    "a1a6ed7f-c440-4cec-a855-c40bbccbf01a": lesson_11_probability,
    # Passport to Advanced Math (module 3)
    "66123c5b-0659-496f-a467-2c56a7f7e930": lesson_12_quadratics,
    "bd5e2b0a-4787-4520-a357-3de4af910c4c": lesson_13_parabolas,
    "fe0a383a-0ead-440c-995c-a6b3520c763b": lesson_14_polynomials,
    "4342dd41-1ead-4c8a-85ad-b26cb98b8556": lesson_15_exponentials,
    "195bc7e8-7315-4816-b464-a5759cd1f128": lesson_16_transformations,
    # Additional Topics in Math (module 4)
    "a2830066-24d6-48af-be9b-ec0f6bc084f7": lesson_17_geometry,
    "4d2d7a80-5917-4197-9aac-d03307c348d3": lesson_18_circles,
    "26f5a40e-db03-40d9-8dc4-950a3f1b3b41": lesson_19_trigonometry,
    "41dd2b40-a548-4b18-85b2-b11ecb79cbde": lesson_20_complex,
    "bcf5e836-7e5a-4d6c-857a-a8918ed217c7": lesson_21_volume,
}


def rewrite(conn, lesson_id: str, builder) -> None:
    """Pull current content, swap text block 0, write back."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT content, title FROM lessons WHERE id = %s", (lesson_id,)
        )
        row = cur.fetchone()
        if row is None:
            print(f"  ! lesson {lesson_id} not found", file=sys.stderr)
            return
        content, title = row

    # `content` is JSONB → already a dict via psycopg's default loader
    blocks = list(content.get("blocks", []))
    new_html = builder.build()

    # Find the first text block and rewrite its body in place. Keeps
    # the same id so analytics keyed on block id (if any) survive.
    text_block_idx = None
    for i, b in enumerate(blocks):
        if b.get("type") == "text":
            text_block_idx = i
            break

    if text_block_idx is None:
        # No text block at all — insert one at sort_order 0 and shift the rest
        new_block = {
            "id": uuid.uuid4().hex[:7],
            "type": "text",
            "format": "html",
            "body": new_html,
            "page": 1,
            "sort_order": 0,
        }
        for b in blocks:
            b["sort_order"] = b.get("sort_order", 0) + 1
        blocks.insert(0, new_block)
    else:
        blocks[text_block_idx]["body"] = new_html
        blocks[text_block_idx]["format"] = "html"
        blocks[text_block_idx]["page"] = blocks[text_block_idx].get("page", 1)
        blocks[text_block_idx]["sort_order"] = 0

    new_content = {"blocks": blocks, "version": content.get("version", 2)}

    with conn.cursor() as cur:
        cur.execute(
            "UPDATE lessons SET content = %s, updated_at = NOW() WHERE id = %s",
            (json.dumps(new_content), lesson_id),
        )
    print(f"  ✓ {title} ({lesson_id[:8]}…) — {len(new_html)} chars, {len(blocks)} blocks")


def main() -> int:
    db_url = os.environ.get("DB_URL") or os.environ.get("DATABASE_URL")
    if not db_url:
        print("DB_URL not set", file=sys.stderr)
        return 1
    # psycopg expects postgresql:// not postgresql+asyncpg://
    db_url = db_url.replace("+asyncpg", "")

    print(f"Connecting to {db_url.split('@')[-1]} …")
    with psycopg.connect(db_url, autocommit=False) as conn:
        for lesson_id, builder in LESSONS.items():
            rewrite(conn, lesson_id, builder)
        conn.commit()
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
