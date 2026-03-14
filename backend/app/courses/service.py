import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from slugify import slugify

from app.auth.models import User, UserRole
from app.common.exceptions import ForbiddenError, NotFoundError
from app.courses.models import Course, CourseStatus, Lesson, Module
from app.courses.schemas import CourseCreate, CourseUpdate, LessonCreate, LessonUpdate, ModuleCreate, ModuleUpdate
from app.progress.models import Enrollment


async def list_courses(
    db: AsyncSession, user: User, page: int = 1, per_page: int = 20
) -> tuple[list[Course], int]:
    query = select(Course)

    if user.role == UserRole.super_admin:
        pass  # no org filter — see all courses
    elif user.role == UserRole.student:
        # Students see: published courses in their org OR courses they're enrolled in
        enrolled_course_ids = select(Enrollment.course_id).where(
            Enrollment.student_id == user.id
        )
        query = query.where(
            Course.org_id == user.org_id,
            (Course.status == CourseStatus.published) | (Course.id.in_(enrolled_course_ids)),
        )
    elif user.role == UserRole.teacher:
        query = query.where(
            Course.org_id == user.org_id,
            (Course.teacher_id == user.id) | (Course.status == CourseStatus.published),
        )
    else:
        # admin — all courses in their org
        query = query.where(Course.org_id == user.org_id)

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar() or 0

    courses = (
        await db.execute(
            query.options(selectinload(Course.modules).selectinload(Module.lessons))
            .offset((page - 1) * per_page).limit(per_page).order_by(Course.created_at.desc())
        )
    ).scalars().unique().all()

    return list(courses), total


async def get_course(db: AsyncSession, course_id: uuid.UUID, user: User) -> Course:
    query = select(Course).where(Course.id == course_id)
    if user.role != UserRole.super_admin:
        query = query.where(Course.org_id == user.org_id)
    result = await db.execute(
        query.options(selectinload(Course.modules).selectinload(Module.lessons))
    )
    course = result.scalar_one_or_none()
    if not course:
        raise NotFoundError("Course not found")
    return course


async def create_course(db: AsyncSession, data: CourseCreate, user: User) -> Course:
    slug = slugify(data.title)
    base_slug = slug
    counter = 1
    while True:
        existing = await db.execute(
            select(Course).where(Course.org_id == user.org_id, Course.slug == slug)
        )
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    course = Course(
        org_id=user.org_id,
        teacher_id=user.id,
        title=data.title,
        slug=slug,
        description=data.description,
        category=data.category,
    )
    db.add(course)
    await db.flush()

    # Reload with eager-loaded modules for Pydantic serialization
    result = await db.execute(
        select(Course)
        .where(Course.id == course.id)
        .options(selectinload(Course.modules))
    )
    return result.scalar_one()


async def update_course(
    db: AsyncSession, course_id: uuid.UUID, data: CourseUpdate, user: User
) -> Course:
    course = await get_course(db, course_id, user)
    _check_course_owner(course, user)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(course, field, value)

    await db.flush()

    # Reload to get updated server-side fields (updated_at) + eager-load relationships
    result = await db.execute(
        select(Course)
        .where(Course.id == course.id)
        .options(selectinload(Course.modules).selectinload(Module.lessons))
    )
    return result.scalar_one()


async def publish_course(db: AsyncSession, course_id: uuid.UUID, user: User) -> Course:
    course = await get_course(db, course_id, user)
    _check_course_owner(course, user)
    course.status = CourseStatus.published
    await db.flush()

    # Reload to get updated server-side fields (updated_at) + eager-load relationships
    result = await db.execute(
        select(Course)
        .where(Course.id == course.id)
        .options(selectinload(Course.modules).selectinload(Module.lessons))
    )
    return result.scalar_one()


async def create_module(
    db: AsyncSession, course_id: uuid.UUID, data: ModuleCreate, user: User
) -> Module:
    course = await get_course(db, course_id, user)
    _check_course_owner(course, user)

    max_order = await db.execute(
        select(func.coalesce(func.max(Module.sort_order), -1)).where(
            Module.course_id == course_id
        )
    )
    next_order = (max_order.scalar() or 0) + 1

    module = Module(course_id=course_id, title=data.title, sort_order=next_order)
    db.add(module)
    await db.flush()

    # Reload with lessons relationship for Pydantic serialization
    result = await db.execute(
        select(Module).where(Module.id == module.id).options(selectinload(Module.lessons))
    )
    return result.scalar_one()


async def reorder_modules(
    db: AsyncSession, course_id: uuid.UUID, ordered_ids: list[uuid.UUID], user: User
) -> None:
    course = await get_course(db, course_id, user)
    _check_course_owner(course, user)

    for i, module_id in enumerate(ordered_ids):
        result = await db.execute(
            select(Module).where(Module.id == module_id, Module.course_id == course_id)
        )
        module = result.scalar_one_or_none()
        if module:
            module.sort_order = i

    await db.flush()


