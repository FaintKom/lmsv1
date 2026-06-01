"""Student activity-of-day — compute-only aggregate over existing submissions.

Covers:
  - KPIs + lessons grouping + result mapping for a seeded day of work
    (correct / partial / wrong / theory-"done" exercises, a quiz, an
    assignment), and the chronological event timeline.
  - an empty day → zeroed KPIs + empty lessons/timeline + a note (no 404).
  - RBAC: a teacher cannot see a student outside their own courses (403);
    cross-org is hidden as 404; student/parent are rejected at the gate.
"""
import uuid
from datetime import date, datetime, time, timezone

import pytest

from app.assessments.models import Quiz, QuizSubmission
from app.assignments.models import AssignmentStatus, AssignmentSubmission
from app.auth.models import User, UserRole
from app.auth.security import hash_password
from app.exercises.models import ExerciseSubmission
from app.progress.models import Enrollment, LessonProgress, LessonStatus  # noqa: F401
from tests.conftest import (
    auth_header,
    make_assignment,
    make_course,
    make_enrollment,
    make_exercise,
    make_lesson,
    make_module,
)

DAY = date(2026, 5, 20)
OTHER_DAY = date(2026, 5, 21)


def _at(d: date, hh: int, mm: int) -> datetime:
    return datetime.combine(d, time(hh, mm), tzinfo=timezone.utc)


async def _new_user(db, org, role, *, is_methodist=False, suffix=""):
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
    await db.flush()
    return u


async def _make_quiz(db, lesson_id, title="Mini-test"):
    q = Quiz(lesson_id=lesson_id, title=title, passing_score=70)
    db.add(q)
    await db.flush()
    return q


# ── happy path: KPIs + grouping + result mapping + timeline ──────────────────


