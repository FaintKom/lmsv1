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
    """A missing teacher_seen key is NOT proof the teacher left: a redis
    restart (every deploy) wipes it for all active lessons at once. First
    observation plants a grace marker and reports alive — a live teacher's
    5s heartbeat recreates teacher_seen well within the grace window. Only
    if the marker is already there and the teacher still hasn't beaten do
    we call the lesson stale."""
    r = realtime.get_redis()
    if await r.get(realtime.teacher_seen_key(lesson.id)) is not None:
        return False
    grace = realtime.teacher_grace_key(lesson.id)
    if await r.get(grace) is None:
        await r.set(grace, "1", ex=realtime.TEACHER_STALE_SECONDS)
        return False
    return True


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
    questions = [json.loads(q) for q in await r.lrange(realtime.questions_key(lesson.id), 0, -1)]
    lesson.summary = {
        "attendance_seconds": attendance_seconds,
        "scenes": scene_log,
        "last_poll": json.loads(poll_raw) if poll_raw else None,
        "questions": questions,
        # class results snapshot — the live progress dies with the lesson,
        # this is what the teacher reviews afterwards
        "results": await _lesson_results(db, lesson, member_ids),
    }
    lesson.status = "ended"
    lesson.ended_at = datetime.now(timezone.utc)

    await realtime.publish(lesson.id, "all", "lesson_ended", {})
    for sid in member_ids:
        await r.delete(realtime.active_lesson_key(sid))
    await r.delete(
        realtime.scene_key(lesson.id),
        realtime.attendance_key(lesson.id),
        realtime.signals_key(lesson.id),
        realtime.poll_key(lesson.id),
        realtime.poll_votes_key(lesson.id),
        realtime.teacher_seen_key(lesson.id),
        realtime.teacher_grace_key(lesson.id),
        realtime.scene_log_key(lesson.id),
        realtime.questions_key(lesson.id),
    )
    return lesson


async def _lesson_results(
    db: AsyncSession, lesson: LiveLesson, member_ids: list[uuid.UUID]
) -> list[dict]:
    """Per-exercise, per-student outcome for everything submitted during
    the lesson window. Stored in summary so the review outlives redis."""
    from app.exercises.models import Exercise, ExerciseSubmission

    if not member_ids:
        return []
    rows = (
        await db.execute(
            select(ExerciseSubmission, Exercise.title, User.full_name)
            .join(Exercise, Exercise.id == ExerciseSubmission.exercise_id)
            .join(User, User.id == ExerciseSubmission.student_id)
            .where(
                ExerciseSubmission.student_id.in_(member_ids),
                ExerciseSubmission.created_at >= lesson.created_at,
            )
            .order_by(ExerciseSubmission.created_at)
        )
    ).all()
    by_exercise: dict[str, dict] = {}
    for sub, ex_title, student_name in rows:
        ex = by_exercise.setdefault(
            str(sub.exercise_id),
            {"exercise_id": str(sub.exercise_id), "title": ex_title, "students": {}},
        )
        st = ex["students"].setdefault(
            str(sub.student_id),
            {
                "id": str(sub.student_id),
                "name": student_name,
                "attempts": 0,
                "passed": False,
                "score": None,
            },
        )
        st["attempts"] += 1
        if sub.passed:
            st["passed"] = True
        if sub.score is not None:
            st["score"] = sub.score
    return [{**ex, "students": list(ex["students"].values())} for ex in by_exercise.values()]


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

    exercise_title = None
    if exercise_id is not None:
        from app.exercises.models import Exercise

        ex = await db.get(Exercise, exercise_id)
        exercise_title = ex.title if ex else None

    built = {
        "exercise_id": str(exercise_id) if exercise_id else None,
        "exercise_title": exercise_title,
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
    # a new scene makes raised hands stale — clear them for everyone
    await r.delete(realtime.signals_key(lesson.id))
    await realtime.publish(lesson.id, "all", "signals_cleared", {})
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


async def set_signal(lesson: LiveLesson, user: User, signal_type: str | None) -> None:
    r = realtime.get_redis()
    key = realtime.signals_key(lesson.id)
    if signal_type is None:
        await r.hdel(key, str(user.id))
    else:
        await r.hset(key, str(user.id), signal_type)
    await realtime.publish(
        lesson.id,
        "teacher",
        "signal",
        {"student_id": str(user.id), "type": signal_type, "on": signal_type is not None},
    )


async def start_poll(lesson: LiveLesson, question: str, options: list[str]) -> dict:
    r = realtime.get_redis()
    poll = {"question": question, "options": options}
    await r.set(realtime.poll_key(lesson.id), json.dumps(poll))
    await r.delete(realtime.poll_votes_key(lesson.id))
    await realtime.publish(lesson.id, "all", "poll_started", poll)
    return poll


async def _poll_counts(lesson: LiveLesson, poll: dict) -> list[int]:
    r = realtime.get_redis()
    votes = await r.hgetall(realtime.poll_votes_key(lesson.id))
    counts = [0] * len(poll["options"])
    for v in votes.values():
        counts[int(v)] += 1
    return counts


async def vote_poll(lesson: LiveLesson, user: User, option: int) -> None:
    r = realtime.get_redis()
    poll_raw = await r.get(realtime.poll_key(lesson.id))
    if poll_raw is None:
        raise ValueError("no active poll")
    poll = json.loads(poll_raw)
    if option >= len(poll["options"]):
        raise ValueError("bad option")
    await r.hset(realtime.poll_votes_key(lesson.id), str(user.id), str(option))
    counts = await _poll_counts(lesson, poll)
    await realtime.publish(lesson.id, "teacher", "poll_progress", {"counts": counts})


async def close_poll(lesson: LiveLesson) -> dict:
    r = realtime.get_redis()
    poll_raw = await r.get(realtime.poll_key(lesson.id))
    if poll_raw is None:
        raise ValueError("no active poll")
    poll = json.loads(poll_raw)
    counts = await _poll_counts(lesson, poll)
    result = {**poll, "counts": counts}
    await r.delete(realtime.poll_key(lesson.id), realtime.poll_votes_key(lesson.id))
    await r.rpush(
        realtime.scene_log_key(lesson.id),
        json.dumps({"type": "poll", "poll": result, "at": datetime.now(timezone.utc).isoformat()}),
    )
    await realtime.publish(lesson.id, "all", "poll_closed", result)
    return result


async def send_hint(
    db: AsyncSession, lesson: LiveLesson, student_id: uuid.UUID | None, text: str
) -> None:
    """student_id None => broadcast the message to the whole class."""
    if student_id is None:
        await realtime.publish(lesson.id, "all", "message", {"text": text, "broadcast": True})
        for sid in await group_member_ids(db, lesson.group_id):
            await create_notification(
                db,
                user_id=sid,
                title="Сообщение от преподавателя",
                body=text,
                link=f"/lesson/{lesson.id}",
            )
        return
    member = await db.scalar(
        select(StudentGroupMember).where(
            StudentGroupMember.group_id == lesson.group_id,
            StudentGroupMember.user_id == student_id,
        )
    )
    if member is None:
        raise ValueError("student not in lesson group")
    await realtime.publish(
        lesson.id, f"student:{student_id}", "message", {"text": text, "broadcast": False}
    )
    await create_notification(
        db,
        user_id=student_id,
        title="Подсказка от преподавателя",
        body=text,
        link=f"/lesson/{lesson.id}",
    )
