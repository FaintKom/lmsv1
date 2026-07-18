"""Tests for file/interactive submissions — upload validation, ownership, tenancy."""

import pytest
from httpx import AsyncClient

from app.auth.models import UserRole
from tests.conftest import _make_user, auth_header, make_course, make_lesson, make_module

_FAKE_PDF = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"


@pytest.fixture
async def lesson(db, org, teacher):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    return await make_lesson(db, module.id)


async def _upload(client: AsyncClient, user, lesson_id, data=_FAKE_PDF, name="work.pdf"):
    return await client.post(
        f"/api/v1/submissions/lessons/{lesson_id}/upload",
        files={"file": (name, data, "application/pdf")},
        headers=auth_header(user),
    )


@pytest.mark.asyncio
async def test_student_uploads_and_sees_own_file(client: AsyncClient, db, org, student, lesson):
    resp = await _upload(client, student, lesson.id)
    assert resp.status_code == 200, resp.text
    assert resp.json()["original_filename"] == "work.pdf"

    listed = await client.get(
        f"/api/v1/submissions/lessons/{lesson.id}/files", headers=auth_header(student)
    )
    assert listed.status_code == 200
    assert len(listed.json()) == 1


@pytest.mark.asyncio
async def test_disallowed_extension_rejected(client: AsyncClient, student, lesson):
    resp = await _upload(client, student, lesson.id, data=b"MZ\x90\x00", name="virus.exe")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_students_do_not_see_each_others_files(client: AsyncClient, db, org, student, lesson):
    await _upload(client, student, lesson.id)

    other = _make_user(db, org, UserRole.student, suffix="-other")
    await db.flush()
    listed = await client.get(
        f"/api/v1/submissions/lessons/{lesson.id}/files", headers=auth_header(other)
    )
    assert listed.status_code == 200
    assert listed.json() == []


@pytest.mark.asyncio
async def test_teacher_sees_student_files(client: AsyncClient, student, teacher, lesson):
    await _upload(client, student, lesson.id)
    listed = await client.get(
        f"/api/v1/submissions/lessons/{lesson.id}/files", headers=auth_header(teacher)
    )
    assert listed.status_code == 200
    assert len(listed.json()) == 1


@pytest.mark.asyncio
async def test_cross_org_lesson_files_404(client: AsyncClient, admin2, lesson):
    """Staff from another org must not even learn the lesson exists."""
    listed = await client.get(
        f"/api/v1/submissions/lessons/{lesson.id}/files", headers=auth_header(admin2)
    )
    assert listed.status_code == 404


@pytest.mark.asyncio
async def test_student_cannot_download_foreign_file(client: AsyncClient, db, org, student, lesson):
    submission_id = (await _upload(client, student, lesson.id)).json()["id"]

    other = _make_user(db, org, UserRole.student, suffix="-dl")
    await db.flush()
    resp = await client.get(
        f"/api/v1/submissions/files/{submission_id}/download", headers=auth_header(other)
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_interactive_list_empty_and_cross_org_404(
    client: AsyncClient, student, admin2, lesson
):
    ok = await client.get(
        f"/api/v1/submissions/lessons/{lesson.id}/interactive", headers=auth_header(student)
    )
    assert ok.status_code == 200
    assert ok.json() == []

    cross = await client.get(
        f"/api/v1/submissions/lessons/{lesson.id}/interactive", headers=auth_header(admin2)
    )
    assert cross.status_code == 404
