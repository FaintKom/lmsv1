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


def normalize_lesson_content(lesson_dict: dict, exercises: list = None) -> dict:
    """Convert v1 lesson content to v2 blocks format.

    Called before returning lesson data from API. If the content already
    has ``version: 2``, the dict is returned unchanged.
    """
    content = lesson_dict.get("content", {}) or {}

    # Already v2 — return as-is
    if content.get("version") == 2:
        return lesson_dict

    blocks = []
    block_id = 0

    # Extract theory text block (content.body exists in many lesson types)
    body = content.get("body")
    if body and isinstance(body, str) and body.strip():
        blocks.append({
            "id": f"b{block_id}",
            "type": "text",
            "sort_order": block_id,
            "page": 1,
            "body": body,
            "format": content.get("format", "html"),
        })
        block_id += 1

    # Extract video block
    content_type = lesson_dict.get("content_type", "text")
    url = content.get("url")
    if content_type == "video" and url:
        blocks.append({
            "id": f"b{block_id}",
            "type": "video",
            "sort_order": block_id,
            "page": 1,
            "url": url,
        })
        block_id += 1

    # Append exercise blocks from exercises list
    if exercises:
        for ex in exercises:
            blocks.append({
                "id": f"b{block_id}",
                "type": "exercise",
                "sort_order": block_id,
                "page": 1,
                "exercise_id": str(ex["id"]) if isinstance(ex, dict) else str(ex.id),
            })
            block_id += 1

    # If no blocks were created, add empty text block
    if not blocks:
        blocks.append({
            "id": "b0",
            "type": "text",
            "sort_order": 0,
            "page": 1,
            "body": "",
            "format": "tiptap",
        })

    lesson_dict["content"] = {
        "version": 2,
        "blocks": blocks,
    }
    return lesson_dict


async def list_courses(
    db: AsyncSession, user: User, page: int = 1, per_page: int = 20
) -> tuple[list[Course], int]:
    query = select(Course)

    if user.role == UserRole.super_admin:
        pass  # no org filter — see all courses
    elif user.role == UserRole.student:
        # Students see: published non-template courses in their org OR courses they're enrolled in
        enrolled_course_ids = select(Enrollment.course_id).where(
            Enrollment.student_id == user.id
        )
        query = query.where(
            Course.org_id == user.org_id,
            Course.is_template == False,  # noqa: E712
            (Course.status == CourseStatus.published) | (Course.id.in_(enrolled_course_ids)),
        )
    elif user.role == UserRole.teacher:
        # Teachers see only their own courses (non-template)
        query = query.where(
            Course.org_id == user.org_id,
            Course.is_template == False,  # noqa: E712
            Course.teacher_id == user.id,
        )
    else:
        # admin — all courses in their org (including templates)
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

    # Students can only see published courses OR courses they're enrolled in
    if user.role == UserRole.student and course.status != CourseStatus.published:
        enrolled = await db.execute(
            select(Enrollment.id).where(
                Enrollment.course_id == course_id,
                Enrollment.student_id == user.id,
            )
        )
        if not enrolled.scalar_one_or_none():
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

    # Only methodists and admins can create template courses
    is_template = data.is_template if hasattr(data, 'is_template') else False
    if is_template:
        if user.role not in (UserRole.admin, UserRole.super_admin) and not getattr(user, 'is_methodist', False):
            raise ForbiddenError("Only methodists and admins can create template courses")

    course = Course(
        org_id=user.org_id,
        teacher_id=user.id,
        title=data.title,
        slug=slug,
        description=data.description,
        category=data.category,
        is_template=is_template,
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

    # Increment template version and notify teachers who copied this template
    if course.is_template:
        course.template_version = (course.template_version or 1) + 1
        await _notify_template_update(db, course)

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


async def get_lesson(db: AsyncSession, lesson_id: uuid.UUID, user: User | None = None) -> Lesson:
    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id).options(
            selectinload(Lesson.module).selectinload(Module.course)
        )
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise NotFoundError("Lesson not found")

    if user is not None:
        course = lesson.module.course
        # Org isolation (except super_admin)
        if user.role != UserRole.super_admin and course.org_id != user.org_id:
            raise NotFoundError("Lesson not found")
        # Students: only published courses or enrolled
        if user.role == UserRole.student and course.status != CourseStatus.published:
            enrolled = await db.execute(
                select(Enrollment.id).where(
                    Enrollment.course_id == course.id,
                    Enrollment.student_id == user.id,
                )
            )
            if not enrolled.scalar_one_or_none():
                raise NotFoundError("Lesson not found")

    return lesson


