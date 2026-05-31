"""Peer-review distribution + RBAC + my-reviews enrichment tests."""
import pytest
import sqlalchemy
from httpx import AsyncClient

from app.auth.models import UserRole
from app.peer_review.models import PeerReview, PeerReviewAssignment, PeerReviewStatus
from app.peer_review.service import distribute_reviews
from tests.conftest import _make_user, auth_header, make_course, make_enrollment


async def _student(db, org, n):
    u = _make_user(db, org, UserRole.student, suffix=str(n))
    await db.flush()
    return u


async def _make_assignment(db, org, course, min_reviews=1, title="PR1"):
    a = PeerReviewAssignment(
        org_id=org.id,
        course_id=course.id,
        title=title,
        min_reviews=min_reviews,
    )
    db.add(a)
    await db.flush()
    return a


async def _enroll_students(db, org, course, count):
    students = []
    for i in range(count):
        s = await _student(db, org, i)
        await make_enrollment(db, course.id, s.id)
        students.append(s)
    return students


async def _reviews_for(db, assignment_id):
    return (
        await db.execute(
            sqlalchemy.select(PeerReview).where(
                PeerReview.assignment_id == assignment_id
            )
        )
    ).scalars().all()


# ── distribute_reviews unit-level ──────────────────────────────────────────


async def test_distribute_creates_correct_count(db, org, teacher):
    course = await make_course(db, org, teacher)
    students = await _enroll_students(db, org, course, 4)
    assert len(students) == 4
    assignment = await _make_assignment(db, org, course, min_reviews=2)

    result = await distribute_reviews(db, assignment, teacher)
    # 4 students * 2 reviews each
    assert result["total_students"] == 4
    assert result["created"] == 8
    assert len(await _reviews_for(db, assignment.id)) == 8


async def test_distribute_no_self_review(db, org, teacher):
    course = await make_course(db, org, teacher)
    await _enroll_students(db, org, course, 5)
    assignment = await _make_assignment(db, org, course, min_reviews=3)

    await distribute_reviews(db, assignment, teacher)
    reviews = await _reviews_for(db, assignment.id)
    assert all(r.reviewer_id != r.reviewee_id for r in reviews)
    for reviewer in {r.reviewer_id for r in reviews}:
        targets = [r.reviewee_id for r in reviews if r.reviewer_id == reviewer]
        assert len(targets) == len(set(targets)) == 3


async def test_distribute_clamps_min_reviews(db, org, teacher):
    course = await make_course(db, org, teacher)
    await _enroll_students(db, org, course, 2)
    # min_reviews 5 but only 1 other student available → clamp to 1
    assignment = await _make_assignment(db, org, course, min_reviews=5)
    result = await distribute_reviews(db, assignment, teacher)
    assert result["created"] == 2  # each of 2 students reviews the 1 other


async def test_distribute_requires_two_students(db, org, teacher):
    from fastapi import HTTPException

    course = await make_course(db, org, teacher)
    await _enroll_students(db, org, course, 1)
    assignment = await _make_assignment(db, org, course, min_reviews=1)
    with pytest.raises(HTTPException) as exc:
        await distribute_reviews(db, assignment, teacher)
    assert exc.value.status_code == 400


async def test_distribute_idempotent_keeps_completed(db, org, teacher):
    course = await make_course(db, org, teacher)
    await _enroll_students(db, org, course, 3)
    assignment = await _make_assignment(db, org, course, min_reviews=1)
    await distribute_reviews(db, assignment, teacher)

    one = (await _reviews_for(db, assignment.id))[0]
    one.status = PeerReviewStatus.completed
    one.rating = 5
    await db.flush()

    # Re-distribute: should not duplicate the completed pair, total stays 3.
    await distribute_reviews(db, assignment, teacher)
    reviews = await _reviews_for(db, assignment.id)
    assert len(reviews) == 3
    completed = [r for r in reviews if r.status == PeerReviewStatus.completed]
    assert len(completed) == 1 and completed[0].rating == 5


