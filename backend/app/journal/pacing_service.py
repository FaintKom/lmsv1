"""Group pacing — plan (curriculum) vs actual (held sessions).

For each group of a course we ask: is it ahead, on-track or behind its course's
scope & sequence? The computation follows ``DATA_MODEL.md`` §3:

  covered_topics  = distinct actual_topic_id over the group's HELD sessions
  current_topic   = actual_topic_id of the group's most-recent held session
  next_topic      = first curriculum topic (by position) not yet covered
  progress        = covered_topics / total_topics

Mode A (lessons — always available):
  expected_lessons       = number of held sessions (one budgeted lesson each)
  covered_lessons_actual = Σ planned_lessons over covered topics
  delta = covered_lessons_actual − expected_lessons

Badge thresholds:
  delta >= +1  → "ahead"   (sun)
  |delta| < 1  → "ontrack" (green)
  delta <= -1  → "behind"  (coral)

Everything is computed with a handful of grouped queries over the caller's
in-scope groups — no per-group round-trip (no N+1).
"""
from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models import StudentGroup
from app.analytics.task_stats_service import (
    TaskStatsError,
    _course_scope_clause,
    _is_org_wide,
    require_stats_role,
)
from app.auth.models import User, UserRole
from app.courses.models import Course
from app.curriculum.models import CurriculumTopic
from app.journal.models import ClassSession
from app.rooms.models import Room


def _badge(delta: float) -> str:
    """Map a lessons-delta to a pacing badge (DATA_MODEL §3.3)."""
    if delta >= 1:
        return "ahead"
    if delta <= -1:
        return "behind"
    return "ontrack"


# ── Board (all groups in scope) ──────────────────────────────────────────────


