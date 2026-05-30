"""Per-task statistics aggregation + RBAC (Phase 2).

A "task" is an exercise (ExerciseSubmission), a quiz (QuizSubmission), or an
assignment (AssignmentSubmission). This module aggregates submission rows into
methodist-facing metrics and gates access by role:

RBAC / scoping (enforced in :func:`_course_scope_clause` +
:func:`_authorize_course`):

  - teacher                      → only their own courses (Course.teacher_id == user.id)
  - is_methodist (any non-super) → all courses in their org
  - admin                        → all courses in their org
  - super_admin                  → all courses, all orgs (global)
  - student / parent             → no access (TaskStatsError "forbidden")

Org isolation: every query is constrained to the caller's org_id unless the
caller is super_admin. A teacher additionally cannot see a colleague's course.

Aggregates use GROUP BY (no N+1). pass_rate excludes rows with NULL ``passed``;
AVG over attempt_number / time_spent_seconds naturally skips NULLs;
median uses PostgreSQL ``percentile_cont``.
"""
from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Float, and_, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.assessments.models import Quiz, QuizSubmission
from app.assignments.models import Assignment, AssignmentSubmission
from app.auth.models import User, UserRole
from app.courses.models import Course, Lesson, Module
from app.exercises.models import Exercise, ExerciseSubmission
from app.progress.models import Enrollment


