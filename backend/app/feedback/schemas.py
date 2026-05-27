"""Pydantic schemas for the content-feedback module.

Wire-format for the lesson + content-block feedback API. The model
layer stores both kinds in a single ``content_feedback`` row; these
schemas mirror that shape with field-level validators that enforce the
two shapes from the request side (e.g. ``lesson_rating`` rows must
carry ``rating``; ``block_issue`` rows must carry ``block_id`` +
``category``).
"""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.feedback.models import FeedbackCategory, FeedbackKind, FeedbackStatus


# ── Student-facing request shapes ──────────────────────────────────────


class FeedbackCreateRequest(BaseModel):
    """Body for POST /feedback. Shape depends on kind."""

    lesson_id: uuid.UUID
    kind: FeedbackKind

    # Required when kind == lesson_rating.
    rating: int | None = Field(default=None, ge=1, le=5)

    # Required when kind == block_issue.
    block_id: str | None = Field(default=None, max_length=64)
    block_type: str | None = Field(default=None, max_length=16)
    category: FeedbackCategory | None = None

    # Optional for either kind.
    comment: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def _shape_consistency(self):
        if self.kind is FeedbackKind.lesson_rating:
            if self.rating is None:
                raise ValueError("rating is required for lesson_rating")
            if self.block_id or self.category:
                raise ValueError(
                    "block_id/category must be empty for lesson_rating"
                )
        else:  # block_issue
            if not self.block_id:
                raise ValueError("block_id is required for block_issue")
            if self.category is None:
                raise ValueError("category is required for block_issue")
            if self.rating is not None:
                raise ValueError("rating must be empty for block_issue")
        return self


class FeedbackUpdateRequest(BaseModel):
    """Body for PATCH /feedback/{id} (own row, within edit window)."""

    comment: str | None = Field(default=None, max_length=2000)
    rating: int | None = Field(default=None, ge=1, le=5)


class FeedbackResponse(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    block_id: str | None
    block_type: str | None
    kind: FeedbackKind
    rating: int | None
    category: FeedbackCategory | None
    comment: str | None
    status: FeedbackStatus
    xp_awarded: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Admin shapes ───────────────────────────────────────────────────────


class AdminFeedbackResponse(FeedbackResponse):
    """Admin sees author identity + resolution metadata. Students don't."""

    user_id: uuid.UUID
    user_name: str | None = None
    user_email: str | None = None
    resolved_by: uuid.UUID | None
    resolved_at: datetime | None
    resolver_note: str | None


class AdminStatusUpdateRequest(BaseModel):
    status: FeedbackStatus
    resolver_note: str | None = Field(default=None, max_length=1000)


class StatsBlockEntry(BaseModel):
    block_id: str
    block_type: str | None
    lesson_id: uuid.UUID
    lesson_title: str | None
    open_count: int


class StatsLessonEntry(BaseModel):
    lesson_id: uuid.UUID
    lesson_title: str | None
    avg_rating: float | None
    ratings_count: int
    open_issues_count: int


class FeedbackStatsResponse(BaseModel):
    """Aggregates surfaced on the admin dashboard."""

    open_total: int
    top_blocks: list[StatsBlockEntry]
    worst_rated_lessons: list[StatsLessonEntry]
    new_since_last_visit: int = 0