async def get_pacing_board(db: AsyncSession, user: User) -> dict:
    """Pacing for every group the caller may see + KPI counts.

    Scope: a plain teacher sees groups whose course they own; methodist/admin
    see every group in their org; super_admin sees all. A group only appears
    when it is linked to a course (``group.course_id`` set) — that is the Phase
    B scheduling group. All aggregates are grouped queries keyed by group.
    """
    require_stats_role(user)

    # In-scope courses (reuse the analytics scope clause).
    course_stmt = select(Course.id, Course.title)
    scope = _course_scope_clause(user)
    if scope is not None:
        course_stmt = course_stmt.where(scope)
    course_rows = (await db.execute(course_stmt)).all()
    course_title_by_id = {cid: title for cid, title in course_rows}
    course_ids = list(course_title_by_id.keys())
    if not course_ids:
        return {"groups": [], "kpis": {"ontrack": 0, "behind": 0, "ahead": 0}}

    # Groups of those courses.
    groups = (
        await db.execute(
            select(StudentGroup)
            .where(StudentGroup.course_id.in_(course_ids))
            .order_by(StudentGroup.name)
        )
    ).scalars().all()
    if not groups:
        return {"groups": [], "kpis": {"ontrack": 0, "behind": 0, "ahead": 0}}

    group_ids = [g.id for g in groups]

    # Curriculum topics for the in-scope courses — one query, then bucket.
    total_topics_by_course: dict[uuid.UUID, int] = {}
    lessons_by_topic: dict[uuid.UUID, int] = {}
    topics_by_course: dict[uuid.UUID, list] = {}
    topic_rows = (
        await db.execute(
            select(
                CurriculumTopic.id,
                CurriculumTopic.course_id,
                CurriculumTopic.position,
                CurriculumTopic.title,
                CurriculumTopic.planned_lessons,
            )
            .where(CurriculumTopic.course_id.in_(course_ids))
            .order_by(CurriculumTopic.course_id, CurriculumTopic.position)
        )
    ).all()
    for tid, cid, pos, title, planned in topic_rows:
        total_topics_by_course[cid] = total_topics_by_course.get(cid, 0) + 1
        lessons_by_topic[tid] = planned
        topics_by_course.setdefault(cid, []).append((tid, pos, title, planned))

    # Held-session count per group — one grouped query.
    held_count_by_group: dict[uuid.UUID, int] = {}
    for gid, n in (
        await db.execute(
            select(ClassSession.group_id, func.count())
            .where(
                ClassSession.group_id.in_(group_ids),
                ClassSession.held.is_(True),
            )
            .group_by(ClassSession.group_id)
        )
    ).all():
        held_count_by_group[gid] = n

    # Distinct covered topics per group — one grouped query.
    covered_by_group: dict[uuid.UUID, set] = {gid: set() for gid in group_ids}
    for gid, tid in (
        await db.execute(
            select(ClassSession.group_id, ClassSession.actual_topic_id)
            .where(
                ClassSession.group_id.in_(group_ids),
                ClassSession.held.is_(True),
                ClassSession.actual_topic_id.isnot(None),
            )
            .distinct()
        )
    ).all():
        covered_by_group.setdefault(gid, set()).add(tid)

    # Current topic per group = actual_topic_id of the latest held session that
    # carries one. One query ordered by date desc; first row per group wins.
    current_topic_by_group: dict[uuid.UUID, uuid.UUID] = {}
    for gid, tid in (
        await db.execute(
            select(ClassSession.group_id, ClassSession.actual_topic_id)
            .where(
                ClassSession.group_id.in_(group_ids),
                ClassSession.held.is_(True),
                ClassSession.actual_topic_id.isnot(None),
            )
            .order_by(ClassSession.session_date.desc(), ClassSession.created_at.desc())
        )
    ).all():
        current_topic_by_group.setdefault(gid, tid)

    # Teacher + room names referenced by the groups — one query each.
    teacher_ids = {g.teacher_id for g in groups if g.teacher_id}
    teacher_names: dict[uuid.UUID, str] = {}
    if teacher_ids:
        for tid, name in (
            await db.execute(
                select(User.id, User.full_name).where(User.id.in_(teacher_ids))
            )
        ).all():
            teacher_names[tid] = name or ""
    room_ids = {g.default_room_id for g in groups if g.default_room_id}
    room_names: dict[uuid.UUID, str] = {}
    if room_ids:
        for rid, name in (
            await db.execute(select(Room.id, Room.name).where(Room.id.in_(room_ids)))
        ).all():
            room_names[rid] = name or ""

    out_groups: list[dict] = []
    kpis = {"ontrack": 0, "behind": 0, "ahead": 0}
    for g in groups:
        cid = g.course_id
        total = total_topics_by_course.get(cid, 0)
        course_topics = topics_by_course.get(cid, [])
        covered_ids = covered_by_group.get(g.id, set())
        covered = len(covered_ids)
        held = held_count_by_group.get(g.id, 0)

        # next topic = first by position not covered.
        next_title = None
        next_pos = None
        for tid, pos, title, _planned in course_topics:
            if tid not in covered_ids:
                next_title = title
                next_pos = pos
                break

        # Mode A delta.
        covered_lessons_actual = sum(
            lessons_by_topic.get(tid, 1) for tid in covered_ids
        )
        expected_lessons = held
        delta = covered_lessons_actual - expected_lessons
        badge = _badge(delta) if total else "ontrack"
        kpis[badge] += 1

        # "planned today" marker = how far along the plan the group *should* be
        # given the held sessions, as a topic position (cumulative
        # planned_lessons crossing the expected-lessons budget).
        planned_today_pos = 0
        running = 0
        for _tid, pos, _title, planned in course_topics:
            running += planned
            planned_today_pos = pos
            if running >= expected_lessons:
                break
        if expected_lessons <= 0:
            planned_today_pos = 0

        out_groups.append(
            {
                "group_id": str(g.id),
                "group_name": g.name,
                "course_id": str(cid) if cid else None,
                "course_title": course_title_by_id.get(cid, ""),
                "teacher_name": teacher_names.get(g.teacher_id, "") if g.teacher_id else "",
                "default_room_name": (
                    room_names.get(g.default_room_id, "") if g.default_room_id else ""
                ),
                "covered": covered,
                "total": total,
                "progress": round(covered / total, 4) if total else 0.0,
                "planned_today_pos": planned_today_pos,
                "delta": delta,
                "badge": badge,
                "next_topic_title": next_title,
                "next_topic_position": next_pos,
                "current_topic_id": (
                    str(current_topic_by_group[g.id])
                    if g.id in current_topic_by_group
                    else None
                ),
            }
        )

    return {"groups": out_groups, "kpis": kpis}


