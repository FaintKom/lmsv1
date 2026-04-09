"""
Rule-based recommendation engine.

Types:
- "review": Low quiz scores → review topic
- "continue": Incomplete courses → keep going
- "new": Unenrolled courses that match interests → try this
- "almost_done": Courses near completion → finish up
"""


from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.assessments.models import QuizSubmission
from app.auth.models import User
from app.courses.models import Course
from app.progress.models import Enrollment


async def get_recommendations(db: AsyncSession, user: User) -> list[dict]:
    recommendations = []

    # 1. "almost_done" — courses with 70-99% progress
    result = await db.execute(
        select(Enrollment, Course.title, Course.id)
        .join(Course, Enrollment.course_id == Course.id)
        .where(
            Enrollment.student_id == user.id,
            Enrollment.completed_at.is_(None),
            Enrollment.progress_percent >= 70,
            Enrollment.progress_percent < 100,
        )
        .order_by(Enrollment.progress_percent.desc())
        .limit(2)
    )
    for enrollment, title, course_id in result.all():
        recommendations.append({
            "type": "almost_done",
            "title": f"Almost done: {title}",
            "description": f"You're {int(enrollment.progress_percent)}% through — finish strong!",
            "link": f"/courses/{course_id}",
            "priority": 1,
        })

    # 2. "continue" — enrolled courses with low progress
    result = await db.execute(
        select(Enrollment, Course.title, Course.id)
        .join(Course, Enrollment.course_id == Course.id)
        .where(
            Enrollment.student_id == user.id,
            Enrollment.completed_at.is_(None),
            Enrollment.progress_percent < 70,
            Enrollment.progress_percent > 0,
        )
        .order_by(Enrollment.progress_percent.desc())
        .limit(2)
    )
    for enrollment, title, course_id in result.all():
        recommendations.append({
            "type": "continue",
            "title": f"Continue: {title}",
            "description": f"Pick up where you left off ({int(enrollment.progress_percent)}% done)",
            "link": f"/courses/{course_id}",
            "priority": 2,
        })

    # 3. "review" — quizzes with low scores (<60%)
    result = await db.execute(
        select(
            QuizSubmission.quiz_id,
            func.avg(QuizSubmission.score).label("avg_score"),
        )
        .where(QuizSubmission.student_id == user.id)
        .group_by(QuizSubmission.quiz_id)
        .having(func.avg(QuizSubmission.score) < 60)
        .limit(2)
    )
    for quiz_id, avg_score in result.all():
        recommendations.append({
            "type": "review",
            "title": "Review needed",
            "description": f"Your average quiz score is {int(avg_score or 0)}% — try reviewing the material",
            "link": "/progress",
            "priority": 3,
        })

    # 4. "new" — published courses student hasn't enrolled in
    enrolled_ids = (
        select(Enrollment.course_id)
        .where(Enrollment.student_id == user.id)
        .scalar_subquery()
    )
    result = await db.execute(
        select(Course)
        .where(
            Course.org_id == user.org_id,
            Course.status == "published",
            Course.id.notin_(enrolled_ids),
            Course.is_template == False,
        )
        .limit(3)
    )
    for course in result.scalars().all():
        recommendations.append({
            "type": "new",
            "title": f"Try: {course.title}",
            "description": "A new course you haven't started yet",
            "link": f"/courses/{course.id}",
            "priority": 4,
        })

    # Sort by priority, limit to 6
    recommendations.sort(key=lambda r: r["priority"])
    return recommendations[:6]
