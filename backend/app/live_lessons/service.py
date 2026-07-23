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
from app.live_lessons.models import LessonBoard, LiveLesson
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


SOLUTION_PAYLOAD_CAP = 64_000  # bytes of JSON


async def _solution_payload(db: AsyncSession, lesson: LiveLesson, payload: dict) -> dict:
    """Server builds the snapshot so students never fetch each other's data."""
    from app.exercises.models import ExerciseSubmission
    from app.live_lessons.models import ExerciseDraft

    anonymous = bool(payload.get("anonymous", False))
    answers, source_code, student_id, exercise_id = None, None, None, None

    if payload.get("submission_id"):
        sub = await db.get(ExerciseSubmission, uuid.UUID(str(payload["submission_id"])))
        if sub is None:
            raise ValueError("submission not found")
        answers, source_code = sub.answers, sub.source_code
        student_id, exercise_id = sub.student_id, sub.exercise_id
    elif payload.get("student_id") and payload.get("exercise_id"):
        student_id = uuid.UUID(str(payload["student_id"]))
        exercise_id = uuid.UUID(str(payload["exercise_id"]))
        draft = await db.scalar(
            select(ExerciseDraft).where(
                ExerciseDraft.student_id == student_id,
                ExerciseDraft.exercise_id == exercise_id,
                ExerciseDraft.org_id == lesson.org_id,
            )
        )
        if draft is None:
            raise ValueError("draft not found")
        answers, source_code = draft.answers, draft.source_code
    else:
        raise ValueError("solution payload needs submission_id or student_id+exercise_id")

    student_name = None
    if not anonymous and student_id is not None:
        student = await db.get(User, student_id)
        student_name = student.full_name if student else None

    built = {
        "exercise_id": str(exercise_id) if exercise_id else None,
        "answers": answers,
        "source_code": source_code,
        "student_name": student_name,
        "anonymous": anonymous,
    }
    if len(json.dumps(built, ensure_ascii=False)) > SOLUTION_PAYLOAD_CAP:
        built["source_code"] = (source_code or "")[: SOLUTION_PAYLOAD_CAP // 2]
        if len(json.dumps(built, ensure_ascii=False)) > SOLUTION_PAYLOAD_CAP:
            raise ValueError("solution too large to broadcast")
    return built


async def set_scene(db: AsyncSession, lesson: LiveLesson, scene: dict) -> LiveLesson:
    if scene["type"] == "solution":
        scene = {**scene, "payload": await _solution_payload(db, lesson, scene["payload"])}
    lesson.current_scene = scene
    r = realtime.get_redis()
    await r.set(realtime.scene_key(lesson.id), json.dumps(scene))
    await r.rpush(
        realtime.scene_log_key(lesson.id),
        json.dumps({"type": scene["type"], "at": datetime.now(timezone.utc).isoformat()}),
    )
    await realtime.publish(lesson.id, "all", "scene_changed", scene)
    return lesson


async def set_follow_mode(db: AsyncSession, lesson: LiveLesson, follow_mode: str) -> LiveLesson:
    lesson.follow_mode = follow_mode
    await realtime.publish(lesson.id, "all", "settings_changed", {"follow_mode": follow_mode})
    return lesson


BOARD_DELTA_CAP = 200_000  # bytes of JSON per PATCH


async def create_board(
    db: AsyncSession, lesson: LiveLesson, kind: str, material_ref: str | None
) -> LessonBoard:
    board = LessonBoard(
        live_lesson_id=lesson.id,
        kind=kind,
        scene={"elements": [], "appState": {}},
        material_ref=material_ref,
    )
    db.add(board)
    await db.flush()
    return board


async def get_board(db: AsyncSession, lesson: LiveLesson, board_id: uuid.UUID) -> LessonBoard:
    board = await db.scalar(
        select(LessonBoard).where(
            LessonBoard.id == board_id, LessonBoard.live_lesson_id == lesson.id
        )
    )
    if board is None:
        raise ValueError("board not found")
    return board


async def apply_board_delta(
    db: AsyncSession,
    lesson: LiveLesson,
    board: LessonBoard,
    updated: list[dict],
    deleted: list[str],
    version: int,
) -> LessonBoard:
    if (
        len(json.dumps({"updated": updated, "deleted": deleted}, ensure_ascii=False))
        > BOARD_DELTA_CAP
    ):
        raise OverflowError("delta too large")
    elements = {e["id"]: e for e in board.scene.get("elements", []) if "id" in e}
    for e in updated:
        if "id" in e:
            elements[e["id"]] = e
    for el_id in deleted:
        elements.pop(el_id, None)
    # reassign (not mutate) so SQLAlchemy sees the JSONB change
    board.scene = {**board.scene, "elements": list(elements.values())}
    board.version = version
    await realtime.publish(
        lesson.id,
        "all",
        "board_delta",
        {"board_id": str(board.id), "updated": updated, "deleted": deleted, "version": version},
    )
    return board


async def heartbeat(
    lesson: LiveLesson, user: User, current_view: str, exercise_id: uuid.UUID | None
) -> None:
    r = realtime.get_redis()
    if user.id == lesson.teacher_id:
        await r.set(realtime.teacher_seen_key(lesson.id), "1", ex=realtime.TEACHER_STALE_SECONDS)
        return
    key = realtime.presence_key(lesson.id, user.id)
    prev = await r.get(key)
    value = json.dumps(
        {"view": current_view, "exercise_id": str(exercise_id) if exercise_id else None}
    )
    await r.set(key, value, ex=realtime.PRESENCE_TTL)
    await r.set(realtime.active_lesson_key(user.id), str(lesson.id), ex=realtime.PRESENCE_TTL)
    await r.hincrby(realtime.attendance_key(lesson.id), str(user.id), 1)
    if prev != value:  # first beat or view/task changed -> notify teacher
        await realtime.publish(
            lesson.id,
            "teacher",
            "presence",
            {"student_id": str(user.id), "online": True, **json.loads(value)},
        )


async def roster(db: AsyncSession, lesson: LiveLesson) -> dict:
    r = realtime.get_redis()
    rows = await db.execute(
        select(User.id, User.full_name)
        .join(StudentGroupMember, StudentGroupMember.user_id == User.id)
        .where(StudentGroupMember.group_id == lesson.group_id)
        .order_by(User.full_name)
    )
    signals = await r.hgetall(realtime.signals_key(lesson.id))
    members = []
    for uid, name in rows:
        presence_raw = await r.get(realtime.presence_key(lesson.id, uid))
        presence = json.loads(presence_raw) if presence_raw else None
        members.append(
            {
                "id": str(uid),
                "name": name,
                "online": presence is not None,
                "current_view": presence["view"] if presence else None,
                "exercise_id": presence["exercise_id"] if presence else None,
                "signal": signals.get(str(uid)),
            }
        )
    return {"members": members}
