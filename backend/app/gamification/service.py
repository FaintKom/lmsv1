import uuid
from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.gamification.models import (
    Badge,
    RoomItem,
    UserBadge,
    UserRoomEquip,
    UserRoomPlaced,
    UserStreak,
)
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
    {
        "name": "First Steps",
        "description": "Complete your first lesson",
        "icon": "🎯",
        "criteria_key": "first_lesson",
        "criteria": {"lessons": 1},
    },
    {
        "name": "Dedicated Learner",
        "description": "Complete 10 lessons",
        "icon": "📚",
        "criteria_key": "lessons_10",
        "criteria": {"lessons": 10},
    },
    {
        "name": "Scholar",
        "description": "Complete 50 lessons",
        "icon": "🎓",
        "criteria_key": "lessons_50",
        "criteria": {"lessons": 50},
    },
    {
        "name": "Course Champion",
        "description": "Complete a course",
        "icon": "🏆",
        "criteria_key": "course_complete",
        "criteria": {"courses": 1},
    },
    {
        "name": "Multi-Course Master",
        "description": "Complete 5 courses",
        "icon": "👑",
        "criteria_key": "courses_5",
        "criteria": {"courses": 5},
    },
    {
        "name": "Week Warrior",
        "description": "Maintain a 7-day streak",
        "icon": "🔥",
        "criteria_key": "streak_7",
        "criteria": {"streak": 7},
    },
    {
        "name": "Month Master",
        "description": "Maintain a 30-day streak",
        "icon": "💎",
        "criteria_key": "streak_30",
        "criteria": {"streak": 30},
    },
    {
        "name": "Code Warrior",
        "description": "Pass 10 code challenges",
        "icon": "⚔️",
        "criteria_key": "code_10",
        "criteria": {"code_passed": 10},
    },
    {
        "name": "XP Hunter",
        "description": "Earn 500 XP",
        "icon": "⭐",
        "criteria_key": "xp_500",
        "criteria": {"xp": 500},
    },
    {
        "name": "XP Master",
        "description": "Earn 5000 XP",
        "icon": "🌟",
        "criteria_key": "xp_5000",
        "criteria": {"xp": 5000},
    },
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
        return {
            **league,
            "next_league": next_league["name"],
            "next_xp": next_league["min_xp"],
            "progress": round(progress, 1),
        }
    return {**league, "next_league": None, "next_xp": None, "progress": 100.0}


async def award_xp(db: AsyncSession, user_id: uuid.UUID, amount: int, reason: str = "") -> int:
    """Award XP to a user. Returns new total XP."""
    result = await db.execute(select(UserStreak).where(UserStreak.user_id == user_id))
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
    result = await db.execute(select(func.count(Badge.id)).where(Badge.org_id == org_id))
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

    # Row-lock the streak so two concurrent same-day activities can't both
    # pass the "already counted today" guard and double-increment.
    result = await db.execute(
        select(UserStreak).where(UserStreak.user_id == user_id).with_for_update()
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
    earned_result = await db.execute(select(UserBadge.badge_id).where(UserBadge.user_id == user_id))
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

    streak_result = await db.execute(select(UserStreak).where(UserStreak.user_id == user_id))
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
        elif badge.criteria_key == "lessons_10" and completed_lessons >= criteria.get(
            "lessons", 10
        ):
            earned = True
        elif badge.criteria_key == "lessons_50" and completed_lessons >= criteria.get(
            "lessons", 50
        ):
            earned = True
        elif badge.criteria_key == "course_complete" and completed_courses >= criteria.get(
            "courses", 1
        ):
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


async def get_user_badges(db: AsyncSession, user_id: uuid.UUID, org_id: uuid.UUID) -> list[dict]:
    """Get all badges with earned status for a user."""
    await seed_default_badges(db, org_id)

    result = await db.execute(select(Badge).where(Badge.org_id == org_id))
    badges = result.scalars().all()

    earned_result = await db.execute(select(UserBadge).where(UserBadge.user_id == user_id))
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
    result = await db.execute(select(UserStreak).where(UserStreak.user_id == user_id))
    streak = result.scalar_one_or_none()
    if not streak:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "last_activity_date": None,
            "total_xp": 0,
            "league": get_league(0),
        }
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
        streak_result = await db.execute(select(UserStreak).where(UserStreak.user_id == student.id))
        streak = streak_result.scalar_one_or_none()

        # Badge count
        badge_result = await db.execute(
            select(func.count(UserBadge.id)).where(UserBadge.user_id == student.id)
        )
        badges = badge_result.scalar() or 0

        xp = (streak.total_xp if streak else 0) or 0
        leaderboard.append(
            {
                "user_id": student.id,
                "user_name": student.full_name,
                "completed_lessons": completed,
                "current_streak": streak.current_streak if streak else 0,
                "badge_count": badges,
                "total_xp": xp,
                "league": get_league(xp),
            }
        )

    # Sort by XP desc, then lessons, then streaks
    leaderboard.sort(
        key=lambda x: (x["total_xp"], x["completed_lessons"], x["current_streak"]), reverse=True
    )
    return leaderboard[:limit]


