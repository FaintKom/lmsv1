"""The last three places where "my course" meant "the one I created" — specs/064.

specs/061 settled the definition, #464 widened the shared clause, #467 and
specs/063 carried it through the admin router and attendance. A grep for the
narrow test across the whole backend turned up three survivors, and each one
locked a teacher out of their own work:

  - the group's own programme (journal pacing)
  - peer review on the course their group studies
  - marking a quiz set on that course

Each test opens with a positive control. "A stranger is refused" passes before
the endpoint exists; only the pair means anything.
"""

import uuid
from datetime import datetime, timezone

from app.admin.models import StudentGroup
from app.assessments.models import Quiz, QuizSubmission
from app.auth.models import User, UserRole
from app.auth.security import hash_password
from tests.conftest import (
    auth_header,
    make_course,
    make_enrollment,
    make_lesson,
    make_module,
)


async def _teacher(db, org, name):
    u = User(
        org_id=org.id,
        email=f"teacher-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("TestPass123!"),
        full_name=name,
        role=UserRole.teacher,
        is_active=True,
        consent_accepted_at=datetime.now(timezone.utc),
    )
    db.add(u)
    await db.flush()
    return u


async def _pupil(db, org, name):
    u = User(
        org_id=org.id,
        email=f"pupil-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("TestPass123!"),
        full_name=name,
        role=UserRole.student,
        is_active=True,
        consent_accepted_at=datetime.now(timezone.utc),
    )
    db.add(u)
    await db.flush()
    return u


async def _group_on(db, org, teacher, course):
    g = StudentGroup(
        org_id=org.id,
        name=f"Group {uuid.uuid4().hex[:6]}",
        teacher_id=teacher.id,
        course_id=course.id,
    )
    db.add(g)
    await db.flush()
    return g


# ── The group's own programme ─────────────────────────────────────────────


async def test_pacing_opens_for_the_teacher_of_that_group(client, org, db):
    owner = await _teacher(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    leader = await _teacher(db, org, "Group Leader")
    group = await _group_on(db, org, leader, course)

    resp = await client.get(f"/api/v1/journal/pacing/{group.id}", headers=auth_header(leader))
    assert resp.status_code == 200, resp.text


async def test_pacing_stays_shut_for_a_stranger(client, org, db):
    owner = await _teacher(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    group = await _group_on(db, org, owner, course)

    # Positive control: the course owner reads it.
    mine = await client.get(f"/api/v1/journal/pacing/{group.id}", headers=auth_header(owner))
    assert mine.status_code == 200, mine.text

    stranger = await _teacher(db, org, "Stranger")
    resp = await client.get(f"/api/v1/journal/pacing/{group.id}", headers=auth_header(stranger))
    assert resp.status_code == 403, resp.text


# ── Peer review on the course my group studies ────────────────────────────


async def test_peer_review_opens_for_a_course_i_lead_through_a_group(client, org, db):
    owner = await _teacher(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    leader = await _teacher(db, org, "Group Leader")
    await _group_on(db, org, leader, course)

    resp = await client.get(
        f"/api/v1/peer-review/assignments?course_id={course.id}",
        headers=auth_header(leader),
    )
    assert resp.status_code == 200, resp.text


async def test_peer_review_stays_shut_for_a_stranger(client, org, db):
    owner = await _teacher(db, org, "Course Owner")
    course = await make_course(db, org, owner)

    # Positive control: the owner reads their own.
    mine = await client.get(
        f"/api/v1/peer-review/assignments?course_id={course.id}",
        headers=auth_header(owner),
    )
    assert mine.status_code == 200, mine.text

    stranger = await _teacher(db, org, "Stranger")
    resp = await client.get(
        f"/api/v1/peer-review/assignments?course_id={course.id}",
        headers=auth_header(stranger),
    )
    assert resp.status_code == 403, resp.text


# ── Marking a quiz set on that course ─────────────────────────────────────


async def _quiz_with_submission(db, course, pupil):
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    quiz = Quiz(lesson_id=lesson.id, title="Checkpoint", passing_score=70)
    db.add(quiz)
    await db.flush()
    now = datetime.now(timezone.utc)
    db.add(
        QuizSubmission(
            quiz_id=quiz.id,
            student_id=pupil.id,
            answers={},
            score=80,
            passed=True,
            submitted_at=now,
            graded_at=now,
            attempt_number=1,
            time_spent_seconds=50,
        )
    )
    await db.flush()
    return quiz


async def test_quiz_breakdown_opens_for_a_course_i_lead_through_a_group(client, org, db):
    owner = await _teacher(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    pupil = await _pupil(db, org, "Group Pupil")
    await make_enrollment(db, course.id, pupil.id)
    quiz = await _quiz_with_submission(db, course, pupil)

    leader = await _teacher(db, org, "Group Leader")
    await _group_on(db, org, leader, course)

    resp = await client.get(
        f"/api/v1/assessments/quizzes/{quiz.id}/students/{pupil.id}/breakdown",
        headers=auth_header(leader),
    )
    assert resp.status_code == 200, resp.text


async def test_quiz_breakdown_stays_shut_for_a_stranger(client, org, db):
    owner = await _teacher(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    pupil = await _pupil(db, org, "Owners Pupil")
    await make_enrollment(db, course.id, pupil.id)
    quiz = await _quiz_with_submission(db, course, pupil)

    # Positive control: the owner reads the same breakdown.
    mine = await client.get(
        f"/api/v1/assessments/quizzes/{quiz.id}/students/{pupil.id}/breakdown",
        headers=auth_header(owner),
    )
    assert mine.status_code == 200, mine.text

    stranger = await _teacher(db, org, "Stranger")
    resp = await client.get(
        f"/api/v1/assessments/quizzes/{quiz.id}/students/{pupil.id}/breakdown",
        headers=auth_header(stranger),
    )
    assert resp.status_code == 403, resp.text
