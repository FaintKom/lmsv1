"""Tests for sandbox challenge CRUD — RBAC and hidden-test-case filtering.

/execute and /submit call the remote sandbox container and are exercised by
the QA role-flow suite, not here.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, make_course, make_lesson, make_module


@pytest.fixture
async def lesson(db, org, teacher):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    return await make_lesson(db, module.id)


async def _create_challenge(client: AsyncClient, user, lesson_id):
    resp = await client.post(
        "/api/v1/sandbox/challenges",
        json={
            "lesson_id": str(lesson_id),
            "title": "Sum two numbers",
            "language": "python",
            "starter_code": "def solve():\n    pass\n",
        },
        headers=auth_header(user),
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.mark.asyncio
async def test_languages_listed(client: AsyncClient):
    resp = await client.get("/api/v1/sandbox/languages")
    assert resp.status_code == 200
    assert len(resp.json()["languages"]) > 0


@pytest.mark.asyncio
async def test_challenge_by_lesson_404_when_absent(client: AsyncClient, student, lesson):
    resp = await client.get(
        f"/api/v1/sandbox/lessons/{lesson.id}/challenge", headers=auth_header(student)
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_student_cannot_create_challenge(client: AsyncClient, student, lesson):
    resp = await client.post(
        "/api/v1/sandbox/challenges",
        json={"lesson_id": str(lesson.id), "title": "x", "language": "python"},
        headers=auth_header(student),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_hidden_test_cases_filtered_for_students(
    client: AsyncClient, teacher, student, lesson
):
    challenge = await _create_challenge(client, teacher, lesson.id)

    for hidden in (False, True):
        resp = await client.post(
            f"/api/v1/sandbox/challenges/{challenge['id']}/test-cases",
            json={"input": "1 2", "expected_output": "3", "is_hidden": hidden},
            headers=auth_header(teacher),
        )
        assert resp.status_code == 200

    as_student = (
        await client.get(
            f"/api/v1/sandbox/lessons/{lesson.id}/challenge", headers=auth_header(student)
        )
    ).json()
    assert all(not tc["is_hidden"] for tc in as_student["test_cases"])
    assert len(as_student["test_cases"]) == 1


@pytest.mark.asyncio
async def test_delete_challenge(client: AsyncClient, teacher, lesson):
    challenge = await _create_challenge(client, teacher, lesson.id)
    resp = await client.delete(
        f"/api/v1/sandbox/challenges/{challenge['id']}", headers=auth_header(teacher)
    )
    assert resp.status_code == 200
