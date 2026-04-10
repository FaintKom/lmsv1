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
from app.auth.dependencies import require_role
from app.auth.models import User, UserRole
from app.db.session import get_db

router = APIRouter()


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
    teacher: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
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

        existing = (
            await db.execute(
                select(AttendanceRecord).where(
                    and_(
                        AttendanceRecord.student_id == student_uuid,
                        AttendanceRecord.session_date == rec.session_date,
                        AttendanceRecord.org_id == teacher.org_id,
                        AttendanceRecord.course_id == course_uuid if course_uuid else True,
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
    student_id: str | None = Query(None),
    teacher: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    """Query attendance records for the teacher's org."""
    q = select(AttendanceRecord).where(AttendanceRecord.org_id == teacher.org_id)
    if session_date:
        q = q.where(AttendanceRecord.session_date == session_date)
    if course_id:
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
    teacher: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
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

    return {"summary": summary}
