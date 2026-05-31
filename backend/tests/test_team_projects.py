"""Team-projects lifecycle + RBAC + org-isolation tests."""
from httpx import AsyncClient

from app.auth.models import UserRole
from tests.conftest import _make_user, auth_header


async def _student(db, org, n):
    u = _make_user(db, org, UserRole.student, suffix=str(n))
    await db.flush()
    return u


async def _create_project(client, teacher, **kwargs):
    body = {
        "title": kwargs.get("title", "Capstone"),
        "max_team_size": kwargs.get("max_team_size", 4),
    }
    resp = await client.post(
        "/api/v1/team-projects",
        headers=auth_header(teacher),
        json=body,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── create + listing ────────────────────────────────────────────────────────


async def test_create_returns_counts(client: AsyncClient, db, org, teacher):
    project = await _create_project(client, teacher)
    assert project["member_count"] == 0
    assert project["is_member"] is False
    assert project["max_team_size"] == 4


async def test_student_cannot_create(client: AsyncClient, db, org, student):
    resp = await client.post(
        "/api/v1/team-projects",
        headers=auth_header(student),
        json={"title": "Nope"},
    )
    assert resp.status_code == 403, resp.text


# ── join / members / full / double-join ───────────────────────────────────────


async def test_join_then_members_list(client: AsyncClient, db, org, teacher):
    project = await _create_project(client, teacher, max_team_size=3)
    s1 = await _student(db, org, 1)
    s2 = await _student(db, org, 2)

    for s in (s1, s2):
        r = await client.post(
            f"/api/v1/team-projects/{project['id']}/join", headers=auth_header(s)
        )
        assert r.status_code == 201, r.text

    resp = await client.get(
        f"/api/v1/team-projects/{project['id']}/members", headers=auth_header(s1)
    )
    assert resp.status_code == 200, resp.text
    members = resp.json()
    assert len(members) == 2
    assert {m["user_id"] for m in members} == {str(s1.id), str(s2.id)}
    assert all(m["user_name"] for m in members)
    assert all(m["role"] == "member" for m in members)


async def test_double_join_conflicts(client: AsyncClient, db, org, teacher):
    project = await _create_project(client, teacher)
    s1 = await _student(db, org, 1)
    r1 = await client.post(
        f"/api/v1/team-projects/{project['id']}/join", headers=auth_header(s1)
    )
    assert r1.status_code == 201, r1.text
    r2 = await client.post(
        f"/api/v1/team-projects/{project['id']}/join", headers=auth_header(s1)
    )
    assert r2.status_code == 409, r2.text


async def test_join_respects_max_team_size(client: AsyncClient, db, org, teacher):
    project = await _create_project(client, teacher, max_team_size=1)
    s1 = await _student(db, org, 1)
    s2 = await _student(db, org, 2)
    r1 = await client.post(
        f"/api/v1/team-projects/{project['id']}/join", headers=auth_header(s1)
    )
    assert r1.status_code == 201, r1.text
    r2 = await client.post(
        f"/api/v1/team-projects/{project['id']}/join", headers=auth_header(s2)
    )
    assert r2.status_code == 409, r2.text


async def test_get_project_reflects_membership(client: AsyncClient, db, org, teacher):
    project = await _create_project(client, teacher)
    s1 = await _student(db, org, 1)
    await client.post(
        f"/api/v1/team-projects/{project['id']}/join", headers=auth_header(s1)
    )
    resp = await client.get(
        f"/api/v1/team-projects/{project['id']}", headers=auth_header(s1)
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["member_count"] == 1
    assert body["is_member"] is True


# ── submit / submissions ──────────────────────────────────────────────────────


async def test_submit_and_list_submissions(client: AsyncClient, db, org, teacher):
    project = await _create_project(client, teacher)
    s1 = await _student(db, org, 1)
    await client.post(
        f"/api/v1/team-projects/{project['id']}/join", headers=auth_header(s1)
    )

    sub = await client.post(
        f"/api/v1/team-projects/{project['id']}/submit",
        headers=auth_header(s1),
        json={"content": {"url": "https://github.com/team/repo"}},
    )
    assert sub.status_code == 201, sub.text

    resp = await client.get(
        f"/api/v1/team-projects/{project['id']}/submissions", headers=auth_header(s1)
    )
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["content"] == {"url": "https://github.com/team/repo"}
    assert rows[0]["submitter_name"]
    assert rows[0]["created_at"]


async def test_non_member_cannot_submit_or_view(client: AsyncClient, db, org, teacher):
    project = await _create_project(client, teacher)
    outsider = await _student(db, org, 9)
    sub = await client.post(
        f"/api/v1/team-projects/{project['id']}/submit",
        headers=auth_header(outsider),
        json={"content": {"text": "sneaky"}},
    )
    assert sub.status_code == 403, sub.text
    view = await client.get(
        f"/api/v1/team-projects/{project['id']}/submissions",
        headers=auth_header(outsider),
    )
    assert view.status_code == 403, view.text


# ── leave / remove member ─────────────────────────────────────────────────────


async def test_leave_project(client: AsyncClient, db, org, teacher):
    project = await _create_project(client, teacher)
    s1 = await _student(db, org, 1)
    await client.post(
        f"/api/v1/team-projects/{project['id']}/join", headers=auth_header(s1)
    )
    leave = await client.post(
        f"/api/v1/team-projects/{project['id']}/leave", headers=auth_header(s1)
    )
    assert leave.status_code == 204, leave.text

    # No longer a member.
    again = await client.post(
        f"/api/v1/team-projects/{project['id']}/leave", headers=auth_header(s1)
    )
    assert again.status_code == 404, again.text


async def test_teacher_removes_member(client: AsyncClient, db, org, teacher):
    project = await _create_project(client, teacher)
    s1 = await _student(db, org, 1)
    await client.post(
        f"/api/v1/team-projects/{project['id']}/join", headers=auth_header(s1)
    )
    resp = await client.delete(
        f"/api/v1/team-projects/{project['id']}/members/{s1.id}",
        headers=auth_header(teacher),
    )
    assert resp.status_code == 204, resp.text
    members = await client.get(
        f"/api/v1/team-projects/{project['id']}/members", headers=auth_header(teacher)
    )
    assert members.json() == []


# ── org isolation ─────────────────────────────────────────────────────────────


async def test_org_isolation(client: AsyncClient, db, org, teacher, admin2):
    project = await _create_project(client, teacher)
    # admin2 is in a different org → 404 everywhere.
    for path in ("", "/members", "/submissions"):
        resp = await client.get(
            f"/api/v1/team-projects/{project['id']}{path}", headers=auth_header(admin2)
        )
        assert resp.status_code == 404, (path, resp.text)
    join = await client.post(
        f"/api/v1/team-projects/{project['id']}/join", headers=auth_header(admin2)
    )
    assert join.status_code == 404, join.text


async def test_list_excludes_other_orgs(client: AsyncClient, db, org, teacher, admin2):
    await _create_project(client, teacher)
    resp = await client.get("/api/v1/team-projects", headers=auth_header(admin2))
    assert resp.status_code == 200, resp.text
    assert resp.json() == []
