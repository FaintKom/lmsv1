import uuid
from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.gamification.models import Badge, RoomItem, UserBadge, UserRoomEquip, UserStreak
from app.progress.models import LessonProgress, LessonStatus

# XP rewards
XP_LESSON_COMPLETE = 10
XP_QUIZ_PASSED = 25
XP_CODE_CHALLENGE_PASSED = 50
XP_DAILY_STREAK_BONUS = 5

# League thresholds
LEAGUES = [
    {"name": "Bronze", "icon": "🥉", "min_xp": 0, "color": "#CD7F32"},
    {"name": "Silver", "icon": "🥈", "min_xp": 100, "color": "#C0C0C0"},
    {"name": "Gold", "icon": "🥇", "min_xp": 500, "color": "#FFD700"},
    {"name": "Platinum", "icon": "💎", "min_xp": 1500, "color": "#E5E4E2"},
    {"name": "Diamond", "icon": "👑", "min_xp": 5000, "color": "#B9F2FF"},
]

DEFAULT_BADGES = [
    {"name": "First Steps", "description": "Complete your first lesson", "icon": "🎯", "criteria_key": "first_lesson", "criteria": {"lessons": 1}},
    {"name": "Dedicated Learner", "description": "Complete 10 lessons", "icon": "📚", "criteria_key": "lessons_10", "criteria": {"lessons": 10}},
    {"name": "Scholar", "description": "Complete 50 lessons", "icon": "🎓", "criteria_key": "lessons_50", "criteria": {"lessons": 50}},
    {"name": "Course Champion", "description": "Complete a course", "icon": "🏆", "criteria_key": "course_complete", "criteria": {"courses": 1}},
    {"name": "Multi-Course Master", "description": "Complete 5 courses", "icon": "👑", "criteria_key": "courses_5", "criteria": {"courses": 5}},
    {"name": "Week Warrior", "description": "Maintain a 7-day streak", "icon": "🔥", "criteria_key": "streak_7", "criteria": {"streak": 7}},
    {"name": "Month Master", "description": "Maintain a 30-day streak", "icon": "💎", "criteria_key": "streak_30", "criteria": {"streak": 30}},
    {"name": "Code Warrior", "description": "Pass 10 code challenges", "icon": "⚔️", "criteria_key": "code_10", "criteria": {"code_passed": 10}},
    {"name": "XP Hunter", "description": "Earn 500 XP", "icon": "⭐", "criteria_key": "xp_500", "criteria": {"xp": 500}},
    {"name": "XP Master", "description": "Earn 5000 XP", "icon": "🌟", "criteria_key": "xp_5000", "criteria": {"xp": 5000}},
]


def get_league(xp: int) -> dict:
    """Get league info for given XP amount."""
    league = LEAGUES[0]
    for l in LEAGUES:
        if xp >= l["min_xp"]:
            league = l
    # Calculate progress to next league
    current_idx = LEAGUES.index(league)
    if current_idx < len(LEAGUES) - 1:
        next_league = LEAGUES[current_idx + 1]
        progress = (xp - league["min_xp"]) / (next_league["min_xp"] - league["min_xp"]) * 100
        return {**league, "next_league": next_league["name"], "next_xp": next_league["min_xp"], "progress": round(progress, 1)}
    return {**league, "next_league": None, "next_xp": None, "progress": 100.0}


async def award_xp(db: AsyncSession, user_id: uuid.UUID, amount: int, reason: str = "") -> int:
    """Award XP to a user. Returns new total XP."""
    result = await db.execute(
        select(UserStreak).where(UserStreak.user_id == user_id)
    )
    streak = result.scalar_one_or_none()

    if not streak:
        streak = UserStreak(user_id=user_id, total_xp=amount)
        db.add(streak)
    else:
        streak.total_xp = (streak.total_xp or 0) + amount

    await db.flush()
    return streak.total_xp


