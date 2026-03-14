import uuid
from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.gamification.models import Badge, UserBadge, UserStreak
from app.progress.models import LessonProgress, LessonStatus


DEFAULT_BADGES = [
    {"name": "First Steps", "description": "Complete your first lesson", "icon": "🎯", "criteria_key": "first_lesson", "criteria": {"lessons": 1}},
    {"name": "Dedicated Learner", "description": "Complete 10 lessons", "icon": "📚", "criteria_key": "lessons_10", "criteria": {"lessons": 10}},
    {"name": "Scholar", "description": "Complete 50 lessons", "icon": "🎓", "criteria_key": "lessons_50", "criteria": {"lessons": 50}},
    {"name": "Course Champion", "description": "Complete a course", "icon": "🏆", "criteria_key": "course_complete", "criteria": {"courses": 1}},
    {"name": "Multi-Course Master", "description": "Complete 5 courses", "icon": "👑", "criteria_key": "courses_5", "criteria": {"courses": 5}},
    {"name": "Week Warrior", "description": "Maintain a 7-day streak", "icon": "🔥", "criteria_key": "streak_7", "criteria": {"streak": 7}},
    {"name": "Month Master", "description": "Maintain a 30-day streak", "icon": "💎", "criteria_key": "streak_30", "criteria": {"streak": 30}},
    {"name": "Code Warrior", "description": "Pass 10 code challenges", "icon": "⚔️", "criteria_key": "code_10", "criteria": {"code_passed": 10}},
]


async def seed_default_badges(db: AsyncSession, org_id: uuid.UUID) -> None:
    """Create default badges for an organization if they don't exist."""
    result = await db.execute(
        select(func.count(Badge.id)).where(Badge.org_id == org_id)
    )
    if result.scalar() > 0:
        return

    for b in DEFAULT_BADGES:
        db.add(Badge(org_id=org_id, **b))
    await db.flush()


async def update_streak(db: AsyncSession, user_id: uuid.UUID) -> UserStreak:
    """Update user's streak on activity."""
    today = date.today()

    result = await db.execute(
        select(UserStreak).where(UserStreak.user_id == user_id)
    )
    streak = result.scalar_one_or_none()

    if not streak:
        streak = UserStreak(
            user_id=user_id,
            current_streak=1,
            longest_streak=1,
            last_activity_date=today,
        )
        db.add(streak)
        await db.flush()
        return streak

    if streak.last_activity_date == today:
        return streak  # Already counted today

    if streak.last_activity_date and (today - streak.last_activity_date).days == 1:
        # Consecutive day
        streak.current_streak += 1
    elif streak.last_activity_date and (today - streak.last_activity_date).days > 1:
        # Streak broken
        streak.current_streak = 1
    else:
        streak.current_streak = 1

    streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    streak.last_activity_date = today
    await db.flush()
    return streak


