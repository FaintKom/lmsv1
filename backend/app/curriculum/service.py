"""Curriculum (scope & sequence) CRUD service.

A course's curriculum is its ordered list of :class:`CurriculumTopic`. RBAC is
delegated to the shared analytics task-stats helpers so curriculum shares the
exact same scoping rules as the journal:

  - teacher                      → read own courses (write is staff-only)
  - is_methodist / admin         → read + write all courses in their org
  - super_admin                  → read + write all courses, all orgs
  - student / parent             → forbidden

Write access (create/update/delete/reorder) is restricted to org-wide staff
(methodist/admin/super_admin); a plain teacher may only *read* their own
course's curriculum. Reads reuse ``_authorize_course`` (own-course for
teachers, org-wide for methodist/admin).
"""
from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.task_stats_service import (
    TaskStatsError,
    _authorize_course,
    _is_org_wide,
    require_stats_role,
)
from app.auth.models import User
from app.curriculum.models import CurriculumTopic


def _topic_dict(t: CurriculumTopic) -> dict:
    return {
        "id": str(t.id),
        "course_id": str(t.course_id),
        "position": t.position,
        "title": t.title or "",
        "planned_lessons": t.planned_lessons,
        "target_date": t.target_date.isoformat() if t.target_date else None,
    }


def _require_write(user: User) -> None:
    """Curriculum writes are org-wide staff only (methodist/admin/super_admin)."""
    require_stats_role(user)
    if not _is_org_wide(user):
        raise TaskStatsError("forbidden", "Only methodists/admins can edit the curriculum")


async def list_topics(
    db: AsyncSession, user: User, course_id: uuid.UUID
) -> dict:
    """Ordered scope & sequence of a course (teacher read = own course)."""
    require_stats_role(user)
    course = await _authorize_course(db, user, course_id)
    topics = (
        await db.execute(
            select(CurriculumTopic)
            .where(CurriculumTopic.course_id == course_id)
            .order_by(CurriculumTopic.position, CurriculumTopic.created_at)
        )
    ).scalars().all()
    return {
        "course_id": str(course.id),
        "course_title": course.title,
        "topics": [_topic_dict(t) for t in topics],
    }


async def create_topic(
    db: AsyncSession,
    user: User,
    course_id: uuid.UUID,
    title: str,
    planned_lessons: int | None,
    target_date: date | None,
) -> dict:
    """Append a topic at the next position for the course."""
    _require_write(user)
    await _authorize_course(db, user, course_id)

    max_pos = await db.scalar(
        select(func.max(CurriculumTopic.position)).where(
            CurriculumTopic.course_id == course_id
        )
    )
    next_pos = (max_pos or 0) + 1
    topic = CurriculumTopic(
        course_id=course_id,
        position=next_pos,
        title=(title or "")[:300],
        planned_lessons=max(1, planned_lessons or 1),
        target_date=target_date,
    )
    db.add(topic)
    await db.flush()
    return _topic_dict(topic)


async def update_topic(
    db: AsyncSession,
    user: User,
    topic_id: uuid.UUID,
    *,
    title: str | None = None,
    planned_lessons: int | None = None,
    target_date: date | None = None,
    target_date_set: bool = False,
    position: int | None = None,
) -> dict:
    """Update a topic's fields and/or move it to a new position.

    ``position`` triggers a reorder: the topic is moved to the requested 1-based
    slot (clamped to ``[1, N]``) and the other topics of the course are shifted
    to keep positions contiguous. ``target_date_set`` distinguishes "clear the
    date" (explicit null) from "leave it untouched".
    """
    _require_write(user)
    topic = await db.scalar(
        select(CurriculumTopic).where(CurriculumTopic.id == topic_id)
    )
    if topic is None:
        raise TaskStatsError("not_found", "Topic not found")
    # Course-level RBAC (org isolation). Writes already require org-wide above.
    await _authorize_course(db, user, topic.course_id)

    if title is not None:
        topic.title = title[:300]
    if planned_lessons is not None:
        topic.planned_lessons = max(1, planned_lessons)
    if target_date_set:
        topic.target_date = target_date

    if position is not None and position != topic.position:
        await _reorder(db, topic, position)

    await db.flush()
    return _topic_dict(topic)


async def _reorder(db: AsyncSession, topic: CurriculumTopic, new_position: int) -> None:
    """Move ``topic`` to ``new_position`` and renumber the course contiguously."""
    topics = (
        await db.execute(
            select(CurriculumTopic)
            .where(CurriculumTopic.course_id == topic.course_id)
            .order_by(CurriculumTopic.position, CurriculumTopic.created_at)
        )
    ).scalars().all()
    # Build the new order list without the moved topic, then insert it.
    others = [t for t in topics if t.id != topic.id]
    target_idx = max(0, min(new_position - 1, len(others)))
    others.insert(target_idx, topic)
    for idx, t in enumerate(others, start=1):
        if t.position != idx:
            t.position = idx
            db.add(t)


async def delete_topic(
    db: AsyncSession, user: User, topic_id: uuid.UUID
) -> dict:
    """Delete a topic and close the gap so positions stay contiguous."""
    _require_write(user)
    topic = await db.scalar(
        select(CurriculumTopic).where(CurriculumTopic.id == topic_id)
    )
    if topic is None:
        raise TaskStatsError("not_found", "Topic not found")
    await _authorize_course(db, user, topic.course_id)

    course_id = topic.course_id
    removed_pos = topic.position
    await db.delete(topic)
    await db.flush()
    # Shift everything after the removed slot down by one.
    await db.execute(
        sa_update(CurriculumTopic)
        .where(
            CurriculumTopic.course_id == course_id,
            CurriculumTopic.position > removed_pos,
        )
        .values(position=CurriculumTopic.position - 1)
    )
    await db.flush()
    return {"deleted": str(topic_id)}
