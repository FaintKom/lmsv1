"""Advanced analytics queries for methodist/admin dashboard.

All queries are org-scoped via _org_filter from the main service module.
"""

from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import Date, case, cast, func, literal, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.service import _org_filter
from app.attendance.models import AttendanceRecord, AttendanceStatus
from app.auth.models import User, UserRole
from app.courses.models import Course, Lesson, Module
from app.exercises.models import Exercise, ExerciseSubmission
from app.gamification.models import UserStreak
from app.progress.models import Enrollment, LessonProgress, LessonStatus


# ── Student Risk Scores ──────────────────────────────────────────────


async def get_student_risks(
    db: AsyncSession,
    user: User,
    *,
    course_id: UUID | None = None,
) -> list[dict]:
    """Compute risk score per student: activity, scores, progress velocity."""
    now = datetime.now(timezone.utc)
    org_filters = _org_filter(User.org_id, user)

    students_q = (
        select(User.id, User.full_name, User.email)
        .where(
            User.role == UserRole.student,
            User.is_active == True,  # noqa: E712
            *org_filters,
        )
    )
    students = (await db.execute(students_q)).all()
    if not students:
        return []

    student_ids = [s.id for s in students]

    # Enrollments with progress
    enroll_q = select(
        Enrollment.student_id,
        func.avg(Enrollment.progress_percent).label("avg_progress"),
        func.count(Enrollment.id).label("enrollment_count"),
        func.count(Enrollment.completed_at).label("completed_count"),
    ).where(Enrollment.student_id.in_(student_ids))
    if course_id:
        enroll_q = enroll_q.where(Enrollment.course_id == course_id)
    enroll_q = enroll_q.group_by(Enrollment.student_id)
    enroll_rows = {r.student_id: r for r in (await db.execute(enroll_q)).all()}

    # Latest activity
    activity_q = (
        select(
            ExerciseSubmission.student_id,
            func.max(ExerciseSubmission.submitted_at).label("last_activity"),
        )
        .where(ExerciseSubmission.student_id.in_(student_ids))
        .group_by(ExerciseSubmission.student_id)
    )
    activity_rows = {
        r.student_id: r.last_activity for r in (await db.execute(activity_q)).all()
    }

    # Avg exercise score per student
    score_q = (
        select(
            ExerciseSubmission.student_id,
            func.avg(ExerciseSubmission.score).label("avg_score"),
        )
        .where(
            ExerciseSubmission.student_id.in_(student_ids),
            ExerciseSubmission.score.isnot(None),
        )
        .group_by(ExerciseSubmission.student_id)
    )
    score_rows = {r.student_id: float(r.avg_score) for r in (await db.execute(score_q)).all()}

    # Streaks
    streak_q = select(
        UserStreak.user_id, UserStreak.current_streak
    ).where(UserStreak.user_id.in_(student_ids))
    streak_map = {
        r.user_id: r.current_streak for r in (await db.execute(streak_q)).all()
    }

    results = []
    for s in students:
        enroll = enroll_rows.get(s.id)
        if not enroll or enroll.enrollment_count == 0:
            continue

        last_act = activity_rows.get(s.id)
        days_inactive = (now - last_act).days if last_act else 999
        avg_score = score_rows.get(s.id, 0.0)
        avg_progress = float(enroll.avg_progress) if enroll.avg_progress else 0.0
        streak = streak_map.get(s.id, 0)

        risk_points = 0
        if days_inactive > 14:
            risk_points += 40
        elif days_inactive > 7:
            risk_points += 25
        elif days_inactive > 3:
            risk_points += 10

        if avg_score < 40:
            risk_points += 30
        elif avg_score < 60:
            risk_points += 15

        if avg_progress < 20:
            risk_points += 20
        elif avg_progress < 50:
            risk_points += 10

        if streak == 0 and days_inactive > 3:
            risk_points += 10

        if risk_points >= 50:
            risk_level = "high"
        elif risk_points >= 25:
            risk_level = "medium"
        else:
            risk_level = "low"

        results.append({
            "student_id": str(s.id),
            "full_name": s.full_name,
            "email": s.email,
            "risk_level": risk_level,
            "risk_score": risk_points,
            "days_inactive": days_inactive if days_inactive < 999 else None,
            "avg_score": round(avg_score, 1),
            "avg_progress": round(avg_progress, 1),
            "current_streak": streak,
            "enrollment_count": enroll.enrollment_count,
            "completed_count": enroll.completed_count,
        })

    results.sort(key=lambda x: -x["risk_score"])
    return results


# ── Course Effectiveness ─────────────────────────────────────────────


