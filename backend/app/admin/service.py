from datetime import date, timedelta

from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.schemas import DashboardStats, DetailedAnalytics
from app.auth.models import User, UserRole
from app.courses.models import Course, Lesson
from app.progress.models import Enrollment


async def get_dashboard_stats(db: AsyncSession, user: User) -> DashboardStats:
    org_id = user.org_id

    total_users = (
        await db.execute(
            select(func.count(User.id)).where(User.org_id == org_id)
        )
    ).scalar() or 0

    total_courses = (
        await db.execute(
            select(func.count(Course.id)).where(Course.org_id == org_id)
        )
    ).scalar() or 0

    total_enrollments = (
        await db.execute(
            select(func.count(Enrollment.id))
            .join(Course, Enrollment.course_id == Course.id)
            .where(Course.org_id == org_id)
        )
    ).scalar() or 0

    active_students = (
        await db.execute(
            select(func.count(User.id)).where(
                User.org_id == org_id,
                User.role == UserRole.student,
                User.is_active == True,
            )
        )
    ).scalar() or 0

    return DashboardStats(
        total_users=total_users,
        total_courses=total_courses,
        total_enrollments=total_enrollments,
        active_students=active_students,
    )


async def get_detailed_analytics(db: AsyncSession, user: User) -> DetailedAnalytics:
    from app.courses.models import Module

    org_id = user.org_id

    # Completion rate
    total_enrollments = (
        await db.execute(
            select(func.count(Enrollment.id))
            .join(Course, Enrollment.course_id == Course.id)
            .where(Course.org_id == org_id)
        )
    ).scalar() or 0

    completed_enrollments = (
        await db.execute(
            select(func.count(Enrollment.id))
            .join(Course, Enrollment.course_id == Course.id)
            .where(Course.org_id == org_id, Enrollment.completed_at.isnot(None))
        )
    ).scalar() or 0

    completion_rate = (
        round(completed_enrollments / total_enrollments * 100, 1) if total_enrollments > 0 else 0.0
    )

    # Avg quiz score
    avg_quiz_score = None
    try:
        from app.quizzes.models import QuizSubmission

        score = (
            await db.execute(
                select(func.avg(QuizSubmission.score))
                .join(Lesson, QuizSubmission.lesson_id == Lesson.id)
                .join(Module, Lesson.module_id == Module.id)
                .join(Course, Module.course_id == Course.id)
                .where(Course.org_id == org_id)
            )
        ).scalar()
        if score is not None:
            avg_quiz_score = round(float(score), 1)
    except Exception:
        pass

    # Avg code pass rate
    avg_code_pass_rate = None
    try:
        from app.sandbox.models import CodeSubmission

        total_subs = (
            await db.execute(
                select(func.count(CodeSubmission.id))
                .join(User, CodeSubmission.user_id == User.id)
                .where(User.org_id == org_id)
            )
        ).scalar() or 0
        passed_subs = (
            await db.execute(
                select(func.count(CodeSubmission.id))
                .join(User, CodeSubmission.user_id == User.id)
                .where(User.org_id == org_id, CodeSubmission.passed == True)
            )
        ).scalar() or 0
        if total_subs > 0:
            avg_code_pass_rate = round(passed_subs / total_subs * 100, 1)
    except Exception:
        pass

    # Enrollments over time (last 30 days)
    today = date.today()
    thirty_days_ago = today - timedelta(days=30)
    rows = (
        await db.execute(
            select(
                cast(Enrollment.enrolled_at, Date).label("day"),
                func.count(Enrollment.id).label("count"),
            )
            .join(Course, Enrollment.course_id == Course.id)
            .where(Course.org_id == org_id, Enrollment.enrolled_at >= thirty_days_ago)
            .group_by("day")
            .order_by("day")
        )
    ).all()
    enrollment_map = {str(r.day): r.count for r in rows}
    enrollments_over_time = []
    for i in range(31):
        d = thirty_days_ago + timedelta(days=i)
        enrollments_over_time.append({"date": str(d), "count": enrollment_map.get(str(d), 0)})

    # Top courses by enrollment count
    top_rows = (
        await db.execute(
            select(
                Course.id,
                Course.title,
                func.count(Enrollment.id).label("enrollment_count"),
            )
            .join(Enrollment, Enrollment.course_id == Course.id, isouter=True)
            .where(Course.org_id == org_id)
            .group_by(Course.id, Course.title)
            .order_by(func.count(Enrollment.id).desc())
            .limit(10)
        )
    ).all()
    top_courses = [
        {"id": str(r.id), "title": r.title, "enrollment_count": r.enrollment_count}
        for r in top_rows
    ]

    # Lesson type distribution
    type_rows = (
        await db.execute(
            select(
                Lesson.content_type,
                func.count(Lesson.id).label("count"),
            )
            .join(Module, Lesson.module_id == Module.id)
            .join(Course, Module.course_id == Course.id)
            .where(Course.org_id == org_id)
            .group_by(Lesson.content_type)
        )
    ).all()
    lesson_type_distribution = [
        {
            "type": str(r.content_type.value) if hasattr(r.content_type, "value") else str(r.content_type),
            "count": r.count,
        }
        for r in type_rows
    ]

    return DetailedAnalytics(
        completion_rate=completion_rate,
        avg_quiz_score=avg_quiz_score,
        avg_code_pass_rate=avg_code_pass_rate,
        enrollments_over_time=enrollments_over_time,
        top_courses=top_courses,
        lesson_type_distribution=lesson_type_distribution,
    )
