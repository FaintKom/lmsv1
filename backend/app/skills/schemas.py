import uuid

from pydantic import BaseModel


class SkillCreate(BaseModel):
    name: str
    icon: str | None = None
    category: str = "programming"


class SkillResponse(BaseModel):
    id: uuid.UUID
    name: str
    icon: str | None
    category: str

    model_config = {"from_attributes": True}


class UserSkillResponse(BaseModel):
    skill_id: uuid.UUID
    skill_name: str
    skill_icon: str | None
    category: str
    total_xp: int
    level: int


class SkillUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    category: str | None = None


class LessonSkillLink(BaseModel):
    lesson_id: uuid.UUID
    skill_id: uuid.UUID
    xp_amount: int = 10
