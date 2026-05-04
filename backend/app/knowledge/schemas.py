"""Pydantic schemas for knowledge module API."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EntryTypeLiteral = Literal[
    "concept", "insight", "tool", "framework", "method", "template", "exercise", "case_study"
]
StageLiteral = Literal[
    "research", "analysis", "design", "development", "delivery", "evaluation", "iteration"
]
AudienceLiteral = Literal["k12", "adult", "corporate", "higher_ed", "self_directed"]
ModeLiteral = Literal[
    "online", "offline", "hybrid", "sync", "async", "microlearning", "simulation", "game-based"
]
ProblemLiteral = Literal[
    "motivation", "retention", "engagement", "assessment", "transfer", "feedback",
    "accessibility", "scalability", "onboarding", "cognitive-load", "differentiation",
    "collaboration",
]
SourceTypeLiteral = Literal["skillbox", "prog_tools", "telegram", "web", "book", "own"]


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str | None = None
    source_type: SourceTypeLiteral
    title: str | None = None


class EntrySummary(BaseModel):
    """Lighter shape for list/search results — no `content`."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: EntryTypeLiteral
    title: str
    summary: str
    applicability: str
    stage: list[str]
    audience: list[str]
    mode: list[str]
    problems: list[str]
    tags: list[str]
    ai_quality: float | None
    verifier_score: float | None
    created_at: datetime


class EntryDetail(EntrySummary):
    """Full entry shape for single-entry view."""
    content: str
    sources: list[SourceResponse]


class SearchResultItem(EntrySummary):
    """Search result with similarity / rank score."""
    score: float = Field(..., description="0-1 relevance, higher is better")


class SearchResponse(BaseModel):
    query: str
    total: int
    items: list[SearchResultItem]


class ListFilters(BaseModel):
    """Optional filters for list/search."""
    types: list[EntryTypeLiteral] | None = None
    stages: list[StageLiteral] | None = None
    audiences: list[AudienceLiteral] | None = None
    modes: list[ModeLiteral] | None = None
    problems: list[ProblemLiteral] | None = None
    tags: list[str] | None = None
    min_score: float | None = Field(None, ge=0, le=1)