async def get_course_effectiveness(
    db: AsyncSession,
    user: User,
) -> list[dict]:
    """Per-course stats: completion rate, avg score, time-to-complete."""
    org_filters = _org_filter(Course.org_id, user)

    courses_q = (
        select(Course.id, Course.title, Course.status)
        .where(Course.is_template == False, *org_filters)  # noqa: E712
        .order_by(Course.title)
    )
    courses = (await db.execute(courses_q)).all()
    if not courses:
        return []

    results = []
    for c in courses:
        enroll_q = select(
            func.count(Enrollment.id).label("total"),
            func.count(Enrollment.completed_at).label("completed"),
            func.avg(Enrollment.progress_percent).label("avg_progress"),
        ).where(Enrollment.course_id == c.id)
        stats = (await db.execute(enroll_q)).one()

        total = stats.total or 0
        completed = stats.completed or 0
        completion_rate = round(completed / total * 100, 1) if total > 0 else 0.0

        score_q = (
            select(func.avg(ExerciseSubmission.score))
            .join(Exercise, ExerciseSubmission.exercise_id == Exercise.id)
            .join(Lesson, Exercise.lesson_id == Lesson.id)
            .join(Module, Lesson.module_id == Module.id)
            .where(Module.course_id == c.id, ExerciseSubmission.score.isnot(None))
        )
        avg_score = (await db.execute(score_q)).scalar()
        avg_score = round(float(avg_score), 1) if avg_score else None

        time_q = (
            select(
                func.avg(
                    func.extract("epoch", Enrollment.completed_at)
                    - func.extract("epoch", Enrollment.enrolled_at)
                )
            ).where(Enrollment.course_id == c.id, Enrollment.completed_at.isnot(None))
        )
        avg_seconds = (await db.execute(time_q)).scalar()
        avg_days = round(float(avg_seconds) / 86400, 1) if avg_seconds else None

        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        active_q = (
            select(func.count(func.distinct(ExerciseSubmission.student_id)))
            .join(Exercise, ExerciseSubmission.exercise_id == Exercise.id)
            .join(Lesson, Exercise.lesson_id == Lesson.id)
            .join(Module, Lesson.module_id == Module.id)
            .where(Module.course_id == c.id, ExerciseSubmission.submitted_at >= seven_days_ago)
        )
        active_count = (await db.execute(active_q)).scalar() or 0

        results.append({
            "course_id": str(c.id),
            "title": c.title,
            "status": c.status.value if hasattr(c.status, "value") else str(c.status),
            "total_enrolled": total,
            "completed": completed,
            "completion_rate": completion_rate,
            "avg_score": avg_score,
            "avg_days_to_complete": avg_days,
            "active_7d": active_count,
            "avg_progress": round(float(stats.avg_progress), 1) if stats.avg_progress else 0.0,
        })

    results.sort(key=lambda x: -x["total_enrolled"])
    return results


# ── Lesson Funnel ────────────────────────────────────────────────────


async def get_lesson_funnel(
    db: AsyncSession,
    user: User,
    course_id: UUID,
) -> list[dict]:
    """Per-lesson started/completed counts for drop-off analysis."""
    org_filters = _org_filter(Course.org_id, user)

    course = (
        await db.execute(select(Course.id).where(Course.id == course_id, *org_filters))
    ).scalar_one_or_none()
    if not course:
        return []

    lessons_q = (
        select(Lesson.id, Lesson.title, Module.sort_order.label("m_order"), Lesson.sort_order.label("l_order"))
        .join(Module, Lesson.module_id == Module.id)
        .where(Module.course_id == course_id)
        .order_by(Module.sort_order, Lesson.sort_order)
    )
    lessons = (await db.execute(lessons_q)).all()
    if not lessons:
        return []

    total_enrolled = (
        await db.execute(
            select(func.count(Enrollment.id)).where(Enrollment.course_id == course_id)
        )
    ).scalar() or 0

    results = []
    for idx, lesson in enumerate(lessons):
        started_q = (
            select(func.count(LessonProgress.id))
            .join(Enrollment, LessonProgress.enrollment_id == Enrollment.id)
            .where(LessonProgress.lesson_id == lesson.id, Enrollment.course_id == course_id)
        )
        started = (await db.execute(started_q)).scalar() or 0

        completed_q = (
            select(func.count(LessonProgress.id))
            .join(Enrollment, LessonProgress.enrollment_id == Enrollment.id)
            .where(
                LessonProgress.lesson_id == lesson.id,
                LessonProgress.status == LessonStatus.completed,
                Enrollment.course_id == course_id,
            )
        )
        completed = (await db.execute(completed_q)).scalar() or 0

        score_q = (
            select(func.avg(ExerciseSubmission.score))
            .join(Exercise, ExerciseSubmission.exercise_id == Exercise.id)
            .where(Exercise.lesson_id == lesson.id, ExerciseSubmission.score.isnot(None))
        )
        avg_score = (await db.execute(score_q)).scalar()

        results.append({
            "lesson_id": str(lesson.id),
            "title": lesson.title,
            "position": idx + 1,
            "total_enrolled": total_enrolled,
            "started": started,
            "completed": completed,
            "drop_off_rate": round((started - completed) / started * 100, 1) if started > 0 else 0.0,
            "avg_score": round(float(avg_score), 1) if avg_score else None,
        })

    return results


