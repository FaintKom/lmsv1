"""Class journal endpoints.

Day-centric register for a course. Staff-only (teacher/admin/methodist/
super_admin); the org-vs-own-course scoping is enforced in the service layer
via the shared analytics task-stats helpers. ``TaskStatsError`` codes are
mapped to HTTP exactly like the analytics router (forbidden→403, not_found→404).
"""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.task_stats_service import TaskStatsError
from app.auth.dependencies import require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.journal import pacing_service
from app.journal import service as journal_service

router = APIRouter()

# Same gate as attendance: methodists are admin/teacher users with
# ``is_methodist`` set, so they pass; org-vs-own-course scoping happens in the
# service layer.
_MANAGER_ROLES = (UserRole.admin, UserRole.teacher)


def _translate(exc: TaskStatsError) -> HTTPException:
    code_to_status = {
        "not_found": status.HTTP_404_NOT_FOUND,
        "forbidden": status.HTTP_403_FORBIDDEN,
        "invalid_range": status.HTTP_422_UNPROCESSABLE_ENTITY,
        "range_too_long": status.HTTP_422_UNPROCESSABLE_ENTITY,
    }
    http_status = code_to_status.get(exc.code, status.HTTP_400_BAD_REQUEST)
    return HTTPException(
        status_code=http_status,
        detail={"code": exc.code, "message": exc.message},
    )


class SessionUpsertRequest(BaseModel):
    course_id: uuid.UUID
    session_date: date
    held: bool = True
    topic: str = Field(default="", max_length=500)
    notes: str | None = None
    # Phase C: the curriculum topic actually covered this session (drives
    # pacing). Optional; omitting it leaves the existing value untouched.
    actual_topic_id: uuid.UUID | None = None


class GenerateFromScheduleRequest(BaseModel):
    course_id: uuid.UUID
    from_date: date
    to_date: date


@router.get("/journal/sessions")
async def list_sessions(
    course_id: uuid.UUID = Query(...),
    group_id: uuid.UUID | None = Query(default=None),
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """All journal days for a course (newest first) + attendance counts.

    Optional ``group_id`` scopes the rows to a single group of the course
    (falls back to the whole course when absent — current behavior).
    """
    try:
        return await journal_service.list_sessions(db, user, course_id, group_id=group_id)
    except TaskStatsError as exc:
        raise _translate(exc) from exc


@router.post("/journal/sessions")
async def upsert_session(
    body: SessionUpsertRequest,
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Create or update the journal row for one (course, date)."""
    try:
        return await journal_service.upsert_session(
            db,
            user,
            body.course_id,
            body.session_date,
            body.held,
            body.topic,
            body.notes,
            actual_topic_id=body.actual_topic_id,
            actual_topic_set="actual_topic_id" in body.model_fields_set,
        )
    except TaskStatsError as exc:
        raise _translate(exc) from exc


@router.post("/journal/generate-from-schedule")
async def generate_from_schedule(
    body: GenerateFromScheduleRequest,
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Create journal days from the course's weekly timetable across a range."""
    try:
        return await journal_service.generate_from_schedule(
            db,
            user,
            body.course_id,
            body.from_date,
            body.to_date,
        )
    except TaskStatsError as exc:
        raise _translate(exc) from exc


@router.get("/journal/export")
async def export_register(
    course_id: uuid.UUID = Query(...),
    from_date: date = Query(...),
    to_date: date = Query(...),
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Download a register CSV (sessions × enrolled students) over a range."""
    try:
        csv_text, filename = await journal_service.export_register_csv(
            db, user, course_id, from_date, to_date
        )
    except TaskStatsError as exc:
        raise _translate(exc) from exc
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/journal/today")
async def get_today(
    date_: date | None = Query(default=None, alias="date"),
    course_id: uuid.UUID | None = Query(default=None),
    group_id: uuid.UUID | None = Query(default=None),
    teacher_id: uuid.UUID | None = Query(default=None),
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Daily agenda: scheduled slots for the day + session/attendance enrichment.

    Optional ``group_id`` filters the agenda to slots of one group. When a slot
    has a group, the agenda entry prefers the group's name + teacher; otherwise
    it falls back to the course (current behavior).
    """
    day = date_ or date.today()
    try:
        return await journal_service.get_today(
            db, user, day, course_id=course_id, group_id=group_id, teacher_id=teacher_id
        )
    except TaskStatsError as exc:
        raise _translate(exc) from exc


@router.get("/journal/room-board")
async def get_room_board(
    date_: date | None = Query(default=None, alias="date"),
    group_id: uuid.UUID | None = Query(default=None),
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Rooms x that day's slots, with double-booking conflicts flagged.

    Optional ``group_id`` scopes the board to a single group's slots.
    """
    day = date_ or date.today()
    try:
        return await journal_service.get_room_board(db, user, day, group_id=group_id)
    except TaskStatsError as exc:
        raise _translate(exc) from exc


@router.get("/journal/day")
async def get_day(
    course_id: uuid.UUID = Query(...),
    session_date: date = Query(...),
    group_id: uuid.UUID | None = Query(default=None),
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Session row (or null) + per-enrolled-student activity for that day.

    Optional ``group_id`` scopes the roster to that group's members and the
    session lookup to that group (falls back to course enrollment when absent).
    """
    try:
        return await journal_service.get_day(
            db, user, course_id, session_date, group_id=group_id
        )
    except TaskStatsError as exc:
        raise _translate(exc) from exc


@router.get("/journal/student-activity")
async def get_student_activity(
    student_id: uuid.UUID = Query(...),
    date_: date = Query(..., alias="date"),
    group_id: uuid.UUID | None = Query(default=None),
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """What one student did on a given day — computed from existing submissions.

    Returns day-level KPIs, the day's lessons (each with its exercise results),
    and a chronological event timeline. RBAC matches the student-profile
    service (teacher→own-course students, methodist/admin→org, super→global);
    a day with no activity returns zeroed KPIs + a note, never a 404.
    """
    try:
        return await journal_service.get_student_activity(
            db, user, student_id, date_, group_id=group_id
        )
    except TaskStatsError as exc:
        raise _translate(exc) from exc


@router.get("/journal/pacing")
async def get_pacing_board(
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Pacing board: every group in scope with progress/delta/badge + KPIs."""
    try:
        return await pacing_service.get_pacing_board(db, user)
    except TaskStatsError as exc:
        raise _translate(exc) from exc


@router.get("/journal/pacing/{group_id}")
async def get_pacing_timeline(
    group_id: uuid.UUID,
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Pacing timeline: a group's course scope & sequence with coverage."""
    try:
        return await pacing_service.get_pacing_timeline(db, user, group_id)
    except TaskStatsError as exc:
        raise _translate(exc) from exc
