"""Knowledge module business logic.

Handles search (vector + facet hybrid), get-by-id, list with filters.
"""

from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path

import httpx
from sqlalchemy import and_, select, text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.knowledge.models import Entry, EntryStatus, EntryVisibility

logger = logging.getLogger(__name__)

VOYAGE_URL = "https://api.voyageai.com/v1/embeddings"
VOYAGE_MODEL = "voyage-3-large"


class VoyageError(Exception):
    pass


def _get_voyage_key() -> str | None:
    if "VOYAGE_API_KEY" in os.environ:
        return os.environ["VOYAGE_API_KEY"]
    # Fallback: dev/local key file. In prod set the env var.
    p = Path(r"F:\google-secrets\voyage-api-key.txt")
    if p.exists():
        return p.read_text(encoding="utf-8").strip()
    return None


async def embed_query(text_in: str) -> list[float]:
    """Embed a search query via Voyage AI. Returns 1024-dim vector."""
    key = _get_voyage_key()
    if not key:
        raise VoyageError("VOYAGE_API_KEY not configured")

    async with httpx.AsyncClient() as client:
        r = await client.post(
            VOYAGE_URL,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": VOYAGE_MODEL, "input": [text_in], "input_type": "query"},
            timeout=20,
        )
        if r.status_code != 200:
            raise VoyageError(f"Voyage API {r.status_code}: {r.text[:300]}")
        data = r.json()
        return data["data"][0]["embedding"]


def _vector_literal(vec: list[float]) -> str:
    """Postgres vector accepts '[v1,v2,...]' string literal."""
    return "[" + ",".join(str(float(x)) for x in vec) + "]"


def _public_filter():
    """Common WHERE clauses for what's visible publicly."""
    return and_(
        Entry.deleted_at.is_(None),
        Entry.status == EntryStatus.verified,
        Entry.visibility == EntryVisibility.public,
    )


async def search(
    db: AsyncSession,
    query: str,
    *,
    limit: int = 20,
    types: list[str] | None = None,
    stages: list[str] | None = None,
    audiences: list[str] | None = None,
    modes: list[str] | None = None,
    problems: list[str] | None = None,
    tags: list[str] | None = None,
) -> list[tuple[Entry, float]]:
    """Hybrid search: Voyage embedding similarity + optional facet filters.

    Returns list of (entry, similarity_score) sorted by score desc.
    """
    if not query.strip():
        return []

    qvec = await embed_query(query)
    vlit = _vector_literal(qvec)

    # Build filter conditions
    conds = [
        "deleted_at IS NULL",
        "status = 'verified'",
        "visibility = 'public'",
    ]
    params: dict[str, object] = {"vec": vlit, "limit": limit}

    if types:
        conds.append("type = ANY(:types)")
        params["types"] = types
    if stages:
        conds.append("stage && :stages")  # array overlap operator
        params["stages"] = stages
    if audiences:
        conds.append("audience && :audiences")
        params["audiences"] = audiences
    if modes:
        conds.append("mode && :modes")
        params["modes"] = modes
    if problems:
        conds.append("problems && :problems")
        params["problems"] = problems
    if tags:
        conds.append("tags && :tags")
        params["tags"] = tags

    where = " AND ".join(conds)

    # Cosine similarity = 1 - (embedding <=> query_vec)
    sql = text(f"""
        SELECT id, 1 - (embedding <=> CAST(:vec AS vector)) AS score
        FROM knowledge_entries
        WHERE {where} AND embedding IS NOT NULL
        ORDER BY embedding <=> CAST(:vec AS vector)
        LIMIT :limit
    """)

    result = await db.execute(sql, params)
    rows = result.fetchall()
    if not rows:
        return []

    ids = [r.id for r in rows]
    score_by_id = {r.id: float(r.score) for r in rows}

    # Hydrate full Entry objects (preserve order from search)
    entries_q = select(Entry).options(selectinload(Entry.sources)).where(Entry.id.in_(ids))
    entries = (await db.execute(entries_q)).scalars().all()
    entries_by_id = {e.id: e for e in entries}
    ordered = [(entries_by_id[i], score_by_id[i]) for i in ids if i in entries_by_id]
    return ordered


async def list_entries(
    db: AsyncSession,
    *,
    limit: int = 50,
    offset: int = 0,
    types: list[str] | None = None,
    stages: list[str] | None = None,
    audiences: list[str] | None = None,
    modes: list[str] | None = None,
    problems: list[str] | None = None,
    tags: list[str] | None = None,
) -> tuple[list[Entry], int]:
    """List entries with optional facet filters. Returns (items, total_count)."""
    try:
        base_filter = [
            Entry.deleted_at.is_(None),
            Entry.status == EntryStatus.verified,
            Entry.visibility == EntryVisibility.public,
        ]
        if types:
            base_filter.append(Entry.type.in_(types))
        if stages:
            base_filter.append(Entry.stage.overlap(stages))
        if audiences:
            base_filter.append(Entry.audience.overlap(audiences))
        if modes:
            base_filter.append(Entry.mode.overlap(modes))
        if problems:
            base_filter.append(Entry.problems.overlap(problems))
        if tags:
            base_filter.append(Entry.tags.overlap(tags))

        # Total
        total_q = select(Entry.id).where(*base_filter)
        total = len((await db.execute(total_q)).scalars().all())

        # Page
        page_q = (
            select(Entry)
            .options(selectinload(Entry.sources))
            .where(*base_filter)
            .order_by(Entry.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        items = (await db.execute(page_q)).scalars().all()
        return list(items), total
    except ProgrammingError as exc:
        logger.warning("knowledge list_entries failed (table may not exist): %s", exc)
        await db.rollback()
        return [], 0


async def get_entry(db: AsyncSession, entry_id: uuid.UUID) -> Entry | None:
    q = (
        select(Entry)
        .options(selectinload(Entry.sources))
        .where(Entry.id == entry_id, Entry.deleted_at.is_(None))
    )
    return (await db.execute(q)).scalars().first()


async def get_facet_counts(db: AsyncSession) -> dict:
    """Aggregate facet value counts for the filter sidebar."""
    empty = {"type": [], "stage": [], "audience": [], "mode": [], "problems": []}
    try:
        sql = text("""
            SELECT facet, val, COUNT(*) AS n FROM (
                SELECT 'type' AS facet, type::text AS val FROM knowledge_entries
                    WHERE deleted_at IS NULL AND status='verified' AND visibility='public'
                UNION ALL
                SELECT 'stage', unnest(stage) FROM knowledge_entries
                    WHERE deleted_at IS NULL AND status='verified' AND visibility='public'
                UNION ALL
                SELECT 'audience', unnest(audience) FROM knowledge_entries
                    WHERE deleted_at IS NULL AND status='verified' AND visibility='public'
                UNION ALL
                SELECT 'mode', unnest(mode) FROM knowledge_entries
                    WHERE deleted_at IS NULL AND status='verified' AND visibility='public'
                UNION ALL
                SELECT 'problems', unnest(problems) FROM knowledge_entries
                    WHERE deleted_at IS NULL AND status='verified' AND visibility='public'
            ) t
            GROUP BY facet, val
            ORDER BY facet, n DESC
        """)
        result = await db.execute(sql)
        out: dict[str, list[dict]] = dict(empty)
        for row in result:
            out.setdefault(row.facet, []).append({"value": row.val, "count": row.n})
        return out
    except ProgrammingError as exc:
        logger.warning("knowledge get_facet_counts failed (table may not exist): %s", exc)
        await db.rollback()
        return empty
