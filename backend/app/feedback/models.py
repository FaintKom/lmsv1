"""Content feedback domain.

Two coupled but independent feedback targets share one table; the
``kind`` enum disambiguates which fields the row uses.

  - ``lesson_rating``: a 1–5 star score + optional comment, submitted
    once per (user, lesson). Re-rating UPDATEs the same row, which
    is enforced by a partial unique index in the Alembic migration:
    ``(user_id, lesson_id) WHERE kind='lesson_rating'``.

  - ``block_issue``:  a category + optional comment flagged on one
    content unit (text / video / exercise) inside a lesson. The
    block reference is a soft string ID — content blocks live inside
    a JSON column on ``lessons.content`` and don't have their own
    FK target. Hard-capped at 3 per (user, lesson, block) by the
    service layer.

The same row carries an admin workflow (open → acknowledged →
resolved / wontfix / duplicate) and a ``xp_awarded`` flip so the
gamification side can stay idempotent — see ``app.gamification.service``.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, IDMixin, TimestampMixin


class FeedbackKind(str, enum.Enum):
    lesson_rating = "lesson_rating"
    block_issue = "block_issue"


class FeedbackCategory(str, enum.Enum):
    typo = "typo"
    unclear = "unclear"
    wrong_grading = "wrong_grading"
    broken_link = "broken_link"
    too_easy = "too_easy"
    too_hard = "too_hard"
    other = "other"


class FeedbackStatus(str, enum.Enum):
    open = "open"
    acknowledged = "acknowledged"
    resolved = "resolved"
    wontfix = "wontfix"
    duplicate = "duplicate"


class ContentFeedback(Base, IDMixin, TimestampMixin):
    __tablename__ = "content_feedback"

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Block-level fields. Both NULL for lesson_rating rows.
    # ``block_id`` is a soft reference (LessonBlock.id is a string inside
    # the lesson's JSON content, not its own FK target). ``block_type``
    # is one of "text" / "video" / "exercise" — kept in the row so the
    # admin inbox can render the right icon without re-resolving the JSON.
    block_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    block_type: Mapped[str | None] = mapped_column(String(16), nullable=True)

    kind: Mapped[FeedbackKind] = mapped_column(
        String(20), nullable=False
    )

    # 1..5 for lesson_rating, NULL for block_issue.
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # NULL for lesson_rating, required for block_issue.
    category: Mapped[FeedbackCategory | None] = mapped_column(
        String(20), nullable=True
    )

    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[FeedbackStatus] = mapped_column(
        String(20), nullable=False, default=FeedbackStatus.open, server_default="open"
    )

    # Resolution metadata. resolved_by + resolved_at are populated when
    # an admin moves the row out of `open`.
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolver_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Flip when admin awards the +5 XP "helpful feedback" prize. Idempotent.
    xp_awarded: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
