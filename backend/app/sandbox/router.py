import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.sandbox.executor import execute_code_remote
from app.sandbox.schemas import (
    ChallengeCreate,
    ChallengeResponse,
    CodeSubmissionResponse,
    ExecuteRequest,
    ExecuteResponse,
    SubmitCodeRequest,
    TestCaseCreate,
    TestCaseResponse,
)
from app.sandbox.service import (
    add_test_case,
    create_challenge,
    delete_challenge,
    delete_test_case,
    get_challenge,
    get_challenge_by_lesson,
    submit_code,
    update_challenge,
)

router = APIRouter()


@router.post("/execute", response_model=ExecuteResponse)
async def execute_endpoint(
    data: ExecuteRequest,
    user: User = Depends(get_current_user),
):
    result = await execute_code_remote(data.language, data.source_code, data.stdin)
    return ExecuteResponse(**result)


@router.get("/languages")
async def languages_endpoint():
    from app.sandbox.languages import get_all_languages
    return {"languages": get_all_languages()}


@router.get("/lessons/{lesson_id}/challenge", response_model=ChallengeResponse)
async def get_challenge_by_lesson_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    challenge = await get_challenge_by_lesson(db, lesson_id)
    response = ChallengeResponse.model_validate(challenge)
    if user.role == UserRole.student and response.test_cases:
        response.test_cases = [tc for tc in response.test_cases if not tc.is_hidden]
    return response


@router.post("/challenges", response_model=ChallengeResponse)
async def create_challenge_endpoint(
    data: ChallengeCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    challenge = await create_challenge(db, data.model_dump())
    return ChallengeResponse.model_validate(challenge)


@router.get("/challenges")
async def list_challenges_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.sandbox.models import CodeChallenge
    from app.courses.models import Course, Lesson, Module

    result = await db.execute(
        select(CodeChallenge)
        .join(Lesson, CodeChallenge.lesson_id == Lesson.id)
        .join(Module, Lesson.module_id == Module.id)
        .join(Course, Module.course_id == Course.id)
        .where(Course.org_id == user.org_id)
        .options(selectinload(CodeChallenge.test_cases))
    )
    challenges = result.scalars().unique().all()
    items = []
    for ch in challenges:
        tcs = [
            {"id": str(tc.id), "input": tc.input, "expected_output": tc.expected_output, "is_hidden": tc.is_hidden}
            for tc in ch.test_cases
            if not tc.is_hidden or user.role != UserRole.student
        ]
        items.append({
            "id": str(ch.id), "title": ch.title, "description": ch.description,
            "language": ch.language, "starter_code": ch.starter_code,
            "time_limit_seconds": ch.time_limit_seconds, "memory_limit_mb": ch.memory_limit_mb,
            "test_cases": tcs,
        })
    return items


@router.get("/challenges/{challenge_id}", response_model=ChallengeResponse)
async def get_challenge_endpoint(
    challenge_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    challenge = await get_challenge(db, challenge_id)
    response = ChallengeResponse.model_validate(challenge)
    if user.role == UserRole.student and response.test_cases:
        response.test_cases = [tc for tc in response.test_cases if not tc.is_hidden]
    return response


@router.post("/challenges/{challenge_id}/test-cases", response_model=TestCaseResponse)
async def add_test_case_endpoint(
    challenge_id: uuid.UUID,
    data: TestCaseCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    tc = await add_test_case(db, challenge_id, data.model_dump())
    return TestCaseResponse.model_validate(tc)


@router.put("/challenges/{challenge_id}", response_model=ChallengeResponse)
async def update_challenge_endpoint(
    challenge_id: uuid.UUID,
    data: ChallengeCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    challenge = await update_challenge(db, challenge_id, data.model_dump(exclude_unset=True))
    return ChallengeResponse.model_validate(challenge)


@router.delete("/challenges/{challenge_id}")
async def delete_challenge_endpoint(
    challenge_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await delete_challenge(db, challenge_id)
    return {"status": "ok"}


@router.delete("/challenges/{challenge_id}/test-cases/{test_case_id}")
async def delete_test_case_endpoint(
    challenge_id: uuid.UUID,
    test_case_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await delete_test_case(db, test_case_id)
    return {"status": "ok"}


@router.post("/challenges/{challenge_id}/submit", response_model=CodeSubmissionResponse)
async def submit_code_endpoint(
    challenge_id: uuid.UUID,
    data: SubmitCodeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import logging
    logger = logging.getLogger(__name__)
    try:
        submission = await submit_code(db, challenge_id, data.source_code, data.language, user)
        logger.info(f"Submission {submission.id}: status={submission.status}, results={submission.results}")
        return CodeSubmissionResponse.model_validate(submission)
    except Exception as e:
        logger.exception(f"Submit code failed: {e}")
        raise
