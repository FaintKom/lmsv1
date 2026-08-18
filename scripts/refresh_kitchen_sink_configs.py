"""Bring the seeded Kitchen Sink exercises back in line with the fixtures.

`create_kitchen_sink_course.py` matches rows by a deterministic uuid5 and then
leaves them alone: changing a fixture does not rewrite an exercise that already
exists. That is the right default for a seeder, since it cannot then trample
content somebody edited, and it means every fixture repair only protects the next
fresh database.

Measured in production on 2026-08-19, after four fixture repairs had shipped:

    code_challenge | Kitchen Sink | solution reads no stdin   (finding 11)
    crossword      | Kitchen Sink | no words key              (finding 3)
    bubble_sheet   | Kitchen Sink | no questions key          (findings 9 and 12)

All three are unsolvable as a pupil meets them, in the one course a human opens to
look at every exercise type.

This script rewrites `config` on exercises the Kitchen Sink seeder owns, and
nothing else: no other course, no submissions, no questions, no test cases. It
reports what it would change and stops there unless `--apply` is passed.

Production mounts neither scripts/ nor qa/ into the backend container, so both
files travel in. The QA stack does mount them and needs no copying.

    # look
    docker compose -f docker-compose.prod.yml cp scripts/refresh_kitchen_sink_configs.py backend:/tmp/refresh.py
    docker compose -f docker-compose.prod.yml cp qa/exercise-fixtures.json backend:/tmp/fixtures.json
    docker compose -f docker-compose.prod.yml exec -T backend python /tmp/refresh.py --fixtures /tmp/fixtures.json

    # do it
    docker compose -f docker-compose.prod.yml exec -T backend python /tmp/refresh.py --fixtures /tmp/fixtures.json --apply
"""

import argparse
import asyncio
import json
import pathlib
import sys
import uuid

_REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent

# Where the `app` package lives depends on how this is run: from the repo root,
# from backend/, or from /tmp inside the container - which is how it reaches
# production, because scripts/ is not in the image. Look for a file only the real
# package has rather than for a directory named "app": on the container the root
# holds /app, so a name check picks the wrong one and the import fails later.
for _candidate in (_REPO_ROOT, _REPO_ROOT / "backend", pathlib.Path("/app")):
    if (_candidate / "app" / "db" / "session.py").exists():
        sys.path.insert(0, str(_candidate))
        break

# The same namespace as create_kitchen_sink_course.py. Keep the two equal, or this
# script addresses rows that do not exist and reports a cheerful nothing to do.
NAMESPACE_KS = uuid.UUID("9f1b7c2e-4d6a-5e8f-9a0b-1c2d3e4f5a6b")

# Where the fixtures are depends on the stack. The QA compose mounts ./qa into
# the container; production mounts neither scripts/ nor qa/, so there the file is
# copied in and named with --fixtures.
_FIXTURE_CANDIDATES = (
    _REPO_ROOT / "qa" / "exercise-fixtures.json",
    pathlib.Path("/app/qa/exercise-fixtures.json"),
    pathlib.Path("/tmp/fixtures.json"),
)


def ks_uuid(slug: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE_KS, slug)


def find_fixtures(explicit: str | None) -> pathlib.Path:
    """Where to read the fixtures from, said out loud rather than guessed at."""
    if explicit:
        path = pathlib.Path(explicit)
        if not path.exists():
            raise SystemExit(f"no fixtures at {path}")
        return path
    for candidate in _FIXTURE_CANDIDATES:
        if candidate.exists():
            return candidate
    raise SystemExit(
        "no fixtures found in "
        + ", ".join(str(c) for c in _FIXTURE_CANDIDATES)
        + " — copy the file in and pass --fixtures"
    )


def load_fixture_configs(path: pathlib.Path) -> dict[str, dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return {f["type"]: (f.get("config") or {}) for f in data["fixtures"]}


def describe_change(ex_type: str, current: dict, wanted: dict) -> str:
    """What a reader needs in order to judge whether the rewrite is the right one."""
    gone = sorted(set(current) - set(wanted))
    added = sorted(set(wanted) - set(current))
    changed = sorted(k for k in set(current) & set(wanted) if current[k] != wanted[k])
    parts = []
    if added:
        parts.append(f"+{added}")
    if gone:
        parts.append(f"-{gone}")
    if changed:
        parts.append(f"~{changed}")
    return f"{ex_type}: " + (", ".join(parts) or "no visible key change")


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="write the changes; without it the script only reports",
    )
    parser.add_argument(
        "--fixtures",
        help="path to exercise-fixtures.json; needed where qa/ is not mounted",
    )
    args = parser.parse_args()

    # Imported here so --help works without a database or the app's environment.
    from sqlalchemy import select

    # SQLAlchemy resolves relationship() targets by name against its class
    # registry, so every model an Exercise can reach has to be imported before
    # the mapper is used. Importing only exercises.models raises
    # "expression 'Lesson' failed to locate a name" at query time, not at import.
    import app.assessments.models  # noqa: F401
    import app.auth.models  # noqa: F401
    import app.courses.models  # noqa: F401
    import app.sandbox.models  # noqa: F401
    import app.submissions.models  # noqa: F401
    from app.db.session import async_session_factory
    from app.exercises.models import Exercise

    fixtures_path = find_fixtures(args.fixtures)
    print(f"fixtures: {fixtures_path}")
    wanted_by_type = load_fixture_configs(fixtures_path)
    ids = {ks_uuid(f"exercise-{t}"): t for t in wanted_by_type}

    async with async_session_factory() as db:
        found = (await db.execute(select(Exercise).where(Exercise.id.in_(list(ids))))).scalars()
        rows = list(found.all())
        if not rows:
            print("no Kitchen Sink exercises found — nothing to do")
            return 0

        stale = [
            (ex, wanted_by_type[ids[ex.id]])
            for ex in rows
            if (ex.config or {}) != wanted_by_type[ids[ex.id]]
        ]

        print(
            f"Kitchen Sink exercises: {len(rows)} found, {len(stale)} out of step with the fixtures"
        )
        for ex, wanted in stale:
            print("  " + describe_change(ids[ex.id], ex.config or {}, wanted))

        if not stale:
            return 0
        if not args.apply:
            print("\ndry run — pass --apply to write these")
            return 0

        for ex, wanted in stale:
            ex.config = wanted
        await db.commit()
        print(f"\nupdated {len(stale)} exercise(s)")

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
