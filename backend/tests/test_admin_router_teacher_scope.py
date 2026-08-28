"""Six admin-router endpoints that still computed «mine» the old way — specs/063.

specs/061 settled what a teacher sees: the students of a group they lead plus
the students of a course they own. PR #464 widened the shared course clause and
#467 closed the roster and the group lists. These six kept their own answer.

Two of them made the interface contradict itself — the panel counted one way
and the page it links to counted another — and four let a teacher write outside
their own courses. Each test below opens with a positive control: «a stranger
is refused» goes green before the endpoint exists, which is a lesson this
project has already paid for once.
"""

import uuid
from datetime import datetime, timezone

from app.admin.models import StudentGroup
from app.assignments.models import AssignmentStatus, AssignmentSubmission
from app.auth.models import User, UserRole
from app.auth.security import hash_password
from tests.conftest import auth_header, make_assignment, make_course, make_enrollment


async def _staff(db, org, name, *, methodist=False):
    u = User(
        org_id=org.id,
        email=f"teacher-{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=hash_password("TestPass123!"),
        full_name=name,
        role=UserRole.teacher,
        is_active=True,
        is_methodist=methodist,
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


async def _lead_through_group(db, org, teacher, course):
    db.add(
        StudentGroup(
            org_id=org.id,
            name=f"Group {uuid.uuid4().hex[:6]}",
            teacher_id=teacher.id,
            course_id=course.id,
        )
    )
    await db.flush()


async def _ungraded_submission(db, org, course, author, pupil):
    assignment = await make_assignment(db, org.id, course.id, author.id)
    db.add(
        AssignmentSubmission(
            assignment_id=assignment.id,
            student_id=pupil.id,
            content="answer",
            submitted_at=datetime.now(timezone.utc),
            status=AssignmentStatus.submitted,
        )
    )
    await db.flush()
    return assignment


# ── Reads: the panel and the page it links to must agree ──────────────────


async def test_review_queue_follows_the_course_not_the_author(client, org, db):
    """The badge read 0 while the panel above it named a number.

    The queue filtered on ``Assignment.created_by``; a teacher leading somebody
    else's course through a group authors nothing there, so they were shown an
    empty list for work that was theirs to mark.
    """
    owner = await _staff(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    pupil = await _pupil(db, org, "Group Pupil")
    await make_enrollment(db, course.id, pupil.id)
    await _ungraded_submission(db, org, course, owner, pupil)

    leader = await _staff(db, org, "Group Leader")
    await _lead_through_group(db, org, leader, course)

    # Positive control: the author sees it, so the queue itself works.
    mine = await client.get("/api/v1/admin/review-queue", headers=auth_header(owner))
    assert mine.status_code == 200, mine.text
    assert len(mine.json()) >= 1

    for path, read in (
        ("/api/v1/admin/review-queue", lambda r: len(r.json())),
        ("/api/v1/admin/review-queue/count", lambda r: r.json()["count"]),
    ):
        resp = await client.get(path, headers=auth_header(leader))
        assert resp.status_code == 200, resp.text
        assert read(resp) >= 1, f"{path}: the leader of the group sees nothing"


async def test_review_queue_shows_a_methodist_the_school(client, org, db):
    """A methodist has role=teacher, so the old filter handed her her own work.

    She authors nothing, and the queue keyed on authorship left her with an
    empty page — the same role-versus-flag slip that emptied her dashboard.
    """
    owner = await _staff(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    pupil = await _pupil(db, org, "Somebody's Pupil")
    await make_enrollment(db, course.id, pupil.id)
    await _ungraded_submission(db, org, course, owner, pupil)

    methodist = await _staff(db, org, "Мария", methodist=True)

    resp = await client.get("/api/v1/admin/review-queue", headers=auth_header(methodist))
    assert resp.status_code == 200, resp.text
    assert len(resp.json()) >= 1


async def test_review_queue_still_hides_a_strangers_work(client, org, db):
    owner = await _staff(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    pupil = await _pupil(db, org, "Owners Pupil")
    await make_enrollment(db, course.id, pupil.id)
    await _ungraded_submission(db, org, course, owner, pupil)

    stranger = await _staff(db, org, "Stranger")
    resp = await client.get("/api/v1/admin/review-queue", headers=auth_header(stranger))
    assert resp.status_code == 200, resp.text
    assert resp.json() == []


async def test_student_profile_opens_for_a_pupil_of_my_group(client, org, db):
    """The teacher's own panel linked here and the profile answered 403.

    ``_teacher_shares_course`` asked ``Course.teacher_id``; the pupil was in the
    teacher's group, on a course owned by the admin.
    """
    owner = await _staff(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    pupil = await _pupil(db, org, "Group Pupil")
    await make_enrollment(db, course.id, pupil.id)

    leader = await _staff(db, org, "Group Leader")
    await _lead_through_group(db, org, leader, course)

    resp = await client.get(
        f"/api/v1/admin/students/{pupil.id}/profile", headers=auth_header(leader)
    )
    assert resp.status_code == 200, resp.text


async def test_student_profile_stays_shut_for_a_stranger(client, org, db):
    owner = await _staff(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    pupil = await _pupil(db, org, "Owners Pupil")
    await make_enrollment(db, course.id, pupil.id)

    # Positive control: the owner opens it, so the route works.
    mine = await client.get(
        f"/api/v1/admin/students/{pupil.id}/profile", headers=auth_header(owner)
    )
    assert mine.status_code == 200, mine.text

    stranger = await _staff(db, org, "Stranger")
    resp = await client.get(
        f"/api/v1/admin/students/{pupil.id}/profile", headers=auth_header(stranger)
    )
    assert resp.status_code == 403, resp.text


# ── Writes: outside your own courses there is nothing to write to ─────────


async def test_enrolling_into_a_strangers_course_is_refused(client, org, db):
    owner = await _staff(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    pupil = await _pupil(db, org, "New Pupil")

    stranger = await _staff(db, org, "Stranger")
    body = {"user_id": str(pupil.id), "course_id": str(course.id)}

    resp = await client.post("/api/v1/admin/enroll", json=body, headers=auth_header(stranger))
    assert resp.status_code == 404, resp.text

    # Positive control: the owner enrols the same pupil into the same course.
    mine = await client.post("/api/v1/admin/enroll", json=body, headers=auth_header(owner))
    assert mine.status_code in (200, 201), mine.text


async def test_enrolling_into_a_course_i_lead_through_a_group_is_allowed(client, org, db):
    owner = await _staff(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    pupil = await _pupil(db, org, "New Pupil")

    leader = await _staff(db, org, "Group Leader")
    await _lead_through_group(db, org, leader, course)

    resp = await client.post(
        "/api/v1/admin/enroll",
        json={"user_id": str(pupil.id), "course_id": str(course.id)},
        headers=auth_header(leader),
    )
    assert resp.status_code in (200, 201), resp.text


async def test_unenrolling_from_a_strangers_course_is_refused(client, org, db):
    owner = await _staff(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    pupil = await _pupil(db, org, "Owners Pupil")
    enrollment = await make_enrollment(db, course.id, pupil.id)

    stranger = await _staff(db, org, "Stranger")
    resp = await client.delete(
        f"/api/v1/admin/enrollments/{enrollment.id}", headers=auth_header(stranger)
    )
    assert resp.status_code == 404, resp.text

    # Positive control: the owner removes the very same enrollment.
    mine = await client.delete(
        f"/api/v1/admin/enrollments/{enrollment.id}", headers=auth_header(owner)
    )
    assert mine.status_code == 200, mine.text


async def test_bulk_enrolling_into_a_strangers_course_is_refused(client, org, db):
    owner = await _staff(db, org, "Course Owner")
    course = await make_course(db, org, owner)

    stranger = await _staff(db, org, "Stranger")
    # Consent is checked before ownership, so without it the refusal would be a
    # 400 that says nothing about whose course this is.
    body = {
        "course_id": str(course.id),
        "parental_consent": True,
        "rows": [{"email": "new.pupil@test.com"}],
    }

    resp = await client.post("/api/v1/admin/bulk-enroll", json=body, headers=auth_header(stranger))
    assert resp.status_code == 404, resp.text

    # Positive control: the owner's identical call clears the course check.
    mine = await client.post("/api/v1/admin/bulk-enroll", json=body, headers=auth_header(owner))
    assert mine.status_code != 404, mine.text


async def test_bulk_import_into_a_strangers_group_is_refused(client, org, db):
    owner = await _staff(db, org, "Course Owner")
    group = StudentGroup(org_id=org.id, name="Owner's group", teacher_id=owner.id)
    db.add(group)
    await db.flush()

    csv = b"full_name,email\nNew Pupil,new.pupil@test.com\n"

    stranger = await _staff(db, org, "Stranger")
    resp = await client.post(
        f"/api/v1/admin/bulk-import-students?group_id={group.id}&parental_consent=true",
        files={"file": ("students.csv", csv, "text/csv")},
        headers=auth_header(stranger),
    )
    assert resp.status_code == 404, resp.text

    # Positive control: the group's own teacher gets past the group check.
    mine = await client.post(
        f"/api/v1/admin/bulk-import-students?group_id={group.id}&parental_consent=true",
        files={"file": ("students.csv", csv, "text/csv")},
        headers=auth_header(owner),
    )
    assert mine.status_code != 404, mine.text


# ── Attendance: the one that stopped a teacher marking their own class ────


async def test_roster_opens_for_the_course_i_lead_through_a_group(client, org, db):
    """Measured in prod 2026-08-28, as Игорь Соколов.

    The course roster and the group membership each named two pupils, and
    ``/attendance/roster`` on that same course answered 403. The journal drew
    the refusal as «0/0 · No students enrolled in this course», so the teacher
    could not mark their own group and the screen blamed an empty school.
    """
    owner = await _staff(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    pupil = await _pupil(db, org, "Group Pupil")
    await make_enrollment(db, course.id, pupil.id)

    leader = await _staff(db, org, "Group Leader")
    await _lead_through_group(db, org, leader, course)

    resp = await client.get(
        f"/api/v1/attendance/roster?course_id={course.id}&session_date=2026-08-27",
        headers=auth_header(leader),
    )
    assert resp.status_code == 200, resp.text


async def test_roster_stays_shut_for_a_stranger(client, org, db):
    owner = await _staff(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    pupil = await _pupil(db, org, "Owners Pupil")
    await make_enrollment(db, course.id, pupil.id)

    # Positive control: the owner reads their own roster.
    mine = await client.get(
        f"/api/v1/attendance/roster?course_id={course.id}&session_date=2026-08-27",
        headers=auth_header(owner),
    )
    assert mine.status_code == 200, mine.text

    stranger = await _staff(db, org, "Stranger")
    resp = await client.get(
        f"/api/v1/attendance/roster?course_id={course.id}&session_date=2026-08-27",
        headers=auth_header(stranger),
    )
    assert resp.status_code == 403, resp.text


async def test_marking_attendance_on_a_strangers_course_is_refused(client, org, db):
    """Reading a colleague's roster was refused; writing to it was not.

    ``POST /attendance`` filtered by ``org_id`` and never asked whose course the
    record named.
    """
    owner = await _staff(db, org, "Course Owner")
    course = await make_course(db, org, owner)
    pupil = await _pupil(db, org, "Owners Pupil")
    await make_enrollment(db, course.id, pupil.id)

    body = {
        "records": [
            {
                "student_id": str(pupil.id),
                "course_id": str(course.id),
                "session_date": "2026-08-27",
                "status": "present",
            }
        ]
    }

    stranger = await _staff(db, org, "Stranger")
    resp = await client.post("/api/v1/attendance", json=body, headers=auth_header(stranger))
    assert resp.status_code == 403, resp.text

    # Positive control: the owner writes the very same record.
    mine = await client.post("/api/v1/attendance", json=body, headers=auth_header(owner))
    assert mine.status_code in (200, 201), mine.text
