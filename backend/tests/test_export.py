"""Tests for course export/import — variants, tenancy, JSON round-trip."""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, make_course, make_lesson, make_module


@pytest.fixture
async def course(db, org, teacher):
    c = await make_course(db, org, teacher)
    m = await make_module(db, c.id)
    await make_lesson(db, m.id)
    return c


@pytest.mark.asyncio
async def test_teacher_exports_json(client: AsyncClient, teacher, course):
    resp = await client.get(f"/api/v1/courses/{course.id}/export", headers=auth_header(teacher))
    assert resp.status_code == 200
    assert "attachment" in resp.headers["content-disposition"]
    data = resp.json()
    assert data["schema"] == "grasslms-course-v1"


@pytest.mark.asyncio
async def test_student_cannot_export_teacher_variant(client: AsyncClient, student, course):
    resp = await client.get(
        f"/api/v1/courses/{course.id}/export",
        params={"variant": "teacher"},
        headers=auth_header(student),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_cross_org_export_404(client: AsyncClient, admin2, course):
    resp = await client.get(f"/api/v1/courses/{course.id}/export", headers=auth_header(admin2))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_student_cannot_import(client: AsyncClient, student):
    resp = await client.post(
        "/api/v1/courses/import",
        json={"schema": "grasslms-course-v1"},
        headers=auth_header(student),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_wrong_schema_rejected(client: AsyncClient, teacher):
    resp = await client.post(
        "/api/v1/courses/import",
        json={"schema": "some-other-schema"},
        headers=auth_header(teacher),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_export_import_round_trip(client: AsyncClient, teacher, course):
    exported = (
        await client.get(f"/api/v1/courses/{course.id}/export", headers=auth_header(teacher))
    ).json()

    imported = await client.post(
        "/api/v1/courses/import", json=exported, headers=auth_header(teacher)
    )
    assert imported.status_code == 200, imported.text
    new_id = imported.json().get("course_id") or imported.json().get("id")
    assert new_id and str(new_id) != str(course.id)
