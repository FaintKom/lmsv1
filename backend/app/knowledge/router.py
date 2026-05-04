"""Knowledge module HTTP routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db
from app.knowledge import service
from app.knowledge.schemas import (
    EntryDetail,
    EntrySummary,
    SearchResponse,
    SearchResultItem,
)

router = APIRouter()


@router.get("/search", response_model=SearchResponse)
async def search_endpoint(
    q: str = Query(..., min_length=1, description="Natural-language query"),
    limit: int = Query(20, ge=1, le=100),
    types: list[str] | None = Query(None),
    stages: list[str] | None = Query(None),
    audiences: list[str] | None = Query(None),
    modes: list[str] | None = Query(None),
    problems: list[str] | None = Query(None),
    tags: list[str] | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Hybrid semantic search: Voyage embedding + facet filters."""
    try:
        results = await service.search(
            db,
            q,
            limit=limit,
            types=types,
            stages=stages,
            audiences=audiences,
            modes=modes,
            problems=problems,
            tags=tags,
        )
    except service.VoyageError as e:
        raise HTTPException(status_code=503, detail=f"Embedding service unavailable: {e}")

    items = [
        SearchResultItem(
            **EntrySummary.model_validate(entry).model_dump(),
            score=score,
        )
        for entry, score in results
    ]
    return SearchResponse(query=q, total=len(items), items=items)


@router.get("", response_model=dict)
async def list_endpoint(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    types: list[str] | None = Query(None),
    stages: list[str] | None = Query(None),
    audiences: list[str] | None = Query(None),
    modes: list[str] | None = Query(None),
    problems: list[str] | None = Query(None),
    tags: list[str] | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Browse entries with facet filters (no semantic search)."""
    items, total = await service.list_entries(
        db,
        limit=limit,
        offset=offset,
        types=types,
        stages=stages,
        audiences=audiences,
        modes=modes,
        problems=problems,
        tags=tags,
    )
    return {
        "total": total,
        "items": [EntrySummary.model_validate(e).model_dump(mode="json") for e in items],
    }


@router.get("/facets", response_model=dict)
async def facets_endpoint(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Counts per facet value for sidebar filters."""
    return await service.get_facet_counts(db)


@router.get("/{entry_id}", response_model=EntryDetail)
async def get_endpoint(
    entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    entry = await service.get_entry(db, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return EntryDetail.model_validate(entry)
