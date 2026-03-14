import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.models import User
from app.common.exceptions import NotFoundError
from app.sandbox.executor import execute_code_remote
from app.sandbox.models import CodeChallenge, CodeSubmission, SubmissionStatus, TestCase


async def get_challenge_by_lesson(db: AsyncSession, lesson_id: uuid.UUID) -> CodeChallenge:
    result = await db.execute(
        select(CodeChallenge)
        .where(CodeChallenge.lesson_id == lesson_id)
        .options(selectinload(CodeChallenge.test_cases))
    )
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise NotFoundError("Challenge not found for this lesson")
    return challenge


async def delete_challenge(db: AsyncSession, challenge_id: uuid.UUID) -> None:
    result = await db.execute(
        select(CodeChallenge).where(CodeChallenge.id == challenge_id)
    )
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise NotFoundError("Challenge not found")
    await db.delete(challenge)
    await db.flush()


async def update_challenge(db: AsyncSession, challenge_id: uuid.UUID, data: dict) -> CodeChallenge:
    result = await db.execute(
        select(CodeChallenge).where(CodeChallenge.id == challenge_id)
    )
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise NotFoundError("Challenge not found")
    for field, value in data.items():
        if hasattr(challenge, field) and value is not None:
            setattr(challenge, field, value)
    await db.flush()
    result = await db.execute(
        select(CodeChallenge)
        .where(CodeChallenge.id == challenge_id)
        .options(selectinload(CodeChallenge.test_cases))
    )
    return result.scalar_one()


async def delete_test_case(db: AsyncSession, test_case_id: uuid.UUID) -> None:
    result = await db.execute(
        select(TestCase).where(TestCase.id == test_case_id)
    )
    tc = result.scalar_one_or_none()
    if not tc:
        raise NotFoundError("Test case not found")
    await db.delete(tc)
    await db.flush()


async def get_challenge(db: AsyncSession, challenge_id: uuid.UUID) -> CodeChallenge:
    result = await db.execute(
        select(CodeChallenge)
        .where(CodeChallenge.id == challenge_id)
        .options(selectinload(CodeChallenge.test_cases))
    )
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise NotFoundError("Challenge not found")
    return challenge


async def create_challenge(db: AsyncSession, data: dict) -> CodeChallenge:
    challenge = CodeChallenge(**data)
    db.add(challenge)
    await db.flush()
    result = await db.execute(
        select(CodeChallenge)
        .where(CodeChallenge.id == challenge.id)
        .options(selectinload(CodeChallenge.test_cases))
    )
    return result.scalar_one()


async def add_test_case(db: AsyncSession, challenge_id: uuid.UUID, data: dict) -> TestCase:
    test_case = TestCase(challenge_id=challenge_id, **data)
    db.add(test_case)
    await db.flush()
    return test_case


async def submit_code(
    db: AsyncSession, challenge_id: uuid.UUID, source_code: str, language: str, user: User
) -> CodeSubmission:
    challenge = await get_challenge(db, challenge_id)

    submission = CodeSubmission(
        challenge_id=challenge_id,
        student_id=user.id,
        source_code=source_code,
        language=language,
        status=SubmissionStatus.running,
        submitted_at=datetime.now(timezone.utc),
        total_tests=len(challenge.test_cases),
    )
    db.add(submission)
    await db.flush()

    # Run against each test case
    results = []
    total_passed = 0

    for tc in challenge.test_cases:
        exec_result = await execute_code_remote(
            language=language,
            source_code=source_code,
            stdin=tc.input,
            timeout_seconds=challenge.time_limit_seconds,
            memory_limit_mb=challenge.memory_limit_mb,
        )

        actual_output = exec_result.get("stdout", "").strip()
        expected = tc.expected_output.strip()
        passed = actual_output == expected and exec_result.get("status") == "success"

        if passed:
            total_passed += 1

        results.append({
            "test_case_id": str(tc.id),
            "passed": passed,
            "actual_output": actual_output if not tc.is_hidden else "",
            "time_ms": exec_result.get("execution_time_ms", 0),
        })

    submission.results = results
    submission.total_passed = total_passed
    submission.execution_time_ms = sum(r.get("time_ms", 0) for r in results)
    submission.status = (
        SubmissionStatus.passed if total_passed == len(challenge.test_cases)
        else SubmissionStatus.failed
    )

    await db.flush()

    # Award XP for passing code challenge
    if submission.status == SubmissionStatus.passed:
        try:
            from app.gamification.service import award_xp, XP_CODE_CHALLENGE_PASSED
            await award_xp(db, user.id, XP_CODE_CHALLENGE_PASSED, "code_challenge_passed")
        except Exception:
            pass

    return submission