async def reorder_lessons(
    db: AsyncSession, module_id: uuid.UUID, ordered_ids: list[uuid.UUID], user: User
) -> None:
    result = await db.execute(
        select(Module).where(Module.id == module_id).options(selectinload(Module.course))
    )
    module = result.scalar_one_or_none()
    if not module:
        raise NotFoundError("Module not found")

    _check_course_owner(module.course, user)

    for i, lesson_id in enumerate(ordered_ids):
        result = await db.execute(
            select(Lesson).where(Lesson.id == lesson_id, Lesson.module_id == module_id)
        )
        lesson = result.scalar_one_or_none()
        if lesson:
            lesson.sort_order = i

    await db.flush()


async def create_lesson(
    db: AsyncSession, module_id: uuid.UUID, data: LessonCreate, user: User
) -> Lesson:
    result = await db.execute(
        select(Module).where(Module.id == module_id).options(selectinload(Module.course))
    )
    module = result.scalar_one_or_none()
    if not module:
        raise NotFoundError("Module not found")

    _check_course_owner(module.course, user)

    max_order = await db.execute(
        select(func.coalesce(func.max(Lesson.sort_order), -1)).where(
            Lesson.module_id == module_id
        )
    )
    next_order = (max_order.scalar() or 0) + 1

    lesson = Lesson(
        module_id=module_id,
        title=data.title,
        content_type=data.content_type,
        content=data.content,
        sort_order=next_order,
        duration_minutes=data.duration_minutes,
    )
    db.add(lesson)
    await db.flush()
    return lesson


async def get_lesson(db: AsyncSession, lesson_id: uuid.UUID) -> Lesson:
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise NotFoundError("Lesson not found")
    return lesson


async def update_lesson(
    db: AsyncSession, lesson_id: uuid.UUID, data: LessonUpdate, user: User
) -> Lesson:
    lesson = await get_lesson(db, lesson_id)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)

    await db.flush()
    return lesson


async def delete_course(db: AsyncSession, course_id: uuid.UUID, user: User) -> None:
    course = await get_course(db, course_id, user)
    _check_course_owner(course, user)
    await db.delete(course)
    await db.flush()


async def update_module(
    db: AsyncSession, module_id: uuid.UUID, data: ModuleUpdate, user: User
) -> Module:
    result = await db.execute(
        select(Module).where(Module.id == module_id).options(selectinload(Module.course))
    )
    module = result.scalar_one_or_none()
    if not module:
        raise NotFoundError("Module not found")

    _check_course_owner(module.course, user)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(module, field, value)

    await db.flush()

    # Reload to get fresh data
    result = await db.execute(
        select(Module).where(Module.id == module_id).options(selectinload(Module.lessons))
    )
    return result.scalar_one()


async def delete_module(db: AsyncSession, module_id: uuid.UUID, user: User) -> None:
    result = await db.execute(
        select(Module).where(Module.id == module_id).options(selectinload(Module.course))
    )
    module = result.scalar_one_or_none()
    if not module:
        raise NotFoundError("Module not found")

    _check_course_owner(module.course, user)
    await db.delete(module)
    await db.flush()


async def delete_lesson(db: AsyncSession, lesson_id: uuid.UUID, user: User) -> None:
    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id).options(
            selectinload(Lesson.module).selectinload(Module.course)
        )
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise NotFoundError("Lesson not found")

    _check_course_owner(lesson.module.course, user)
    await db.delete(lesson)
    await db.flush()


async def search_courses_and_lessons(
    db: AsyncSession, user: User, query: str
) -> dict:
    """Search courses by title/description and lessons by title, filtered by org_id."""
    pattern = f"%{query}%"

    # Search courses
    course_query = select(Course).where(
        (Course.title.ilike(pattern)) | (Course.description.ilike(pattern)),
    )
    if user.role != UserRole.super_admin:
        course_query = course_query.where(Course.org_id == user.org_id)
    if user.role == "student":
        course_query = course_query.where(Course.status == CourseStatus.published)

    courses_result = await db.execute(course_query.limit(20))
    courses = courses_result.scalars().all()

    # Search lessons (join through module -> course to filter by org_id)
    lesson_query = (
        select(Lesson)
        .join(Module, Lesson.module_id == Module.id)
        .join(Course, Module.course_id == Course.id)
        .where(Lesson.title.ilike(pattern))
    )
    if user.role != UserRole.super_admin:
        lesson_query = lesson_query.where(Course.org_id == user.org_id)
    if user.role == "student":
        lesson_query = lesson_query.where(Course.status == CourseStatus.published)

    lessons_result = await db.execute(
        lesson_query.options(
            selectinload(Lesson.module).selectinload(Module.course)
        ).limit(20)
    )
    lessons = lessons_result.scalars().unique().all()

    return {"courses": courses, "lessons": lessons}


def _check_course_owner(course: Course, user: User) -> None:
    if user.role in (UserRole.admin, UserRole.super_admin):
        return
    if course.teacher_id != user.id:
        raise ForbiddenError("You don't have permission to modify this course")
