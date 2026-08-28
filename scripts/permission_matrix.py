"""Who may call what — one table instead of one browser session per role.

Answers the question that cost a day of manual checking on 2026-08-24: the
admin router admits a plain teacher on 34 endpoints, and six of them had been
looked at. This walks every listed endpoint with every role and prints what
each one answers.

Runs against the QA stack, never against production. Identities are minted the
way the test suite mints them — a token for a synthetic user in the local
database — so no password is typed anywhere.

    python scripts/permission_matrix.py                # table
    python scripts/permission_matrix.py --json         # machine-readable
    python scripts/permission_matrix.py --only groups  # filter by path

Read the table as a claim about *reachability*, not about correctness: 200
says the door opens, not that what comes through it is properly scoped.
Scoping is what the per-endpoint tests are for.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timezone

import httpx

BASE = os.environ.get("QA_BASE_URL", "http://localhost:8000")

# Paths that take an id are probed with a throwaway one: a 404 then means "you
# may ask, there is no such row", which is a different answer from 403.
NOWHERE = "00000000-0000-0000-0000-000000000000"

def endpoints(subject: str) -> list[str]:
    """The sweep, with a real student's id where a row is needed.

    A throwaway id answers 404 even where the role check never fired, which
    reads as "closed" and is not. ``subject`` is a real student of the same
    school, so the answer is about permission rather than about existence.
    """
    return [p.replace("{subject}", subject) for p in _PATHS]


# GET only. A permission sweep that mutates is a sweep you run once.
_PATHS: list[str] = [
    "/api/v1/admin/dashboard",
    "/api/v1/admin/users",
    "/api/v1/admin/organizations",
    "/api/v1/admin/courses",
    "/api/v1/admin/groups",
    "/api/v1/admin/teacher-stats",
    "/api/v1/admin/students/{subject}/profile",
    "/api/v1/admin/analytics/detailed",
    "/api/v1/admin/analytics/report",
    "/api/v1/admin/analytics/export-csv",
    "/api/v1/admin/analytics/v2/overview",
    "/api/v1/admin/analytics/v2/student-risks",
    "/api/v1/admin/analytics/v2/course-effectiveness",
    "/api/v1/admin/analytics/v2/exercise-difficulty",
    "/api/v1/admin/analytics/v2/activity-timeline",
    "/api/v1/admin/analytics/v2/attendance-impact",
    "/api/v1/admin/analytics/v2/kpi-deltas",
    "/api/v1/admin/analytics/v2/xp-movers",
    "/api/v1/admin/gradebook",
    "/api/v1/admin/review-queue",
    "/api/v1/admin/review-queue/count",
    f"/api/v1/admin/courses/{NOWHERE}/students",
    f"/api/v1/admin/groups/{NOWHERE}/members",
    "/api/v1/courses/",
    f"/api/v1/courses/{NOWHERE}",
    "/api/v1/journal/students",
    "/api/v1/journal/teachers",
    "/api/v1/journal/attention",
    "/api/v1/journal/today",
    "/api/v1/journal/room-board",
    f"/api/v1/journal/sessions?course_id={NOWHERE}",
    f"/api/v1/analytics/task-stats/courses/{NOWHERE}",
    "/api/v1/attendance/summary",
    "/api/v1/attendance/my",
    "/api/v1/rooms",
    "/api/v1/curriculum",
    "/api/v1/calendar/events",
    "/api/v1/progress/my-courses/",
    "/api/v1/progress/my-grades",
    "/api/v1/gamification/my-streak",
]

# "methodist" is not a role but a flag on a teacher — the distinction that made
# a methodist read "0 courses" on her own dashboard (specs/061).
ROLES = ["student", "parent", "teacher", "methodist", "admin", "super_admin"]


async def _mint_identities() -> tuple[dict[str, str], str]:
    """A token per role plus one real student to ask questions about."""
    # Two layouts to satisfy: the repository keeps the package in
    # ``backend/app``, the container flattens it to ``/app/app``. Python puts
    # the *script's* directory on the path, not the working one, so neither is
    # found by accident.
    here = os.path.dirname(os.path.abspath(__file__))
    for candidate in (os.path.join(here, "..", "backend"), os.path.join(here, "..")):
        if os.path.isdir(os.path.join(candidate, "app")):
            sys.path.insert(0, candidate)
            break
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.orm import sessionmaker

    from app.auth.models import Organization, User, UserRole
    from app.auth.security import create_access_token, hash_password

    engine = create_async_engine(os.environ["DATABASE_URL"])
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    tokens: dict[str, str] = {}
    async with factory() as db:
        org = Organization(name=f"Matrix {uuid.uuid4().hex[:6]}", slug=uuid.uuid4().hex[:10])
        db.add(org)
        await db.flush()

        for label in ROLES:
            role = UserRole.teacher if label == "methodist" else UserRole[label]
            u = User(
                org_id=org.id,
                email=f"{label}-{uuid.uuid4().hex[:8]}@matrix.test",
                hashed_password=hash_password("NotUsed123!"),
                full_name=f"Matrix {label}",
                role=role,
                is_active=True,
                is_methodist=(label == "methodist"),
                consent_accepted_at=datetime.now(timezone.utc),
            )
            db.add(u)
            await db.flush()
            tokens[label] = create_access_token({"sub": str(u.id)})

        # Somebody for the others to ask about — a student who is nobody's
        # child and nobody's pupil, so a 200 means the door is simply open.
        subject = User(
            org_id=org.id,
            email=f"subject-{uuid.uuid4().hex[:8]}@matrix.test",
            hashed_password=hash_password("NotUsed123!"),
            full_name="Subject Student",
            role=UserRole.student,
            is_active=True,
            consent_accepted_at=datetime.now(timezone.utc),
        )
        db.add(subject)
        await db.flush()
        subject_id = str(subject.id)
        await db.commit()

    await engine.dispose()
    return tokens, subject_id


async def _sweep(tokens: dict[str, str], paths: list[str]) -> list[dict]:
    rows = []
    async with httpx.AsyncClient(base_url=BASE, timeout=20) as client:
        for path in paths:
            row: dict = {"path": path}
            for label, token in tokens.items():
                try:
                    r = await client.get(path, headers={"Authorization": f"Bearer {token}"})
                    row[label] = r.status_code
                except httpx.HTTPError as exc:
                    row[label] = f"err {type(exc).__name__}"
            rows.append(row)
    return rows


def _print_table(rows: list[dict]) -> None:
    width = max(len(r["path"]) for r in rows) + 2
    header = "endpoint".ljust(width) + "".join(r.rjust(12) for r in ROLES)
    print(header)
    print("-" * len(header))
    for row in rows:
        line = row["path"].ljust(width)
        for label in ROLES:
            line += str(row[label]).rjust(12)
        print(line)


async def main() -> int:
    parser = argparse.ArgumentParser(description="Permission matrix over the QA stack.")
    parser.add_argument("--json", action="store_true", help="print rows as JSON")
    parser.add_argument("--only", default="", help="substring filter on the path")
    args = parser.parse_args()

    if "DATABASE_URL" not in os.environ:
        print("DATABASE_URL is not set — point it at the QA stack, not at prod.")
        return 2

    tokens, subject = await _mint_identities()
    paths = [p for p in endpoints(subject) if args.only in p]
    rows = await _sweep(tokens, paths)

    if args.json:
        print(json.dumps(rows, indent=2))
    else:
        _print_table(rows)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