# ── Exercise Difficulty ──────────────────────────────────────────────


async def get_exercise_difficulty(
    db: AsyncSession,
    user: User,
    *,
    course_id: UUID | None = None,
) -> list[dict]:
    """Per-exercise difficulty metrics: pass rate, avg score, attempts."""
    org_filters = _org_filter(Exercise.org_id, user)

    exercises_q = select(
        Exercise.id, Exercise.title, Exercise.exercise_type, Exercise.lesson_id,
    ).where(*org_filters)

    if course_id:
        exercises_q = (
            exercises_q
            .join(Lesson, Exercise.lesson_id == Lesson.id)
            .join(Module, Lesson.module_id == Module.id)
            .where(Module.course_id == course_id)
        )

    exercises = (await db.execute(exercises_q)).all()
    if not exercises:
        return []

    results = []
    for ex in exercises:
        stats_q = select(
            func.count(ExerciseSubmission.id).label("total"),
            func.count(
                case((ExerciseSubmission.passed == True, literal(1)))  # noqa: E712
            ).label("passed_count"),
            func.avg(ExerciseSubmission.score).label("avg_score"),
            func.count(func.distinct(ExerciseSubmission.student_id)).label("unique_students"),
        ).where(ExerciseSubmission.exercise_id == ex.id)

        stats = (await db.execute(stats_q)).one()
        total = stats.total or 0
        if total == 0:
            continue

        passed = stats.passed_count or 0
        pass_rate = round(passed / total * 100, 1) if total > 0 else 0.0
        avg_attempts = round(total / stats.unique_students, 1) if stats.unique_students else 0

        if pass_rate >= 80:
            difficulty = "easy"
        elif pass_rate >= 50:
            difficulty = "medium"
        else:
            difficulty = "hard"

        results.append({
            "exercise_id": str(ex.id),
            "title": ex.title,
            "exercise_type": ex.exercise_type.value if hasattr(ex.exercise_type, "value") else str(ex.exercise_type),
            "total_submissions": total,
            "unique_students": stats.unique_students,
            "pass_rate": pass_rate,
            "avg_score": round(float(stats.avg_score), 1) if stats.avg_score else 0.0,
            "avg_attempts": avg_attempts,
            "difficulty": difficulty,
        })

    results.sort(key=lambda x: x["pass_rate"])
    return results


# ── Activity Timeline ────────────────────────────────────────────────


async def get_activity_timeline(
    db: AsyncSession,
    user: User,
    *,
    days: int = 30,
) -> list[dict]:
    """Daily activity aggregation: submissions, lessons completed, active users."""
    org_filters = _org_filter(User.org_id, user)
    cutoff = date.today() - timedelta(days=days)

    sub_q = (
        select(
            cast(ExerciseSubmission.submitted_at, Date).label("day"),
            func.count(ExerciseSubmission.id).label("submissions"),
            func.count(func.distinct(ExerciseSubmission.student_id)).label("active_students"),
            func.avg(ExerciseSubmission.score).label("avg_score"),
        )
        .join(User, ExerciseSubmission.student_id == User.id)
        .where(
            ExerciseSubmission.submitted_at >= cutoff,
            ExerciseSubmission.score.isnot(None),
            *org_filters,
        )
        .group_by("day")
    )
    sub_rows = {str(r.day): r for r in (await db.execute(sub_q)).all()}

    lesson_q = (
        select(
            cast(LessonProgress.completed_at, Date).label("day"),
            func.count(LessonProgress.id).label("lessons_completed"),
        )
        .join(Enrollment, LessonProgress.enrollment_id == Enrollment.id)
        .join(User, Enrollment.student_id == User.id)
        .where(
            LessonProgress.completed_at >= cutoff,
            LessonProgress.status == LessonStatus.completed,
            *org_filters,
        )
        .group_by("day")
    )
    lesson_rows = {str(r.day): r.lessons_completed for r in (await db.execute(lesson_q)).all()}

    results = []
    for i in range(days + 1):
        d = cutoff + timedelta(days=i)
        ds = str(d)
        sub = sub_rows.get(ds)
        results.append({
            "date": ds,
            "submissions": sub.submissions if sub else 0,
            "active_students": sub.active_students if sub else 0,
            "lessons_completed": lesson_rows.get(ds, 0),
            "avg_score": round(float(sub.avg_score), 1) if sub and sub.avg_score else None,
        })

    return results


