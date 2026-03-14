from datetime import date, timedelta

from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.schemas import DashboardStats, DetailedAnalytics
from app.auth.models import User, UserRole
from app.courses.models import Course, Lesson
from app.progress.models import Enrollment


def _org_filter(column, user: User):
    """Return org filter conditions — empty list for super_admin (sees all)."""
    if user.role == UserRole.super_admin:
        return []
    return [column == user.org_id]


async def get_dashboard_stats(db: AsyncSession, user: User) -> DashboardStats:
    total_users = (
        await db.execute(
            select(func.count(User.id)).where(*_org_filter(User.org_id, user))
        )
    ).scalar() or 0

    total_courses = (
        await db.execute(
            select(func.count(Course.id)).where(*_org_filter(Course.org_id, user))
        )
    ).scalar() or 0

    enroll_query = (
        select(func.count(Enrollment.id))
        .join(Course, Enrollment.course_id == Course.id)
    )
    for f in _org_filter(Course.org_id, user):
        enroll_query = enroll_query.where(f)
    total_enrollments = (await db.execute(enroll_query)).scalar() or 0

    active_students = (
        await db.execute(
            select(func.count(User.id)).where(
                *_org_filter(User.org_id, user),
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

    org_filters = _org_filter(Course.org_id, user)

    # Completion rate
    enroll_q = (
        select(func.count(Enrollment.id))
        .join(Course, Enrollment.course_id == Course.id)
    )
    for f in org_filters:
        enroll_q = enroll_q.where(f)
    total_enrollments = (await db.execute(enroll_q)).scalar() or 0

    completed_q = (
        select(func.count(Enrollment.id))
        .join(Course, Enrollment.course_id == Course.id)
        .where(Enrollment.completed_at.isnot(None))
    )
    for f in org_filters:
        completed_q = completed_q.where(f)
    completed_enrollments = (await db.execute(completed_q)).scalar() or 0

    completion_rate = (
        round(completed_enrollments / total_enrollments * 100, 1) if total_enrollments > 0 else 0.0
    )

    # Avg quiz score
    avg_quiz_score = None
    try:
        from app.quizzes.models import QuizSubmission

        quiz_q = (
            select(func.avg(QuizSubmission.score))
            .join(Lesson, QuizSubmission.lesson_id == Lesson.id)
            .join(Module, Lesson.module_id == Module.id)
            .join(Course, Module.course_id == Course.id)
        )
        for f in org_filters:
            quiz_q = quiz_q.where(f)
        score = (await db.execute(quiz_q)).scalar()
        if score is not None:
            avg_quiz_score = round(float(score), 1)
    except Exception:
        pass

    # Avg code pass rate
    avg_code_pass_rate = None
    try:
        from app.sandbox.models import CodeSubmission

        user_org_filters = _org_filter(User.org_id, user)
        total_subs_q = (
            select(func.count(CodeSubmission.id))
            .join(User, CodeSubmission.user_id == User.id)
        )
        for f in user_org_filters:
            total_subs_q = total_subs_q.where(f)
        total_subs = (await db.execute(total_subs_q)).scalar() or 0

        passed_subs_q = (
            select(func.count(CodeSubmission.id))
            .join(User, CodeSubmission.user_id == User.id)
            .where(CodeSubmission.passed == True)
        )
        for f in user_org_filters:
            passed_subs_q = passed_subs_q.where(f)
        passed_subs = (await db.execute(passed_subs_q)).scalar() or 0

        if total_subs > 0:
            avg_code_pass_rate = round(passed_subs / total_subs * 100, 1)
    except Exception:
        pass

    # Enrollments over time (last 30 days)
    today = date.today()
    thirty_days_ago = today - timedelta(days=30)
    time_q = (
        select(
            cast(Enrollment.enrolled_at, Date).label("day"),
            func.count(Enrollment.id).label("count"),
        )
        .join(Course, Enrollment.course_id == Course.id)
        .where(Enrollment.enrolled_at >= thirty_days_ago)
    )
    for f in org_filters:
        time_q = time_q.where(f)
    rows = (await db.execute(time_q.group_by("day").order_by("day"))).all()
    enrollment_map = {str(r.day): r.count for r in rows}
    enrollments_over_time = []
    for i in range(31):
        d = thirty_days_ago + timedelta(days=i)
        enrollments_over_time.append({"date": str(d), "count": enrollment_map.get(str(d), 0)})

    # Top courses by enrollment count
    top_q = (
        select(
            Course.id,
            Course.title,
            func.count(Enrollment.id).label("enrollment_count"),
        )
        .join(Enrollment, Enrollment.course_id == Course.id, isouter=True)
    )
    for f in org_filters:
        top_q = top_q.where(f)
    top_rows = (
        await db.execute(
            top_q.group_by(Course.id, Course.title)
            .order_by(func.count(Enrollment.id).desc())
            .limit(10)
        )
    ).all()
    top_courses = [
        {"id": str(r.id), "title": r.title, "enrollment_count": r.enrollment_count}
        for r in top_rows
    ]

    # Lesson type distribution
    type_q = (
        select(
            Lesson.content_type,
            func.count(Lesson.id).label("count"),
        )
        .join(Module, Lesson.module_id == Module.id)
        .join(Course, Module.course_id == Course.id)
    )
    for f in org_filters:
        type_q = type_q.where(f)
    type_rows = (await db.execute(type_q.group_by(Lesson.content_type))).all()
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
