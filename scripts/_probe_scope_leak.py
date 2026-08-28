"""Does a plain teacher see other people's students through the admin API?

The permission matrix says these doors open for a teacher:

    /api/v1/admin/courses/{id}/students   200 — even for a course that does not exist
    /api/v1/admin/analytics/v2/*          200 — school-wide risk and activity

A status code cannot tell scoping from openness. This asks what actually comes
back: one school, two teachers who share nothing, and the question of whether
the second can read the first one's roster and risk list.

Throwaway probe — QA stack only. Delete once the answer lives in a test.
"""

from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

import httpx

BASE = os.environ.get("QA_BASE_URL", "http://localhost:8000")

here = os.path.dirname(os.path.abspath(__file__))
for candidate in (os.path.join(here, "..", "backend"), os.path.join(here, "..")):
    if os.path.isdir(os.path.join(candidate, "app")):
        sys.path.insert(0, candidate)
        break

# Relationships name classes from modules this probe never touches, and an
# unresolved name fails the whole mapper. The test suite solves it the same
# way: import every model module before asking the database anything.
import importlib  # noqa: E402
import pkgutil  # noqa: E402

import app as _app_pkg  # noqa: E402

for _m in pkgutil.iter_modules(_app_pkg.__path__):
    try:
        importlib.import_module(f"app.{_m.name}.models")
    except ModuleNotFoundError:
        pass

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.auth.models import Organization, User, UserRole  # noqa: E402
from app.auth.security import create_access_token, hash_password  # noqa: E402
from app.courses.models import Course, CourseStatus  # noqa: E402
from app.progress.models import Enrollment  # noqa: E402


async def build() -> dict:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as db:
        org = Organization(name=f"Leak {uuid.uuid4().hex[:6]}", slug=uuid.uuid4().hex[:10])
        db.add(org)
        await db.flush()

        def person(role, name):
            return User(
                org_id=org.id,
                email=f"{name}-{uuid.uuid4().hex[:8]}@leak.test",
                hashed_password=hash_password("NotUsed123!"),
                full_name=name,
                role=role,
                is_active=True,
                consent_accepted_at=datetime.now(timezone.utc),
            )

        owner = person(UserRole.teacher, "Owner")
        stranger = person(UserRole.teacher, "Stranger")
        pupil = person(UserRole.student, "Owners Pupil")
        db.add_all([owner, stranger, pupil])
        await db.flush()

        course = Course(
            org_id=org.id,
            title="Owner's course",
            slug=uuid.uuid4().hex[:12],
            description="",
            teacher_id=owner.id,
            status=CourseStatus.published,
        )
        db.add(course)
        await db.flush()
        db.add(
            Enrollment(
                course_id=course.id,
                student_id=pupil.id,
                enrolled_at=datetime.now(timezone.utc),
            )
        )
        await db.commit()

        out = {
            "course_id": str(course.id),
            "pupil_name": pupil.full_name,
            "owner": create_access_token({"sub": str(owner.id)}),
            "stranger": create_access_token({"sub": str(stranger.id)}),
        }

    await engine.dispose()
    return out


def _names(payload) -> list:
    rows = payload if isinstance(payload, list) else (
        payload.get("items") or payload.get("students") or payload.get("data") or []
    )
    if not isinstance(rows, list):
        return []
    return [r.get("full_name") or r.get("student_name") or r.get("name") for r in rows if isinstance(r, dict)]


async def main() -> int:
    d = await build()
    async with httpx.AsyncClient(base_url=BASE, timeout=20) as c:
        for who in ("owner", "stranger"):
            h = {"Authorization": f"Bearer {d[who]}"}

            roster = await c.get(f"/api/v1/admin/courses/{d['course_id']}/students", headers=h)
            names = _names(roster.json()) if roster.status_code == 200 else []

            risks = await c.get("/api/v1/admin/analytics/v2/student-risks", headers=h)
            risk_names = _names(risks.json()) if risks.status_code == 200 else []

            print(f"{who:9} roster={roster.status_code} {names}")
            print(f"{'':9} risks={risks.status_code} {risk_names}")

    print(f"\nowner's pupil is named: {d['pupil_name']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
