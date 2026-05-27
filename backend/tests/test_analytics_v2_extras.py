"""Pytest suite for the A1 analytics v2 extras.

Covers:
  - GET /admin/analytics/v2/kpi-deltas: window arithmetic
  - GET /admin/analytics/v2/xp-movers:  ranking + decliner detection
  - GET /admin/analytics/report:        csv export + pdf-501 stub
  - RBAC: students get 403
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.exercises.models import ExerciseSubmission
from tests.conftest import (
    auth_header,
    make_course,
    make_exercise,
    make_lesson,
    make_module,
)


async def _submission(
    db: AsyncSession,
    exercise_id: uuid.UUID,
    student_id: uuid.UUID,
    *,
    age_days: float,
    score: float = 80.0,
) -> None:
    submitted = datetime.now(timezone.utc) - timedelta(days=age_days)
    s = ExerciseSubmission(
        id=uuid.uuid4(),
        exercise_id=exercise_id,
        student_id=student_id,
        score=score,
        passed=True,
        status="graded",
        submitted_at=submitted,
    )
    db.add(s)
    await db.flush()


# ── KPI deltas ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_kpi_deltas_compares_current_to_prior_window(
    client: AsyncClient, db: AsyncSession, admin, teacher, student, org
):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id)

    # Current window (last 7d): 3 submissions, scores 80, 90, 100 → avg 90
    await _submission(db, ex.id, student.id, age_days=1, score=80)
    await _submission(db, ex.id, student.id, age_days=2, score=90)
    await _submission(db, ex.id, student.id, age_days=3, score=100)

    # Prior window (8-14d ago): 1 submission, score 50
    await _submission(db, ex.id, student.id, age_days=10, score=50)

    res = await client.get(
        "/api/v1/admin/analytics/v2/kpi-deltas?days=7",
        headers=auth_header(admin),
    )
    assert res.status_code == 200, res.text
    payload = res.json()
    assert payload["window_days"] == 7

    subs = payload["metrics"]["submissions"]
    assert subs["current"] == 3
    assert subs["previous"] == 1
    assert subs["delta_pct"] == 200.0  # (3-1)/1 * 100

    avg = payload["metrics"]["avg_score"]
    assert avg["current"] == 90.0
    assert avg["previous"] == 50.0
    # (90 - 50) / 50 * 100 = 80
    assert avg["delta_pct"] == 80.0


@pytest.mark.asyncio
async def test_kpi_deltas_delta_pct_null_when_no_baseline(
    client: AsyncClient, db: AsyncSession, admin, teacher, student, org
):
    """Zero previous-window means delta_pct=None (avoid infinite-growth UI)."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id)

    await _submission(db, ex.id, student.id, age_days=1, score=80)

    res = await client.get(
        "/api/v1/admin/analytics/v2/kpi-deltas?days=7",
        headers=auth_header(admin),
    )
    assert res.status_code == 200
    assert res.json()["metrics"]["submissions"]["delta_pct"] is None


@pytest.mark.asyncio
async def test_kpi_deltas_rejects_out_of_range(client: AsyncClient, admin):
    res = await client.get(
        "/api/v1/admin/analytics/v2/kpi-deltas?days=0",
        headers=auth_header(admin),
    )
    assert res.status_code == 422
    res = await client.get(
        "/api/v1/admin/analytics/v2/kpi-deltas?days=999",
        headers=auth_header(admin),
    )
    assert res.status_code == 422


# ── XP movers ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_xp_movers_ranks_by_score_sum_and_detects_decliners(
    client: AsyncClient, db: AsyncSession, admin, teacher, student, org
):
    # Two students. `student` is the conftest fixture; spin a second one.
    from app.auth.models import User, UserRole

    student_b = User(
        id=uuid.uuid4(),
        email=f"sb-{uuid.uuid4().hex[:6]}@x.test",
        full_name="Student B",
        hashed_password="x",
        role=UserRole.student,
        org_id=org.id,
        is_active=True,
    )
    db.add(student_b)
    await db.flush()

    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    ex = await make_exercise(db, lesson.id, org.id)

    # `student` scores high in current window: 90 + 90 = 180.
    await _submission(db, ex.id, student.id, age_days=1, score=90)
    await _submission(db, ex.id, student.id, age_days=2, score=90)

    # `student_b` was active prior window only (decliner candidate).
    await _submission(db, ex.id, student_b.id, age_days=10, score=70)
    await _submission(db, ex.id, student_b.id, age_days=11, score=70)

    res = await client.get(
        "/api/v1/admin/analytics/v2/xp-movers?window_days=7",
        headers=auth_header(admin),
    )
    assert res.status_code == 200
    payload = res.json()
    assert payload["window_days"] == 7

    movers = payload["movers"]
    assert len(movers) == 1
    assert movers[0]["submission_count"] == 2
    assert movers[0]["score_sum"] == 180.0

    decliner_ids = [d["user_id"] for d in payload["decliners"]]
    assert str(student_b.id) in decliner_ids


# ── Report ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_report_csv_format(client: AsyncClient, admin):
    res = await client.get(
        "/api/v1/admin/analytics/report?format=csv&window_days=7",
        headers=auth_header(admin),
    )
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    body = res.text
    assert "# Analytics report" in body
    assert "# KPI deltas" in body
    assert "metric,current,previous,delta_pct" in body
    assert "# Top movers" in body
    assert "# Decliners" in body


@pytest.mark.asyncio
async def test_report_pdf_returns_501(client: AsyncClient, admin):
    res = await client.get(
        "/api/v1/admin/analytics/report?format=pdf",
        headers=auth_header(admin),
    )
    assert res.status_code == 501
    assert res.json()["detail"]["code"] == "pdf_not_implemented"


@pytest.mark.asyncio
async def test_report_invalid_format_rejected(client: AsyncClient, admin):
    res = await client.get(
        "/api/v1/admin/analytics/report?format=xlsx",
        headers=auth_header(admin),
    )
    assert res.status_code == 422


# ── RBAC ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_student_cannot_access_analytics_extras(
    client: AsyncClient, student
):
    headers = auth_header(student)
    for url in (
        "/api/v1/admin/analytics/v2/kpi-deltas",
        "/api/v1/admin/analytics/v2/xp-movers",
        "/api/v1/admin/analytics/report?format=csv",
    ):
        res = await client.get(url, headers=headers)
        assert res.status_code == 403, url
