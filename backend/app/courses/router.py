import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.courses.schemas import (
    CourseCreate,
    CourseResponse,
    CourseUpdate,
    LessonCreate,
    LessonResponse,
    LessonUpdate,
    ModuleCreate,
    ModuleResponse,
    ModuleUpdate,
    ReorderRequest,
    SearchLessonResponse,
)
from app.courses.service import (
    create_course,
    create_lesson,
    create_module,
    delete_course,
    delete_lesson,
    delete_module,
    get_course,
    get_lesson,
    list_courses,
    publish_course,
    reorder_lessons,
    reorder_modules,
    search_courses_and_lessons,
    update_course,
    update_lesson,
    update_module,
)
from app.db.session import get_db

router = APIRouter()


@router.get("/search", response_model=dict)
async def search_endpoint(
    q: str = Query("", min_length=1),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    results = await search_courses_and_lessons(db, user, q)
    return {
        "courses": [CourseResponse.model_validate(c) for c in results["courses"]],
        "lessons": [SearchLessonResponse.model_validate(l) for l in results["lessons"]],
    }


@router.get("", response_model=dict)
async def list_courses_endpoint(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    courses, total = await list_courses(db, user, page, per_page)
    return {
        "items": [CourseResponse.model_validate(c) for c in courses],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.post("", response_model=CourseResponse)
async def create_course_endpoint(
    data: CourseCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    course = await create_course(db, data, user)
    return CourseResponse.model_validate(course)


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course_endpoint(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await get_course(db, course_id, user)
    return CourseResponse.model_validate(course)


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course_endpoint(
    course_id: uuid.UUID,
    data: CourseUpdate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    course = await update_course(db, course_id, data, user)
    return CourseResponse.model_validate(course)


@router.post("/{course_id}/publish", response_model=CourseResponse)
async def publish_course_endpoint(
    course_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    course = await publish_course(db, course_id, user)
    return CourseResponse.model_validate(course)


# Modules

@router.post("/{course_id}/modules", response_model=ModuleResponse)
async def create_module_endpoint(
    course_id: uuid.UUID,
    data: ModuleCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    module = await create_module(db, course_id, data, user)
    return ModuleResponse.model_validate(module)


@router.put("/{course_id}/modules/reorder")
async def reorder_modules_endpoint(
    course_id: uuid.UUID,
    data: ReorderRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await reorder_modules(db, course_id, data.ordered_ids, user)
    return {"status": "ok"}


@router.put("/{course_id}/modules/{module_id}/lessons/reorder")
async def reorder_lessons_endpoint(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    data: ReorderRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await reorder_lessons(db, module_id, data.ordered_ids, user)
    return {"status": "ok"}


# Lessons

@router.post("/{course_id}/modules/{module_id}/lessons", response_model=LessonResponse)
async def create_lesson_endpoint(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    data: LessonCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    lesson = await create_lesson(db, module_id, data, user)
    return LessonResponse.model_validate(lesson)


@router.get("/{course_id}/lessons/{lesson_id}", response_model=LessonResponse)
async def get_lesson_endpoint(
    course_id: uuid.UUID,
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lesson = await get_lesson(db, lesson_id, user)
    return LessonResponse.model_validate(lesson)


@router.put("/{course_id}/modules/{module_id}/lessons/{lesson_id}", response_model=LessonResponse)
async def update_lesson_endpoint(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    lesson_id: uuid.UUID,
    data: LessonUpdate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    lesson = await update_lesson(db, lesson_id, data, user)
    return LessonResponse.model_validate(lesson)


@router.delete("/{course_id}")
async def delete_course_endpoint(
    course_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await delete_course(db, course_id, user)
    return {"status": "ok"}


@router.put("/{course_id}/modules/{module_id}", response_model=ModuleResponse)
async def update_module_endpoint(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    data: ModuleUpdate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    module = await update_module(db, module_id, data, user)
    return ModuleResponse.model_validate(module)


@router.delete("/{course_id}/modules/{module_id}")
async def delete_module_endpoint(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await delete_module(db, module_id, user)
    return {"status": "ok"}


@router.delete("/{course_id}/modules/{module_id}/lessons/{lesson_id}")
async def delete_lesson_endpoint(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    lesson_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await delete_lesson(db, lesson_id, user)
    return {"status": "ok"}
