"""RBAC matrix - for every (role, endpoint) pair assert the expected HTTP status.

Catches privilege regressions (student suddenly able to delete users,
methodist losing knowledge-search access, etc.) in under 5 seconds. Runs
on every PR via the QA workflow.

Each row: (method, path, body_or_None, params_or_None, {role: expected_status})

Methodist gets the SAME results as teacher because methodist is modelled as
`role=teacher, is_methodist=True` (see backend/app/auth/models.py and
seed_qa.py). The `require_role` dependency only checks `User.role`, not the
methodist flag.
"""
import pytest

# Status codes we tolerate as PASS for write endpoints that lack proper
# bodies in the parametrised request. The point is to verify the AUTH
# decision, not the business logic. 200/201/422 all mean "you cleared
# auth" - they only differ in whether the body was valid for the route.
AUTH_PASS = {200, 201, 422}

RBAC_ROWS: list[tuple[str, str, dict | None, dict | None, dict[str, set[int] | int]]] = [
    # Auth - every authenticated user can fetch their own profile.
    ("GET", "/api/v1/auth/me", None, None,
     {"student": 200, "teacher": 200, "methodist": 200, "admin": 200}),

    # Courses - listing is open to every authenticated role.
    ("GET", "/api/v1/courses", None, None,
     {"student": 200, "teacher": 200, "methodist": 200, "admin": 200}),

    # Creating a course is admin/teacher only.
    ("POST", "/api/v1/courses", {"title": "rbac-probe", "description": ""}, None,
     {"student": 403, "teacher": AUTH_PASS, "methodist": AUTH_PASS, "admin": AUTH_PASS}),

    # Exercises - listing open, creating admin/teacher.
    ("GET", "/api/v1/exercises", None, None,
     {"student": 200, "teacher": 200, "methodist": 200, "admin": 200}),

    ("POST", "/api/v1/exercises",
     {"lesson_id": "00000000-0000-0000-0000-000000000000", "exercise_type": "quiz",
      "title": "rbac-probe", "config": {}},
     None,
     # Teachers/admins clear auth but get 404 (lesson not found) or 422.
     {"student": 403, "teacher": {200, 201, 404, 422}, "methodist": {200, 201, 404, 422},
      "admin": {200, 201, 404, 422}}),

    # Admin user list - admin only.
    ("GET", "/api/v1/admin/users", None, None,
     {"student": 403, "teacher": 403, "methodist": 403, "admin": 200}),

    # Admin dashboard - admin or teacher (methodist included).
    ("GET", "/api/v1/admin/dashboard", None, None,
     {"student": 403, "teacher": 200, "methodist": 200, "admin": 200}),

    # Knowledge search - any authenticated user. 503 is acceptable because
    # the QA stack runs with KNOWLEDGE_EMBEDDINGS_ENABLED=false / no Voyage
    # API key, and the endpoint returns 503 with a clear message rather than
    # silently returning 0 results. Auth still cleared at that point.
    ("GET", "/api/v1/knowledge/search", None, {"q": "algebra"},
     {"student": {200, 503}, "teacher": {200, 503}, "methodist": {200, 503}, "admin": {200, 503}}),

    # Knowledge listing - any authenticated user.
    ("GET", "/api/v1/knowledge", None, None,
     {"student": 200, "teacher": 200, "methodist": 200, "admin": 200}),

    # Deleting a (non-existent) user - admin clears the role gate, others 403.
    ("DELETE", "/api/v1/admin/users/00000000-0000-0000-0000-000000000000", None, None,
     {"student": 403, "teacher": 403, "methodist": 403,
      "admin": {200, 204, 404, 422}}),
]


RBAC_IDS = [f"{row[0]} {row[1]}" for row in RBAC_ROWS]


@pytest.mark.parametrize("method,path,body,params,expected", RBAC_ROWS, ids=RBAC_IDS)
@pytest.mark.parametrize("role", ["student", "teacher", "methodist", "admin"])
async def test_rbac(role, method, path, body, params, expected, role_client_factory):
    c = await role_client_factory(role)
    r = await c.request(method, path, json=body, params=params)
    want = expected[role]
    if isinstance(want, int):
        assert r.status_code == want, (
            f"{role} {method} {path}: got {r.status_code}, want {want}, "
            f"body={r.text[:200]}"
        )
    else:
        assert r.status_code in want, (
            f"{role} {method} {path}: got {r.status_code}, want one of {sorted(want)}, "
            f"body={r.text[:200]}"
        )