def _lesson_to_dict(lesson: Lesson) -> dict:
    """Convert a Lesson ORM object to a plain dict for normalization."""
    return {
        "id": lesson.id,
        "title": lesson.title,
        "content_type": lesson.content_type.value if hasattr(lesson.content_type, "value") else lesson.content_type,
        "content": lesson.content.copy() if lesson.content else {},
        "sort_order": lesson.sort_order,
        "duration_minutes": lesson.duration_minutes,
    }


async def update_lesson(
    db: AsyncSession, lesson_id: uuid.UUID, data: LessonUpdate, user: User
) -> Lesson:
    lesson = await get_lesson(db, lesson_id, user)
    _check_course_owner(lesson.module.course, user)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)

    await db.flush()
    return lesson


async def delete_course(db: AsyncSession, course_id: uuid.UUID, user: User) -> None:
    course = await get_course(db, course_id, user)
    _check_course_owner(course, user)
    await db.delete(course)
    await db.commit()


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
    if user.role == UserRole.student:
        course_query = course_query.where(Course.status == CourseStatus.published)

    courses_result = await db.execute(
        course_query.options(selectinload(Course.modules).selectinload(Module.lessons)).limit(20)
    )
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
    if user.role == UserRole.student:
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
    # Template courses: allow methodists or the assigned teacher
    if course.is_template:
        if course.teacher_id == user.id:
            return
        if getattr(user, 'is_methodist', False):
            return
        raise ForbiddenError("Only methodists and admins can modify template courses")
    # Teachers can modify courses they own or courses in their org without an owner
    if course.teacher_id == user.id:
        return
    if course.teacher_id is None and course.org_id == user.org_id:
        return
    raise ForbiddenError("You don't have permission to modify this course")


async def _notify_template_update(db: AsyncSession, course: Course) -> None:
    """Notify teachers who copied this template that a new version is available."""
    from app.notifications.service import create_notification

    copies = await db.execute(
        select(Course.teacher_id).where(
            Course.source_course_id == course.id
        ).distinct()
    )
    teacher_ids = [row[0] for row in copies.all()]
    for tid in teacher_ids:
        await create_notification(
            db, tid,
            title=f"Template updated: {course.title}",
            body=f"A new version (v{course.template_version}) is available.",
            link=f"/courses/{course.id}",
        )


async def list_template_courses(
    db: AsyncSession, user: User
) -> list[Course]:
    """List all template courses in the user's org."""
    query = select(Course).where(
        Course.org_id == user.org_id,
        Course.is_template == True,  # noqa: E712
    ).options(
        selectinload(Course.modules).selectinload(Module.lessons)
    ).order_by(Course.created_at.desc())

    result = await db.execute(query)
    return list(result.scalars().unique().all())


async def seed_demo_course_for_org(
    db: AsyncSession,
    org_id: uuid.UUID,
    teacher_id: uuid.UUID,
) -> Course | None:
    """Clone the first available template course into a freshly created org.

    Unlike `copy_course`, this bypasses the org-ownership check because the
    caller is the auth/register flow — the new teacher has not yet been
    granted super_admin, but we still want them to land on a populated
    dashboard instead of an empty one.

    Looks for any published course with `is_template=True` across all orgs,
    picks the oldest one (stable choice) and deep-copies it. Returns None
    silently if no template exists — registration must not fail because of
    a missing seed course.
    """
    # Find a template course anywhere in the system
    result = await db.execute(
        select(Course)
        .where(Course.is_template == True)  # noqa: E712
        .options(selectinload(Course.modules).selectinload(Module.lessons))
        .order_by(Course.created_at.asc())
        .limit(1)
    )
    source = result.scalar_one_or_none()
    if source is None:
        return None

    slug = await _generate_unique_slug(db, org_id, source.title)

    from app.courses.models import CourseStatus

    new_course = Course(
        org_id=org_id,
        teacher_id=teacher_id,
        title=source.title,
        slug=slug,
        description=source.description,
        thumbnail_url=source.thumbnail_url,
        category=source.category,
        is_template=False,
        source_course_id=source.id,
        template_version=source.template_version,
        # Auto-publish so the new teacher can enroll and see the seed
        # content immediately, instead of seeing an empty "draft" course.
        status=CourseStatus.published,
    )
    db.add(new_course)
    await db.flush()

    # Deep copy modules and lessons using the existing helpers
    for src_module in source.modules:
        new_module = Module(
            course_id=new_course.id,
            title=src_module.title,
            sort_order=src_module.sort_order,
        )
        db.add(new_module)
        await db.flush()
        for src_lesson in src_module.lessons:
            await _copy_lesson_entity(
                db, src_lesson, new_module.id, src_lesson.sort_order
            )

    await db.flush()
    return new_course