@pytest.mark.asyncio
async def test_activity_kpis_grouping_and_result_mapping(client, teacher, org, db):
    course = await make_course(db, org, teacher, title="Math 3A")
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id, title="Fractions — intro")
    student = await _new_user(db, org, UserRole.student, suffix="s")
    enr = await make_enrollment(db, course.id, student.id)

    # The student completed the lesson on DAY → attended.
    db.add(
        LessonProgress(
            enrollment_id=enr.id,
            lesson_id=lesson.id,
            status=LessonStatus.completed,
            completed_at=_at(DAY, 9, 5),
        )
    )

    # Four exercises in that lesson with distinct verdicts → distinct results.
    ex_theory = await make_exercise(db, lesson.id, org.id, title="What is a fraction?")
    ex_ok = await make_exercise(db, lesson.id, org.id, title="Identify the fraction")
    ex_part = await make_exercise(db, lesson.id, org.id, title="Compare fractions")
    ex_bad = await make_exercise(db, lesson.id, org.id, title="Shade 3/4")

    # theory: no score, no verdict → "done"
    db.add(ExerciseSubmission(
        exercise_id=ex_theory.id, student_id=student.id,
        submitted_at=_at(DAY, 9, 10), time_spent_seconds=60,
    ))
    # correct: passed=True, items 5/5
    db.add(ExerciseSubmission(
        exercise_id=ex_ok.id, student_id=student.id, passed=True, score=100,
        total_passed=5, total_tests=5,
        submitted_at=_at(DAY, 9, 15), time_spent_seconds=120,
    ))
    # partial: score only (60), no boolean verdict → "partial"
    db.add(ExerciseSubmission(
        exercise_id=ex_part.id, student_id=student.id, score=60,
        submitted_at=_at(DAY, 9, 20), time_spent_seconds=90,
    ))
    # wrong: passed=False
    db.add(ExerciseSubmission(
        exercise_id=ex_bad.id, student_id=student.id, passed=False, score=20,
        submitted_at=_at(DAY, 9, 25), time_spent_seconds=30,
    ))

    # A quiz on the same lesson, passed → "correct".
    quiz = await _make_quiz(db, lesson.id)
    db.add(QuizSubmission(
        quiz_id=quiz.id, student_id=student.id, passed=True, score=90,
        submitted_at=_at(DAY, 9, 30), time_spent_seconds=300,
    ))

    # A graded assignment (course-level) scoring 50/100 → "partial".
    assignment = await make_assignment(db, org.id, course.id, teacher.id, max_score=100)
    db.add(AssignmentSubmission(
        assignment_id=assignment.id, student_id=student.id,
        status=AssignmentStatus.graded, score=50,
        submitted_at=_at(DAY, 10, 0), time_spent_seconds=600,
    ))
    await db.flush()

    resp = await client.get(
        "/api/v1/journal/student-activity",
        params={"student_id": str(student.id), "date": DAY.isoformat()},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["student"]["id"] == str(student.id)
    assert data["date"] == DAY.isoformat()
    assert "note" not in data

    kpis = data["kpis"]
    # 6 submissions total (4 exercises + 1 quiz + 1 assignment).
    assert kpis["exercises_done"] == 6
    # Graded = correct(ex) + partial(ex) + wrong(ex) + correct(quiz) + partial(assign)
    #        = 5 graded; correct = 2 (ex_ok, quiz) → 40%.
    assert kpis["correct_pct"] == 40
    # XP = 2 correct * 12.
    assert kpis["xp_earned"] == 24
    # All submissions carried time → summed (60+120+90+30+300+600).
    assert kpis["time_spent_sec"] == 1200
    # Two lessons attended: the lesson (exercises+quiz) + the course-level
    # assignment bucket.
    assert kpis["lessons_attended"] == 2

    # Lesson bucket has the four exercises + quiz; results mapped correctly.
    lessons = data["lessons"]
    lesson_bucket = next(
        l for l in lessons if l["topic"] == "Fractions — intro"
    )
    assert lesson_bucket["attended"] is True
    by_title = {e["title"]: e for e in lesson_bucket["exercises"]}
    assert by_title["What is a fraction?"]["result"] == "done"
    assert by_title["Identify the fraction"]["result"] == "correct"
    assert by_title["Identify the fraction"]["items"] == "5/5"
    assert by_title["Compare fractions"]["result"] == "partial"
    assert by_title["Shade 3/4"]["result"] == "wrong"
    assert by_title["Mini-test"]["type"] == "quiz"
    assert by_title["Mini-test"]["result"] == "correct"

    # Course-level assignment bucket (topic None, lesson_id None).
    assign_bucket = next(l for l in lessons if l["lesson_id"] is None)
    assert assign_bucket["exercises"][0]["type"] == "assignment"
    assert assign_bucket["exercises"][0]["result"] == "partial"

    # Timeline is chronological and includes the lesson-entry event.
    ats = [e["at"] for e in data["timeline"]]
    assert ats == sorted(ats)
    assert any(e["kind"] == "in" for e in data["timeline"])
    assert len(data["timeline"]) == 7  # 1 lesson + 4 ex + 1 quiz + 1 assign


# ── empty day ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_empty_day_returns_zeroed_kpis_and_note(client, teacher, org, db):
    student = await _new_user(db, org, UserRole.student, suffix="idle")
    # Make the student teachable: enroll in a course the teacher owns.
    course = await make_course(db, org, teacher)
    await make_enrollment(db, course.id, student.id)

    resp = await client.get(
        "/api/v1/journal/student-activity",
        params={"student_id": str(student.id), "date": OTHER_DAY.isoformat()},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["kpis"] == {
        "lessons_attended": 0,
        "exercises_done": 0,
        "correct_pct": 0,
        "time_spent_sec": 0,
        "xp_earned": 0,
    }
    assert data["lessons"] == []
    assert data["timeline"] == []
    assert data["note"]


# ── RBAC ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_teacher_cannot_see_out_of_scope_student(client, teacher, org, db):
    # Student enrolled only in a colleague's course → not teachable by `teacher`.
    colleague = await _new_user(db, org, UserRole.teacher, suffix="col")
    colleague_course = await make_course(db, org, colleague)
    student = await _new_user(db, org, UserRole.student, suffix="other")
    await make_enrollment(db, colleague_course.id, student.id)

    resp = await client.get(
        "/api/v1/journal/student-activity",
        params={"student_id": str(student.id), "date": DAY.isoformat()},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_methodist_sees_org_student(client, teacher, org, db):
    methodist = await _new_user(db, org, UserRole.teacher, is_methodist=True, suffix="m")
    course = await make_course(db, org, teacher)
    student = await _new_user(db, org, UserRole.student, suffix="any")
    await make_enrollment(db, course.id, student.id)

    resp = await client.get(
        "/api/v1/journal/student-activity",
        params={"student_id": str(student.id), "date": DAY.isoformat()},
        headers=auth_header(methodist),
    )
    assert resp.status_code == 200, resp.text


@pytest.mark.asyncio
async def test_cross_org_student_hidden_as_404(client, teacher, org, org2, db):
    other_admin = await _new_user(db, org2, UserRole.admin, suffix="o2")
    student = await _new_user(db, org, UserRole.student, suffix="ours")

    resp = await client.get(
        "/api/v1/journal/student-activity",
        params={"student_id": str(student.id), "date": DAY.isoformat()},
        headers=auth_header(other_admin),
    )
    assert resp.status_code == 404, resp.text


@pytest.mark.asyncio
async def test_student_and_parent_rejected(client, teacher, org, db):
    target = await _new_user(db, org, UserRole.student, suffix="target")
    student = await _new_user(db, org, UserRole.student, suffix="caller")
    parent = await _new_user(db, org, UserRole.parent, suffix="caller")

    for caller in (student, parent):
        resp = await client.get(
            "/api/v1/journal/student-activity",
            params={"student_id": str(target.id), "date": DAY.isoformat()},
            headers=auth_header(caller),
        )
        # Rejected at require_role(admin, teacher) dependency.
        assert resp.status_code in (401, 403), resp.text


@pytest.mark.asyncio
async def test_other_day_excluded(client, teacher, org, db):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id, title="One")
    student = await _new_user(db, org, UserRole.student, suffix="x")
    await make_enrollment(db, course.id, student.id)
    ex = await make_exercise(db, lesson.id, org.id)
    # Submitted on DAY only.
    db.add(ExerciseSubmission(
        exercise_id=ex.id, student_id=student.id, passed=True, score=100,
        submitted_at=_at(DAY, 12, 0),
    ))
    await db.flush()

    # Query OTHER_DAY → nothing.
    resp = await client.get(
        "/api/v1/journal/student-activity",
        params={"student_id": str(student.id), "date": OTHER_DAY.isoformat()},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["kpis"]["exercises_done"] == 0
