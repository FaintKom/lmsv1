import os
import re
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.common.exceptions import NotFoundError
from app.common.file_validation import (
    IMAGE_EXTENSIONS,
    FileCategory,
    UploadValidationError,
    validate_upload,
)
from app.config import settings
from app.courses.schemas import (
    CopyLessonRequest,
    CopyModuleRequest,
    CopyWithGroupRequest,
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
    _lesson_to_dict,
    copy_course,
    copy_lesson,
    copy_module,
    create_course,
    create_lesson,
    create_module,
    delete_course,
    delete_lesson,
    delete_module,
    get_course,
    get_lesson,
    list_courses,
    list_template_courses,
    normalize_lesson_content,
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


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    """Upload an image for use in lesson content."""
    raw = await file.read()
    try:
        validated = validate_upload(
            filename=file.filename,
            data=raw,
            allowed_extensions=IMAGE_EXTENSIONS,
            max_size_mb=5,
            category=FileCategory.IMAGE,
        )
    except UploadValidationError as e:
        raise HTTPException(400, str(e)) from e

    upload_dir = os.path.join(settings.upload_dir, "images")
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, validated.safe_name)

    with open(filepath, "wb") as f:
        f.write(validated.data)

    url = f"/api/v1/courses/images/{validated.safe_name}"
    return {"url": url}


@router.get("/images/{filename}")
async def serve_image(filename: str):
    """Serve an uploaded image."""
    # Sanitize filename to prevent directory traversal — must match UUID hex + allowed ext
    if not re.match(r'^[a-f0-9]{32}\.(jpg|jpeg|png|gif|webp|svg)$', filename):
        raise HTTPException(404, "Not found")

    filepath = os.path.join(settings.upload_dir, "images", filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "Image not found")

    return FileResponse(filepath)


# Presentation sources accepted for Theory blocks. Keynote (.key) is excluded:
# rendering it needs a paid server-side conversion (CloudConvert/unoconv).
THEORY_EXTENSIONS = {".pdf", ".pptx", ".ppt"}


@router.post("/upload-theory")
async def upload_theory(
    file: UploadFile = File(...),
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    """Upload a PDF/PPTX deck for a theory lesson block."""
    raw = await file.read()
    try:
        validated = validate_upload(
            filename=file.filename,
            data=raw,
            allowed_extensions=THEORY_EXTENSIONS,
            max_size_mb=50,
            category=FileCategory.DOCUMENT,
        )
    except UploadValidationError as e:
        raise HTTPException(400, str(e)) from e

    upload_dir = os.path.join(settings.upload_dir, "theory")
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, validated.safe_name)

    with open(filepath, "wb") as f:
        f.write(validated.data)

    url = f"/api/v1/courses/files/{validated.safe_name}"
    display = os.path.basename((file.filename or "deck").replace("\\", "/"))
    kind = "pdf" if validated.extension == ".pdf" else "pptx"
    return {"url": url, "filename": display, "kind": kind}


@router.get("/files/{filename}")
async def serve_theory_file(filename: str):
    """Serve an uploaded theory deck (PDF/PPTX)."""
    if not re.match(r'^[a-f0-9]{32}\.(pdf|pptx|ppt)$', filename):
        raise HTTPException(404, "Not found")

    filepath = os.path.join(settings.upload_dir, "theory", filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "File not found")

    return FileResponse(filepath)


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
    # P2: enforce plan course limit
    from app.billing.limits import check_course_limit
    await check_course_limit(db, user.org_id)

    course = await create_course(db, data, user)
    return CourseResponse.model_validate(course)


@router.get("/templates", response_model=list[CourseResponse])
async def list_templates_endpoint(
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    """List all template courses in the user's org."""
    templates = await list_template_courses(db, user)
    return [CourseResponse.model_validate(c) for c in templates]


@router.post("/{course_id}/copy", response_model=CourseResponse)
async def copy_course_endpoint(
    course_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    """Deep copy an entire course (modules, lessons, quizzes, challenges)."""
    course = await copy_course(db, course_id, user)
    return CourseResponse.model_validate(course)


@router.post("/{course_id}/copy-with-group")
async def copy_course_with_group_endpoint(
    course_id: uuid.UUID,
    data: CopyWithGroupRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    """Copy a template course and enroll group members."""
    from datetime import datetime, timezone

    from app.admin.models import StudentGroup, StudentGroupMember
    from app.courses.models import Course as CourseModel
    from app.progress.models import Enrollment

    # Verify source is a published template
    source = (await db.execute(
        select(CourseModel).where(CourseModel.id == course_id)
    )).scalar_one_or_none()
    if not source:
        raise NotFoundError("Course not found")
    if user.role != UserRole.super_admin and source.org_id != user.org_id:
        raise NotFoundError("Course not found")

    # Copy course
    new_course = await copy_course(db, course_id, user)

    # Enroll group members
    enrolled = 0
    for group_id in data.group_ids:
        # Validate group belongs to org
        grp = (await db.execute(
            select(StudentGroup).where(
                StudentGroup.id == group_id,
                StudentGroup.org_id == user.org_id,
            )
        )).scalar_one_or_none()
        if not grp:
            continue

        members = (await db.execute(
            select(StudentGroupMember.user_id).where(
                StudentGroupMember.group_id == group_id
            )
        )).all()

        for (uid,) in members:
            existing = (await db.execute(
                select(Enrollment).where(
                    Enrollment.course_id == new_course.id,
                    Enrollment.student_id == uid,
                )
            )).scalar_one_or_none()
            if not existing:
                db.add(Enrollment(
                    course_id=new_course.id,
                    student_id=uid,
                    enrolled_at=datetime.now(timezone.utc),
                ))
                enrolled += 1

    await db.flush()

    return {
        "course": CourseResponse.model_validate(new_course),
        "enrolled_count": enrolled,
    }


@router.post("/copy-module", response_model=ModuleResponse)
async def copy_module_endpoint(
    data: CopyModuleRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    """Copy a single module into a target course."""
    module = await copy_module(db, data.source_module_id, data.target_course_id, user)
    return ModuleResponse.model_validate(module)


@router.post("/copy-lesson", response_model=LessonResponse)
async def copy_lesson_endpoint(
    data: CopyLessonRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    """Copy a single lesson into a target module."""
    lesson = await copy_lesson(db, data.source_lesson_id, data.target_module_id, user)
    return LessonResponse.model_validate(lesson)


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course_endpoint(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func

    from app.progress.models import Enrollment

    course = await get_course(db, course_id, user)
    resp = CourseResponse.model_validate(course)

    # Add enrolled student count
    count_result = await db.execute(
        select(func.count()).where(Enrollment.course_id == course_id)
    )
    resp.enrolled_count = count_result.scalar() or 0
    return resp


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
    from app.exercises.service import get_exercises_by_lesson

    lesson = await get_lesson(db, lesson_id, user)
    exercises = await get_exercises_by_lesson(db, lesson_id)
    lesson_dict = _lesson_to_dict(lesson)
    normalized = normalize_lesson_content(lesson_dict, exercises)
    return LessonResponse(**normalized)


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
