"""Tests for the per-student profile endpoint + aggregation.

Covers:
  - aggregation across the three submission models (counts, avg score,
    pass rate, avg attempts, avg time), enrollments, gamification, certificates
  - RBAC: owner-teacher 200, other-teacher 403, cross-org 404, methodist 200,
    admin (org) 200, student/parent 403
"""
import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient

from app.assessments.models import Quiz, QuizSubmission
from app.assignments.models import AssignmentStatus, AssignmentSubmission
from app.auth.models import User, UserRole
from app.certificates.models import Certificate
from app.exercises.models import ExerciseSubmission
from app.gamification.models import Badge, UserBadge, UserStreak
from tests.conftest import (
    auth_header,
    make_assignment,
    make_course,
    make_enrollment,
    make_exercise,
    make_lesson,
    make_module,
)


# ── local helpers ──────────────────────────────────────────────────────────


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


async def _seed_full_student(db, org, teacher, student):
    """Enroll + create one exercise, quiz, and assignment submission each."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    await make_enrollment(db, course.id, student.id)

    exercise = await make_exercise(db, lesson.id, org.id, title="Ex 1")
    db.add(
        ExerciseSubmission(
            exercise_id=exercise.id,
            student_id=student.id,
            answers={},
            score=80,
            passed=True,
            attempt_number=2,
            time_spent_seconds=60,
            submitted_at=datetime(2026, 5, 1, tzinfo=timezone.utc),
        )
    )

    quiz = await _make_quiz(db, lesson.id, title="Quiz 1")
    db.add(
        QuizSubmission(
            quiz_id=quiz.id,
            student_id=student.id,
            answers={},
            score=40,
            passed=False,
            attempt_number=1,
            time_spent_seconds=90,
            submitted_at=datetime(2026, 5, 2, tzinfo=timezone.utc),
        )
    )

    assignment = await make_assignment(db, org.id, course.id, teacher.id, title="HW 1")
    db.add(
        AssignmentSubmission(
            assignment_id=assignment.id,
            student_id=student.id,
            content="my answer",
            score=95,
            status=AssignmentStatus.graded,
            attempt_number=1,
            time_spent_seconds=300,
            submitted_at=datetime(2026, 5, 3, tzinfo=timezone.utc),
        )
    )
    await db.flush()
    return course, quiz


# ── Aggregation ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_profile_aggregates_all_sections(
    client: AsyncClient, db, org, teacher, student
):
    course, quiz = await _seed_full_student(db, org, teacher, student)

    # Gamification
    db.add(UserStreak(user_id=student.id, current_streak=3, longest_streak=7, total_xp=500))
    badge = Badge(org_id=org.id, name="Starter", icon="star", criteria_key="first_lesson")
    db.add(badge)
    await db.flush()
    db.add(UserBadge(user_id=student.id, badge_id=badge.id, earned_at=datetime.now(timezone.utc)))
    # Certificate
    db.add(
        Certificate(
            user_id=student.id,
            course_id=course.id,
            certificate_number=f"CERT-{uuid.uuid4().hex[:6]}",
            issued_at=datetime.now(timezone.utc),
        )
    )
    await db.flush()

    resp = await client.get(
        f"/api/v1/admin/students/{student.id}/profile", headers=auth_header(teacher)
    )
    assert resp.status_code == 200
    body = resp.json()

    # Identity
    assert body["student"]["id"] == str(student.id)
    assert body["student"]["email"] == student.email
    assert body["student"]["role"] == "student"

    # Enrollments
    assert len(body["enrollments"]) == 1
    assert body["enrollments"][0]["course_id"] == str(course.id)

    # Submissions summary
    ex = body["submissions"]["exercises"]
    assert ex["total"] == 1 and ex["avg_score"] == 80.0
    assert ex["pass_rate"] == 1.0 and ex["avg_attempts"] == 2.0
    assert ex["avg_time_spent_seconds"] == 60.0

    qz = body["submissions"]["quizzes"]
    assert qz["total"] == 1 and qz["avg_score"] == 40.0 and qz["pass_rate"] == 0.0

    asg = body["submissions"]["assignments"]
    assert asg["total"] == 1 and asg["avg_score"] == 95.0 and asg["pass_rate"] is None

    assert body["total_submissions"] == 3

    # Recent list — sorted newest-first; assignment (2026-05-03) is first.
    assert len(body["recent_submissions"]) == 3
    assert body["recent_submissions"][0]["task_type"] == "assignment"
    # Quiz row carries quiz_id for the breakdown link.
    quiz_row = next(r for r in body["recent_submissions"] if r["task_type"] == "quiz")
    assert quiz_row["quiz_id"] == str(quiz.id)

    # Gamification
    assert body["gamification"]["total_xp"] == 500
    assert body["gamification"]["current_streak"] == 3
    assert body["gamification"]["longest_streak"] == 7
    assert len(body["gamification"]["badges"]) == 1
    assert body["gamification"]["badges"][0]["name"] == "Starter"

    # Certificates
    assert len(body["certificates"]) == 1
    assert body["certificates"][0]["course_id"] == str(course.id)


@pytest.mark.asyncio
async def test_profile_empty_student_defaults(
    client: AsyncClient, db, org, admin, student
):
    """A student with no activity yields zeroed sections, not errors."""
    resp = await client.get(
        f"/api/v1/admin/students/{student.id}/profile", headers=auth_header(admin)
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["enrollments"] == []
    assert body["total_submissions"] == 0
    assert body["submissions"]["exercises"]["avg_score"] is None
    assert body["gamification"]["total_xp"] == 0
    assert body["certificates"] == []


# ── RBAC ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_owner_teacher_200(client: AsyncClient, db, org, teacher, student):
    course = await make_course(db, org, teacher)
    await make_enrollment(db, course.id, student.id)
    resp = await client.get(
        f"/api/v1/admin/students/{student.id}/profile", headers=auth_header(teacher)
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_other_teacher_403(client: AsyncClient, db, org, teacher, student):
    """A teacher who does not teach this student (same org) is forbidden."""
    # student is enrolled in teacher's course
    course = await make_course(db, org, teacher)
    await make_enrollment(db, course.id, student.id)

    other_teacher = _new_user(db, org, UserRole.teacher, suffix="other")
    await db.flush()

    resp = await client.get(
        f"/api/v1/admin/students/{student.id}/profile",
        headers=auth_header(other_teacher),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_cross_org_404(client: AsyncClient, db, org, org2, teacher):
    """A student in another org is reported as not found (existence hidden)."""
    foreign_student = await _student(db, org2, suffix="foreign")
    resp = await client.get(
        f"/api/v1/admin/students/{foreign_student.id}/profile",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_methodist_org_200(client: AsyncClient, db, org, student):
    """A methodist sees any student in their org without teaching them."""
    methodist = _new_user(db, org, UserRole.teacher, is_methodist=True, suffix="meth")
    await db.flush()
    resp = await client.get(
        f"/api/v1/admin/students/{student.id}/profile", headers=auth_header(methodist)
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_admin_org_200(client: AsyncClient, db, org, admin, student):
    resp = await client.get(
        f"/api/v1/admin/students/{student.id}/profile", headers=auth_header(admin)
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_super_admin_cross_org_200(client: AsyncClient, db, org2, super_admin):
    foreign_student = await _student(db, org2, suffix="foreign2")
    resp = await client.get(
        f"/api/v1/admin/students/{foreign_student.id}/profile",
        headers=auth_header(super_admin),
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_student_forbidden(client: AsyncClient, db, org, student):
    other_student = await _student(db, org, suffix="other")
    resp = await client.get(
        f"/api/v1/admin/students/{other_student.id}/profile",
        headers=auth_header(student),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_parent_forbidden(client: AsyncClient, db, org, parent, student):
    resp = await client.get(
        f"/api/v1/admin/students/{student.id}/profile", headers=auth_header(parent)
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_non_student_target_404(client: AsyncClient, db, org, admin, teacher):
    """Requesting a non-student user's profile returns 404."""
    resp = await client.get(
        f"/api/v1/admin/students/{teacher.id}/profile", headers=auth_header(admin)
    )
    assert resp.status_code == 404