class TaskStatsError(Exception):
    """Domain error with a stable code + user-facing message."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


# ── RBAC ───────────────────────────────────────────────────────────────


def require_stats_role(user: User) -> None:
    """Only staff roles may read task statistics."""
    if user.role in (UserRole.student, UserRole.parent):
        raise TaskStatsError("forbidden", "Role cannot view task statistics")


def _is_org_wide(user: User) -> bool:
    """Whether the user sees every course in their org (vs. own courses only)."""
    return user.role in (UserRole.admin, UserRole.super_admin) or bool(user.is_methodist)


def _course_scope_clause(user: User):
    """SQLAlchemy clause restricting Course rows to what the user may see.

    super_admin → no restriction. Everyone else → own org; plain teachers (not
    methodist/admin) are further restricted to courses they own.
    """
    clauses = []
    if user.role != UserRole.super_admin:
        clauses.append(Course.org_id == user.org_id)
        if not _is_org_wide(user):
            clauses.append(Course.teacher_id == user.id)
    return and_(*clauses) if clauses else None


async def _authorize_course(db: AsyncSession, user: User, course_id: uuid.UUID) -> Course:
    """Fetch a course and confirm the caller may see its stats."""
    course = await db.scalar(select(Course).where(Course.id == course_id))
    if course is None:
        raise TaskStatsError("not_found", "Course not found")
    if user.role == UserRole.super_admin:
        return course
    if course.org_id != user.org_id:
        # Hide existence across orgs.
        raise TaskStatsError("not_found", "Course not found")
    if not _is_org_wide(user) and course.teacher_id != user.id:
        raise TaskStatsError("forbidden", "You can only view your own courses")
    return course


# ── Aggregate column helpers ────────────────────────────────────────────


def _agg_columns(passed_col, time_col, attempt_col, student_col):
    """Common aggregate expressions shared by the exercise + quiz tables."""
    return [
        func.count().label("total_submissions"),
        func.count(func.distinct(student_col)).label("unique_students"),
        func.count(passed_col).filter(passed_col.is_(True)).label("success_count"),
        func.count(passed_col).filter(passed_col.is_(False)).label("failure_count"),
        # pass_rate denominator = rows with a non-NULL passed verdict.
        func.count(passed_col).label("graded_count"),
        func.avg(cast(attempt_col, Float)).label("avg_attempts"),
        func.avg(cast(time_col, Float)).label("avg_time_spent_seconds"),
        func.percentile_cont(0.5)
        .within_group(time_col.asc())
        .label("median_time_spent_seconds"),
    ]


def _row_to_stats(
    *,
    task_id,
    task_type,
    title,
    course_id,
    lesson_id,
    row,
    enrolled: int | None,
) -> dict:
    total = row.total_submissions or 0
    graded = row.graded_count or 0
    success = row.success_count or 0
    unique = row.unique_students or 0
    pass_rate = round(success / graded, 4) if graded else None
    completion_rate = (
        round(unique / enrolled, 4) if enrolled and enrolled > 0 else None
    )
    return {
        "task_id": task_id,
        "task_type": task_type,
        "title": title,
        "course_id": course_id,
        "lesson_id": lesson_id,
        "total_submissions": total,
        "unique_students": unique,
        "success_count": success,
        "failure_count": row.failure_count or 0,
        "pass_rate": pass_rate,
        "avg_attempts": round(row.avg_attempts, 2) if row.avg_attempts is not None else None,
        "avg_time_spent_seconds": (
            round(row.avg_time_spent_seconds, 1)
            if row.avg_time_spent_seconds is not None
            else None
        ),
        "median_time_spent_seconds": (
            round(float(row.median_time_spent_seconds), 1)
            if row.median_time_spent_seconds is not None
            else None
        ),
        "completion_rate": completion_rate,
    }


# ── Enrollment counts ───────────────────────────────────────────────────


async def _enrolled_count(db: AsyncSession, course_id: uuid.UUID) -> int:
    return (
        await db.execute(
            select(func.count(func.distinct(Enrollment.student_id))).where(
                Enrollment.course_id == course_id
            )
        )
    ).scalar() or 0


# ── Per-task aggregation for a set of courses ───────────────────────────


async def _exercise_stats_for_courses(
    db: AsyncSession, course_ids: list[uuid.UUID], enrolled_by_course: dict[uuid.UUID, int]
) -> list[dict]:
    if not course_ids:
        return []
    cols = _agg_columns(
        ExerciseSubmission.passed,
        ExerciseSubmission.time_spent_seconds,
        ExerciseSubmission.attempt_number,
        ExerciseSubmission.student_id,
    )
    stmt = (
        select(
            Exercise.id.label("task_id"),
            Exercise.title.label("title"),
            Exercise.lesson_id.label("lesson_id"),
            Course.id.label("course_id"),
            *cols,
        )
        .select_from(Exercise)
        .join(Lesson, Lesson.id == Exercise.lesson_id)
        .join(Module, Module.id == Lesson.module_id)
        .join(Course, Course.id == Module.course_id)
        .outerjoin(ExerciseSubmission, ExerciseSubmission.exercise_id == Exercise.id)
        .where(Course.id.in_(course_ids))
        .group_by(Exercise.id, Exercise.title, Exercise.lesson_id, Course.id)
    )
    rows = (await db.execute(stmt)).all()
    return [
        _row_to_stats(
            task_id=r.task_id,
            task_type="exercise",
            title=r.title,
            course_id=r.course_id,
            lesson_id=r.lesson_id,
            row=r,
            enrolled=enrolled_by_course.get(r.course_id),
        )
        for r in rows
    ]


async def _quiz_stats_for_courses(
    db: AsyncSession, course_ids: list[uuid.UUID], enrolled_by_course: dict[uuid.UUID, int]
) -> list[dict]:
    if not course_ids:
        return []
    cols = _agg_columns(
        QuizSubmission.passed,
        QuizSubmission.time_spent_seconds,
        QuizSubmission.attempt_number,
        QuizSubmission.student_id,
    )
    stmt = (
        select(
            Quiz.id.label("task_id"),
            Quiz.title.label("title"),
            Quiz.lesson_id.label("lesson_id"),
            Course.id.label("course_id"),
            *cols,
        )
        .select_from(Quiz)
        .join(Lesson, Lesson.id == Quiz.lesson_id)
        .join(Module, Module.id == Lesson.module_id)
        .join(Course, Course.id == Module.course_id)
        .outerjoin(QuizSubmission, QuizSubmission.quiz_id == Quiz.id)
        .where(Course.id.in_(course_ids))
        .group_by(Quiz.id, Quiz.title, Quiz.lesson_id, Course.id)
    )
    rows = (await db.execute(stmt)).all()
    return [
        _row_to_stats(
            task_id=r.task_id,
            task_type="quiz",
            title=r.title,
            course_id=r.course_id,
            lesson_id=r.lesson_id,
            row=r,
            enrolled=enrolled_by_course.get(r.course_id),
        )
        for r in rows
    ]


async def _assignment_stats_for_courses(
    db: AsyncSession, course_ids: list[uuid.UUID], enrolled_by_course: dict[uuid.UUID, int]
) -> list[dict]:
    if not course_ids:
        return []
    # Assignments have no pass/fail; treat a graded submission (score not NULL)
    # as "success" so pass_rate reads as fraction-graded. graded_count == total
    # so the denominator is every submission.
    graded_flag = AssignmentSubmission.score.isnot(None)
    stmt = (
        select(
            Assignment.id.label("task_id"),
            Assignment.title.label("title"),
            Assignment.course_id.label("course_id"),
            func.count(AssignmentSubmission.id).label("total_submissions"),
            func.count(func.distinct(AssignmentSubmission.student_id)).label("unique_students"),
            func.count(AssignmentSubmission.id).filter(graded_flag).label("success_count"),
            func.count(AssignmentSubmission.id)
            .filter(AssignmentSubmission.score.is_(None) & AssignmentSubmission.id.isnot(None))
            .label("failure_count"),
            func.count(AssignmentSubmission.id).label("graded_count"),
            func.avg(cast(AssignmentSubmission.attempt_number, Float)).label("avg_attempts"),
            func.avg(cast(AssignmentSubmission.time_spent_seconds, Float)).label(
                "avg_time_spent_seconds"
            ),
            func.percentile_cont(0.5)
            .within_group(AssignmentSubmission.time_spent_seconds.asc())
            .label("median_time_spent_seconds"),
        )
        .select_from(Assignment)
        .outerjoin(AssignmentSubmission, AssignmentSubmission.assignment_id == Assignment.id)
        .where(Assignment.course_id.in_(course_ids))
        .group_by(Assignment.id, Assignment.title, Assignment.course_id)
    )
    rows = (await db.execute(stmt)).all()
    return [
        _row_to_stats(
            task_id=r.task_id,
            task_type="assignment",
            title=r.title,
            course_id=r.course_id,
            lesson_id=None,
            row=r,
            enrolled=enrolled_by_course.get(r.course_id),
        )
        for r in rows
    ]


# ── Public API ──────────────────────────────────────────────────────────


async def get_course_task_stats(
    db: AsyncSession, user: User, course_id: uuid.UUID
) -> dict:
    """All tasks (exercises + quizzes + assignments) in one course."""
    require_stats_role(user)
    course = await _authorize_course(db, user, course_id)

    enrolled = await _enrolled_count(db, course_id)
    enrolled_by_course = {course_id: enrolled}
    cids = [course_id]

    tasks: list[dict] = []
    tasks += await _exercise_stats_for_courses(db, cids, enrolled_by_course)
    tasks += await _quiz_stats_for_courses(db, cids, enrolled_by_course)
    tasks += await _assignment_stats_for_courses(db, cids, enrolled_by_course)

    tasks.sort(key=lambda t: (t["task_type"], t["title"].lower()))
    return {
        "course_id": course.id,
        "course_title": course.title,
        "enrolled_students": enrolled,
        "tasks": tasks,
    }


async def get_lesson_task_stats(
    db: AsyncSession, user: User, lesson_id: uuid.UUID
) -> dict:
    """All tasks tied to a single lesson (exercises + the lesson's quiz)."""
    require_stats_role(user)

    # Resolve lesson → course for both authz and the title.
    row = (
        await db.execute(
            select(Lesson.title, Course.id)
            .select_from(Lesson)
            .join(Module, Module.id == Lesson.module_id)
            .join(Course, Course.id == Module.course_id)
            .where(Lesson.id == lesson_id)
        )
    ).first()
    if row is None:
        raise TaskStatsError("not_found", "Lesson not found")
    lesson_title, course_id = row
    await _authorize_course(db, user, course_id)

    enrolled = await _enrolled_count(db, course_id)
    enrolled_by_course = {course_id: enrolled}

    # Filter to this lesson only.
    all_ex = await _exercise_stats_for_courses(db, [course_id], enrolled_by_course)
    all_quiz = await _quiz_stats_for_courses(db, [course_id], enrolled_by_course)
    tasks = [t for t in all_ex + all_quiz if t["lesson_id"] == lesson_id]
    tasks.sort(key=lambda t: (t["task_type"], t["title"].lower()))
    return {
        "lesson_id": lesson_id,
        "lesson_title": lesson_title,
        "tasks": tasks,
    }


async def get_task_detail(
    db: AsyncSession,
    user: User,
    task_type: str,
    task_id: uuid.UUID,
    *,
    include_timeline: bool = False,
) -> dict:
    """Single-task detail with an optional per-day submission timeline."""
    require_stats_role(user)
    if task_type not in ("exercise", "quiz", "assignment"):
        raise TaskStatsError("bad_request", "Unknown task_type")

    course_id = await _course_id_for_task(db, task_type, task_id)
    if course_id is None:
        raise TaskStatsError("not_found", "Task not found")
    await _authorize_course(db, user, course_id)

    enrolled = await _enrolled_count(db, course_id)
    enrolled_by_course = {course_id: enrolled}

    if task_type == "exercise":
        all_tasks = await _exercise_stats_for_courses(db, [course_id], enrolled_by_course)
    elif task_type == "quiz":
        all_tasks = await _quiz_stats_for_courses(db, [course_id], enrolled_by_course)
    else:
        all_tasks = await _assignment_stats_for_courses(db, [course_id], enrolled_by_course)

    match = next((t for t in all_tasks if t["task_id"] == task_id), None)
    if match is None:
        raise TaskStatsError("not_found", "Task not found")

    timeline: list[dict] = []
    if include_timeline:
        timeline = await _task_timeline(db, task_type, task_id)

    return {"stats": match, "timeline": timeline}


async def _course_id_for_task(
    db: AsyncSession, task_type: str, task_id: uuid.UUID
) -> uuid.UUID | None:
    if task_type == "exercise":
        return await db.scalar(
            select(Course.id)
            .select_from(Exercise)
            .join(Lesson, Lesson.id == Exercise.lesson_id)
            .join(Module, Module.id == Lesson.module_id)
            .join(Course, Course.id == Module.course_id)
            .where(Exercise.id == task_id)
        )
    if task_type == "quiz":
        return await db.scalar(
            select(Course.id)
            .select_from(Quiz)
            .join(Lesson, Lesson.id == Quiz.lesson_id)
            .join(Module, Module.id == Lesson.module_id)
            .join(Course, Course.id == Module.course_id)
            .where(Quiz.id == task_id)
        )
    return await db.scalar(
        select(Assignment.course_id).where(Assignment.id == task_id)
    )


async def _task_timeline(
    db: AsyncSession, task_type: str, task_id: uuid.UUID
) -> list[dict]:
    if task_type == "exercise":
        fk, passed_col, ts_col = (
            ExerciseSubmission.exercise_id,
            ExerciseSubmission.passed.is_(True),
            ExerciseSubmission.submitted_at,
        )
    elif task_type == "quiz":
        fk, passed_col, ts_col = (
            QuizSubmission.quiz_id,
            QuizSubmission.passed.is_(True),
            QuizSubmission.submitted_at,
        )
    else:
        fk, passed_col, ts_col = (
            AssignmentSubmission.assignment_id,
            AssignmentSubmission.score.isnot(None),
            AssignmentSubmission.submitted_at,
        )

    day = func.date(ts_col).label("day")
    stmt = (
        select(
            day,
            func.count().label("submissions"),
            func.count().filter(passed_col).label("success_count"),
        )
        .where(fk == task_id)
        .group_by(day)
        .order_by(day)
    )
    rows = (await db.execute(stmt)).all()
    out: list[dict] = []
    for r in rows:
        d = r.day
        if isinstance(d, str):
            d = date.fromisoformat(d)
        out.append(
            {
                "day": d,
                "submissions": r.submissions or 0,
                "success_count": r.success_count or 0,
            }
        )
    return out