# ── Attendance Impact ────────────────────────────────────────────────


async def get_attendance_impact(
    db: AsyncSession,
    user: User,
) -> dict:
    """Attendance rates per student and correlation with scores."""
    org_filters = _org_filter(AttendanceRecord.org_id, user)

    att_q = (
        select(
            AttendanceRecord.student_id,
            func.count(AttendanceRecord.id).label("total_sessions"),
            func.count(
                case(
                    (AttendanceRecord.status.in_([AttendanceStatus.present, AttendanceStatus.late]), literal(1))
                )
            ).label("attended"),
        )
        .where(*org_filters)
        .group_by(AttendanceRecord.student_id)
    )
    att_rows = (await db.execute(att_q)).all()

    if not att_rows:
        return {"students": [], "avg_attendance_rate": None, "has_data": False}

    student_ids = [r.student_id for r in att_rows]
    att_map = {
        r.student_id: round(r.attended / r.total_sessions * 100, 1) if r.total_sessions > 0 else 0
        for r in att_rows
    }

    score_q = (
        select(
            ExerciseSubmission.student_id,
            func.avg(ExerciseSubmission.score).label("avg_score"),
        )
        .where(ExerciseSubmission.student_id.in_(student_ids), ExerciseSubmission.score.isnot(None))
        .group_by(ExerciseSubmission.student_id)
    )
    score_map = {
        r.student_id: round(float(r.avg_score), 1)
        for r in (await db.execute(score_q)).all()
    }

    name_q = select(User.id, User.full_name).where(User.id.in_(student_ids))
    name_map = {r.id: r.full_name for r in (await db.execute(name_q)).all()}

    students = []
    for sid in student_ids:
        students.append({
            "student_id": str(sid),
            "full_name": name_map.get(sid, ""),
            "attendance_rate": att_map.get(sid, 0),
            "avg_score": score_map.get(sid),
        })

    students.sort(key=lambda x: -(x["attendance_rate"] or 0))
    avg_rate = round(sum(s["attendance_rate"] for s in students) / len(students), 1) if students else None

    return {"students": students, "avg_attendance_rate": avg_rate, "has_data": True}


# ── Overview KPIs ────────────────────────────────────────────────────


async def get_overview_kpis(
    db: AsyncSession,
    user: User,
) -> dict:
    """High-level KPIs for dashboard overview tab."""
    org_filters_user = _org_filter(User.org_id, user)
    org_filters_course = _org_filter(Course.org_id, user)

    total_students = (
        await db.execute(
            select(func.count(User.id)).where(
                User.role == UserRole.student,
                User.is_active == True,  # noqa: E712
                *org_filters_user,
            )
        )
    ).scalar() or 0

    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active_q = (
        select(func.count(func.distinct(ExerciseSubmission.student_id)))
        .join(User, ExerciseSubmission.student_id == User.id)
        .where(ExerciseSubmission.submitted_at >= seven_days_ago, *org_filters_user)
    )
    active_7d = (await db.execute(active_q)).scalar() or 0

    enroll_total_q = (
        select(func.count(Enrollment.id))
        .join(Course, Enrollment.course_id == Course.id)
        .where(*org_filters_course)
    )
    enroll_total = (await db.execute(enroll_total_q)).scalar() or 0

    enroll_done_q = (
        select(func.count(Enrollment.id))
        .join(Course, Enrollment.course_id == Course.id)
        .where(Enrollment.completed_at.isnot(None), *org_filters_course)
    )
    enroll_done = (await db.execute(enroll_done_q)).scalar() or 0
    completion_rate = round(enroll_done / enroll_total * 100, 1) if enroll_total > 0 else 0.0

    avg_score_q = (
        select(func.avg(ExerciseSubmission.score))
        .join(User, ExerciseSubmission.student_id == User.id)
        .where(ExerciseSubmission.score.isnot(None), *org_filters_user)
    )
    avg_score = (await db.execute(avg_score_q)).scalar()
    avg_score = round(float(avg_score), 1) if avg_score else 0.0

    risks = await get_student_risks(db, user)
    risk_counts = {"high": 0, "medium": 0, "low": 0}
    for r in risks:
        risk_counts[r["risk_level"]] += 1

    total_courses = (
        await db.execute(
            select(func.count(Course.id)).where(
                *org_filters_course,
                Course.is_template == False,  # noqa: E712
            )
        )
    ).scalar() or 0

    return {
        "total_students": total_students,
        "active_7d": active_7d,
        "total_courses": total_courses,
        "total_enrollments": enroll_total,
        "completion_rate": completion_rate,
        "avg_score": avg_score,
        "at_risk_high": risk_counts["high"],
        "at_risk_medium": risk_counts["medium"],
        "at_risk_low": risk_counts["low"],
    }