async def _generate_unique_slug(db: AsyncSession, org_id: uuid.UUID, title: str) -> str:
    """Generate a unique slug within the org."""
    slug = slugify(title)
    base_slug = slug
    counter = 1
    while True:
        existing = await db.execute(
            select(Course).where(Course.org_id == org_id, Course.slug == slug)
        )
        if not existing.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


async def _copy_lesson_entity(
    db: AsyncSession, source_lesson: Lesson, target_module_id: uuid.UUID, sort_order: int
) -> Lesson:
    """Copy a single lesson and its associated quiz/challenge."""
    new_lesson = Lesson(
        module_id=target_module_id,
        title=source_lesson.title,
        content_type=source_lesson.content_type,
        content=source_lesson.content.copy() if source_lesson.content else {},
        sort_order=sort_order,
        duration_minutes=source_lesson.duration_minutes,
    )
    db.add(new_lesson)
    await db.flush()

    # Copy quiz if exists
    from app.assessments.models import Quiz, Question
    quiz_result = await db.execute(
        select(Quiz).where(Quiz.lesson_id == source_lesson.id)
        .options(selectinload(Quiz.questions))
    )
    source_quiz = quiz_result.scalar_one_or_none()
    if source_quiz:
        new_quiz = Quiz(
            lesson_id=new_lesson.id,
            title=source_quiz.title,
            passing_score=source_quiz.passing_score,
            time_limit_minutes=source_quiz.time_limit_minutes,
        )
        db.add(new_quiz)
        await db.flush()
        for q in source_quiz.questions:
            new_q = Question(
                quiz_id=new_quiz.id,
                question_text=q.question_text,
                question_type=q.question_type,
                options=q.options.copy() if q.options else None,
                correct_answer=q.correct_answer,
                points=q.points,
                sort_order=q.sort_order,
            )
            db.add(new_q)

    # Copy code challenge if exists
    from app.sandbox.models import CodeChallenge, TestCase
    challenge_result = await db.execute(
        select(CodeChallenge).where(CodeChallenge.lesson_id == source_lesson.id)
        .options(selectinload(CodeChallenge.test_cases))
    )
    source_challenge = challenge_result.scalar_one_or_none()
    if source_challenge:
        new_challenge = CodeChallenge(
            lesson_id=new_lesson.id,
            title=source_challenge.title,
            description=source_challenge.description,
            language=source_challenge.language,
            starter_code=source_challenge.starter_code,
            solution_code=source_challenge.solution_code,
            time_limit_seconds=source_challenge.time_limit_seconds,
            memory_limit_mb=source_challenge.memory_limit_mb,
        )
        db.add(new_challenge)
        await db.flush()
        for tc in source_challenge.test_cases:
            new_tc = TestCase(
                challenge_id=new_challenge.id,
                input=tc.input,
                expected_output=tc.expected_output,
                is_hidden=tc.is_hidden,
                sort_order=tc.sort_order,
            )
            db.add(new_tc)

    # Copy unified exercises if any
    from app.exercises.models import Exercise, ExerciseType
    from app.exercises.service import generate_display_id
    exercise_result = await db.execute(
        select(Exercise).where(Exercise.lesson_id == source_lesson.id)
        .options(selectinload(Exercise.questions), selectinload(Exercise.test_cases))
    )
    source_exercises = exercise_result.scalars().all()
    for src_ex in source_exercises:
        new_display_id = await generate_display_id(
            db, src_ex.org_id, src_ex.exercise_type
        )
        new_ex = Exercise(
            lesson_id=new_lesson.id,
            org_id=src_ex.org_id,
            display_id=new_display_id,
            exercise_type=src_ex.exercise_type,
            title=src_ex.title,
            config=src_ex.config.copy() if src_ex.config else {},
            sort_order=src_ex.sort_order,
        )
        db.add(new_ex)
        await db.flush()

        # Copy questions for quiz exercises
        for q in src_ex.questions:
            from app.assessments.models import Question as QModel
            new_q = QModel(
                exercise_id=new_ex.id,
                question_text=q.question_text,
                question_type=q.question_type,
                options=q.options.copy() if q.options else None,
                correct_answer=q.correct_answer,
                points=q.points,
                sort_order=q.sort_order,
            )
            db.add(new_q)

        # Copy test cases for code challenge exercises
        for tc in src_ex.test_cases:
            from app.sandbox.models import TestCase as TCModel
            new_tc = TCModel(
                exercise_id=new_ex.id,
                input=tc.input,
                expected_output=tc.expected_output,
                is_hidden=tc.is_hidden,
                sort_order=tc.sort_order,
            )
            db.add(new_tc)

    await db.flush()
    return new_lesson


