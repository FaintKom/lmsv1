"""Pytest suite for the content-feedback module (sprint F1).

Covers domain rules + endpoints:
  - lesson_rating create + UPSERT on re-rate
  - block_issue create + per-block 3-cap
  - 5-minute edit window on PATCH /feedback/{id}
  - admin status PATCH + cross-org isolation
  - award_xp idempotency
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.feedback import service as feedback_service
from app.feedback.models import (
    ContentFeedback,
    FeedbackKind,
    FeedbackStatus,
)
from app.gamification.models import UserStreak
from tests.conftest import (
    auth_header,
    make_course,
    make_lesson,
    make_module,
)


@pytest_asyncio.fixture
async def lesson_in_org(db: AsyncSession, org, teacher):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    return await make_lesson(db, module.id)


@pytest_asyncio.fixture
async def lesson_in_org2(db: AsyncSession, org2, admin2):
    """A lesson belonging to a different org — for cross-org isolation tests."""
    course = await make_course(db, org2, admin2)
    module = await make_module(db, course.id)
    return await make_lesson(db, module.id)


# ─── Student endpoints ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_lesson_rating_then_upsert(
    client: AsyncClient, student, lesson_in_org
):
    headers = auth_header(student)
    body = {
        "lesson_id": str(lesson_in_org.id),
        "kind": "lesson_rating",
        "rating": 4,
        "comment": "Good pacing.",
    }
    res = await client.post("/api/v1/feedback", json=body, headers=headers)
    assert res.status_code == 201
    fid = res.json()["id"]

    # Re-rating UPSERTs into the same row.
    body["rating"] = 5
    body["comment"] = "Even better second time."
    res2 = await client.post("/api/v1/feedback", json=body, headers=headers)
    assert res2.status_code == 201
    assert res2.json()["id"] == fid
    assert res2.json()["rating"] == 5
    assert res2.json()["comment"] == "Even better second time."


@pytest.mark.asyncio
async def test_create_lesson_rating_rejects_extra_fields(
    client: AsyncClient, student, lesson_in_org
):
    headers = auth_header(student)
    res = await client.post(
        "/api/v1/feedback",
        json={
            "lesson_id": str(lesson_in_org.id),
            "kind": "lesson_rating",
            "rating": 4,
            "block_id": "blk-1",  # invalid for lesson_rating
        },
        headers=headers,
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_get_my_lesson_rating(client: AsyncClient, student, lesson_in_org):
    headers = auth_header(student)
    res = await client.get(
        f"/api/v1/feedback/lesson/{lesson_in_org.id}/my", headers=headers
    )
    assert res.status_code == 200
    assert res.json() is None

    await client.post(
        "/api/v1/feedback",
        json={
            "lesson_id": str(lesson_in_org.id),
            "kind": "lesson_rating",
            "rating": 5,
        },
        headers=headers,
    )
    res = await client.get(
        f"/api/v1/feedback/lesson/{lesson_in_org.id}/my", headers=headers
    )
    assert res.status_code == 200
    assert res.json()["rating"] == 5


@pytest.mark.asyncio
async def test_create_block_issue(client: AsyncClient, student, lesson_in_org):
    headers = auth_header(student)
    body = {
        "lesson_id": str(lesson_in_org.id),
        "kind": "block_issue",
        "block_id": "blk-12",
        "block_type": "text",
        "category": "typo",
        "comment": "Found a typo in paragraph 2.",
    }
    res = await client.post("/api/v1/feedback", json=body, headers=headers)
    assert res.status_code == 201
    payload = res.json()
    assert payload["kind"] == "block_issue"
    assert payload["block_id"] == "blk-12"
    assert payload["category"] == "typo"


@pytest.mark.asyncio
async def test_block_issue_cap_three_per_user_per_block(
    client: AsyncClient, student, lesson_in_org
):
    headers = auth_header(student)
    body = {
        "lesson_id": str(lesson_in_org.id),
        "kind": "block_issue",
        "block_id": "blk-spammy",
        "block_type": "text",
        "category": "unclear",
    }
    # 3 succeed.
    for _ in range(3):
        res = await client.post("/api/v1/feedback", json=body, headers=headers)
        assert res.status_code == 201
    # 4th rejected with 429 + stable code.
    res = await client.post("/api/v1/feedback", json=body, headers=headers)
    assert res.status_code == 429
    assert res.json()["detail"]["code"] == "block_cap_reached"


@pytest.mark.asyncio
async def test_edit_window_blocks_late_edit(
    db: AsyncSession, student, lesson_in_org
):
    """PATCH must reject edits older than EDIT_WINDOW_MINUTES."""
    row = ContentFeedback(
        id=uuid.uuid4(),
        org_id=student.org_id,
        lesson_id=lesson_in_org.id,
        user_id=student.id,
        kind=FeedbackKind.lesson_rating,
        rating=3,
        status=FeedbackStatus.open,
        created_at=datetime.now(timezone.utc)
        - timedelta(minutes=feedback_service.EDIT_WINDOW_MINUTES + 1),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(row)
    await db.flush()

    from app.feedback.schemas import FeedbackUpdateRequest

    with pytest.raises(feedback_service.FeedbackError) as exc:
        await feedback_service.update_own_feedback(
            db, student, row.id, FeedbackUpdateRequest(comment="too late")
        )
    assert exc.value.code == "edit_window_expired"


# ─── Admin endpoints ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_list_filters_status(
    client: AsyncClient, student, admin, lesson_in_org
):
    # Seed: 3 open block_issue rows.
    headers = auth_header(student)
    for cat in ("typo", "unclear", "broken_link"):
        await client.post(
            "/api/v1/feedback",
            json={
                "lesson_id": str(lesson_in_org.id),
                "kind": "block_issue",
                "block_id": f"blk-{cat}",
                "block_type": "text",
                "category": cat,
            },
            headers=headers,
        )
    # Move one to resolved via admin endpoint.
    admin_headers = auth_header(admin)
    listed = (
        await client.get("/api/v1/admin/feedback", headers=admin_headers)
    ).json()
    fid = listed[0]["id"]
    res = await client.patch(
        f"/api/v1/admin/feedback/{fid}/status",
        json={"status": "resolved", "resolver_note": "Fixed in next revision."},
        headers=admin_headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "resolved"

    # Filter by status=open returns 2.
    res = await client.get(
        "/api/v1/admin/feedback?status=open", headers=admin_headers
    )
    assert res.status_code == 200
    assert len(res.json()) == 2


@pytest.mark.asyncio
async def test_admin_cross_org_isolation(
    client: AsyncClient, student, admin, lesson_in_org2
):
    """Admin in org A cannot see feedback for lessons in org B."""
    headers = auth_header(student)
    res = await client.post(
        "/api/v1/feedback",
        json={
            "lesson_id": str(lesson_in_org2.id),
            "kind": "block_issue",
            "block_id": "blk-cross",
            "block_type": "text",
            "category": "typo",
        },
        headers=headers,
    )
    # The student CAN submit (they have the lesson_id), but the row's
    # org_id is org B (resolved from lesson → module → course).
    assert res.status_code == 201

    admin_headers = auth_header(admin)
    listed = (
        await client.get("/api/v1/admin/feedback", headers=admin_headers)
    ).json()
    block_ids = [item["block_id"] for item in listed]
    assert "blk-cross" not in block_ids


@pytest.mark.asyncio
async def test_award_xp_idempotent_and_bumps_total(
    db: AsyncSession, student, admin, lesson_in_org
):
    """+5 XP on first award, no-op on second."""
    db.add(UserStreak(user_id=student.id, total_xp=100))
    await db.flush()

    row = ContentFeedback(
        id=uuid.uuid4(),
        org_id=admin.org_id,
        lesson_id=lesson_in_org.id,
        user_id=student.id,
        kind=FeedbackKind.block_issue,
        block_id="blk-xp",
        block_type="text",
        category="typo",
        status=FeedbackStatus.resolved,
    )
    db.add(row)
    await db.flush()

    await feedback_service.award_xp(db, admin, row.id)
    streak = await db.scalar(
        select(UserStreak).where(UserStreak.user_id == student.id)
    )
    assert streak.total_xp == 100 + feedback_service.XP_HELPFUL_FEEDBACK
    assert row.xp_awarded is True

    # Second call is a no-op.
    await feedback_service.award_xp(db, admin, row.id)
    streak = await db.scalar(
        select(UserStreak).where(UserStreak.user_id == student.id)
    )
    assert streak.total_xp == 100 + feedback_service.XP_HELPFUL_FEEDBACK
