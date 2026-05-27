"""Business logic for the content-feedback module.

All cross-cutting rules live here (per-block 3-cap, edit window,
XP-award idempotency + per-author hourly cap) so the router stays a
thin shim and the pytest suite can exercise rules directly.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.courses.models import Course, Lesson, Module
from app.feedback.models import (
    ContentFeedback,
    FeedbackCategory,
    FeedbackKind,
    FeedbackStatus,
)
from app.feedback.schemas import (
    AdminStatusUpdateRequest,
    FeedbackCreateRequest,
    FeedbackUpdateRequest,
)
from app.gamification import service as gamification_service

# Constants surfaced as module-level so tests can patch them.
EDIT_WINDOW_MINUTES = 5
MAX_BLOCK_ISSUES_PER_USER_PER_BLOCK = 3
XP_HELPFUL_FEEDBACK = 5
MAX_XP_AWARDS_PER_AUTHOR_PER_HOUR = 2


class FeedbackError(Exception):
    """Domain error carrying a stable code and a user-facing message."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _resolve_org_id(db: AsyncSession, lesson_id: uuid.UUID) -> uuid.UUID:
    """Resolve the org the lesson belongs to (via module → course)."""
    stmt = (
        select(Course.org_id)
        .join(Module, Module.course_id == Course.id)
        .join(Lesson, Lesson.module_id == Module.id)
        .where(Lesson.id == lesson_id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if row is None:
        raise FeedbackError("lesson_not_found", "Lesson does not exist")
    return row[0]


async def create_feedback(
    db: AsyncSession,
    user: User,
    body: FeedbackCreateRequest,
) -> ContentFeedback:
    """Create or upsert a feedback row.

    Lesson ratings UPSERT (one per user per lesson — partial unique
    index in the DB plus a defensive SELECT-then-UPDATE here so we
    return a stable id to the client). Block issues INSERT subject to
    the per-block 3-cap.
    """
    org_id = await _resolve_org_id(db, body.lesson_id)

    if body.kind is FeedbackKind.lesson_rating:
        existing = await db.scalar(
            select(ContentFeedback).where(
                and_(
                    ContentFeedback.user_id == user.id,
                    ContentFeedback.lesson_id == body.lesson_id,
                    ContentFeedback.kind == FeedbackKind.lesson_rating,
                )
            )
        )
        if existing is not None:
            existing.rating = body.rating
            existing.comment = body.comment
            existing.updated_at = _now()
            # Re-open if author edits a previously-resolved rating —
            # admin's prior resolution is now stale.
            existing.status = FeedbackStatus.open
            existing.resolved_by = None
            existing.resolved_at = None
            existing.resolver_note = None
            existing.xp_awarded = False
            await db.flush()
            return existing

        row = ContentFeedback(
            id=uuid.uuid4(),
            org_id=org_id,
            lesson_id=body.lesson_id,
            kind=FeedbackKind.lesson_rating,
            rating=body.rating,
            comment=body.comment,
            user_id=user.id,
            status=FeedbackStatus.open,
        )
        db.add(row)
        try:
            await db.flush()
        except IntegrityError:
            # Lost race: another concurrent request inserted first.
            # Re-fetch + apply the update path.
            await db.rollback()
            existing = await db.scalar(
                select(ContentFeedback).where(
                    and_(
                        ContentFeedback.user_id == user.id,
                        ContentFeedback.lesson_id == body.lesson_id,
                        ContentFeedback.kind == FeedbackKind.lesson_rating,
                    )
                )
            )
            assert existing is not None
            existing.rating = body.rating
            existing.comment = body.comment
            await db.flush()
            return existing
        return row

    # block_issue path — enforce the per-block 3-cap.
    count = await db.scalar(
        select(func.count(ContentFeedback.id)).where(
            and_(
                ContentFeedback.user_id == user.id,
                ContentFeedback.lesson_id == body.lesson_id,
                ContentFeedback.block_id == body.block_id,
                ContentFeedback.kind == FeedbackKind.block_issue,
            )
        )
    )
    if (count or 0) >= MAX_BLOCK_ISSUES_PER_USER_PER_BLOCK:
        raise FeedbackError(
            "block_cap_reached",
            f"You can flag this block at most "
            f"{MAX_BLOCK_ISSUES_PER_USER_PER_BLOCK} times",
        )

    row = ContentFeedback(
        id=uuid.uuid4(),
        org_id=org_id,
        lesson_id=body.lesson_id,
        block_id=body.block_id,
        block_type=body.block_type,
        kind=FeedbackKind.block_issue,
        category=body.category,
        comment=body.comment,
        user_id=user.id,
        status=FeedbackStatus.open,
    )
    db.add(row)
    await db.flush()
    return row


async def get_my_lesson_rating(
    db: AsyncSession, user: User, lesson_id: uuid.UUID
) -> ContentFeedback | None:
    """Return the user's prior rating for the lesson, if any."""
    return await db.scalar(
        select(ContentFeedback).where(
            and_(
                ContentFeedback.user_id == user.id,
                ContentFeedback.lesson_id == lesson_id,
                ContentFeedback.kind == FeedbackKind.lesson_rating,
            )
        )
    )


async def update_own_feedback(
    db: AsyncSession,
    user: User,
    feedback_id: uuid.UUID,
    body: FeedbackUpdateRequest,
) -> ContentFeedback:
    """Edit one's own feedback row within the edit window."""
    row = await db.scalar(
        select(ContentFeedback).where(ContentFeedback.id == feedback_id)
    )
    if row is None:
        raise FeedbackError("not_found", "Feedback not found")
    if row.user_id != user.id:
        raise FeedbackError("forbidden", "Cannot edit another user's feedback")
    age = _now() - row.created_at
    if age > timedelta(minutes=EDIT_WINDOW_MINUTES):
        raise FeedbackError(
            "edit_window_expired",
            f"Edit window of {EDIT_WINDOW_MINUTES} minutes has expired",
        )
    if body.comment is not None:
        row.comment = body.comment
    if body.rating is not None and row.kind is FeedbackKind.lesson_rating:
        row.rating = body.rating
    row.updated_at = _now()
    await db.flush()
    return row


# ── Admin operations ──────────────────────────────────────────────────


async def list_admin_feedback(
    db: AsyncSession,
    org_id: uuid.UUID,
    *,
    status: FeedbackStatus | None = None,
    kind: FeedbackKind | None = None,
    category: FeedbackCategory | None = None,
    course_id: uuid.UUID | None = None,
    lesson_id: uuid.UUID | None = None,
    since: datetime | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[ContentFeedback]:
    stmt = select(ContentFeedback).where(ContentFeedback.org_id == org_id)
    if status is not None:
        stmt = stmt.where(ContentFeedback.status == status)
    if kind is not None:
        stmt = stmt.where(ContentFeedback.kind == kind)
    if category is not None:
        stmt = stmt.where(ContentFeedback.category == category)
    if lesson_id is not None:
        stmt = stmt.where(ContentFeedback.lesson_id == lesson_id)
    if course_id is not None:
        stmt = stmt.where(
            ContentFeedback.lesson_id.in_(
                select(Lesson.id)
                .join(Module, Module.id == Lesson.module_id)
                .where(Module.course_id == course_id)
            )
        )
    if since is not None:
        stmt = stmt.where(ContentFeedback.created_at >= since)
    stmt = stmt.order_by(desc(ContentFeedback.created_at)).limit(limit).offset(offset)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def update_status(
    db: AsyncSession,
    admin: User,
    feedback_id: uuid.UUID,
    body: AdminStatusUpdateRequest,
) -> ContentFeedback:
    row = await db.scalar(
        select(ContentFeedback).where(ContentFeedback.id == feedback_id)
    )
    if row is None:
        raise FeedbackError("not_found", "Feedback not found")
    if row.org_id != admin.org_id:
        raise FeedbackError(
            "cross_org",
            "Feedback belongs to a different organisation",
        )
    row.status = body.status
    row.resolver_note = body.resolver_note
    if body.status in (
        FeedbackStatus.resolved,
        FeedbackStatus.wontfix,
        FeedbackStatus.duplicate,
        FeedbackStatus.acknowledged,
    ):
        row.resolved_by = admin.id
        row.resolved_at = _now()
    else:
        row.resolved_by = None
        row.resolved_at = None
    row.updated_at = _now()
    await db.flush()
    return row


async def award_xp(
    db: AsyncSession,
    admin: User,
    feedback_id: uuid.UUID,
) -> ContentFeedback:
    """Reward the author with +5 XP for a helpful feedback row.

    Idempotent: flips the row's ``xp_awarded`` boolean. Per-author
    hourly cap (2/hour) prevents an admin from burst-awarding one
    student into the leaderboard top.
    """
    row = await db.scalar(
        select(ContentFeedback).where(ContentFeedback.id == feedback_id)
    )
    if row is None:
        raise FeedbackError("not_found", "Feedback not found")
    if row.org_id != admin.org_id:
        raise FeedbackError("cross_org", "Cross-org award")
    if row.xp_awarded:
        return row  # already awarded — no-op

    one_hour_ago = _now() - timedelta(hours=1)
    recent_awards = await db.scalar(
        select(func.count(ContentFeedback.id)).where(
            and_(
                ContentFeedback.user_id == row.user_id,
                ContentFeedback.xp_awarded.is_(True),
                ContentFeedback.updated_at >= one_hour_ago,
            )
        )
    )
    if (recent_awards or 0) >= MAX_XP_AWARDS_PER_AUTHOR_PER_HOUR:
        raise FeedbackError(
            "xp_hourly_cap",
            f"Author already received "
            f"{MAX_XP_AWARDS_PER_AUTHOR_PER_HOUR} XP awards in the last hour",
        )

    await gamification_service.award_xp(
        db, row.user_id, XP_HELPFUL_FEEDBACK, reason="feedback_helpful"
    )
    row.xp_awarded = True
    row.updated_at = _now()
    await db.flush()
    return row


# ── Stats aggregations ────────────────────────────────────────────────


async def compute_stats(
    db: AsyncSession, org_id: uuid.UUID, top_n: int = 10
) -> dict:
    """Aggregations surfaced on the admin dashboard widget."""
    open_total = await db.scalar(
        select(func.count(ContentFeedback.id)).where(
            and_(
                ContentFeedback.org_id == org_id,
                ContentFeedback.status == FeedbackStatus.open,
            )
        )
    )

    # Top problem blocks: most open block_issue rows grouped by block.
    block_stmt = (
        select(
            ContentFeedback.block_id,
            ContentFeedback.block_type,
            ContentFeedback.lesson_id,
            Lesson.title.label("lesson_title"),
            func.count(ContentFeedback.id).label("open_count"),
        )
        .join(Lesson, Lesson.id == ContentFeedback.lesson_id)
        .where(
            and_(
                ContentFeedback.org_id == org_id,
                ContentFeedback.status == FeedbackStatus.open,
                ContentFeedback.kind == FeedbackKind.block_issue,
            )
        )
        .group_by(
            ContentFeedback.block_id,
            ContentFeedback.block_type,
            ContentFeedback.lesson_id,
            Lesson.title,
        )
        .order_by(desc("open_count"))
        .limit(top_n)
    )
    top_blocks = [
        {
            "block_id": r.block_id,
            "block_type": r.block_type,
            "lesson_id": r.lesson_id,
            "lesson_title": r.lesson_title,
            "open_count": r.open_count,
        }
        for r in (await db.execute(block_stmt)).all()
    ]

    # Worst-rated lessons: avg rating ascending.
    lesson_stmt = (
        select(
            ContentFeedback.lesson_id,
            Lesson.title.label("lesson_title"),
            func.avg(ContentFeedback.rating).label("avg_rating"),
            func.count(ContentFeedback.id).label("ratings_count"),
        )
        .join(Lesson, Lesson.id == ContentFeedback.lesson_id)
        .where(
            and_(
                ContentFeedback.org_id == org_id,
                ContentFeedback.kind == FeedbackKind.lesson_rating,
            )
        )
        .group_by(ContentFeedback.lesson_id, Lesson.title)
        .order_by("avg_rating")
        .limit(top_n)
    )
    worst_lessons_rows = (await db.execute(lesson_stmt)).all()

    worst_lessons = []
    for r in worst_lessons_rows:
        open_count = await db.scalar(
            select(func.count(ContentFeedback.id)).where(
                and_(
                    ContentFeedback.lesson_id == r.lesson_id,
                    ContentFeedback.status == FeedbackStatus.open,
                    ContentFeedback.kind == FeedbackKind.block_issue,
                )
            )
        )
        worst_lessons.append(
            {
                "lesson_id": r.lesson_id,
                "lesson_title": r.lesson_title,
                "avg_rating": float(r.avg_rating) if r.avg_rating is not None else None,
                "ratings_count": r.ratings_count,
                "open_issues_count": open_count or 0,
            }
        )

    return {
        "open_total": open_total or 0,
        "top_blocks": top_blocks,
        "worst_rated_lessons": worst_lessons,
    }
