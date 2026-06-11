# Plan 005: Correctness hardening (races, null-checks, tz, bounds)

> **Executor instructions**: Follow step by step. Run every verification command.
> If a STOP condition occurs, stop and report. When done, update the 005 row in
> `plans/README.md`. Sub-tasks A–F are independent; each is committable alone.
>
> **Drift check (run first)**: `git diff --stat 0521717..HEAD -- backend/app/progress backend/app/gamification backend/app/donations`
> On mismatch for a sub-task, treat that sub-task as STOP and skip to the next.

## Status

- **Priority**: P2
- **Effort**: M (six small fixes)
- **Risk**: MED (sub-task A adds a DB migration)
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0521717`, 2026-06-11

## Why this matters

Six concrete defects: duplicate-enrollment race, streak double-increment race,
null-deref on orphaned lessons, naive-datetime on a tz-aware column, unbounded
video duration, donation-status silent no-op. Each small; together they remove a
class of silent data-integrity bugs.

## Current state

- **A — enroll race** `progress/service.py:29-45`: check-then-act on
  `(course_id, student_id)`, no unique constraint. Model: `progress/models.py`.
- **B — streak race** `gamification/service.py:98-138`: read `last_activity_date`,
  compare `== today`, then update. Concurrent same-day calls double-increment.
- **C — module null-deref** `progress/service.py:57-62`: `module =
  ...scalar_one_or_none()` then `module.course_id`, no None-check.
- **D — naive datetime** `gamification/models.py:114`: `onupdate=lambda:
  datetime.now()` on a `DateTime(timezone=True)` column.
- **E — unbounded duration** `progress/router.py:141`: `float(data.duration_seconds)`
  no upper bound. Schema: `grep -rn "class VideoProgressUpdate" backend/app/progress`.
- **F — donation status no-op** `donations/service.py:132-142`: if/elif, no `else`.

Migrations in `backend/alembic/versions/`, head `hl1a2b3c4d5`. `op.execute` must
be rerun-safe (`IF NOT EXISTS`) — `_run_setup()` re-runs ALTERs on boot. Naming
`<6char>_<verb>_<entity>.py`. Never edit a shipped migration; add a new one.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Tests | `cd backend && pytest -q` | pass |
| Migration (rerun-safe) | `cd backend && alembic upgrade head` (run twice) | 2nd run no error |
| Lint | `cd backend && ruff check app/` | exit 0 |

## Scope

**In scope:** the six files + one new Alembic migration (A) + targeted tests in
`tests/test_progress.py` / `tests/test_gamification.py` / `tests/test_donations.py`
(where they exist).
**Out of scope:** editing existing migrations; Plan 004's logging (F adds an
`else` branch, not a change to an existing `except`).

## Steps

### Sub-task A: Enrollment unique constraint
1. Add a unique `(course_id, student_id)` to `Enrollment` (`progress/models.py`)
   via `__table_args__` (or a model-level unique index, to match repo habit).
2. New migration: `cd backend && alembic revision -m "add unique enrollment course_student"`.
   Make it rerun-safe — simplest: `op.execute("CREATE UNIQUE INDEX IF NOT EXISTS
   uq_enrollment_course_student ON enrollments (course_id, student_id)")`. (Confirm
   the table name is `enrollments` from the model `__tablename__`.)
3. In `enroll()`, keep the pre-check, but wrap `flush()` in `try/except
   IntegrityError` → `BadRequestError("Already enrolled")` so the race loser gets
   a 400, not a 500.
**Verify**: `alembic upgrade head` twice → 2nd run clean; `pytest tests/test_progress.py -q` → pass.

### Sub-task B: Atomic streak update
Make the same-day guard non-double-incrementing: guard `if streak.last_activity_date
== today: return` before any increment, and do increment + `last_activity_date =
today` together before flush. Stronger option: `UPDATE ... WHERE last_activity_date
< today` so a concurrent second call updates 0 rows. Fit the existing model; do
not add a table.
**Verify**: `pytest tests/test_gamification.py -q` (if present) else `pytest -q`.

### Sub-task C: Module null-check
After `progress/service.py:58`: `if module is None: raise NotFoundError("Lesson is
not attached to a module")` before using `module.course_id`.
**Verify**: `pytest -q` → pass.

### Sub-task D: tz-aware onupdate
`gamification/models.py:114`: `datetime.now()` → `datetime.now(timezone.utc)`;
ensure `timezone` imported.
**Verify**: `ruff check app/gamification/` → exit 0.

### Sub-task E: Bound video duration
In `VideoProgressUpdate`: `duration_seconds: float | None = Field(default=None,
ge=0, le=86400)` and `position_seconds: float = Field(ge=0, le=86400)` if not
already bounded. Validators live in schemas per `backend/CLAUDE.md`.
**Verify**: `pytest tests/test_progress.py -q` → pass.

### Sub-task F: Donation unknown-status branch
`donations/service.py:132-142`: add `else` that logs a warning (module logger) and
leaves the donation in a clearly-unhandled state — do NOT flush as processed.
**Verify**: `pytest -q` → pass (add a test if `tests/test_donations.py` exists).

### Final
**Verify**: `cd backend && pytest -q` → pass; `ruff check app/` → exit 0;
`alembic upgrade head` twice → 2nd run clean.

## Test plan

- A: second `enroll()` for same `(course, student)` → 400 not 500 (`tests/test_progress.py`).
- C: `complete_lesson` on module-less lesson → `NotFoundError` (if cheap to set up).
- E: `duration_seconds` above cap → 422.
- B/D/F: add tests only where fixtures make it cheap; else rely on `pytest -q` green.

## Done criteria

- [ ] `Enrollment` unique `(course_id, student_id)`; migration rerun-safe (twice clean)
- [ ] `enroll()` maps race-loser IntegrityError to 400
- [ ] streak cannot double-increment same day
- [ ] `complete_lesson` null-checks `module`
- [ ] `gamification/models.py:114` tz-aware
- [ ] `VideoProgressUpdate` bounds duration/position
- [ ] donation unknown status logs + not silently processed
- [ ] `cd backend && pytest -q` exit 0; `ruff check app/` exit 0
- [ ] `plans/README.md` row 005 set to DONE

## STOP conditions

- Drift in a sub-task's excerpt → skip it, report, continue others.
- Streak model shape differs from assumption (multiple rows/user) → report B first.
- Migration can't be made rerun-safe → report A.

## Maintenance notes

- Reviewer: scrutinize migration rerun-safety (runs under `_run_setup` each boot)
  and async-session rollback on the IntegrityError path.
