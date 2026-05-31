"""Per-student aggregated profile for staff (teachers / methodists / admins).

One place that pulls a single student's full picture together:

  - identity (name / email / role)
  - per-course enrollments + progress%
  - submissions summary across the three submission models
    (exercises, quizzes, assignments): counts, avg score, pass rate,
    avg attempts, avg time, plus the most-recent N submissions
  - gamification (xp / current+longest streak / badges)
  - certificates

Reuses the data already gathered piecemeal by the GDPR export
(:mod:`app.auth.gdpr`) and the RBAC scoping established by the task-stats
service (:mod:`app.analytics.task_stats_service`).

RBAC / scoping (see :func:`_authorize_student`):

  - teacher                      → only students enrolled in one of the
                                   teacher's own courses (Course.teacher_id)
  - is_methodist (any non-super) → any student in their org
  - admin                        → any student in their org
  - super_admin                  → any student, any org (global)
  - student / parent             → forbidden

Org isolation: a non-super caller only ever sees students in their own org;
a student in another org is reported as "not found" (existence hidden), and
a same-org student a plain teacher doesn't teach is "forbidden".

Efficiency: each submission family is summarised with a single GROUP-BY
aggregate query and the recent-N list with one ORDER BY ... LIMIT query — no
per-row or per-course follow-up queries (no N+1).
"""
from __future__ import annotations

import uuid

from sqlalchemy import Float, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.assessments.models import Quiz, QuizSubmission
from app.assignments.models import Assignment, AssignmentSubmission
from app.auth.models import User, UserRole
from app.certificates.models import Certificate
from app.courses.models import Course
from app.exercises.models import Exercise, ExerciseSubmission
from app.gamification.models import Badge, UserBadge, UserStreak
from app.progress.models import Enrollment


