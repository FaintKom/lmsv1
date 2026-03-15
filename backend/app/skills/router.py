import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.skills.schemas import SkillCreate, SkillResponse, LessonSkillLink
from app.skills.service import (
    create_skill,
    list_skills,
    delete_skill,
    link_skill_to_lesson,
    unlink_skill_from_lesson,
    get_lesson_skills,
    get_user_skills,
    get_radar_data,
)

router = APIRouter()


@router.get("")
async def list_skills_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    skills = await list_skills(db, user.org_id)
    return [SkillResponse.model_validate(s) for s in skills]


@router.post("", response_model=SkillResponse)
async def create_skill_endpoint(
    data: SkillCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    skill = await create_skill(db, data.model_dump(), user)
    return SkillResponse.model_validate(skill)


@router.delete("/{skill_id}")
async def delete_skill_endpoint(
    skill_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    try:
        await delete_skill(db, skill_id, user.org_id)
        return {"status": "ok"}
    except ValueError:
        raise HTTPException(status_code=404, detail="Skill not found")


@router.post("/lessons/link")
async def link_skill_endpoint(
    data: LessonSkillLink,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await link_skill_to_lesson(db, data.lesson_id, data.skill_id, data.xp_amount)
    return {"status": "ok"}


@router.delete("/lessons/{lesson_id}/skills/{skill_id}")
async def unlink_skill_endpoint(
    lesson_id: uuid.UUID,
    skill_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await unlink_skill_from_lesson(db, lesson_id, skill_id)
    return {"status": "ok"}


@router.get("/lessons/{lesson_id}")
async def lesson_skills_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_lesson_skills(db, lesson_id)


@router.get("/my")
async def my_skills_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_skills(db, user.id)


@router.get("/radar")
async def radar_data_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_radar_data(db, user.id)
