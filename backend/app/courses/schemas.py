import uuid
from datetime import datetime

from pydantic import BaseModel


class CourseCreate(BaseModel):
    title: str
    description: str = ""
    category: str | None = None
    is_template: bool = False


class CourseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    thumbnail_url: str | None = None


class CourseResponse(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    description: str
    thumbnail_url: str | None
    status: str
    category: str | None
    teacher_id: uuid.UUID
    is_template: bool = False
    source_course_id: uuid.UUID | None = None
    template_version: int = 1
    created_at: datetime | None = None
    updated_at: datetime | None = None
    modules: list["ModuleResponse"] | None = None

    model_config = {"from_attributes": True}


class ModuleCreate(BaseModel):
    title: str


class ModuleUpdate(BaseModel):
    title: str | None = None


class ModuleResponse(BaseModel):
    id: uuid.UUID
    title: str
    sort_order: int
    lessons: list["LessonResponse"] | None = None

    model_config = {"from_attributes": True}


class ReorderRequest(BaseModel):
    ordered_ids: list[uuid.UUID]


class LessonCreate(BaseModel):
    title: str
    content_type: str = "text"
    content: dict = {}
    duration_minutes: int | None = None


class LessonUpdate(BaseModel):
    title: str | None = None
    content: dict | None = None
    duration_minutes: int | None = None


class LessonResponse(BaseModel):
    id: uuid.UUID
    title: str
    content_type: str
    content: dict
    sort_order: int
    duration_minutes: int | None

    model_config = {"from_attributes": True}


class SearchLessonResponse(BaseModel):
    id: uuid.UUID
    title: str
    content_type: str
    sort_order: int
    module_id: uuid.UUID
    course_id: uuid.UUID | None = None
    course_title: str | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):  # type: ignore
        data = {
            "id": obj.id,
            "title": obj.title,
            "content_type": obj.content_type,
            "sort_order": obj.sort_order,
            "module_id": obj.module_id,
            "course_id": obj.module.course.id if obj.module and obj.module.course else None,
            "course_title": obj.module.course.title if obj.module and obj.module.course else None,
        }
        return cls(**data)


class CopyModuleRequest(BaseModel):
    source_module_id: uuid.UUID
    target_course_id: uuid.UUID


class CopyLessonRequest(BaseModel):
    source_lesson_id: uuid.UUID
    target_module_id: uuid.UUID
