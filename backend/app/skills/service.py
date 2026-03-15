import uuid
import math

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.skills.models import Skill, LessonSkill, UserSkill


def xp_to_level(xp: int) -> int:
    """Convert XP to level (100 XP per level, scaling slightly)."""
    if xp <= 0:
        return 1
    return min(int(math.sqrt(xp / 50)) + 1, 100)


async def create_skill(db: AsyncSession, data: dict, user: User) -> Skill:
    skill = Skill(org_id=user.org_id, **data)
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return skill


async def list_skills(db: AsyncSession, org_id: uuid.UUID) -> list[Skill]:
    result = await db.execute(
        select(Skill).where(Skill.org_id == org_id).order_by(Skill.category, Skill.name)
    )
    return list(result.scalars().all())


async def delete_skill(db: AsyncSession, skill_id: uuid.UUID, org_id: uuid.UUID) -> None:
    result = await db.execute(
        select(Skill).where(Skill.id == skill_id, Skill.org_id == org_id)
    )
    skill = result.scalar_one_or_none()
    if not skill:
        raise ValueError("Skill not found")
    await db.delete(skill)
    await db.commit()


async def link_skill_to_lesson(
    db: AsyncSession,
    lesson_id: uuid.UUID,
    skill_id: uuid.UUID,
    xp_amount: int = 10,
) -> LessonSkill:
    link = LessonSkill(lesson_id=lesson_id, skill_id=skill_id, xp_amount=xp_amount)
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


async def unlink_skill_from_lesson(
    db: AsyncSession,
    lesson_id: uuid.UUID,
    skill_id: uuid.UUID,
) -> None:
    await db.execute(
        delete(LessonSkill).where(
            LessonSkill.lesson_id == lesson_id,
            LessonSkill.skill_id == skill_id,
        )
    )
    await db.commit()


async def get_lesson_skills(db: AsyncSession, lesson_id: uuid.UUID) -> list[dict]:
    result = await db.execute(
        select(LessonSkill, Skill.name, Skill.icon, Skill.category)
        .join(Skill, LessonSkill.skill_id == Skill.id)
        .where(LessonSkill.lesson_id == lesson_id)
    )
    return [
        {
            "skill_id": str(ls.skill_id),
            "skill_name": name,
            "skill_icon": icon,
            "category": cat,
            "xp_amount": ls.xp_amount,
        }
        for ls, name, icon, cat in result.all()
    ]


async def award_skill_xp(
    db: AsyncSession,
    user_id: uuid.UUID,
    lesson_id: uuid.UUID,
) -> None:
    """Award XP for all skills linked to a lesson."""
    result = await db.execute(
        select(LessonSkill).where(LessonSkill.lesson_id == lesson_id)
    )
    lesson_skills = result.scalars().all()

    for ls in lesson_skills:
        us_result = await db.execute(
            select(UserSkill).where(
                UserSkill.user_id == user_id,
                UserSkill.skill_id == ls.skill_id,
            )
        )
        user_skill = us_result.scalar_one_or_none()
        if user_skill:
            user_skill.total_xp += ls.xp_amount
            user_skill.level = xp_to_level(user_skill.total_xp)
        else:
            user_skill = UserSkill(
                user_id=user_id,
                skill_id=ls.skill_id,
                total_xp=ls.xp_amount,
                level=xp_to_level(ls.xp_amount),
            )
            db.add(user_skill)

    await db.flush()


async def get_user_skills(db: AsyncSession, user_id: uuid.UUID) -> list[dict]:
    result = await db.execute(
        select(UserSkill, Skill.name, Skill.icon, Skill.category)
        .join(Skill, UserSkill.skill_id == Skill.id)
        .where(UserSkill.user_id == user_id)
        .order_by(UserSkill.total_xp.desc())
    )
    return [
        {
            "skill_id": str(us.skill_id),
            "skill_name": name,
            "skill_icon": icon,
            "category": cat,
            "total_xp": us.total_xp,
            "level": us.level,
        }
        for us, name, icon, cat in result.all()
    ]


async def get_radar_data(db: AsyncSession, user_id: uuid.UUID) -> list[dict]:
    """Get skills data formatted for radar chart."""
    skills = await get_user_skills(db, user_id)
    return [
        {"subject": s["skill_name"], "value": s["total_xp"], "level": s["level"]}
        for s in skills[:8]  # Max 8 for readability
    ]