async def get_leagues_info() -> list[dict]:
    """Return league tier information."""
    return LEAGUES


# ─── Room (My Room feature) ─────────────────────────────────────────────

# Slots that can be moved via the Layout d-pad. Every slot the user owns
# is movable now, including tied items (monitor/chair/plushie/trophy) and
# the virtual 'avatar' slot for the character itself.
ROOM_MOVABLE_SLOTS: set[str] = {
    # floor furniture
    "bed",
    "desk",
    "dresser",
    "shelf",
    "rug",
    "plant",
    "lamp",
    "sofa",
    "coffee",
    "arcade",
    # wall-mounted
    "shelfwall",
    "cabinet",
    "pictures",
    "window",
    "clock",
    # previously tied (now independently movable)
    "monitor",
    "chair",
    "plushie",
    "trophy",
    # virtual slot for the avatar
    "avatar",
}

# Axis constraints — every slot can now move freely on x, y, z. Wall
# clipping is allowed (per user request); floor clipping is prevented
# client-side by Math.max(0, pos.y + dy) at render time.
_FULL = {"x", "y", "z"}
ROOM_MOVE_AXES: dict[str, set[str]] = {
    slot: _FULL
    for slot in (
        "bed",
        "desk",
        "dresser",
        "shelf",
        "rug",
        "plant",
        "lamp",
        "sofa",
        "coffee",
        "arcade",
        "shelfwall",
        "cabinet",
        "pictures",
        "window",
        "clock",
        "monitor",
        "chair",
        "plushie",
        "trophy",
        "avatar",
    )
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
    {
        "id": "wall-lavender",
        "slot": "wall",
        "group_name": "Walls",
        "name": "Lavender",
        "price": 0,
        "is_default": True,
        "swatch": "#a48dc8",
        "color_hex": "a48dc8",
        "floor_type": None,
    },
    {
        "id": "wall-mint",
        "slot": "wall",
        "group_name": "Walls",
        "name": "Mint",
        "price": 120,
        "is_default": False,
        "swatch": "#65c8b3",
        "color_hex": "65c8b3",
        "floor_type": None,
    },
    {
        "id": "wall-coral",
        "slot": "wall",
        "group_name": "Walls",
        "name": "Coral",
        "price": 120,
        "is_default": False,
        "swatch": "#f2a48d",
        "color_hex": "f2a48d",
        "floor_type": None,
    },
    {
        "id": "wall-sage",
        "slot": "wall",
        "group_name": "Walls",
        "name": "Sage",
        "price": 120,
        "is_default": False,
        "swatch": "#b4ccaa",
        "color_hex": "b4ccaa",
        "floor_type": None,
    },
    {
        "id": "wall-sky",
        "slot": "wall",
        "group_name": "Walls",
        "name": "Sky",
        "price": 180,
        "is_default": False,
        "swatch": "#a9c8d9",
        "color_hex": "a9c8d9",
        "floor_type": None,
    },
    {
        "id": "wall-sun",
        "slot": "wall",
        "group_name": "Walls",
        "name": "Sun",
        "price": 200,
        "is_default": False,
        "swatch": "#f2d878",
        "color_hex": "f2d878",
        "floor_type": None,
    },
    # floors
    {
        "id": "floor-wood",
        "slot": "floor",
        "group_name": "Floor",
        "name": "Light wood",
        "price": 0,
        "is_default": True,
        "swatch": "#d9a26a",
        "color_hex": None,
        "floor_type": "wood",
    },
    {
        "id": "floor-tile",
        "slot": "floor",
        "group_name": "Floor",
        "name": "Cream tile",
        "price": 150,
        "is_default": False,
        "swatch": "#e8e1ce",
        "color_hex": None,
        "floor_type": "tile",
    },
    {
        "id": "floor-carpet",
        "slot": "floor",
        "group_name": "Floor",
        "name": "Coral rug",
        "price": 250,
        "is_default": False,
        "swatch": "#ffae9a",
        "color_hex": None,
        "floor_type": "carpet",
    },
    {
        "id": "floor-moss",
        "slot": "floor",
        "group_name": "Floor",
        "name": "Moss grass",
        "price": 320,
        "is_default": False,
        "swatch": "#7fb069",
        "color_hex": None,
        "floor_type": "moss",
    },
    # furniture
    {
        "id": "bed-basic",
        "slot": "bed",
        "group_name": "Furniture",
        "name": "Wooden bed",
        "price": 0,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "bed-kids",
        "slot": "bed",
        "group_name": "Furniture",
        "name": "Kids bed",
        "price": 350,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "bed-double",
        "slot": "bed",
        "group_name": "Furniture",
        "name": "Double bed",
        "price": 600,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "desk-wood",
        "slot": "desk",
        "group_name": "Furniture",
        "name": "Wooden desk",
        "price": 220,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "desk-white",
        "slot": "desk",
        "group_name": "Furniture",
        "name": "Studio desk",
        "price": 400,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "dresser-blue",
        "slot": "dresser",
        "group_name": "Furniture",
        "name": "Mint dresser",
        "price": 280,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "dresser-cream",
        "slot": "dresser",
        "group_name": "Furniture",
        "name": "Cream dresser",
        "price": 280,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "shelf-tall",
        "slot": "shelf",
        "group_name": "Furniture",
        "name": "Tall bookshelf",
        "price": 360,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "shelf-wall",
        "slot": "shelfwall",
        "group_name": "Furniture",
        "name": "Wall shelf",
        "price": 180,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "cabinet",
        "slot": "cabinet",
        "group_name": "Furniture",
        "name": "Sun cabinet",
        "price": 240,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "sofa",
        "slot": "sofa",
        "group_name": "Furniture",
        "name": "Cream sofa",
        "price": 480,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "coffee-table",
        "slot": "coffee",
        "group_name": "Furniture",
        "name": "Coffee table",
        "price": 200,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "arcade",
        "slot": "arcade",
        "group_name": "Furniture",
        "name": "Retro arcade",
        "price": 950,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    # decor
    {
        "id": "chair",
        "slot": "chair",
        "group_name": "Decor",
        "name": "Desk chair",
        "price": 120,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "monitor",
        "slot": "monitor",
        "group_name": "Decor",
        "name": "Monitor",
        "price": 280,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "lamp",
        "slot": "lamp",
        "group_name": "Decor",
        "name": "Floor lamp",
        "price": 150,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "plant",
        "slot": "plant",
        "group_name": "Decor",
        "name": "Potted plant",
        "price": 80,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "rug-teal",
        "slot": "rug",
        "group_name": "Decor",
        "name": "Teal rug",
        "price": 140,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "rug-warm",
        "slot": "rug",
        "group_name": "Decor",
        "name": "Warm rug",
        "price": 140,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "rug-mint",
        "slot": "rug",
        "group_name": "Decor",
        "name": "Mint rug",
        "price": 140,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "pictures",
        "slot": "pictures",
        "group_name": "Decor",
        "name": "Picture wall",
        "price": 100,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "window",
        "slot": "window",
        "group_name": "Decor",
        "name": "Window",
        "price": 0,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "plushie",
        "slot": "plushie",
        "group_name": "Decor",
        "name": "Bunny plushie",
        "price": 200,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "trophy",
        "slot": "trophy",
        "group_name": "Decor",
        "name": "Trophy",
        "price": 220,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "clock",
        "slot": "clock",
        "group_name": "Decor",
        "name": "Wall clock",
        "price": 90,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    # Imported voxel furniture (rendered from .vox via VOX_ITEMS on the frontend).
    # Default + free: they make up the owner-curated starter room layout
    # (positions in IMPORTED_DEFAULT_PLACEMENTS).
    {
        "id": "vox-bookshelf",
        "slot": "shelf",
        "group_name": "Furniture",
        "name": "Bookshelf",
        "price": 0,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "vox-drawers",
        "slot": "dresser",
        "group_name": "Furniture",
        "name": "Drawers",
        "price": 0,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "vox-plant",
        "slot": "plant",
        "group_name": "Decor",
        "name": "Leafy plant",
        "price": 0,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "vox-monitor",
        "slot": "monitor",
        "group_name": "Furniture",
        "name": "Monitor",
        "price": 0,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "vox-keyboard",
        "slot": "keyboard",
        "group_name": "Furniture",
        "name": "Keyboard",
        "price": 0,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
]


# Avatar parts — same row shape as room items but seeded with item_type='avatar'
# so the frontend can split the shared catalog into two views.
ROOM_AVATAR_CATALOG: list[dict] = [
    # hair
    {
        "id": "avatar-hair-short",
        "slot": "avatar_hair",
        "group_name": "Hair",
        "name": "Short brown",
        "price": 0,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-hair-bald",
        "slot": "avatar_hair",
        "group_name": "Hair",
        "name": "Bald",
        "price": 50,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-hair-long",
        "slot": "avatar_hair",
        "group_name": "Hair",
        "name": "Long blonde",
        "price": 80,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-hair-curly",
        "slot": "avatar_hair",
        "group_name": "Hair",
        "name": "Curly red",
        "price": 150,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-hair-bun",
        "slot": "avatar_hair",
        "group_name": "Hair",
        "name": "Top bun",
        "price": 150,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-hair-mohawk",
        "slot": "avatar_hair",
        "group_name": "Hair",
        "name": "Mohawk",
        "price": 200,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    # face
    {
        "id": "avatar-face-smile",
        "slot": "avatar_face",
        "group_name": "Face",
        "name": "Smile",
        "price": 0,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-face-wink",
        "slot": "avatar_face",
        "group_name": "Face",
        "name": "Wink",
        "price": 80,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-face-blush",
        "slot": "avatar_face",
        "group_name": "Face",
        "name": "Blush",
        "price": 80,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-face-cool",
        "slot": "avatar_face",
        "group_name": "Face",
        "name": "Sunglasses",
        "price": 100,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-face-determined",
        "slot": "avatar_face",
        "group_name": "Face",
        "name": "Determined",
        "price": 120,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-face-glasses",
        "slot": "avatar_face",
        "group_name": "Face",
        "name": "Round glasses",
        "price": 150,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    # outfit
    {
        "id": "avatar-outfit-tshirt",
        "slot": "avatar_outfit",
        "group_name": "Outfit",
        "name": "Blue t-shirt",
        "price": 0,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-outfit-cozy",
        "slot": "avatar_outfit",
        "group_name": "Outfit",
        "name": "Cozy sweater",
        "price": 180,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-outfit-hoodie",
        "slot": "avatar_outfit",
        "group_name": "Outfit",
        "name": "Green hoodie",
        "price": 150,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-outfit-dress",
        "slot": "avatar_outfit",
        "group_name": "Outfit",
        "name": "Coral dress",
        "price": 200,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-outfit-sport",
        "slot": "avatar_outfit",
        "group_name": "Outfit",
        "name": "Sport kit",
        "price": 250,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-outfit-suit",
        "slot": "avatar_outfit",
        "group_name": "Outfit",
        "name": "Formal suit",
        "price": 400,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    # accessory (no default — slot starts empty)
    {
        "id": "avatar-acc-book",
        "slot": "avatar_accessory",
        "group_name": "Accessory",
        "name": "Book",
        "price": 80,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-acc-backpack",
        "slot": "avatar_accessory",
        "group_name": "Accessory",
        "name": "Backpack",
        "price": 100,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-acc-headphones",
        "slot": "avatar_accessory",
        "group_name": "Accessory",
        "name": "Headphones",
        "price": 180,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-acc-cape",
        "slot": "avatar_accessory",
        "group_name": "Accessory",
        "name": "Hero cape",
        "price": 350,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-acc-pet",
        "slot": "avatar_accessory",
        "group_name": "Accessory",
        "name": "Mini pet",
        "price": 500,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    # body (boy + girl base shapes)
    {
        "id": "avatar-body-boy",
        "slot": "avatar_body",
        "group_name": "Body",
        "name": "Boy",
        "price": 0,
        "is_default": True,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-body-girl",
        "slot": "avatar_body",
        "group_name": "Body",
        "name": "Girl",
        "price": 0,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    # hat
    {
        "id": "avatar-hat-cap",
        "slot": "avatar_hat",
        "group_name": "Hat",
        "name": "Baseball cap",
        "price": 80,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-hat-beanie",
        "slot": "avatar_hat",
        "group_name": "Hat",
        "name": "Beanie",
        "price": 60,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-hat-wizard",
        "slot": "avatar_hat",
        "group_name": "Hat",
        "name": "Wizard hat",
        "price": 250,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-hat-crown",
        "slot": "avatar_hat",
        "group_name": "Hat",
        "name": "Party crown",
        "price": 180,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-hat-chef",
        "slot": "avatar_hat",
        "group_name": "Hat",
        "name": "Chef hat",
        "price": 150,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-hat-graduate",
        "slot": "avatar_hat",
        "group_name": "Hat",
        "name": "Graduate cap",
        "price": 220,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    # glasses
    {
        "id": "avatar-glasses-round",
        "slot": "avatar_glasses",
        "group_name": "Glasses",
        "name": "Round glasses",
        "price": 120,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-glasses-shades",
        "slot": "avatar_glasses",
        "group_name": "Glasses",
        "name": "Sunglasses",
        "price": 100,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-glasses-monocle",
        "slot": "avatar_glasses",
        "group_name": "Glasses",
        "name": "Monocle",
        "price": 180,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-glasses-ski",
        "slot": "avatar_glasses",
        "group_name": "Glasses",
        "name": "Ski goggles",
        "price": 160,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-glasses-3d",
        "slot": "avatar_glasses",
        "group_name": "Glasses",
        "name": "3D glasses",
        "price": 90,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    # back
    {
        "id": "avatar-back-backpack",
        "slot": "avatar_back",
        "group_name": "Back",
        "name": "Backpack",
        "price": 120,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-back-cape",
        "slot": "avatar_back",
        "group_name": "Back",
        "name": "Hero cape",
        "price": 350,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-back-wings",
        "slot": "avatar_back",
        "group_name": "Back",
        "name": "Angel wings",
        "price": 500,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-back-quiver",
        "slot": "avatar_back",
        "group_name": "Back",
        "name": "Arrow quiver",
        "price": 200,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-back-jetpack",
        "slot": "avatar_back",
        "group_name": "Back",
        "name": "Jetpack",
        "price": 450,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    # hand
    {
        "id": "avatar-hand-book",
        "slot": "avatar_hand",
        "group_name": "Hand",
        "name": "Book",
        "price": 80,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-hand-pet",
        "slot": "avatar_hand",
        "group_name": "Hand",
        "name": "Mini pet",
        "price": 500,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-hand-flower",
        "slot": "avatar_hand",
        "group_name": "Hand",
        "name": "Flower",
        "price": 60,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-hand-balloon",
        "slot": "avatar_hand",
        "group_name": "Hand",
        "name": "Balloon",
        "price": 90,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
    {
        "id": "avatar-hand-controller",
        "slot": "avatar_hand",
        "group_name": "Hand",
        "name": "Controller",
        "price": 150,
        "is_default": False,
        "swatch": None,
        "color_hex": None,
        "floor_type": None,
    },
]

# Slots that belong to the My Avatar feature.
ROOM_AVATAR_SLOTS: set[str] = {
    "avatar_body",
    "avatar_hair",
    "avatar_face",
    "avatar_outfit",
    "avatar_hat",
    "avatar_glasses",
    "avatar_back",
    "avatar_hand",
    # legacy single-slot accessory -- kept for backwards compat
    "avatar_accessory",
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
    existing = await db.execute(select(UserRoomEquip.slot).where(UserRoomEquip.user_id == user_id))
    have_slots = set(existing.scalars().all())

    defaults = await db.execute(select(RoomItem).where(RoomItem.is_default.is_(True)))
    for item in defaults.scalars().all():
        if item.slot in have_slots:
            continue
        # Furniture/decor defaults are seeded as freeform placed instances
        # (_seed_default_placed). Only room settings (wall/floor) + avatar parts
        # stay slot-based equips.
        if item.slot not in ROOM_SETTING_SLOTS and item.slot not in ROOM_AVATAR_SLOTS:
            continue
        db.add(UserRoomEquip(user_id=user_id, slot=item.slot, item_id=item.id))
    await db.flush()


async def get_room_state(db: AsyncSession, user_id: uuid.UUID) -> dict:
    """Return wallet + equipped map + full catalog for the student."""
    await seed_room_catalog(db)
    # Detect a brand-new room BEFORE seeding so we only auto-furnish on the very
    # first visit — a user who later empties their room is not re-furnished.
    first_visit = not await _user_has_room_rows(db, user_id)
    await _ensure_defaults_equipped(db, user_id)
    if first_visit:
        await _seed_default_placed(db, user_id)
    else:
        # Existing users: migrate any old slot-based furniture to placed once.
        await _migrate_slot_furniture_to_placed(db, user_id)

    wallet = await _get_total_xp(db, user_id)

    equips_result = await db.execute(select(UserRoomEquip).where(UserRoomEquip.user_id == user_id))
    equipped = {
        e.slot: {
            "item_id": e.item_id,
            "offset_dx": e.offset_dx,
            "offset_dy": e.offset_dy,
            "offset_dz": e.offset_dz,
            "offset_rot": e.offset_rot,
        }
        for e in equips_result.scalars().all()
    }

    catalog_result = await db.execute(select(RoomItem).order_by(RoomItem.price, RoomItem.id))
    catalog = catalog_result.scalars().all()

    placed_result = await db.execute(
        select(UserRoomPlaced)
        .where(UserRoomPlaced.user_id == user_id)
        .order_by(UserRoomPlaced.created_at)
    )
    placed = placed_result.scalars().all()

    return {"wallet": wallet, "equipped": equipped, "catalog": catalog, "placed": placed}


# ── Freeform placed items (room furniture/decor) ────────────────────────────

# Room shell settings stay slot-based in user_room_equips; everything else that
# is item_type='room' is freely placeable.
ROOM_SETTING_SLOTS: set[str] = {"wall", "floor"}

# Base placement per furniture slot (voxel grid, ×0.4 world at render), mirrors
# the frontend SLOT_PLACEMENT. Used to seed a sensible default room layout as
# freeform placed instances. (x, y, z, rot_degrees).
DEFAULT_PLACEMENTS: dict[str, tuple[float, float, float, float]] = {
    "bed": (8.5, 0, 1, 0),
    "desk": (1, 0, 0, 0),
    "monitor": (2, 3.2, 0.4, 0),
    "chair": (2.4, 0, 4, 180),
    "dresser": (0, 0, 11.5, 90),
    "shelf": (0, 0, 13, 90),
    "shelfwall": (0.05, 7.5, 6, 90),
    "cabinet": (0.05, 6, 4, 90),
    "pictures": (1.6, 7.5, 0.1, 0),
    "window": (8.5, 5.2, 0.4, 0),
    "clock": (0.1, 8, 3, 90),
    "rug": (4.5, 0, 5.5, 0),
    "plant": (11.5, 0, 9.5, 0),
    "lamp": (12, 0, 11.5, 0),
    "plushie": (11.5, 3.6, 1, -30),
    "trophy": (0.6, 4.25, 10, 0),
    "sofa": (5.5, 0, 10, 0),
    "coffee": (7, 0, 7, 0),
    "arcade": (11, 0, 3.6, -22.5),
}

# Owner-tuned positions for the imported .vox furniture (from /student-cabinet,
# world units ÷0.4 → voxel grid). Keyed by item id so they override the generic
# slot placement above.
IMPORTED_DEFAULT_PLACEMENTS: dict[str, tuple[float, float, float, float]] = {
    "vox-bookshelf": (1.25, 0, 11.75, 0),
    "vox-drawers": (1.25, 0, 8.0, 0),
    "vox-plant": (12.25, 0, 11.25, 0),
    # Monitor + keyboard sit ON the default desk-wood (placed at (1,0,0), top
    # at y≈3.2 vox, footprint x[1..6] z[0..3]).
    "vox-monitor": (4.0, 3.2, 2.3, 0),
    "vox-keyboard": (4.0, 3.2, 1.0, 0),
}


async def _user_has_room_rows(db: AsyncSession, user_id: uuid.UUID) -> bool:
    """True if the user has any equip or placed row (i.e. their room exists)."""
    eq = await db.execute(
        select(UserRoomEquip.slot).where(UserRoomEquip.user_id == user_id).limit(1)
    )
    if eq.first() is not None:
        return True
    pl = await db.execute(
        select(UserRoomPlaced.id).where(UserRoomPlaced.user_id == user_id).limit(1)
    )
    return pl.first() is not None


async def _seed_default_placed(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Furnish a brand-new room: every is_default room furniture/decor item is
    placed at its base layout position as a freeform instance. Wall/floor stay
    equips (settings); avatar parts stay equips (slots)."""
    defaults = await db.execute(
        select(RoomItem).where(RoomItem.is_default.is_(True), RoomItem.item_type == "room")
    )
    for item in defaults.scalars().all():
        if item.slot in ROOM_SETTING_SLOTS:
            continue
        base = IMPORTED_DEFAULT_PLACEMENTS.get(item.id) or DEFAULT_PLACEMENTS.get(item.slot)
        if base is None:
            continue
        x, y, z, rot = base
        db.add(UserRoomPlaced(user_id=user_id, item_id=item.id, x=x, y=y, z=z, rot=rot, scale=1.0))
    await db.flush()


async def _migrate_slot_furniture_to_placed(db: AsyncSession, user_id: uuid.UUID) -> None:
    """One-time, self-healing: convert an existing user's slot-based furniture
    equips into freeform placed instances (base placement + their saved offset),
    then drop those equip rows. Wall/floor/avatar equips stay. No-op once done.
    """
    rows = await db.execute(
        select(UserRoomEquip).where(
            UserRoomEquip.user_id == user_id, UserRoomEquip.item_id.is_not(None)
        )
    )
    to_drop = []
    for e in rows.scalars().all():
        if e.slot in ROOM_SETTING_SLOTS or e.slot in ROOM_AVATAR_SLOTS or e.slot == "avatar":
            continue
        base = DEFAULT_PLACEMENTS.get(e.slot)
        if base is None:
            continue
        bx, by, bz, brot = base
        db.add(
            UserRoomPlaced(
                user_id=user_id,
                item_id=e.item_id,
                x=bx + (e.offset_dx or 0),
                y=by + (e.offset_dy or 0),
                z=bz + (e.offset_dz or 0),
                rot=(brot + (e.offset_rot or 0)) % 360,
                scale=1.0,
            )
        )
        to_drop.append(e)
    for e in to_drop:
        await db.delete(e)
    if to_drop:
        await db.flush()


def _clampf(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(v)))


async def add_placed_item(
    db: AsyncSession,
    user_id: uuid.UUID,
    item_id: str,
    x: float,
    y: float,
    z: float,
    rot: float,
    scale: float,
) -> UserRoomPlaced:
    """Place a new furniture/decor instance. Validates the item exists, is a
    placeable room item (not avatar / wall / floor) and is affordable.
    """
    item_result = await db.execute(select(RoomItem).where(RoomItem.id == item_id))
    item = item_result.scalar_one_or_none()
    if item is None:
        raise RoomEquipError("item_not_found", f"Unknown item '{item_id}'")
    if item.item_type != "room" or item.slot in ROOM_SETTING_SLOTS:
        raise RoomEquipError("not_placeable", f"Item '{item_id}' cannot be placed freely")

    xp = await _get_total_xp(db, user_id)
    if xp < item.price:
        raise RoomEquipError("locked", f"Need {item.price} XP to use '{item_id}' (have {xp})")

    # One copy per item: if it's already placed, return that instance (the
    # caller selects it) instead of creating a duplicate.
    existing = await db.execute(
        select(UserRoomPlaced).where(
            UserRoomPlaced.user_id == user_id, UserRoomPlaced.item_id == item_id
        )
    )
    already = existing.scalar_one_or_none()
    if already is not None:
        return already

    placed = UserRoomPlaced(
        user_id=user_id,
        item_id=item_id,
        x=_clampf(x, -2, 16),
        y=_clampf(y, 0, 16),
        z=_clampf(z, -2, 16),
        rot=float(rot) % 360,
        scale=_clampf(scale, 0.05, 5),
    )
    db.add(placed)
    await db.flush()
    return placed


async def update_placed_item(
    db: AsyncSession,
    user_id: uuid.UUID,
    placed_id: uuid.UUID,
    x: float,
    y: float,
    z: float,
    rot: float,
    scale: float,
) -> UserRoomPlaced:
    """Move / rotate / scale an existing instance the user owns."""
    result = await db.execute(
        select(UserRoomPlaced).where(
            UserRoomPlaced.id == placed_id, UserRoomPlaced.user_id == user_id
        )
    )
    placed = result.scalar_one_or_none()
    if placed is None:
        raise RoomEquipError("item_not_found", "Placed item not found")
    placed.x = _clampf(x, -2, 16)
    placed.y = _clampf(y, 0, 16)
    placed.z = _clampf(z, -2, 16)
    placed.rot = float(rot) % 360
    placed.scale = _clampf(scale, 0.05, 5)
    await db.flush()
    return placed


async def delete_placed_item(db: AsyncSession, user_id: uuid.UUID, placed_id: uuid.UUID) -> None:
    """Remove an instance the user owns (no-op if it isn't theirs)."""
    result = await db.execute(
        select(UserRoomPlaced).where(
            UserRoomPlaced.id == placed_id, UserRoomPlaced.user_id == user_id
        )
    )
    placed = result.scalar_one_or_none()
    if placed is not None:
        await db.delete(placed)
        await db.flush()


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
        raise RoomEquipError("locked", f"Need {item.price} XP to equip '{item_id}' (have {xp})")

    return await _upsert_equip(db, user_id, slot, item_id)


async def set_room_layout(
    db: AsyncSession,
    user_id: uuid.UUID,
    slot: str,
    dx: int,
    dz: int,
    rot: int = 0,
    dy: int = 0,
) -> UserRoomEquip:
    """Set the layout offset + rotation for a slot. Slot must be movable;
    dx/dz clamped to [-12, 12]; dy clamped to [-24, 24]; rot mod 360."""
    if slot not in ROOM_MOVABLE_SLOTS:
        raise RoomEquipError("slot_not_movable", f"Slot '{slot}' cannot be moved")

    axes = ROOM_MOVE_AXES.get(slot, set())
    safe_dx = max(-12, min(12, dx)) if "x" in axes else 0
    safe_dz = max(-12, min(12, dz)) if "z" in axes else 0
    safe_dy = max(-24, min(24, dy)) if "y" in axes else 0
    safe_rot = int(rot) % 360

    existing = await db.execute(
        select(UserRoomEquip).where(UserRoomEquip.user_id == user_id, UserRoomEquip.slot == slot)
    )
    equip = existing.scalar_one_or_none()
    if equip is None:
        equip = UserRoomEquip(
            user_id=user_id,
            slot=slot,
            item_id=None,
            offset_dx=safe_dx,
            offset_dy=safe_dy,
            offset_dz=safe_dz,
            offset_rot=safe_rot,
        )
        db.add(equip)
    else:
        equip.offset_dx = safe_dx
        equip.offset_dy = safe_dy
        equip.offset_dz = safe_dz
        equip.offset_rot = safe_rot
    await db.flush()
    return equip


async def _upsert_equip(
    db: AsyncSession, user_id: uuid.UUID, slot: str, item_id: str | None
) -> UserRoomEquip:
    """Insert-or-update the (user_id, slot) row, preserving any existing offset."""
    existing = await db.execute(
        select(UserRoomEquip).where(UserRoomEquip.user_id == user_id, UserRoomEquip.slot == slot)
    )
    equip = existing.scalar_one_or_none()
    if equip is None:
        equip = UserRoomEquip(user_id=user_id, slot=slot, item_id=item_id)
        db.add(equip)
    else:
        equip.item_id = item_id
    await db.flush()
    return equip
