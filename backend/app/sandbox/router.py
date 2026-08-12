import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.common.rate_limit import limiter
from app.config import settings
from app.db.session import get_db
from app.sandbox.demo_tasks import (
    DEMO_TASKS,
    build_program,
    new_nonce,
    parse_results,
)
from app.sandbox.executor import execute_code_remote
from app.sandbox.schemas import (
    ChallengeCreate,
    ChallengeResponse,
    CodeSubmissionResponse,
    DemoCheckRequest,
    DemoCheckResponse,
    DemoExecuteRequest,
    DemoTestResult,
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

# Public demo limits. Tighter than a real submission on purpose: the landing
# runs "hello world"-sized snippets, so anything needing more than this is not
# a prospect trying the product.
DEMO_LANGUAGES = frozenset({"python", "javascript"})
DEMO_TIMEOUT_SECONDS = 5
DEMO_MEMORY_MB = 128


@router.post("/execute", response_model=ExecuteResponse)
async def execute_endpoint(
    data: ExecuteRequest,
    user: User = Depends(get_current_user),
):
    result = await execute_code_remote(data.language, data.source_code, data.stdin)
    return ExecuteResponse(**result)


@router.post("/demo", response_model=ExecuteResponse)
# Lambda, not a direct read: the limit is then resolved per call, so tightening
# it via env actually takes effect without shipping code.
@limiter.limit(lambda: settings.sandbox_demo_rate_limit)
async def demo_execute_endpoint(request: Request, response: Response, data: DemoExecuteRequest):
    """Run a snippet from the public landing page. No account required.

    The landing has to prove we actually execute code, so it runs on the same
    sandbox students use rather than faking output — the previous landing demo
    posted to a route that does not exist and silently rendered a simulated
    result, which is the first thing a technical buyer checks.

    Being unauthenticated, this is the one place where our compute is free to
    strangers, so it is fenced in on every axis:
      - rate limited per IP (settings.sandbox_demo_rate_limit)
      - source capped at 2000 chars by the schema, and no stdin is accepted
      - its own language allowlist, narrower than the authenticated route
      - shorter timeout and smaller memory ceiling than a real submission
      - nothing is persisted; the result is returned and forgotten
    The sandbox container stays the last line of defence: read-only root,
    tmpfs, no network, CPU and memory caps.
    """
    if data.language not in DEMO_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Demo supports: {', '.join(sorted(DEMO_LANGUAGES))}",
        )
    result = await execute_code_remote(
        data.language,
        data.source_code,
        stdin="",
        timeout_seconds=DEMO_TIMEOUT_SECONDS,
        memory_limit_mb=DEMO_MEMORY_MB,
    )
    return ExecuteResponse(**result)


@router.get("/demo/tasks")
async def demo_tasks_endpoint():
    """Task statement and starter code for the landing demo.

    Deliberately does NOT include expected values — the browser gets the
    question and the visible case names, never the answers. Grading stays at
    /demo/check, where the server holds them.
    """
    return {
        "tasks": [
            {
                "id": task.id,
                "function_name": task.function_name,
                "starters": task.starters,
                "test_names": [t.name for t in task.tests],
            }
            for task in DEMO_TASKS.values()
        ]
    }


@router.post("/demo/check", response_model=DemoCheckResponse)
@limiter.limit(lambda: settings.sandbox_demo_rate_limit)
async def demo_check_endpoint(request: Request, response: Response, data: DemoCheckRequest):
    """Grade a landing-page solution against server-held test cases.

    This is the demo's whole argument: a teacher can trust the platform because
    the judge is the server, not the browser. So the harness is built here, the
    expected values never travel, and the results line is prefixed with a
    per-request nonce the submission cannot know — otherwise a visitor could
    print their own "all passed" and the demo would be lying again.
    """
    if data.language not in DEMO_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Demo supports: {', '.join(sorted(DEMO_LANGUAGES))}",
        )
    task = DEMO_TASKS.get(data.task_id)
    if task is None:
        raise HTTPException(status_code=400, detail="Unknown demo task")

    nonce = new_nonce()
    program = build_program(task, data.language, data.source_code, nonce)
    result = await execute_code_remote(
        data.language,
        program,
        stdin="",
        timeout_seconds=DEMO_TIMEOUT_SECONDS,
        memory_limit_mb=DEMO_MEMORY_MB,
    )

    produced = parse_results(result.get("stdout", ""), nonce)
    if produced is None or len(produced) != len(task.tests):
        # Timed out, crashed, or never defined the function. Report the
        # runtime's own message rather than a bare "wrong" — on a landing page
        # a syntax error must read as a syntax error.
        detail = (result.get("stderr") or "").strip() or "No result produced"
        return DemoCheckResponse(all_passed=False, tests=[], error=detail[:500])

    tests = [
        DemoTestResult(
            name=case.name,
            passed=got == case.expected,
            expected=str(case.expected),
            got=str(got),
        )
        for case, got in zip(task.tests, produced)
    ]
    return DemoCheckResponse(all_passed=all(t.passed for t in tests), tests=tests)


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

    from app.courses.models import Course, Lesson, Module
    from app.sandbox.models import CodeChallenge

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
            {
                "id": str(tc.id),
                "input": tc.input,
                "expected_output": tc.expected_output,
                "is_hidden": tc.is_hidden,
            }
            for tc in ch.test_cases
            if not tc.is_hidden or user.role != UserRole.student
        ]
        items.append(
            {
                "id": str(ch.id),
                "title": ch.title,
                "description": ch.description,
                "language": ch.language,
                "starter_code": ch.starter_code,
                "time_limit_seconds": ch.time_limit_seconds,
                "memory_limit_mb": ch.memory_limit_mb,
                "test_cases": tcs,
            }
        )
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
        logger.info(
            f"Submission {submission.id}: status={submission.status}, results={submission.results}"
        )
        return CodeSubmissionResponse.model_validate(submission)
    except Exception as e:
        logger.exception(f"Submit code failed: {e}")
        raise
