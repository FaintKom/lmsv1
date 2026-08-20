"""every lesson stored as pages, so only one shape is left in the table

Hand-written, data only: no column changes.

Lessons have been stored three ways. v1 kept prose in ``content.body`` (or a
url, for a video). v2 kept a flat ``blocks`` list. v3 — specs/023 — groups
those same blocks into pages, the screens a student walks with Next. The
editors write v3 already; this rewrites what is on disk so the readers can
stop carrying the other two.

The conversion is mechanical and lossless: every block keeps its id, type and
order, and a converted lesson opens as one page holding exactly what it held
before. Rows already on v3 are skipped, which also makes a re-run a no-op.

What is deliberately NOT touched: content that carries neither ``blocks`` nor
``body``/``url`` — the type-specific configs of legacy quiz / theory /
interactive lessons. A page list cannot express them, and rewriting them to an
empty page would blank the lesson. They are left exactly as they are and
counted in the log line, so anyone can see whether any remain.

Revision ID: p4g3sv3rs10n
Revises: r3c0rd1ng5x
Create Date: 2026-08-20
"""

import json
import logging
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "p4g3sv3rs10n"
down_revision: Union[str, None] = "r3c0rd1ng5x"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

logger = logging.getLogger("alembic.runtime.migration")


def _as_pages(content: dict, content_type: str) -> dict | None:
    """The lesson's content as v3 pages, or None if it must stay as it is."""
    if content.get("version") == 3:
        return None

    blocks = content.get("blocks")
    if isinstance(blocks, list):
        ordered = sorted(blocks, key=lambda b: b.get("sort_order", 0) if isinstance(b, dict) else 0)
        return {
            "version": 3,
            "pages": [
                {
                    "id": "page_1",
                    "blocks": [
                        {**b, "sort_order": i, "page": 1}
                        for i, b in enumerate(ordered)
                        if isinstance(b, dict)
                    ],
                }
            ],
        }

    body = content.get("body")
    url = content.get("url")
    built: list[dict] = []
    if isinstance(body, str) and body.strip():
        built.append(
            {
                "id": "b0",
                "type": "text",
                "sort_order": 0,
                "page": 1,
                "body": body,
                "format": content.get("format") or "html",
            }
        )
    if content_type == "video" and isinstance(url, str) and url:
        built.append(
            {
                "id": f"b{len(built)}",
                "type": "video",
                "sort_order": len(built),
                "page": 1,
                "url": url,
            }
        )
    if built:
        return {"version": 3, "pages": [{"id": "page_1", "blocks": built}]}

    # Empty content is a lesson waiting to be written — give it a blank page.
    if not content:
        return {"version": 3, "pages": [{"id": "page_1", "blocks": []}]}

    # Anything else carries a shape pages cannot hold. Leave it alone.
    return None


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, content_type, content FROM lessons")).fetchall()

    converted = 0
    skipped = 0
    for row in rows:
        raw = row.content
        content = raw if isinstance(raw, dict) else (json.loads(raw) if raw else {})
        content_type = getattr(row.content_type, "value", row.content_type) or "text"
        pages = _as_pages(content, str(content_type))
        if pages is None:
            if content.get("version") != 3:
                skipped += 1
            continue
        bind.execute(
            sa.text("UPDATE lessons SET content = CAST(:c AS jsonb) WHERE id = :i"),
            {"c": json.dumps(pages), "i": str(row.id)},
        )
        converted += 1

    logger.info(
        "lessons converted to pages: %d converted, %d left in a shape pages cannot hold",
        converted,
        skipped,
    )


def downgrade() -> None:
    """Back to a flat block list — the shape v3 was grown from.

    Page grouping is the only thing lost, and only because v2 has nowhere to
    put it.
    """
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, content FROM lessons")).fetchall()
    for row in rows:
        raw = row.content
        content = raw if isinstance(raw, dict) else (json.loads(raw) if raw else {})
        if content.get("version") != 3:
            continue
        blocks: list[dict] = []
        for page in content.get("pages") or []:
            for block in page.get("blocks") or []:
                blocks.append({**block, "sort_order": len(blocks), "page": 1})
        bind.execute(
            sa.text("UPDATE lessons SET content = CAST(:c AS jsonb) WHERE id = :i"),
            {"c": json.dumps({"version": 2, "blocks": blocks}), "i": str(row.id)},
        )
