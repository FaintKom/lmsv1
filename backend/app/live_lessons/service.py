"""Live lesson service: lifecycle, scene, presence, boards, signals, polls."""

import json
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models import StudentGroup, StudentGroupMember
from app.attendance.models import AttendanceRecord, AttendanceStatus
from app.auth.models import User, UserRole
from app.live_lessons import realtime
from app.live_lessons.models import LiveLesson
from app.notifications.service import create_notification

ATTENDANCE_PRESENT_SECONDS = 300  # >=5 min of heartbeats => present
HEARTBEAT_SECONDS = 5  # client cadence; attendance = count * this


async def group_member_ids(db: AsyncSession, group_id: uuid.UUID) -> list[uuid.UUID]:
    rows = await db.execute(
        select(StudentGroupMember.user_id).where(StudentGroupMember.group_id == group_id)
    )
    return [r[0] for r in rows]


async def get_lesson_for_user(
    db: AsyncSession, lesson_id: uuid.UUID, user: User
) -> tuple[LiveLesson, bool]:
    """Return (lesson, is_teacher_view). Raises ValueError (404) / PermissionError (403)."""
    lesson = await db.scalar(
        select(LiveLesson).where(LiveLesson.id == lesson_id, LiveLesson.org_id == user.org_id)
    )
    if lesson is None:
        raise ValueError("lesson not found")
    if user.role in (UserRole.admin, UserRole.super_admin) or user.id == lesson.teacher_id:
        return lesson, True
    member = await db.scalar(
        select(StudentGroupMember).where(
            StudentGroupMember.group_id == lesson.group_id,
            StudentGroupMember.user_id == user.id,
        )
    )
    if member is None:
        raise PermissionError("not a participant")
    return lesson, False


async def teacher_stale(lesson: LiveLesson) -> bool:
    r = realtime.get_redis()
    return await r.get(realtime.teacher_seen_key(lesson.id)) is None


async def start_lesson(
    db: AsyncSession,
    user: User,
    group_id: uuid.UUID,
    course_id: uuid.UUID | None,
    class_session_id: uuid.UUID | None,
) -> tuple[LiveLesson, bool]:
    """Returns (lesson, created). created=False => caller responds 409."""
    group = await db.scalar(
        select(StudentGroup).where(StudentGroup.id == group_id, StudentGroup.org_id == user.org_id)
    )
    if group is None:
        raise ValueError("group not found")
    existing = await db.scalar(
        select(LiveLesson).where(LiveLesson.group_id == group_id, LiveLesson.status == "active")
    )
    if existing is not None:
        if await teacher_stale(existing):
            await finalize_lesson(db, existing)
        else:
            return existing, False

    lesson = LiveLesson(
        org_id=user.org_id,
        group_id=group_id,
        course_id=course_id or group.course_id,
        teacher_id=user.id,
        class_session_id=class_session_id,
        current_scene={"type": "blank", "payload": {}},
    )
    db.add(lesson)
    await db.flush()

    r = realtime.get_redis()
    await r.set(realtime.scene_key(lesson.id), json.dumps(lesson.current_scene))
    await r.set(realtime.teacher_seen_key(lesson.id), "1", ex=realtime.TEACHER_STALE_SECONDS)
    for sid in await group_member_ids(db, group_id):
        await r.set(realtime.invite_key(sid), str(lesson.id), ex=realtime.INVITE_TTL)
        await create_notification(
            db,
            user_id=sid,
            title="Live lesson started",
            body=group.name,
            link=f"/lesson/{lesson.id}",
        )
    return lesson, True


async def finalize_lesson(db: AsyncSession, lesson: LiveLesson) -> LiveLesson:
    """End a lesson: summary, attendance records, redis cleanup, broadcast."""
    r = realtime.get_redis()
    att_raw = await r.hgetall(realtime.attendance_key(lesson.id))
    attendance_seconds = {uid: int(c) * HEARTBEAT_SECONDS for uid, c in att_raw.items()}
    member_ids = await group_member_ids(db, lesson.group_id)

    if lesson.course_id is not None:
        today = date.today()
        for sid in member_ids:
            seconds = attendance_seconds.get(str(sid), 0)
            status = (
                AttendanceStatus.present
                if seconds >= ATTENDANCE_PRESENT_SECONDS
                else AttendanceStatus.absent
            )
            existing = await db.scalar(
                select(AttendanceRecord).where(
                    AttendanceRecord.student_id == sid,
                    AttendanceRecord.course_id == lesson.course_id,
                    AttendanceRecord.session_date == today,
                )
            )
            if existing is not None:
                existing.status = status
            else:
                db.add(
                    AttendanceRecord(
                        org_id=lesson.org_id,
                        student_id=sid,
                        course_id=lesson.course_id,
                        session_date=today,
                        status=status,
                        marked_by=lesson.teacher_id,
                    )
                )

    scene_log = [json.loads(s) for s in await r.lrange(realtime.scene_log_key(lesson.id), 0, -1)]
    poll_raw = await r.get(realtime.poll_key(lesson.id))
    lesson.summary = {
        "attendance_seconds": attendance_seconds,
        "scenes": scene_log,
        "last_poll": json.loads(poll_raw) if poll_raw else None,
    }
    lesson.status = "ended"
    lesson.ended_at = datetime.now(timezone.utc)

    await realtime.publish(lesson.id, "all", "lesson_ended", {})
    for sid in member_ids:
        await r.delete(realtime.invite_key(sid), realtime.active_lesson_key(sid))
    await r.delete(
        realtime.scene_key(lesson.id),
        realtime.attendance_key(lesson.id),
        realtime.signals_key(lesson.id),
        realtime.poll_key(lesson.id),
        realtime.poll_votes_key(lesson.id),
        realtime.teacher_seen_key(lesson.id),
        realtime.scene_log_key(lesson.id),
    )
    return lesson
