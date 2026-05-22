"""Fixtures for role-flow tests.

These tests target a LIVE backend (the ephemeral QA stack) over real HTTP,
not the in-process ASGITransport used elsewhere in the suite. The goal is
to exercise real role permissions, real DB writes, real middleware
(rate-limiting, auth) against the seeded data from `scripts/seed_qa.py`.

Preconditions (responsibility of the runner - CI workflow or local dev):
  1. `docker compose -f docker-compose.qa.yml up -d --wait`
  2. `python scripts/seed_qa.py` has run against that stack
  3. The 4 QA users (qa-{student,teacher,methodist,admin}@qa.example.com /
     QaTest2026!) exist and are active.

Run from inside the backend container (CI does this):

    docker compose -f docker-compose.qa.yml exec -T backend \\
        env QA_API_URL=http://localhost:8000 pytest tests/role_flows/ -v

Or from the host (port 8000 is published):

    QA_API_URL=http://localhost:8000 pytest backend/tests/role_flows/ -v

These tests are NOT transactional - mutations persist for the lifetime
of the QA stack. Order independence is the test author's responsibility.
"""
import os
import uuid

import pytest_asyncio
from httpx import AsyncClient

API_URL = os.environ.get("QA_API_URL", "http://localhost:8000")

# Mirror of scripts/seed_qa.py constants. Re-derive instead of importing
# because scripts/ is not a Python package (no __init__.py) and importing
# from it requires hacking sys.path even more than the seed already does.
NAMESPACE_QA = uuid.UUID("12345678-1234-5678-1234-567812345678")


def qa_uuid(slug: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE_QA, slug)


QA_ORG_ID    = qa_uuid("qa-org")
QA_COURSE_ID = qa_uuid("qa-course")
QA_MODULE_ID = qa_uuid("qa-module")
QA_LESSON_ID = qa_uuid("qa-lesson")

QA_USERS: dict[str, tuple[str, str]] = {
    "student":   ("qa-student@qa.example.com",   "QaTest2026!"),
    "teacher":   ("qa-teacher@qa.example.com",   "QaTest2026!"),
    "methodist": ("qa-methodist@qa.example.com", "QaTest2026!"),
    "admin":     ("qa-admin@qa.example.com",     "QaTest2026!"),
}


# Module-level token cache. The /auth/login endpoint is rate-limited
# (5/minute per IP) and a parametrised matrix test logs in once per row
# (~40+ logins in a few seconds) - which trips the limiter and turns every
# test red. Cache the access token so we log in at most once per role per
# test process.
_TOKEN_CACHE: dict[str, str] = {}


async def _login_cached(client: AsyncClient, role: str) -> str:
    if role in _TOKEN_CACHE:
        return _TOKEN_CACHE[role]
    email, password = QA_USERS[role]
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text[:200]}"
    token = r.json()["access_token"]
    _TOKEN_CACHE[role] = token
    return token


@pytest_asyncio.fixture
async def live_client():
    """Bare httpx.AsyncClient pointed at the running QA backend."""
    async with AsyncClient(base_url=API_URL, timeout=30.0) as ac:
        yield ac


@pytest_asyncio.fixture
async def role_client_factory(live_client: AsyncClient):
    """Returns an async factory: role_name -> AsyncClient with Bearer token set.

    Tokens are cached at module level (`_TOKEN_CACHE`) so the matrix test's
    40+ calls share at most one login per role - well under the auth/login
    rate-limit (5/minute per IP).
    """
    async def make(role: str) -> AsyncClient:
        if role not in QA_USERS:
            raise KeyError(f"unknown QA role: {role}; valid: {list(QA_USERS)}")
        token = await _login_cached(live_client, role)
        live_client.headers["Authorization"] = f"Bearer {token}"
        return live_client

    return make