class StudentProfileError(Exception):
    """Domain error with a stable code + user-facing message."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


# ── RBAC ────────────────────────────────────────────────────────────────


def _is_org_wide(user: User) -> bool:
    """Whether the caller sees every student in their org (vs. own students)."""
    return user.role in (UserRole.admin, UserRole.super_admin) or bool(user.is_methodist)


async def _teacher_shares_course(
    db: AsyncSession, teacher_id: uuid.UUID, student_id: uuid.UUID
) -> bool:
    """True iff the student is enrolled in at least one course the teacher owns."""
    found = await db.scalar(
        select(Enrollment.id)
        .join(Course, Course.id == Enrollment.course_id)
        .where(
            Enrollment.student_id == student_id,
            Course.teacher_id == teacher_id,
        )
        .limit(1)
    )
    return found is not None


async def _authorize_student(
    db: AsyncSession, user: User, student_id: uuid.UUID
) -> User:
    """Fetch the target student and confirm the caller may view their profile.

    Raises :class:`StudentProfileError`:
      - ``forbidden`` — caller role can never view profiles, or a plain teacher
        who doesn't teach this (same-org) student.
      - ``not_found`` — no such user, the target isn't a student, or the target
        lives in another org (existence hidden from non-super callers).
    """
    if user.role in (UserRole.student, UserRole.parent):
        raise StudentProfileError("forbidden", "Role cannot view student profiles")

    target = await db.scalar(select(User).where(User.id == student_id))
    if target is None or target.role != UserRole.student:
        raise StudentProfileError("not_found", "Student not found")

    if user.role == UserRole.super_admin:
        return target

    # Non-super callers: org isolation first (hide cross-org existence).
    if target.org_id != user.org_id:
        raise StudentProfileError("not_found", "Student not found")

    # Org-wide roles (admin / methodist) may see any student in the org.
    if _is_org_wide(user):
        return target

    # Plain teacher: only students enrolled in one of their own courses.
    if not await _teacher_shares_course(db, user.id, student_id):
        raise StudentProfileError(
            "forbidden", "You can only view students enrolled in your courses"
        )
    return target


# ── Sections ──────────────────────────────────────────────────────────────


async def _enrollments(db: AsyncSession, student_id: uuid.UUID) -> list[dict]:
    rows = (
        await db.execute(
            select(Enrollment, Course.id, Course.title)
            .join(Course, Course.id == Enrollment.course_id)
            .where(Enrollment.student_id == student_id)
            .order_by(Enrollment.enrolled_at.desc())
        )
    ).all()
    return [
        {
            "course_id": str(cid),
            "course_title": title,
            "progress_percent": float(e.progress_percent or 0),
            "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
            "completed_at": e.completed_at.isoformat() if e.completed_at else None,
        }
        for e, cid, title in rows
    ]


async def _exercise_summary(db: AsyncSession, student_id: uuid.UUID) -> dict:
    row = (
        await db.execute(
            select(
                func.count().label("total"),
                func.count(ExerciseSubmission.score).label("graded"),
                func.count(ExerciseSubmission.passed)
                .filter(ExerciseSubmission.passed.is_(True))
                .label("passed_count"),
                func.count(ExerciseSubmission.passed).label("verdict_count"),
                func.avg(cast(ExerciseSubmission.score, Float)).label("avg_score"),
                func.avg(cast(ExerciseSubmission.attempt_number, Float)).label("avg_attempts"),
                func.avg(cast(ExerciseSubmission.time_spent_seconds, Float)).label("avg_time"),
            ).where(ExerciseSubmission.student_id == student_id)
        )
    ).one()
    return {
        "total": row.total or 0,
        "graded": row.graded or 0,
        "avg_score": round(float(row.avg_score), 1) if row.avg_score is not None else None,
        # pass_rate denominator is rows with a non-NULL passed verdict.
        "pass_rate": (
            round((row.passed_count or 0) / row.verdict_count, 4)
            if row.verdict_count
            else None
        ),
        "avg_attempts": round(float(row.avg_attempts), 2) if row.avg_attempts is not None else None,
        "avg_time_spent_seconds": (
            round(float(row.avg_time), 1) if row.avg_time is not None else None
        ),
    }


async def _quiz_summary(db: AsyncSession, student_id: uuid.UUID) -> dict:
    row = (
        await db.execute(
            select(
                func.count().label("total"),
                func.count(QuizSubmission.score).label("graded"),
                func.count(QuizSubmission.passed)
                .filter(QuizSubmission.passed.is_(True))
                .label("passed_count"),
                func.count(QuizSubmission.passed).label("verdict_count"),
                func.avg(cast(QuizSubmission.score, Float)).label("avg_score"),
                func.avg(cast(QuizSubmission.attempt_number, Float)).label("avg_attempts"),
                func.avg(cast(QuizSubmission.time_spent_seconds, Float)).label("avg_time"),
            ).where(QuizSubmission.student_id == student_id)
        )
    ).one()
    return {
        "total": row.total or 0,
        "graded": row.graded or 0,
        "avg_score": round(float(row.avg_score), 1) if row.avg_score is not None else None,
        "pass_rate": (
            round((row.passed_count or 0) / row.verdict_count, 4)
            if row.verdict_count
            else None
        ),
        "avg_attempts": round(float(row.avg_attempts), 2) if row.avg_attempts is not None else None,
        "avg_time_spent_seconds": (
            round(float(row.avg_time), 1) if row.avg_time is not None else None
        ),
    }


async def _assignment_summary(db: AsyncSession, student_id: uuid.UUID) -> dict:
    row = (
        await db.execute(
            select(
                func.count().label("total"),
                func.count(AssignmentSubmission.score).label("graded"),
                func.avg(cast(AssignmentSubmission.score, Float)).label("avg_score"),
                func.avg(cast(AssignmentSubmission.attempt_number, Float)).label("avg_attempts"),
                func.avg(cast(AssignmentSubmission.time_spent_seconds, Float)).label("avg_time"),
            ).where(AssignmentSubmission.student_id == student_id)
        )
    ).one()
    return {
        "total": row.total or 0,
        "graded": row.graded or 0,
        "avg_score": round(float(row.avg_score), 1) if row.avg_score is not None else None,
        "pass_rate": None,  # assignments have no pass/fail verdict
        "avg_attempts": round(float(row.avg_attempts), 2) if row.avg_attempts is not None else None,
        "avg_time_spent_seconds": (
            round(float(row.avg_time), 1) if row.avg_time is not None else None
        ),
    }


async def _recent_exercises(
    db: AsyncSession, student_id: uuid.UUID, limit: int
) -> list[dict]:
    rows = (
        await db.execute(
            select(
                ExerciseSubmission.id,
                Exercise.id.label("task_id"),
                Exercise.title,
                Exercise.exercise_type,
                ExerciseSubmission.score,
                ExerciseSubmission.passed,
                ExerciseSubmission.attempt_number,
                ExerciseSubmission.time_spent_seconds,
                ExerciseSubmission.submitted_at,
            )
            .join(Exercise, Exercise.id == ExerciseSubmission.exercise_id)
            .where(ExerciseSubmission.student_id == student_id)
            .order_by(ExerciseSubmission.submitted_at.desc())
            .limit(limit)
        )
    ).all()
    return [
        {
            "submission_id": str(r.id),
            "task_id": str(r.task_id),
            "task_type": "exercise",
            "exercise_type": (
                r.exercise_type.value if hasattr(r.exercise_type, "value") else r.exercise_type
            ),
            "title": r.title,
            "score": round(float(r.score), 1) if r.score is not None else None,
            "passed": r.passed,
            "attempt_number": r.attempt_number,
            "time_spent_seconds": r.time_spent_seconds,
            "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
            "quiz_id": None,
        }
        for r in rows
    ]


async def _recent_quizzes(
    db: AsyncSession, student_id: uuid.UUID, limit: int
) -> list[dict]:
    rows = (
        await db.execute(
            select(
                QuizSubmission.id,
                Quiz.id.label("quiz_id"),
                Quiz.title,
                QuizSubmission.score,
                QuizSubmission.passed,
                QuizSubmission.attempt_number,
                QuizSubmission.time_spent_seconds,
                QuizSubmission.submitted_at,
            )
            .join(Quiz, Quiz.id == QuizSubmission.quiz_id)
            .where(QuizSubmission.student_id == student_id)
            .order_by(QuizSubmission.submitted_at.desc())
            .limit(limit)
        )
    ).all()
    return [
        {
            "submission_id": str(r.id),
            "task_id": str(r.quiz_id),
            "task_type": "quiz",
            "exercise_type": "quiz",
            "title": r.title,
            "score": round(float(r.score), 1) if r.score is not None else None,
            "passed": r.passed,
            "attempt_number": r.attempt_number,
            "time_spent_seconds": r.time_spent_seconds,
            "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
            # Carries the quiz id so the frontend can link to the per-question
            # breakdown at /assessments/quizzes/{quiz_id}/students/{sid}/breakdown.
            "quiz_id": str(r.quiz_id),
        }
        for r in rows
    ]


async def _recent_assignments(
    db: AsyncSession, student_id: uuid.UUID, limit: int
) -> list[dict]:
    rows = (
        await db.execute(
            select(
                AssignmentSubmission.id,
                Assignment.id.label("task_id"),
                Assignment.title,
                AssignmentSubmission.score,
                AssignmentSubmission.attempt_number,
                AssignmentSubmission.time_spent_seconds,
                AssignmentSubmission.submitted_at,
                AssignmentSubmission.status,
            )
            .join(Assignment, Assignment.id == AssignmentSubmission.assignment_id)
            .where(AssignmentSubmission.student_id == student_id)
            .order_by(AssignmentSubmission.submitted_at.desc())
            .limit(limit)
        )
    ).all()
    return [
        {
            "submission_id": str(r.id),
            "task_id": str(r.task_id),
            "task_type": "assignment",
            "exercise_type": "assignment",
            "title": r.title,
            "score": round(float(r.score), 1) if r.score is not None else None,
            # No boolean pass/fail; surface graded status instead.
            "passed": None,
            "status": r.status.value if hasattr(r.status, "value") else r.status,
            "attempt_number": r.attempt_number,
            "time_spent_seconds": r.time_spent_seconds,
            "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
            "quiz_id": None,
        }
        for r in rows
    ]


async def _gamification(db: AsyncSession, student_id: uuid.UUID) -> dict:
    streak = await db.scalar(
        select(UserStreak).where(UserStreak.user_id == student_id)
    )
    badge_rows = (
        await db.execute(
            select(UserBadge.earned_at, Badge.name, Badge.icon, Badge.id)
            .join(Badge, Badge.id == UserBadge.badge_id)
            .where(UserBadge.user_id == student_id)
            .order_by(UserBadge.earned_at.desc())
        )
    ).all()
    return {
        "total_xp": streak.total_xp if streak else 0,
        "current_streak": streak.current_streak if streak else 0,
        "longest_streak": streak.longest_streak if streak else 0,
        "badges": [
            {
                "badge_id": str(bid),
                "name": name,
                "icon": icon,
                "earned_at": earned_at.isoformat() if earned_at else None,
            }
            for earned_at, name, icon, bid in badge_rows
        ],
    }


async def _certificates(db: AsyncSession, student_id: uuid.UUID) -> list[dict]:
    rows = (
        await db.execute(
            select(Certificate, Course.title)
            .join(Course, Course.id == Certificate.course_id)
            .where(Certificate.user_id == student_id)
            .order_by(Certificate.issued_at.desc())
        )
    ).all()
    return [
        {
            "course_id": str(cert.course_id),
            "course_title": title,
            "certificate_number": cert.certificate_number,
            "issued_at": cert.issued_at.isoformat() if cert.issued_at else None,
        }
        for cert, title in rows
    ]


# ── Public API ──────────────────────────────────────────────────────────


async def get_student_profile(
    db: AsyncSession,
    user: User,
    student_id: uuid.UUID,
    *,
    recent_limit: int = 20,
) -> dict:
    """Aggregate one student's full profile, gated by the caller's role/org."""
    target = await _authorize_student(db, user, student_id)

    enrollments = await _enrollments(db, student_id)
    completed_courses = sum(1 for e in enrollments if e["completed_at"])

    submissions = {
        "exercises": await _exercise_summary(db, student_id),
        "quizzes": await _quiz_summary(db, student_id),
        "assignments": await _assignment_summary(db, student_id),
    }
    total_submissions = sum(s["total"] for s in submissions.values())

    recent = (
        await _recent_exercises(db, student_id, recent_limit)
        + await _recent_quizzes(db, student_id, recent_limit)
        + await _recent_assignments(db, student_id, recent_limit)
    )
    # Merge the three recent lists and keep the globally most-recent N.
    recent.sort(key=lambda r: r["submitted_at"] or "", reverse=True)
    recent = recent[:recent_limit]

    return {
        "student": {
            "id": str(target.id),
            "full_name": target.full_name,
            "email": target.email,
            "role": target.role.value if hasattr(target.role, "value") else target.role,
            "avatar_url": target.avatar_url,
            "created_at": target.created_at.isoformat() if target.created_at else None,
            "last_active_at": (
                target.last_active_at.isoformat()
                if getattr(target, "last_active_at", None)
                else None
            ),
        },
        "enrollments": enrollments,
        "completed_courses": completed_courses,
        "submissions": submissions,
        "total_submissions": total_submissions,
        "recent_submissions": recent,
        "gamification": await _gamification(db, student_id),
        "certificates": await _certificates(db, student_id),
    }
