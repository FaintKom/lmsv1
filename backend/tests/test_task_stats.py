"""Phase 2 — task statistics for methodists.

Covers:
  - Part A: quiz + assignment submissions store the new time-on-task /
    attempt_number fields when elapsed_seconds is sent; still 200 without it.
  - Part B: aggregation correctness (counts, pass_rate, avg_attempts, avg_time
    with NULLs excluded) across the three submission models; RBAC + cross-org
    isolation (teacher = own courses, methodist = org, admin = org, super_admin
    = global, student/parent forbidden).
"""
import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient

from app.analytics import task_stats_service as svc
from app.assessments.models import Quiz, QuizSubmission
from app.assignments.models import AssignmentStatus, AssignmentSubmission
from app.auth.models import User, UserRole
from app.exercises.models import ExerciseSubmission, ExerciseType
from tests.conftest import (
    auth_header,
    make_assignment,
    make_course,
    make_enrollment,
    make_exercise,
    make_lesson,
    make_module,
)


# ── local fixtures ───────────────────────────────────────────────────────


def _new_user(db, org, role, *, is_methodist=False, suffix=""):
    from app.auth.security import hash_password

    u = User(
        org_id=org.id,
        email=f"{role.value}{suffix}-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("TestPass123!"),
        full_name=f"Test {role.value}{suffix}",
        role=role,
        is_active=True,
        is_methodist=is_methodist,
        consent_accepted_at=datetime.now(timezone.utc),
        privacy_policy_version="1.0",
    )
    db.add(u)
    return u


async def _student(db, org, suffix=""):
    u = _new_user(db, org, UserRole.student, suffix=suffix)
    await db.flush()
    return u


async def _make_quiz(db, lesson_id, title="Quiz", passing_score=70):
    q = Quiz(lesson_id=lesson_id, title=title, passing_score=passing_score)
    db.add(q)
    await db.flush()
    return q


# ───────────────────────────────────────────────────────────────────────
# Part A — instrumentation
# ───────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_quiz_submit_stores_timing(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await _make_quiz(db, lesson.id)

    resp = await client.post(
        f"/api/v1/assessments/quizzes/{quiz.id}/submit",
        json={"answers": [], "elapsed_seconds": 120},
        headers=auth_header(student),
    )
    assert resp.status_code == 200

    row = (
        await db.execute(
            QuizSubmission.__table__.select().where(QuizSubmission.quiz_id == quiz.id)
        )
    ).first()
    assert row.time_spent_seconds == 120
    assert row.started_at is not None
    assert row.attempt_number == 1