# ── HTTP / RBAC ─────────────────────────────────────────────────────────────


async def test_distribute_endpoint(client: AsyncClient, db, org, teacher):
    course = await make_course(db, org, teacher)
    await _enroll_students(db, org, course, 3)
    assignment = await _make_assignment(db, org, course, min_reviews=1)

    resp = await client.post(
        f"/api/v1/peer-review/assignments/{assignment.id}/distribute",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total_students"] == 3
    assert body["created"] == 3


async def test_teacher_cannot_distribute_other_teachers_course(
    client: AsyncClient, db, org
):
    owner = _make_user(db, org, UserRole.teacher, suffix="owner")
    other = _make_user(db, org, UserRole.teacher, suffix="other")
    await db.flush()
    course = await make_course(db, org, owner)
    await _enroll_students(db, org, course, 3)
    assignment = await _make_assignment(db, org, course, min_reviews=1)

    resp = await client.post(
        f"/api/v1/peer-review/assignments/{assignment.id}/distribute",
        headers=auth_header(other),
    )
    assert resp.status_code == 403, resp.text


async def test_admin_other_org_gets_404(client: AsyncClient, db, org, teacher, admin2):
    course = await make_course(db, org, teacher)
    await _enroll_students(db, org, course, 3)
    assignment = await _make_assignment(db, org, course, min_reviews=1)

    resp = await client.post(
        f"/api/v1/peer-review/assignments/{assignment.id}/distribute",
        headers=auth_header(admin2),
    )
    assert resp.status_code == 404, resp.text


async def test_list_assignments_stats(client: AsyncClient, db, org, teacher):
    course = await make_course(db, org, teacher)
    await _enroll_students(db, org, course, 3)
    assignment = await _make_assignment(db, org, course, min_reviews=1)
    await distribute_reviews(db, assignment, teacher)

    resp = await client.get(
        f"/api/v1/peer-review/assignments?course_id={course.id}",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["total_reviews"] == 3
    assert rows[0]["completed_reviews"] == 0
    assert rows[0]["pending_reviews"] == 3


async def test_assignment_detail_enriched(client: AsyncClient, db, org, teacher):
    course = await make_course(db, org, teacher)
    await _enroll_students(db, org, course, 3)
    assignment = await _make_assignment(db, org, course, min_reviews=1)
    await distribute_reviews(db, assignment, teacher)

    resp = await client.get(
        f"/api/v1/peer-review/assignments/{assignment.id}",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total_reviews"] == 3
    assert len(body["reviews"]) == 3
    for row in body["reviews"]:
        assert row["reviewer_name"]
        assert row["reviewee_name"]
        assert row["status"] == "pending"


async def test_my_reviews_enrichment(client: AsyncClient, db, org, teacher):
    course = await make_course(db, org, teacher)
    students = await _enroll_students(db, org, course, 3)
    assignment = await _make_assignment(db, org, course, min_reviews=1, title="Essay Review")
    await distribute_reviews(db, assignment, teacher)

    reviewer = students[0]
    resp = await client.get(
        "/api/v1/peer-review/my-reviews",
        headers=auth_header(reviewer),
    )
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["assignment_title"] == "Essay Review"
    assert rows[0]["reviewee_name"]
    assert rows[0]["reviewer_id"] == str(reviewer.id)


async def test_submit_sets_completed(client: AsyncClient, db, org, teacher):
    course = await make_course(db, org, teacher)
    students = await _enroll_students(db, org, course, 2)
    assignment = await _make_assignment(db, org, course, min_reviews=1)
    await distribute_reviews(db, assignment, teacher)

    review = (
        await db.execute(
            sqlalchemy.select(PeerReview).where(
                PeerReview.reviewer_id == students[0].id
            )
        )
    ).scalars().first()

    resp = await client.post(
        f"/api/v1/peer-review/{review.id}/submit",
        headers=auth_header(students[0]),
        json={"rating": 4, "comment": "Good work"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "completed"
    assert resp.json()["rating"] == 4