async def seed_default_badges(db: AsyncSession, org_id: uuid.UUID) -> None:
    """Create default badges for an organization if they don't exist."""
    result = await db.execute(
        select(func.count(Badge.id)).where(Badge.org_id == org_id)
    )
    count = result.scalar()
    if count >= len(DEFAULT_BADGES):
        return

    # Get existing criteria keys
    existing = await db.execute(select(Badge.criteria_key).where(Badge.org_id == org_id))
    existing_keys = set(existing.scalars().all())

    for b in DEFAULT_BADGES:
        if b["criteria_key"] not in existing_keys:
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
            total_xp=XP_DAILY_STREAK_BONUS,
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

    # Streak bonus XP
    streak.total_xp = (streak.total_xp or 0) + XP_DAILY_STREAK_BONUS

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
    total_xp = (streak.total_xp if streak else 0) or 0

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
        elif badge.criteria_key == "xp_500" and total_xp >= criteria.get("xp", 500):
            earned = True
        elif badge.criteria_key == "xp_5000" and total_xp >= criteria.get("xp", 5000):
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
        return {"current_streak": 0, "longest_streak": 0, "last_activity_date": None, "total_xp": 0, "league": get_league(0)}
    xp = streak.total_xp or 0
    return {
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "last_activity_date": str(streak.last_activity_date) if streak.last_activity_date else None,
        "total_xp": xp,
        "league": get_league(xp),
    }


async def get_leaderboard(db: AsyncSession, org_id: uuid.UUID, limit: int = 20) -> list[dict]:
    """Get leaderboard for an organization, sorted by XP."""
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

        # Streak + XP
        streak_result = await db.execute(
            select(UserStreak).where(UserStreak.user_id == student.id)
        )
        streak = streak_result.scalar_one_or_none()

        # Badge count
        badge_result = await db.execute(
            select(func.count(UserBadge.id)).where(UserBadge.user_id == student.id)
        )
        badges = badge_result.scalar() or 0

        xp = (streak.total_xp if streak else 0) or 0
        leaderboard.append({
            "user_id": student.id,
            "user_name": student.full_name,
            "completed_lessons": completed,
            "current_streak": streak.current_streak if streak else 0,
            "badge_count": badges,
            "total_xp": xp,
            "league": get_league(xp),
        })

    # Sort by XP desc, then lessons, then streaks
    leaderboard.sort(key=lambda x: (x["total_xp"], x["completed_lessons"], x["current_streak"]), reverse=True)
    return leaderboard[:limit]


async def get_leagues_info() -> list[dict]:
    """Return league tier information."""
    return LEAGUES


# ─── Room (My Room feature) ─────────────────────────────────────────────

# Slots whose item placement can be moved via the Layout d-pad.
ROOM_MOVABLE_SLOTS: set[str] = {
    # floor furniture
    "bed", "desk", "dresser", "shelf", "rug", "plant",
    "lamp", "sofa", "coffee", "arcade",
    # left-wall mounted
    "shelfwall", "cabinet",
    # back-wall mounted
    "pictures", "window", "clock",
}

# Axis constraints per movable slot — wall-mounted items lose the axis
# that would lift them off the wall.
ROOM_MOVE_AXES: dict[str, set[str]] = {
    # floor furniture (free in x + z)
    "bed": {"x", "z"},
    "desk": {"x", "z"},
    "dresser": {"x", "z"},
    "shelf": {"x", "z"},
    "rug": {"x", "z"},
    "plant": {"x", "z"},
    "lamp": {"x", "z"},
    "sofa": {"x", "z"},
    "coffee": {"x", "z"},
    "arcade": {"x", "z"},
    # left-wall mounted (slide along z, x locked to wall)
    "shelfwall": {"z"},
    "cabinet": {"z"},
    # back-wall mounted (slide along x, z locked to wall)
    "pictures": {"x"},
    "window": {"x"},
    "clock": {"x"},
}

# Ties: when a parent slot's item moves, the child slot's offset is overridden
# to match (frontend handles compositing — backend just stores raw offsets).
# Listed here for completeness; not enforced server-side.
ROOM_TIES: dict[str, list[str]] = {
    "bed": ["plushie"],
    "desk": ["monitor", "chair"],
    "dresser": ["trophy"],
}