# ── Timeline (one group) ─────────────────────────────────────────────────────


async def get_pacing_timeline(
    db: AsyncSession, user: User, group_id: uuid.UUID
) -> dict:
    """Course scope & sequence with this group's coverage + a drift note."""
    require_stats_role(user)

    group = await db.scalar(select(StudentGroup).where(StudentGroup.id == group_id))
    if group is None or group.course_id is None:
        raise TaskStatsError("not_found", "Group not found")

    # Org isolation + own-course scoping (mirror _authorize_course semantics).
    course = await db.scalar(select(Course).where(Course.id == group.course_id))
    if course is None:
        raise TaskStatsError("not_found", "Course not found")
    if user.role != UserRole.super_admin:
        if course.org_id != user.org_id:
            raise TaskStatsError("not_found", "Group not found")
        if not _is_org_wide(user) and course.teacher_id != user.id:
            raise TaskStatsError("forbidden", "You can only view your own courses")

    topics = (
        await db.execute(
            select(CurriculumTopic)
            .where(CurriculumTopic.course_id == group.course_id)
            .order_by(CurriculumTopic.position, CurriculumTopic.created_at)
        )
    ).scalars().all()

    # Held sessions of this group that carry an actual topic — for covered date
    # (earliest held date per topic) + current topic.
    held_rows = (
        await db.execute(
            select(
                ClassSession.actual_topic_id,
                ClassSession.session_date,
            )
            .where(
                ClassSession.group_id == group_id,
                ClassSession.held.is_(True),
                ClassSession.actual_topic_id.isnot(None),
            )
            .order_by(ClassSession.session_date)
        )
    ).all()
    covered_date_by_topic: dict[uuid.UUID, date] = {}
    last_topic: uuid.UUID | None = None
    for tid, sdate in held_rows:
        covered_date_by_topic.setdefault(tid, sdate)
        last_topic = tid  # rows ordered by date asc → last is most recent

    held_count = await db.scalar(
        select(func.count()).where(
            ClassSession.group_id == group_id,
            ClassSession.held.is_(True),
        )
    ) or 0

    covered_ids = set(covered_date_by_topic.keys())
    total = len(topics)
    covered = len(covered_ids)
    total_lessons = sum(t.planned_lessons for t in topics)
    covered_lessons_actual = sum(
        t.planned_lessons for t in topics if t.id in covered_ids
    )
    delta = covered_lessons_actual - held_count
    badge = _badge(delta) if total else "ontrack"

    # today-marker fraction = held lessons / total lessons (DATA_MODEL §3 — the
    # plan position the group should be at, by held sessions).
    today_fraction = round(held_count / total_lessons, 4) if total_lessons else 0.0
    today_fraction = min(1.0, max(0.0, today_fraction))

    # Mark the first uncovered topic as "next".
    next_topic_id = None
    for t in topics:
        if t.id not in covered_ids:
            next_topic_id = t.id
            break

    topic_dicts = []
    current_topic_title = None
    for t in topics:
        state = "ahead"  # default = not yet reached
        if t.id in covered_ids:
            state = "current" if t.id == last_topic else "covered"
        elif t.id == next_topic_id:
            state = "next"
        if t.id == last_topic:
            current_topic_title = t.title
        topic_dicts.append(
            {
                "id": str(t.id),
                "position": t.position,
                "title": t.title or "",
                "planned_lessons": t.planned_lessons,
                "target_date": t.target_date.isoformat() if t.target_date else None,
                "covered_date": (
                    covered_date_by_topic[t.id].isoformat()
                    if t.id in covered_date_by_topic
                    else None
                ),
                "state": state,
            }
        )

    return {
        "group_id": str(group_id),
        "group_name": group.name,
        "course_id": str(group.course_id),
        "course_title": course.title,
        "covered": covered,
        "total": total,
        "covered_lessons": covered_lessons_actual,
        "total_lessons": total_lessons,
        "held_sessions": held_count,
        "current_topic_title": current_topic_title,
        "delta": delta,
        "badge": badge,
        "today_fraction": today_fraction,
        "topics": topic_dicts,
    }
