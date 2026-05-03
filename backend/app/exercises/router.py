import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.exercises.models import ExerciseType
from app.exercises.schemas import (
    CONFIG_SCHEMAS,
    ExerciseCreate,
    ExerciseListResponse,
    ExerciseResponse,
    ExerciseSubmissionResponse,
    ExerciseUpdate,
    QuestionCreate,
    QuestionInExercise,
    QuestionUpdate,
    SubmissionListResponse,
    SubmitExerciseRequest,
    TestCaseCreate,
    TestCaseInExercise,
)
from app.exercises.service import (
    add_question_to_exercise,
    add_test_case_to_exercise,
    create_exercise,
    delete_exercise,
    delete_question_from_exercise,
    delete_test_case_from_exercise,
    get_attempt_status,
    get_exercise,
    get_exercises_by_lesson,
    list_exercises,
    list_submissions,
    submit_exercise,
    update_exercise,
    update_question_in_exercise,
    upload_file_submission,
)

router = APIRouter()


# ─── Schema discovery ───────────────────────────────────────────────

@router.get("/config-schemas")
async def get_config_schemas(_user: User = Depends(get_current_user)):
    """Return JSON Schema for every exercise type's `config` field.

    Clients (admin UI, MCP server, integration scripts) use this to know
    exactly which keys belong in `Exercise.config` per type. Each entry is a
    standard JSON Schema produced by Pydantic's `model_json_schema()`.

    Example response shape:
        {
          "matching": {"properties": {"pairs": {...}, "shuffle": {...}}, ...},
          "fill_blanks": {"properties": {"text": ..., "blanks": ...}, ...},
          ...
        }
    """
    return {etype.value: schema_cls.model_json_schema() for etype, schema_cls in CONFIG_SCHEMAS.items()}


# ─── Exercise CRUD ───────────────────────────────────────────────────