@pytest.mark.asyncio
async def test_quiz_submit_clamps_garbage(client: AsyncClient, student, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await _make_quiz(db, lesson.id)

    resp = await client.post(
        f"/api/v1/assessments/quizzes/{quiz.id}/submit",
        json={"answers": [], "elapsed_seconds": 999999},  # > 24h
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    row = (
        await db.execute(
            QuizSubmission.__table__.select().where(QuizSubmission.quiz_id == quiz.id)
        )
    ).first()
    assert row.time_spent_seconds == 86400


@pytest.mark.asyncio
async def test_quiz_submit_without_elapsed_still_200_null(
    client: AsyncClient, student, teacher, org, db
):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await _make_quiz(db, lesson.id)

    resp = await client.post(
        f"/api/v1/assessments/quizzes/{quiz.id}/submit",
        json={"answers": []},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    row = (
        await db.execute(
            QuizSubmission.__table__.select().where(QuizSubmission.quiz_id == quiz.id)
        )
    ).first()
    assert row.time_spent_seconds is None
    assert row.started_at is None
    # attempt_number is always stamped (>=1) even without elapsed.
    assert row.attempt_number == 1


@pytest.mark.asyncio
async def test_quiz_attempt_number_increments(
    client: AsyncClient, student, teacher, org, db
):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await _make_quiz(db, lesson.id)

    for _ in range(3):
        resp = await client.post(
            f"/api/v1/assessments/quizzes/{quiz.id}/submit",
            json={"answers": []},
            headers=auth_header(student),
        )
        assert resp.status_code == 200

    rows = (
        await db.execute(
            QuizSubmission.__table__.select()
            .where(QuizSubmission.quiz_id == quiz.id)
            .order_by(QuizSubmission.attempt_number)
        )
    ).all()
    assert [r.attempt_number for r in rows] == [1, 2, 3]


@pytest.mark.asyncio
async def test_assignment_submit_stores_timing(
    client: AsyncClient, student, teacher, org, db
):
    course = await make_course(db, org, teacher)
    assignment = await make_assignment(db, org.id, course.id, teacher.id)

    resp = await client.post(
        f"/api/v1/assignments/{assignment.id}/submit",
        data={"content": "answer", "elapsed_seconds": "300"},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    row = (
        await db.execute(
            AssignmentSubmission.__table__.select().where(
                AssignmentSubmission.assignment_id == assignment.id
            )
        )
    ).first()
    assert row.time_spent_seconds == 300
    assert row.started_at is not None
    assert row.attempt_number == 1


@pytest.mark.asyncio
async def test_assignment_submit_without_elapsed_still_200_null(
    client: AsyncClient, student, teacher, org, db
):
    course = await make_course(db, org, teacher)
    assignment = await make_assignment(db, org.id, course.id, teacher.id)

    resp = await client.post(
        f"/api/v1/assignments/{assignment.id}/submit",
        data={"content": "answer"},
        headers=auth_header(student),
    )
    assert resp.status_code == 200
    row = (
        await db.execute(
            AssignmentSubmission.__table__.select().where(
                AssignmentSubmission.assignment_id == assignment.id
            )
        )
    ).first()
    assert row.time_spent_seconds is None
    assert row.attempt_number == 1


@pytest.mark.asyncio
async def test_assignment_resubmit_bumps_attempt(
    client: AsyncClient, student, teacher, org, db
):
    course = await make_course(db, org, teacher)
    assignment = await make_assignment(db, org.id, course.id, teacher.id)

    for _ in range(2):
        resp = await client.post(
            f"/api/v1/assignments/{assignment.id}/submit",
            data={"content": "answer", "elapsed_seconds": "60"},
            headers=auth_header(student),
        )
        assert resp.status_code == 200

    row = (
        await db.execute(
            AssignmentSubmission.__table__.select().where(
                AssignmentSubmission.assignment_id == assignment.id
            )
        )
    ).first()
    # One row reused on resubmit → attempt_number bumped to 2.
    assert row.attempt_number == 2


# ───────────────────────────────────────────────────────────────────────
# Part B — aggregation correctness
# ───────────────────────────────────────────────────────────────────────


def _ex_sub(exercise_id, student_id, *, passed, attempt, time):
    return ExerciseSubmission(
        exercise_id=exercise_id,
        student_id=student_id,
        answers={},
        score=100 if passed else 0,
        passed=passed,
        status="graded",
        submitted_at=datetime.now(timezone.utc),
        graded_at=datetime.now(timezone.utc),
        attempt_number=attempt,
        time_spent_seconds=time,
    )


@pytest.mark.asyncio
async def test_exercise_aggregation_counts_and_rates(db, org, teacher):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(
        db, lesson.id, org.id, exercise_type=ExerciseType.quiz, title="Agg Ex"
    )
    s1 = await _student(db, org, suffix="a")
    s2 = await _student(db, org, suffix="b")
    await make_enrollment(db, course.id, s1.id)
    await make_enrollment(db, course.id, s2.id)

    # s1: 2 attempts (fail then pass), times 100 & 200
    db.add(_ex_sub(ex.id, s1.id, passed=False, attempt=1, time=100))
    db.add(_ex_sub(ex.id, s1.id, passed=True, attempt=2, time=200))
    # s2: 1 attempt (pass), time NULL (excluded from avg/median)
    db.add(_ex_sub(ex.id, s2.id, passed=True, attempt=1, time=None))
    await db.flush()

    data = await svc.get_course_task_stats(db, teacher, course.id)
    task = next(t for t in data["tasks"] if t["task_id"] == ex.id)

    assert task["total_submissions"] == 3
    assert task["unique_students"] == 2
    assert task["success_count"] == 2
    assert task["failure_count"] == 1
    # pass_rate = passed(2) / graded(3)
    assert task["pass_rate"] == pytest.approx(2 / 3, abs=1e-3)
    # avg_attempts = mean(1,2,1) = 1.333
    assert task["avg_attempts"] == pytest.approx(1.33, abs=0.01)
    # avg_time over non-NULL (100, 200) = 150; NULL excluded
    assert task["avg_time_spent_seconds"] == pytest.approx(150.0, abs=0.1)
    assert task["median_time_spent_seconds"] == pytest.approx(150.0, abs=0.1)
    # completion_rate = unique(2) / enrolled(2) = 1.0
    assert task["completion_rate"] == pytest.approx(1.0, abs=1e-3)
    assert data["enrolled_students"] == 2


@pytest.mark.asyncio
async def test_quiz_aggregation_via_service(db, org, teacher):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = await _make_quiz(db, lesson.id, title="Agg Quiz")
    s1 = await _student(db, org, suffix="q1")

    now = datetime.now(timezone.utc)
    db.add(QuizSubmission(quiz_id=quiz.id, student_id=s1.id, answers={}, score=80,
                          passed=True, submitted_at=now, graded_at=now,
                          attempt_number=1, time_spent_seconds=50))
    db.add(QuizSubmission(quiz_id=quiz.id, student_id=s1.id, answers={}, score=40,
                          passed=False, submitted_at=now, graded_at=now,
                          attempt_number=2, time_spent_seconds=None))
    await db.flush()

    data = await svc.get_course_task_stats(db, teacher, course.id)
    task = next(t for t in data["tasks"] if t["task_id"] == quiz.id)
    assert task["task_type"] == "quiz"
    assert task["total_submissions"] == 2
    assert task["unique_students"] == 1
    assert task["pass_rate"] == pytest.approx(0.5, abs=1e-3)
    assert task["avg_time_spent_seconds"] == pytest.approx(50.0, abs=0.1)


@pytest.mark.asyncio
async def test_assignment_aggregation_via_service(db, org, teacher):
    course = await make_course(db, org, teacher)
    assignment = await make_assignment(db, org.id, course.id, teacher.id, title="Agg HW")
    s1 = await _student(db, org, suffix="h1")
    now = datetime.now(timezone.utc)
    # graded (score set) + ungraded (score NULL)
    db.add(AssignmentSubmission(assignment_id=assignment.id, student_id=s1.id,
                                content="x", submitted_at=now,
                                status=AssignmentStatus.graded, score=90,
                                attempt_number=1, time_spent_seconds=400))
    await db.flush()
    s2 = await _student(db, org, suffix="h2")
    db.add(AssignmentSubmission(assignment_id=assignment.id, student_id=s2.id,
                                content="y", submitted_at=now,
                                status=AssignmentStatus.submitted, score=None,
                                attempt_number=1, time_spent_seconds=None))
    await db.flush()

    data = await svc.get_course_task_stats(db, teacher, course.id)
    task = next(t for t in data["tasks"] if t["task_id"] == assignment.id)
    assert task["task_type"] == "assignment"
    assert task["total_submissions"] == 2
    assert task["unique_students"] == 2
    assert task["success_count"] == 1  # one graded
    # pass_rate = graded(1) / total(2)
    assert task["pass_rate"] == pytest.approx(0.5, abs=1e-3)
    assert task["avg_time_spent_seconds"] == pytest.approx(400.0, abs=0.1)


@pytest.mark.asyncio
async def test_course_stats_includes_all_three_types(db, org, teacher):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id, exercise_type=ExerciseType.quiz)
    quiz = await _make_quiz(db, lesson.id)
    assignment = await make_assignment(db, org.id, course.id, teacher.id)
    await db.flush()

    data = await svc.get_course_task_stats(db, teacher, course.id)
    types = {t["task_type"] for t in data["tasks"]}
    ids = {t["task_id"] for t in data["tasks"]}
    assert types == {"exercise", "quiz", "assignment"}
    assert {ex.id, quiz.id, assignment.id} <= ids


# ───────────────────────────────────────────────────────────────────────
# Part B — RBAC / scoping
# ───────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_teacher_cannot_see_other_teachers_course(db, org):
    teacher_a = _new_user(db, org, UserRole.teacher, suffix="A")
    teacher_b = _new_user(db, org, UserRole.teacher, suffix="B")
    await db.flush()
    course_b = await make_course(db, org, teacher_b)

    with pytest.raises(svc.TaskStatsError) as exc:
        await svc.get_course_task_stats(db, teacher_a, course_b.id)
    assert exc.value.code == "forbidden"


@pytest.mark.asyncio
async def test_teacher_can_see_own_course(db, org):
    teacher_a = _new_user(db, org, UserRole.teacher, suffix="own")
    await db.flush()
    course = await make_course(db, org, teacher_a)
    data = await svc.get_course_task_stats(db, teacher_a, course.id)
    assert data["course_id"] == course.id


@pytest.mark.asyncio
async def test_methodist_sees_any_org_course(db, org):
    methodist = _new_user(db, org, UserRole.teacher, is_methodist=True, suffix="m")
    other_teacher = _new_user(db, org, UserRole.teacher, suffix="o")
    await db.flush()
    course = await make_course(db, org, other_teacher)

    # Methodist is NOT the course owner but sees it (org-wide).
    data = await svc.get_course_task_stats(db, methodist, course.id)
    assert data["course_id"] == course.id


@pytest.mark.asyncio
async def test_admin_sees_org_course(db, org, admin):
    teacher = _new_user(db, org, UserRole.teacher, suffix="adm")
    await db.flush()
    course = await make_course(db, org, teacher)
    data = await svc.get_course_task_stats(db, admin, course.id)
    assert data["course_id"] == course.id


@pytest.mark.asyncio
async def test_cross_org_isolation_returns_not_found(db, org, org2):
    teacher_org2 = _new_user(db, org2, UserRole.teacher, suffix="x")
    methodist_org1 = _new_user(db, org, UserRole.teacher, is_methodist=True, suffix="m1")
    await db.flush()
    course_org2 = await make_course(db, org2, teacher_org2)

    # Methodist in org1 must NOT see a course in org2 (404, existence hidden).
    with pytest.raises(svc.TaskStatsError) as exc:
        await svc.get_course_task_stats(db, methodist_org1, course_org2.id)
    assert exc.value.code == "not_found"


@pytest.mark.asyncio
async def test_super_admin_sees_cross_org(db, org, org2, super_admin):
    teacher_org2 = _new_user(db, org2, UserRole.teacher, suffix="sa")
    await db.flush()
    course_org2 = await make_course(db, org2, teacher_org2)
    data = await svc.get_course_task_stats(db, super_admin, course_org2.id)
    assert data["course_id"] == course_org2.id


@pytest.mark.asyncio
async def test_student_forbidden(db, org, teacher, student):
    course = await make_course(db, org, teacher)
    with pytest.raises(svc.TaskStatsError) as exc:
        await svc.get_course_task_stats(db, student, course.id)
    assert exc.value.code == "forbidden"


@pytest.mark.asyncio
async def test_endpoint_rbac_via_http(client: AsyncClient, db, org, teacher, student):
    course = await make_course(db, org, teacher)
    # Teacher (owner) → 200
    ok = await client.get(
        f"/api/v1/analytics/task-stats/courses/{course.id}",
        headers=auth_header(teacher),
    )
    assert ok.status_code == 200
    # Student → 403
    forbidden = await client.get(
        f"/api/v1/analytics/task-stats/courses/{course.id}",
        headers=auth_header(student),
    )
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_lesson_and_detail_endpoints(client: AsyncClient, db, org, teacher):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id, exercise_type=ExerciseType.quiz)
    s1 = await _student(db, org, suffix="d")
    db.add(_ex_sub(ex.id, s1.id, passed=True, attempt=1, time=120))
    await db.flush()

    lesson_resp = await client.get(
        f"/api/v1/analytics/task-stats/lessons/{lesson.id}",
        headers=auth_header(teacher),
    )
    assert lesson_resp.status_code == 200
    assert any(t["task_id"] == str(ex.id) for t in lesson_resp.json()["tasks"])

    detail_resp = await client.get(
        f"/api/v1/analytics/task-stats/exercise/{ex.id}?timeline=true",
        headers=auth_header(teacher),
    )
    assert detail_resp.status_code == 200
    body = detail_resp.json()
    assert body["stats"]["task_id"] == str(ex.id)
    assert len(body["timeline"]) >= 1