# Catalog seed data — kept in lockstep with the alembic migration so a fresh
# DB started via Base.metadata.create_all (the _run_setup fallback path) also
# gets the catalog populated.
ROOM_DEFAULT_CATALOG: list[dict] = [
    # walls
    {"id": "wall-lavender", "slot": "wall", "group_name": "Walls", "name": "Lavender", "price": 0, "is_default": True, "swatch": "#a48dc8", "color_hex": "a48dc8", "floor_type": None},
    {"id": "wall-mint", "slot": "wall", "group_name": "Walls", "name": "Mint", "price": 120, "is_default": False, "swatch": "#65c8b3", "color_hex": "65c8b3", "floor_type": None},
    {"id": "wall-coral", "slot": "wall", "group_name": "Walls", "name": "Coral", "price": 120, "is_default": False, "swatch": "#f2a48d", "color_hex": "f2a48d", "floor_type": None},
    {"id": "wall-sage", "slot": "wall", "group_name": "Walls", "name": "Sage", "price": 120, "is_default": False, "swatch": "#b4ccaa", "color_hex": "b4ccaa", "floor_type": None},
    {"id": "wall-sky", "slot": "wall", "group_name": "Walls", "name": "Sky", "price": 180, "is_default": False, "swatch": "#a9c8d9", "color_hex": "a9c8d9", "floor_type": None},
    {"id": "wall-sun", "slot": "wall", "group_name": "Walls", "name": "Sun", "price": 200, "is_default": False, "swatch": "#f2d878", "color_hex": "f2d878", "floor_type": None},
    # floors
    {"id": "floor-wood", "slot": "floor", "group_name": "Floor", "name": "Light wood", "price": 0, "is_default": True, "swatch": "#d9a26a", "color_hex": None, "floor_type": "wood"},
    {"id": "floor-tile", "slot": "floor", "group_name": "Floor", "name": "Cream tile", "price": 150, "is_default": False, "swatch": "#e8e1ce", "color_hex": None, "floor_type": "tile"},
    {"id": "floor-carpet", "slot": "floor", "group_name": "Floor", "name": "Coral rug", "price": 250, "is_default": False, "swatch": "#ffae9a", "color_hex": None, "floor_type": "carpet"},
    {"id": "floor-moss", "slot": "floor", "group_name": "Floor", "name": "Moss grass", "price": 320, "is_default": False, "swatch": "#7fb069", "color_hex": None, "floor_type": "moss"},
    # furniture
    {"id": "bed-basic", "slot": "bed", "group_name": "Furniture", "name": "Wooden bed", "price": 0, "is_default": True, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "bed-kids", "slot": "bed", "group_name": "Furniture", "name": "Kids bed", "price": 350, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "bed-double", "slot": "bed", "group_name": "Furniture", "name": "Double bed", "price": 600, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "desk-wood", "slot": "desk", "group_name": "Furniture", "name": "Wooden desk", "price": 220, "is_default": True, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "desk-white", "slot": "desk", "group_name": "Furniture", "name": "Studio desk", "price": 400, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "dresser-blue", "slot": "dresser", "group_name": "Furniture", "name": "Mint dresser", "price": 280, "is_default": True, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "dresser-cream", "slot": "dresser", "group_name": "Furniture", "name": "Cream dresser", "price": 280, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "shelf-tall", "slot": "shelf", "group_name": "Furniture", "name": "Tall bookshelf", "price": 360, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "shelf-wall", "slot": "shelfwall", "group_name": "Furniture", "name": "Wall shelf", "price": 180, "is_default": True, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "cabinet", "slot": "cabinet", "group_name": "Furniture", "name": "Sun cabinet", "price": 240, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "sofa", "slot": "sofa", "group_name": "Furniture", "name": "Cream sofa", "price": 480, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "coffee-table", "slot": "coffee", "group_name": "Furniture", "name": "Coffee table", "price": 200, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "arcade", "slot": "arcade", "group_name": "Furniture", "name": "Retro arcade", "price": 950, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    # decor
    {"id": "chair", "slot": "chair", "group_name": "Decor", "name": "Desk chair", "price": 120, "is_default": True, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "monitor", "slot": "monitor", "group_name": "Decor", "name": "Monitor", "price": 280, "is_default": True, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "lamp", "slot": "lamp", "group_name": "Decor", "name": "Floor lamp", "price": 150, "is_default": True, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "plant", "slot": "plant", "group_name": "Decor", "name": "Potted plant", "price": 80, "is_default": True, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "rug-teal", "slot": "rug", "group_name": "Decor", "name": "Teal rug", "price": 140, "is_default": True, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "rug-warm", "slot": "rug", "group_name": "Decor", "name": "Warm rug", "price": 140, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "rug-mint", "slot": "rug", "group_name": "Decor", "name": "Mint rug", "price": 140, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "pictures", "slot": "pictures", "group_name": "Decor", "name": "Picture wall", "price": 100, "is_default": True, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "window", "slot": "window", "group_name": "Decor", "name": "Window", "price": 0, "is_default": True, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "plushie", "slot": "plushie", "group_name": "Decor", "name": "Bunny plushie", "price": 200, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "trophy", "slot": "trophy", "group_name": "Decor", "name": "Trophy", "price": 220, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "clock", "slot": "clock", "group_name": "Decor", "name": "Wall clock", "price": 90, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
]


# Avatar parts — same row shape as room items but seeded with item_type='avatar'
# so the frontend can split the shared catalog into two views.
ROOM_AVATAR_CATALOG: list[dict] = [
    # hair
    {"id": "avatar-hair-short", "slot": "avatar_hair", "group_name": "Hair", "name": "Short brown", "price": 0, "is_default": True, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-hair-bald", "slot": "avatar_hair", "group_name": "Hair", "name": "Bald", "price": 50, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-hair-long", "slot": "avatar_hair", "group_name": "Hair", "name": "Long blonde", "price": 80, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-hair-curly", "slot": "avatar_hair", "group_name": "Hair", "name": "Curly red", "price": 150, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-hair-bun", "slot": "avatar_hair", "group_name": "Hair", "name": "Top bun", "price": 150, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-hair-mohawk", "slot": "avatar_hair", "group_name": "Hair", "name": "Mohawk", "price": 200, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    # face
    {"id": "avatar-face-smile", "slot": "avatar_face", "group_name": "Face", "name": "Smile", "price": 0, "is_default": True, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-face-wink", "slot": "avatar_face", "group_name": "Face", "name": "Wink", "price": 80, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-face-blush", "slot": "avatar_face", "group_name": "Face", "name": "Blush", "price": 80, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-face-cool", "slot": "avatar_face", "group_name": "Face", "name": "Sunglasses", "price": 100, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-face-determined", "slot": "avatar_face", "group_name": "Face", "name": "Determined", "price": 120, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-face-glasses", "slot": "avatar_face", "group_name": "Face", "name": "Round glasses", "price": 150, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    # outfit
    {"id": "avatar-outfit-tshirt", "slot": "avatar_outfit", "group_name": "Outfit", "name": "Blue t-shirt", "price": 0, "is_default": True, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-outfit-cozy", "slot": "avatar_outfit", "group_name": "Outfit", "name": "Cozy sweater", "price": 180, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-outfit-hoodie", "slot": "avatar_outfit", "group_name": "Outfit", "name": "Green hoodie", "price": 150, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-outfit-dress", "slot": "avatar_outfit", "group_name": "Outfit", "name": "Coral dress", "price": 200, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-outfit-sport", "slot": "avatar_outfit", "group_name": "Outfit", "name": "Sport kit", "price": 250, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-outfit-suit", "slot": "avatar_outfit", "group_name": "Outfit", "name": "Formal suit", "price": 400, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    # accessory (no default — slot starts empty)
    {"id": "avatar-acc-book", "slot": "avatar_accessory", "group_name": "Accessory", "name": "Book", "price": 80, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-acc-backpack", "slot": "avatar_accessory", "group_name": "Accessory", "name": "Backpack", "price": 100, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-acc-headphones", "slot": "avatar_accessory", "group_name": "Accessory", "name": "Headphones", "price": 180, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-acc-cape", "slot": "avatar_accessory", "group_name": "Accessory", "name": "Hero cape", "price": 350, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
    {"id": "avatar-acc-pet", "slot": "avatar_accessory", "group_name": "Accessory", "name": "Mini pet", "price": 500, "is_default": False, "swatch": None, "color_hex": None, "floor_type": None},
]

# Slots that belong to the My Avatar feature.
ROOM_AVATAR_SLOTS: set[str] = {
    "avatar_hair", "avatar_face", "avatar_outfit", "avatar_accessory",
}


async def seed_room_catalog(db: AsyncSession) -> None:
    """Idempotent catalog seed. Inserts any missing rows; never touches existing
    ones (so owners can hand-tune prices via SQL without losing edits on restart).
    """
    existing = await db.execute(select(RoomItem.id))
    have = set(existing.scalars().all())
    total = len(ROOM_DEFAULT_CATALOG) + len(ROOM_AVATAR_CATALOG)
    if len(have) >= total:
        return
    for row in ROOM_DEFAULT_CATALOG:
        if row["id"] in have:
            continue
        db.add(RoomItem(i18n_key=f"room.item.{row['id']}", item_type="room", **row))
    for row in ROOM_AVATAR_CATALOG:
        if row["id"] in have:
            continue
        db.add(RoomItem(i18n_key=f"room.item.{row['id']}", item_type="avatar", **row))
    await db.flush()


async def _get_total_xp(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(select(UserStreak.total_xp).where(UserStreak.user_id == user_id))
    xp = result.scalar()
    return int(xp or 0)


async def _ensure_defaults_equipped(db: AsyncSession, user_id: uuid.UUID) -> None:
    """First time a user opens /my-room, populate their equips with every
    is_default item. Idempotent — skips slots the user already has rows for.
    """
    existing = await db.execute(
        select(UserRoomEquip.slot).where(UserRoomEquip.user_id == user_id)
    )
    have_slots = set(existing.scalars().all())

    defaults = await db.execute(select(RoomItem).where(RoomItem.is_default.is_(True)))
    for item in defaults.scalars().all():
        if item.slot in have_slots:
            continue
        db.add(UserRoomEquip(user_id=user_id, slot=item.slot, item_id=item.id))
    await db.flush()


async def get_room_state(db: AsyncSession, user_id: uuid.UUID) -> dict:
    """Return wallet + equipped map + full catalog for the student."""
    await seed_room_catalog(db)
    await _ensure_defaults_equipped(db, user_id)

    wallet = await _get_total_xp(db, user_id)

    equips_result = await db.execute(
        select(UserRoomEquip).where(UserRoomEquip.user_id == user_id)
    )
    equipped = {
        e.slot: {"item_id": e.item_id, "offset_dx": e.offset_dx, "offset_dz": e.offset_dz}
        for e in equips_result.scalars().all()
    }

    catalog_result = await db.execute(select(RoomItem).order_by(RoomItem.price, RoomItem.id))
    catalog = catalog_result.scalars().all()

    return {"wallet": wallet, "equipped": equipped, "catalog": catalog}


class RoomEquipError(Exception):
    """Raised when an equip request fails validation (locked, slot mismatch)."""

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


async def equip_room_item(
    db: AsyncSession, user_id: uuid.UUID, slot: str, item_id: str | None
) -> UserRoomEquip:
    """Equip an item in a slot, or pass item_id=None to toggle the slot off.

    Validates:
      - item exists and matches slot,
      - user's total_xp >= item.price (else 'locked').
    """
    if item_id is None:
        # Toggling off — always allowed.
        equip = await _upsert_equip(db, user_id, slot, None)
        return equip

    item_result = await db.execute(select(RoomItem).where(RoomItem.id == item_id))
    item = item_result.scalar_one_or_none()
    if item is None:
        raise RoomEquipError("item_not_found", f"Unknown item '{item_id}'")
    if item.slot != slot:
        raise RoomEquipError(
            "slot_mismatch",
            f"Item '{item_id}' belongs to slot '{item.slot}', not '{slot}'",
        )

    xp = await _get_total_xp(db, user_id)
    if xp < item.price:
        raise RoomEquipError(
            "locked", f"Need {item.price} XP to equip '{item_id}' (have {xp})"
        )

    return await _upsert_equip(db, user_id, slot, item_id)


async def set_room_layout(
    db: AsyncSession, user_id: uuid.UUID, slot: str, dx: int, dz: int
) -> UserRoomEquip:
    """Set the layout offset for a slot. Slot must be movable; dx/dz clamped."""
    if slot not in ROOM_MOVABLE_SLOTS:
        raise RoomEquipError("slot_not_movable", f"Slot '{slot}' cannot be moved")

    axes = ROOM_MOVE_AXES.get(slot, set())
    safe_dx = max(-12, min(12, dx)) if "x" in axes else 0
    safe_dz = max(-12, min(12, dz)) if "z" in axes else 0

    existing = await db.execute(
        select(UserRoomEquip).where(
            UserRoomEquip.user_id == user_id, UserRoomEquip.slot == slot
        )
    )
    equip = existing.scalar_one_or_none()
    if equip is None:
        equip = UserRoomEquip(
            user_id=user_id, slot=slot, item_id=None, offset_dx=safe_dx, offset_dz=safe_dz
        )
        db.add(equip)
    else:
        equip.offset_dx = safe_dx
        equip.offset_dz = safe_dz
    await db.flush()
    return equip


async def _upsert_equip(
    db: AsyncSession, user_id: uuid.UUID, slot: str, item_id: str | None
) -> UserRoomEquip:
    """Insert-or-update the (user_id, slot) row, preserving any existing offset."""
    existing = await db.execute(
        select(UserRoomEquip).where(
            UserRoomEquip.user_id == user_id, UserRoomEquip.slot == slot
        )
    )
    equip = existing.scalar_one_or_none()
    if equip is None:
        equip = UserRoomEquip(user_id=user_id, slot=slot, item_id=item_id)
        db.add(equip)
    else:
        equip.item_id = item_id
    await db.flush()
    return equip