@router.post("", response_model=ExerciseResponse)
async def create_exercise_endpoint(
    data: ExerciseCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    exercise = await create_exercise(db, user, data.model_dump())
    return ExerciseResponse.model_validate(exercise)


@router.get("", response_model=ExerciseListResponse)
async def list_exercises_endpoint(
    exercise_type: ExerciseType | None = None,
    lesson_id: uuid.UUID | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await list_exercises(
        db, user, exercise_type=exercise_type, lesson_id=lesson_id,
        search=search, page=page, per_page=per_page,
    )
    return ExerciseListResponse(
        items=[ExerciseResponse.model_validate(e) for e in items],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/submissions/{submission_id}/download")
async def download_file_endpoint(
    submission_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select

    from app.common.exceptions import NotFoundError
    from app.exercises.models import ExerciseSubmission

    result = await db.execute(
        select(ExerciseSubmission).where(ExerciseSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise NotFoundError("Submission not found")

    if user.role == UserRole.student and submission.student_id != user.id:
        raise NotFoundError("Submission not found")

    if not submission.file_path:
        raise NotFoundError("No file attached to this submission")

    return FileResponse(
        path=submission.file_path,
        filename=submission.original_filename,
        media_type=submission.mime_type or "application/octet-stream",
    )


@router.get("/by-lesson/{lesson_id}", response_model=list[ExerciseResponse])
async def get_exercises_by_lesson_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exercises = await get_exercises_by_lesson(db, lesson_id)

    # Strip answers for students
    result = []
    for ex in exercises:
        resp = ExerciseResponse.model_validate(ex)
        if user.role == UserRole.student:
            resp = _strip_answers(resp)
        result.append(resp)
    return result


@router.get("/{exercise_id}", response_model=ExerciseResponse)
async def get_exercise_endpoint(
    exercise_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exercise = await get_exercise(db, exercise_id, user)
    resp = ExerciseResponse.model_validate(exercise)
    if user.role == UserRole.student:
        resp = _strip_answers(resp)
    return resp


@router.put("/{exercise_id}", response_model=ExerciseResponse)
async def update_exercise_endpoint(
    exercise_id: uuid.UUID,
    data: ExerciseUpdate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    exercise = await update_exercise(db, exercise_id, user, data.model_dump(exclude_unset=True))
    return ExerciseResponse.model_validate(exercise)


@router.delete("/{exercise_id}")
async def delete_exercise_endpoint(
    exercise_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await delete_exercise(db, exercise_id, user)
    return {"status": "ok"}


# ─── Questions (quiz exercises) ─────────────────────────────────────

@router.post("/{exercise_id}/questions", response_model=QuestionInExercise)
async def add_question_endpoint(
    exercise_id: uuid.UUID,
    data: QuestionCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    question = await add_question_to_exercise(db, exercise_id, user, data.model_dump())
    return QuestionInExercise.model_validate(question)


@router.put("/{exercise_id}/questions/{question_id}", response_model=QuestionInExercise)
async def update_question_endpoint(
    exercise_id: uuid.UUID,
    question_id: uuid.UUID,
    data: QuestionUpdate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    question = await update_question_in_exercise(db, question_id, user, data.model_dump(exclude_unset=True))
    return QuestionInExercise.model_validate(question)


@router.delete("/{exercise_id}/questions/{question_id}")
async def delete_question_endpoint(
    exercise_id: uuid.UUID,
    question_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await delete_question_from_exercise(db, question_id, user)
    return {"status": "ok"}


# ─── Test cases (code challenge exercises) ──────────────────────────

@router.post("/{exercise_id}/test-cases", response_model=TestCaseInExercise)
async def add_test_case_endpoint(
    exercise_id: uuid.UUID,
    data: TestCaseCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    tc = await add_test_case_to_exercise(db, exercise_id, user, data.model_dump())
    return TestCaseInExercise.model_validate(tc)


@router.delete("/{exercise_id}/test-cases/{test_case_id}")
async def delete_test_case_endpoint(
    exercise_id: uuid.UUID,
    test_case_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await delete_test_case_from_exercise(db, test_case_id, user)
    return {"status": "ok"}


# ─── Submissions ─────────────────────────────────────────────────────

@router.get("/{exercise_id}/attempts")
async def get_attempts_endpoint(
    exercise_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_attempt_status(db, exercise_id, user)


@router.post("/{exercise_id}/submit", response_model=ExerciseSubmissionResponse)
async def submit_exercise_endpoint(
    exercise_id: uuid.UUID,
    data: SubmitExerciseRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    submission = await submit_exercise(db, exercise_id, user, data.model_dump())
    resp = ExerciseSubmissionResponse.model_validate(submission)

    # Attach attempt tracking info
    if hasattr(submission, "_attempt_number"):
        resp.attempt_number = submission._attempt_number  # type: ignore[attr-defined]
        resp.attempts_remaining = submission._attempts_remaining  # type: ignore[attr-defined]
        resp.max_attempts_reached = submission._max_attempts_reached  # type: ignore[attr-defined]
        resp.correct_answer = submission._correct_answer  # type: ignore[attr-defined]
    else:
        # Normal submission — compute attempt info
        from app.exercises.service import _count_attempts, _get_exercise_with_relations
        exercise = await _get_exercise_with_relations(db, exercise_id)
        max_att = exercise.max_attempts if exercise.max_attempts is not None else 100
        count = await _count_attempts(db, exercise_id, user.id)
        resp.attempt_number = count
        resp.attempts_remaining = max(0, max_att - count)
        resp.max_attempts_reached = count >= max_att

    return resp


@router.post("/{exercise_id}/upload", response_model=ExerciseSubmissionResponse)
async def upload_file_endpoint(
    exercise_id: uuid.UUID,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    submission = await upload_file_submission(db, exercise_id, user, file)
    return ExerciseSubmissionResponse.model_validate(submission)


@router.get("/{exercise_id}/submissions", response_model=SubmissionListResponse)
async def list_submissions_endpoint(
    exercise_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await list_submissions(db, exercise_id, user, page, per_page)
    return SubmissionListResponse(
        items=[ExerciseSubmissionResponse.model_validate(s) for s in items],
        total=total,
        page=page,
        per_page=per_page,
    )


# ─── Helpers ─────────────────────────────────────────────────────────

def _strip_answers(resp: ExerciseResponse) -> ExerciseResponse:
    """Remove correct answers from response for students."""
    if resp.questions:
        for q in resp.questions:
            if q.options:
                for opt in q.options:
                    opt.pop("is_correct", None)
            q.correct_answer = None
    if resp.test_cases:
        resp.test_cases = [tc for tc in resp.test_cases if not tc.is_hidden]
    # Strip solution from config but keep shuffled blanks as word bank
    if resp.config:
        import random
        blanks = resp.config.get("blanks")
        resp.config = {k: v for k, v in resp.config.items() if k not in ("solution_code", "correct_order", "blanks", "correct_answer")}
        if blanks:
            shuffled = list(blanks)
            random.shuffle(shuffled)
            resp.config["word_bank"] = shuffled
    return resp
