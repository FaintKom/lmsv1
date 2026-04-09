"""GDPR data export helper — Article 20 (Right to Data Portability)."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.assessments.models import QuizSubmission
from app.assignments.models import AssignmentSubmission
from app.auth.models import User
from app.certificates.models import Certificate
from app.courses.models import Course
from app.discussions.models import Comment
from app.gamification.models import UserBadge, UserStreak
from app.learning_paths.models import LearningPathEnrollment
from app.notifications.models import Notification
from app.progress.models import Enrollment
from app.sandbox.models import CodeSubmission
from app.skills.models import Skill, UserSkill
from app.submissions.models import FileSubmission, InteractiveSubmission


async def export_user_data(db: AsyncSession, user_id: uuid.UUID) -> dict:
    """Export all personal data for a user (GDPR Art. 20)."""

    # Profile
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return {}

    profile = {
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "consent_accepted_at": user.consent_accepted_at.isoformat() if user.consent_accepted_at else None,
        "email_preferences": user.email_preferences,
    }

    # Enrollments
    result = await db.execute(
        select(Enrollment, Course.title)
        .join(Course, Enrollment.course_id == Course.id)
        .where(Enrollment.student_id == user_id)
    )
    enrollments = [
        {
            "course_title": title,
            "progress_percent": float(e.progress_percent or 0),
            "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
            "completed_at": e.completed_at.isoformat() if e.completed_at else None,
        }
        for e, title in result.all()
    ]

    # Quiz submissions
    result = await db.execute(
        select(QuizSubmission).where(QuizSubmission.student_id == user_id)
    )
    quiz_submissions = [
        {
            "quiz_id": str(qs.quiz_id),
            "score": float(qs.score) if qs.score else None,
            "passed": qs.passed,
            "submitted_at": qs.submitted_at.isoformat() if qs.submitted_at else None,
        }
        for qs in result.scalars().all()
    ]

    # Assignment submissions
    result = await db.execute(
        select(AssignmentSubmission).where(AssignmentSubmission.student_id == user_id)
    )
    assignment_submissions = [
        {
            "assignment_id": str(s.assignment_id),
            "content": s.content,
            "score": s.score,
            "feedback": s.feedback,
            "status": s.status.value if hasattr(s.status, "value") else s.status,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        }
        for s in result.scalars().all()
    ]

    # Code submissions
    result = await db.execute(
        select(CodeSubmission).where(CodeSubmission.student_id == user_id)
    )
    code_submissions = [
        {
            "challenge_id": str(cs.challenge_id),
            "language": cs.language,
            "status": cs.status.value if hasattr(cs.status, "value") else cs.status,
            "total_passed": cs.total_passed,
            "total_tests": cs.total_tests,
            "submitted_at": cs.submitted_at.isoformat() if cs.submitted_at else None,
        }
        for cs in result.scalars().all()
    ]

    # File submissions
    result = await db.execute(
        select(FileSubmission).where(FileSubmission.student_id == user_id)
    )
    file_submissions = [
        {
            "lesson_id": str(fs.lesson_id),
            "original_filename": fs.original_filename,
            "file_size": fs.file_size,
            "mime_type": fs.mime_type,
        }
        for fs in result.scalars().all()
    ]

    # Interactive submissions
    result = await db.execute(
        select(InteractiveSubmission).where(InteractiveSubmission.student_id == user_id)
    )
    interactive_submissions = [
        {
            "lesson_id": str(i.lesson_id),
            "exercise_type": i.exercise_type,
            "answers": i.answers,
            "score": i.score,
            "passed": i.passed,
        }
        for i in result.scalars().all()
    ]

    # Comments
    result = await db.execute(
        select(Comment).where(Comment.user_id == user_id)
    )
    comments = [
        {
            "lesson_id": str(c.lesson_id),
            "content": c.content,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in result.scalars().all()
    ]

    # Certificates
    result = await db.execute(
        select(Certificate).where(Certificate.user_id == user_id)
    )
    certificates = [
        {
            "course_id": str(cert.course_id),
            "certificate_number": cert.certificate_number,
            "issued_at": cert.issued_at.isoformat() if cert.issued_at else None,
        }
        for cert in result.scalars().all()
    ]

    # Gamification
    result = await db.execute(
        select(UserStreak).where(UserStreak.user_id == user_id)
    )
    streak = result.scalar_one_or_none()
    gamification = {
        "current_streak": streak.current_streak if streak else 0,
        "longest_streak": streak.longest_streak if streak else 0,
        "total_xp": streak.total_xp if streak else 0,
    }

    result = await db.execute(
        select(UserBadge).where(UserBadge.user_id == user_id)
    )
    badges = [
        {
            "badge_id": str(ub.badge_id),
            "earned_at": ub.earned_at.isoformat() if ub.earned_at else None,
        }
        for ub in result.scalars().all()
    ]

    # Skills
    result = await db.execute(
        select(UserSkill, Skill.name)
        .join(Skill, UserSkill.skill_id == Skill.id)
        .where(UserSkill.user_id == user_id)
    )
    skills = [
        {
            "skill_name": name,
            "total_xp": us.total_xp,
            "level": us.level,
        }
        for us, name in result.all()
    ]

    # Learning path enrollments
    result = await db.execute(
        select(LearningPathEnrollment).where(LearningPathEnrollment.student_id == user_id)
    )
    path_enrollments = [
        {
            "path_id": str(lpe.path_id),
            "current_step": lpe.current_step,
            "enrolled_at": lpe.enrolled_at.isoformat() if lpe.enrolled_at else None,
        }
        for lpe in result.scalars().all()
    ]

    # Notifications (last 100)
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(100)
    )
    notifications = [
        {
            "title": n.title,
            "message": n.message,
            "read": n.read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in result.scalars().all()
    ]

    return {
        "profile": profile,
        "enrollments": enrollments,
        "quiz_submissions": quiz_submissions,
        "assignment_submissions": assignment_submissions,
        "code_submissions": code_submissions,
        "file_submissions": file_submissions,
        "interactive_submissions": interactive_submissions,
        "comments": comments,
        "certificates": certificates,
        "gamification": gamification,
        "badges": badges,
        "skills": skills,
        "learning_path_enrollments": path_enrollments,
        "notifications": notifications,
        "exported_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    }