async def check_and_award_badges(
    db: AsyncSession, user_id: uuid.UUID, org_id: uuid.UUID
) -> list[str]:
    """Check criteria and award new badges. Returns names of newly awarded badges."""
    await seed_default_badges(db, org_id)

    # Get all badges for org
    result = await db.execute(select(Badge).where(Badge.org_id == org_id))
    badges = result.scalars().all()

    # Get already earned
    earned_result = await db.execute(
        select(UserBadge.badge_id).where(UserBadge.user_id == user_id)
    )
    earned_ids = set(earned_result.scalars().all())

    # Get stats
    from app.progress.models import Enrollment

    lessons_result = await db.execute(
        select(func.count(LessonProgress.id)).where(
            LessonProgress.enrollment_id.in_(
                select(Enrollment.id).where(Enrollment.student_id == user_id)
            ),
            LessonProgress.status == LessonStatus.completed,
        )
    )
    completed_lessons = lessons_result.scalar() or 0
    courses_result = await db.execute(
        select(func.count(Enrollment.id)).where(
            Enrollment.student_id == user_id,
            Enrollment.completed_at.isnot(None),
        )
    )
    completed_courses = courses_result.scalar() or 0

    streak_result = await db.execute(
        select(UserStreak).where(UserStreak.user_id == user_id)
    )
    streak = streak_result.scalar_one_or_none()
    current_streak = streak.current_streak if streak else 0

    from app.sandbox.models import CodeSubmission
    code_result = await db.execute(
        select(func.count(CodeSubmission.id)).where(
            CodeSubmission.student_id == user_id,
            CodeSubmission.status == "passed",
        )
    )
    code_passed = code_result.scalar() or 0

    # Check each badge
    newly_awarded: list[str] = []
    now = datetime.now(timezone.utc)

    for badge in badges:
        if badge.id in earned_ids:
            continue

        criteria = badge.criteria or {}
        earned = False

        if badge.criteria_key == "first_lesson" and completed_lessons >= criteria.get("lessons", 1):
            earned = True
        elif badge.criteria_key == "lessons_10" and completed_lessons >= criteria.get("lessons", 10):
            earned = True
        elif badge.criteria_key == "lessons_50" and completed_lessons >= criteria.get("lessons", 50):
            earned = True
        elif badge.criteria_key == "course_complete" and completed_courses >= criteria.get("courses", 1):
            earned = True
        elif badge.criteria_key == "courses_5" and completed_courses >= criteria.get("courses", 5):
            earned = True
        elif badge.criteria_key == "streak_7" and current_streak >= criteria.get("streak", 7):
            earned = True
        elif badge.criteria_key == "streak_30" and current_streak >= criteria.get("streak", 30):
            earned = True
        elif badge.criteria_key == "code_10" and code_passed >= criteria.get("code_passed", 10):
            earned = True

        if earned:
            db.add(UserBadge(user_id=user_id, badge_id=badge.id, earned_at=now))
            newly_awarded.append(badge.name)

    if newly_awarded:
        await db.flush()

    return newly_awarded


async def get_user_badges(
    db: AsyncSession, user_id: uuid.UUID, org_id: uuid.UUID
) -> list[dict]:
    """Get all badges with earned status for a user."""
    await seed_default_badges(db, org_id)

    result = await db.execute(select(Badge).where(Badge.org_id == org_id))
    badges = result.scalars().all()

    earned_result = await db.execute(
        select(UserBadge).where(UserBadge.user_id == user_id)
    )
    earned_map = {ub.badge_id: ub.earned_at for ub in earned_result.scalars().all()}

    return [
        {
            "id": b.id,
            "name": b.name,
            "description": b.description,
            "icon": b.icon,
            "criteria_key": b.criteria_key,
            "earned": b.id in earned_map,
            "earned_at": earned_map.get(b.id),
        }
        for b in badges
    ]


async def get_user_streak(db: AsyncSession, user_id: uuid.UUID) -> dict:
    result = await db.execute(
        select(UserStreak).where(UserStreak.user_id == user_id)
    )
    streak = result.scalar_one_or_none()
    if not streak:
        return {"current_streak": 0, "longest_streak": 0, "last_activity_date": None}
    return {
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "last_activity_date": str(streak.last_activity_date) if streak.last_activity_date else None,
    }


async def get_leaderboard(db: AsyncSession, org_id: uuid.UUID, limit: int = 20) -> list[dict]:
    """Get leaderboard for an organization."""
    from app.progress.models import Enrollment

    # Students in this org
    users_result = await db.execute(
        select(User).where(User.org_id == org_id, User.role == "student")
    )
    students = users_result.scalars().all()

    leaderboard = []
    for student in students:
        # Completed lessons
        lessons_result = await db.execute(
            select(func.count(LessonProgress.id)).where(
                LessonProgress.enrollment_id.in_(
                    select(Enrollment.id).where(Enrollment.student_id == student.id)
                ),
                LessonProgress.status == LessonStatus.completed,
            )
        )
        completed = lessons_result.scalar() or 0

        # Streak
        streak_result = await db.execute(
            select(UserStreak).where(UserStreak.user_id == student.id)
        )
        streak = streak_result.scalar_one_or_none()

        # Badge count
        badge_result = await db.execute(
            select(func.count(UserBadge.id)).where(UserBadge.user_id == student.id)
        )
        badges = badge_result.scalar() or 0

        leaderboard.append({
            "user_id": student.id,
            "user_name": student.full_name,
            "completed_lessons": completed,
            "current_streak": streak.current_streak if streak else 0,
            "badge_count": badges,
        })

    # Sort by completed lessons desc, then streaks
    leaderboard.sort(key=lambda x: (x["completed_lessons"], x["current_streak"]), reverse=True)
    return leaderboard[:limit]