async def copy_course(
    db: AsyncSession, source_course_id: uuid.UUID, user: User
) -> Course:
    """Deep copy a course (modules → lessons → quizzes → challenges)."""
    # Load source with full tree
    result = await db.execute(
        select(Course).where(Course.id == source_course_id)
        .options(selectinload(Course.modules).selectinload(Module.lessons))
    )
    source = result.scalar_one_or_none()
    if not source:
        raise NotFoundError("Source course not found")

    # Org check
    if user.role != UserRole.super_admin and source.org_id != user.org_id:
        raise NotFoundError("Source course not found")

    slug = await _generate_unique_slug(db, user.org_id, source.title)

    new_course = Course(
        org_id=user.org_id,
        teacher_id=user.id,
        title=source.title,
        slug=slug,
        description=source.description,
        thumbnail_url=source.thumbnail_url,
        category=source.category,
        is_template=False,
        source_course_id=source.id,
        template_version=source.template_version,
    )
    db.add(new_course)
    await db.flush()

    # Copy modules and lessons
    for src_module in source.modules:
        new_module = Module(
            course_id=new_course.id,
            title=src_module.title,
            sort_order=src_module.sort_order,
        )
        db.add(new_module)
        await db.flush()

        for src_lesson in src_module.lessons:
            await _copy_lesson_entity(db, src_lesson, new_module.id, src_lesson.sort_order)

    await db.flush()

    # Reload with relationships
    result = await db.execute(
        select(Course).where(Course.id == new_course.id)
        .options(selectinload(Course.modules).selectinload(Module.lessons))
    )
    return result.scalar_one()


async def copy_module(
    db: AsyncSession, source_module_id: uuid.UUID, target_course_id: uuid.UUID, user: User
) -> Module:
    """Copy a single module (with lessons) into a target course."""
    # Validate target course ownership
    target_course = await get_course(db, target_course_id, user)
    _check_course_owner(target_course, user)

    # Load source module
    result = await db.execute(
        select(Module).where(Module.id == source_module_id)
        .options(selectinload(Module.lessons), selectinload(Module.course))
    )
    src_module = result.scalar_one_or_none()
    if not src_module:
        raise NotFoundError("Source module not found")

    # Org check on source
    if user.role != UserRole.super_admin and src_module.course.org_id != user.org_id:
        raise NotFoundError("Source module not found")

    # Get next sort order
    max_order = await db.execute(
        select(func.coalesce(func.max(Module.sort_order), -1)).where(
            Module.course_id == target_course_id
        )
    )
    next_order = (max_order.scalar() or 0) + 1

    new_module = Module(
        course_id=target_course_id,
        title=src_module.title,
        sort_order=next_order,
    )
    db.add(new_module)
    await db.flush()

    for src_lesson in src_module.lessons:
        await _copy_lesson_entity(db, src_lesson, new_module.id, src_lesson.sort_order)

    await db.flush()

    # Reload
    result = await db.execute(
        select(Module).where(Module.id == new_module.id)
        .options(selectinload(Module.lessons))
    )
    return result.scalar_one()


async def copy_lesson(
    db: AsyncSession, source_lesson_id: uuid.UUID, target_module_id: uuid.UUID, user: User
) -> Lesson:
    """Copy a single lesson (with quiz/challenge) into a target module."""
    # Validate target module ownership
    result = await db.execute(
        select(Module).where(Module.id == target_module_id)
        .options(selectinload(Module.course))
    )
    target_module = result.scalar_one_or_none()
    if not target_module:
        raise NotFoundError("Target module not found")
    _check_course_owner(target_module.course, user)

    # Load source lesson
    source_lesson = await get_lesson(db, source_lesson_id, user)

    # Get next sort order
    max_order = await db.execute(
        select(func.coalesce(func.max(Lesson.sort_order), -1)).where(
            Lesson.module_id == target_module_id
        )
    )
    next_order = (max_order.scalar() or 0) + 1

    new_lesson = await _copy_lesson_entity(db, source_lesson, target_module_id, next_order)
    return new_lesson
