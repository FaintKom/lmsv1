"""Attendance CRUD endpoints (P2-8).

Teachers/admins can mark and query student attendance per session date.
"""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.attendance.models import AttendanceRecord, AttendanceStatus
from app.attendance.service import (
    authorize_course,
    authorize_group,
    enrolled_students,
    group_member_students,
)
from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.courses.models import Course
from app.db.session import get_db

router = APIRouter()

# Roles allowed to mark/manage attendance (roster, bulk upsert, summary).
# Methodists are admin/teacher users with ``is_methodist`` set, so they pass
# this gate; the org-vs-own-course scoping is enforced in the service layer.
_MANAGER_ROLES = (UserRole.admin, UserRole.teacher)


class AttendanceMark(BaseModel):
    student_id: str
    course_id: str | None = None
    session_date: date
    status: str  # one of AttendanceStatus values
    note: str | None = None


class BulkAttendanceMark(BaseModel):
    records: list[AttendanceMark]


@router.post("/attendance")
async def mark_attendance(
    data: BulkAttendanceMark,
    teacher: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Mark attendance for one or more students in one call."""
    created = 0
    updated = 0
    for rec in data.records:
        try:
            status = AttendanceStatus(rec.status)
        except ValueError:
            raise HTTPException(400, f"Invalid status: {rec.status}") from None
        try:
            student_uuid = uuid.UUID(rec.student_id)
        except ValueError:
            raise HTTPException(400, f"Invalid student_id: {rec.student_id}") from None

        course_uuid = None
        if rec.course_id:
            try:
                course_uuid = uuid.UUID(rec.course_id)
            except ValueError:
                raise HTTPException(400, f"Invalid course_id: {rec.course_id}") from None

        course_filter = (
            AttendanceRecord.course_id == course_uuid
            if course_uuid is not None
            else AttendanceRecord.course_id.is_(None)
        )
        existing = (
            await db.execute(
                select(AttendanceRecord).where(
                    and_(
                        AttendanceRecord.student_id == student_uuid,
                        AttendanceRecord.session_date == rec.session_date,
                        AttendanceRecord.org_id == teacher.org_id,
                        course_filter,
                    )
                )
            )
        ).scalar_one_or_none()

        if existing:
            existing.status = status
            existing.note = rec.note
            existing.marked_by = teacher.id
            db.add(existing)
            updated += 1
        else:
            db.add(AttendanceRecord(
                org_id=teacher.org_id,
                student_id=student_uuid,
                course_id=course_uuid,
                session_date=rec.session_date,
                status=status,
                note=rec.note,
                marked_by=teacher.id,
            ))
            created += 1

    await db.flush()
    return {"created": created, "updated": updated}


@router.get("/attendance")
async def list_attendance(
    session_date: date | None = Query(None),
    course_id: str | None = Query(None),
    group_id: str | None = Query(None),
    student_id: str | None = Query(None),
    teacher: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Query attendance records for the teacher's org.

    Phase B: pass ``group_id`` to scope to a single group — the records are
    restricted to that group's course and its member students (the group's
    course is derived + authorized). Falls back to the plain ``course_id``
    filter when absent (current behavior).
    """
    q = select(AttendanceRecord).where(AttendanceRecord.org_id == teacher.org_id)
    if session_date:
        q = q.where(AttendanceRecord.session_date == session_date)
    if group_id:
        try:
            group_uuid = uuid.UUID(group_id)
        except ValueError:
            raise HTTPException(400, f"Invalid group_id: {group_id}") from None
        course, _group = await authorize_group(db, teacher, group_uuid)
        member_ids = [sid for sid, _ in await group_member_students(db, group_uuid)]
        q = q.where(AttendanceRecord.course_id == course.id)
        # Restrict to member students; an empty group yields no records.
        q = q.where(AttendanceRecord.student_id.in_(member_ids or [uuid.UUID(int=0)]))
    elif course_id:
        q = q.where(AttendanceRecord.course_id == uuid.UUID(course_id))
    if student_id:
        q = q.where(AttendanceRecord.student_id == uuid.UUID(student_id))
    q = q.order_by(AttendanceRecord.session_date.desc()).limit(500)

    result = await db.execute(q)
    records = result.scalars().all()
    return {
        "records": [
            {
                "id": str(r.id),
                "student_id": str(r.student_id),
                "course_id": str(r.course_id) if r.course_id else None,
                "session_date": r.session_date.isoformat() if r.session_date else None,
                "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                "note": r.note,
                "marked_by": str(r.marked_by) if r.marked_by else None,
            }
            for r in records
        ]
    }


@router.get("/attendance/summary")
async def attendance_summary(
    course_id: str | None = Query(None),
    teacher: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Per-student attendance summary (count by status)."""
    q = select(AttendanceRecord).where(AttendanceRecord.org_id == teacher.org_id)
    if course_id:
        q = q.where(AttendanceRecord.course_id == uuid.UUID(course_id))

    result = await db.execute(q)
    records = result.scalars().all()

    # Group by student
    summary: dict[str, dict[str, int]] = {}
    for r in records:
        sid = str(r.student_id)
        if sid not in summary:
            summary[sid] = {"present": 0, "late": 0, "absent": 0, "excused": 0, "total": 0}
        status_key = r.status.value if hasattr(r.status, "value") else str(r.status)
        summary[sid][status_key] = summary[sid].get(status_key, 0) + 1
        summary[sid]["total"] += 1

    # Attach display names so the UI can label rows without a second request.
    names: dict[str, str] = {}
    if summary:
        name_rows = (
            await db.execute(
                select(User.id, User.full_name).where(
                    User.id.in_([uuid.UUID(s) for s in summary])
                )
            )
        ).all()
        names = {str(uid): full_name for uid, full_name in name_rows}
    for sid, counts in summary.items():
        counts["student_name"] = names.get(sid, "")  # type: ignore[assignment]

    return {"summary": summary}


@router.get("/attendance/roster")
async def attendance_roster(
    session_date: date = Query(...),
    course_id: str | None = Query(None),
    group_id: str | None = Query(None),
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Students of a course (or group), pre-filled with any existing record.

    For the given (course/group, date) each row carries the student's current
    ``status`` and ``note`` (or ``None`` if not yet marked) so the marking
    grid can hydrate. Authorization mirrors peer-review: teachers see only
    their own courses, methodists/admins their whole org, super_admin anything.

    Phase B: pass ``group_id`` to scope the roster to that group's members
    (the course is derived from the group); otherwise pass ``course_id`` for
    the course's enrollment (current behavior).
    """
    if group_id:
        try:
            group_uuid = uuid.UUID(group_id)
        except ValueError:
            raise HTTPException(400, f"Invalid group_id: {group_id}") from None
        course, _group = await authorize_group(db, user, group_uuid)
        course_uuid = course.id
        students = await group_member_students(db, group_uuid)
    elif course_id:
        try:
            course_uuid = uuid.UUID(course_id)
        except ValueError:
            raise HTTPException(400, f"Invalid course_id: {course_id}") from None
        course: Course = await authorize_course(db, user, course_uuid)
        students = await enrolled_students(db, course_uuid)
    else:
        raise HTTPException(400, "course_id or group_id is required")

    existing_rows = (
        await db.execute(
            select(AttendanceRecord).where(
                AttendanceRecord.course_id == course_uuid,
                AttendanceRecord.session_date == session_date,
                AttendanceRecord.org_id == course.org_id,
            )
        )
    ).scalars().all()
    by_student = {str(r.student_id): r for r in existing_rows}

    roster = []
    for sid, full_name in students:
        rec = by_student.get(str(sid))
        roster.append(
            {
                "student_id": str(sid),
                "student_name": full_name,
                "status": (
                    rec.status.value
                    if rec and hasattr(rec.status, "value")
                    else (str(rec.status) if rec else None)
                ),
                "note": rec.note if rec else None,
            }
        )

    return {
        "course_id": str(course_uuid),
        "group_id": str(group_id) if group_id else None,
        "session_date": session_date.isoformat(),
        "roster": roster,
    }


@router.get("/attendance/my")
async def my_attendance(
    student: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """The current user's own attendance records, newest first.

    Lets students (and their parents) see their own attendance history.
    Org-scoped and locked to ``student_id == user.id`` so no one reads
    another learner's record here.
    """
    rows = (
        await db.execute(
            select(AttendanceRecord, Course.title)
            .outerjoin(Course, Course.id == AttendanceRecord.course_id)
            .where(
                AttendanceRecord.student_id == student.id,
                AttendanceRecord.org_id == student.org_id,
            )
            .order_by(AttendanceRecord.session_date.desc())
            .limit(500)
        )
    ).all()
    return {
        "records": [
            {
                "id": str(r.id),
                "course_id": str(r.course_id) if r.course_id else None,
                "course_title": course_title,
                "session_date": r.session_date.isoformat() if r.session_date else None,
                "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                "note": r.note,
            }
            for r, course_title in rows
        ]
    }
