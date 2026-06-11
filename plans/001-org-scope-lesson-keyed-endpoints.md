# Plan 001: Lesson-keyed endpoints enforce org/enrollment ownership

> **Executor instructions**: Follow step by step. Run every verification command
> and confirm the expected result before the next step. If a STOP condition
> occurs, stop and report. When done, update the 001 row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0521717..HEAD -- backend/app/assessments backend/app/submissions backend/app/progress backend/app/journal backend/app/common`
> If any in-scope file changed since `0521717`, compare the "Current state"
> excerpts against the live code before proceeding; on mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (touches authz on hot read paths — a too-strict check 403s real users)
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0521717`, 2026-06-11

## Why this matters

Several lesson-keyed resources are fetched by bare id with no organization or
enrollment ownership check. Students are scoped to their own rows, but a caller
who knows a resource UUID from another organization (most plausibly a teacher or
admin in org B, or a student probing) can read a quiz, file submission, or
interactive submission belonging to org A. In a multi-tenant LMS this is a
cross-tenant data leak. This plan introduces one shared helper that verifies a
lesson belongs to the caller's org, and applies it on the unprotected read/grade
paths so the isolation is enforced in one auditable place.

## Current state

Multi-tenancy convention (from `backend/CLAUDE.md`): org-owned tables carry
`org_id`; isolation is enforced in router/service via
`current_user.org_id == resource.org_id`, with `super_admin` exempt. `Quiz`,
`FileSubmission`, interactive submissions have **no** `org_id` column — their org
is reachable only through `lesson_id → Module.course_id → Course.org_id`.

Unprotected service functions:

- `backend/app/assessments/service.py:41-50` — `get_quiz(db, quiz_id)`: fetches
  by id, no org check. Called by `get_quiz_endpoint` (router.py:59) and by
  `submit_quiz`.
- `backend/app/assessments/service.py:53-62` — `get_quiz_by_lesson(db, lesson_id)`:
  same gap. Called by `get_quiz_by_lesson_endpoint` (router.py:70).
- `backend/app/submissions/service.py:76-85` — `get_file_submissions`: filters by
  `lesson_id`; students scoped to own, but teacher/admin in another org are not
  blocked from another org's lesson.
- `backend/app/submissions/service.py:88-100` — `get_file_submission` (download):
  student scoped to own; no org check for staff roles.
- `backend/app/submissions/service.py` interactive: `get_interactive_submissions`
  (around line 453 per audit) — same lesson-only filter.
- `backend/app/progress/router.py:225-267` — highlights `list`/`create` endpoints
  take `lesson_id` and never verify the student can access that lesson.

Existing helper home: `backend/app/common/` contains `exceptions.py`
(`NotFoundError`, `BadRequestError`, etc.), `file_validation.py`, `pagination.py`,
`storage.py`, `timing.py`. There is **no** `auth.py` yet — this plan creates it.

Exemplar of the correct pattern already in the repo — `backend/app/progress/service.py:48-67`
(`complete_lesson`) walks `Lesson → Module → Course` and checks enrollment. And
`enroll` (`progress/service.py:19-27`) filters `Course.org_id == user.org_id`.
Match these.

`User` model: `user.org_id` (UUID), `user.role` (`UserRole` enum, member
`super_admin`). Import as `from app.auth.models import User, UserRole`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Backend tests | `cd backend && pytest -q` | all pass, exit 0 |
| Targeted tests | `cd backend && pytest tests/test_assessments.py tests/test_progress.py -q` | pass |
| Lint | `cd backend && ruff check app/ tests/` | exit 0 |

## Scope

**In scope:**
- `backend/app/common/auth.py` (create)
- `backend/app/assessments/service.py`
- `backend/app/submissions/service.py`
- `backend/app/progress/router.py` (highlights endpoints only)
- `backend/app/journal/service.py` (the group-name lookup at line ~583 — S7)

**Out of scope (do NOT touch):**
- The highlights `delete` endpoint (`progress/router.py:270`) — already scoped by
  `user_id`.
- Any change to response shapes / Pydantic schemas — clients depend on them.
- `complete_lesson` / `enroll` — already correct; reference only.
- Test files — those are Plan 002.

## Steps

### Step 1: Create the shared org-scope helper

Create `backend/app/common/auth.py` with a `lesson_in_user_org(db, lesson_id, user)`
coroutine that joins `Lesson → Module → Course`, filters `Course.org_id ==
user.org_id` UNLESS `user.role == UserRole.super_admin`, and raises
`NotFoundError("Lesson not found")` when no row matches (404, not 403 — avoids
leaking cross-org existence, matches `complete_lesson`/`enroll`). Prefer a Python
branch for the super_admin exemption (`if user.role != UserRole.super_admin:
query = query.where(Course.org_id == user.org_id)`) over an inline SQL boolean —
safer to compile. Return the `Lesson`.

**Verify**: `cd backend && python -c "import app.common.auth"` → exit 0.

### Step 2: Guard the quiz read paths

In `backend/app/assessments/service.py`, give `get_quiz` and `get_quiz_by_lesson`
a `user: User` param and verify org:
- `get_quiz(db, quiz_id, user)`: after loading the quiz, call
  `await lesson_in_user_org(db, quiz.lesson_id, user)`.
- `get_quiz_by_lesson(db, lesson_id, user)`: call `lesson_in_user_org` first, then load.
- `submit_quiz`: thread `user` into its internal `get_quiz` call.
Update the three call sites in `assessments/router.py` (`get_quiz_endpoint:65`,
`get_quiz_by_lesson_endpoint:76`, submit endpoint) to pass `user`. Import
`from app.common.auth import lesson_in_user_org`.

**Verify**: `cd backend && ruff check app/assessments/` → exit 0.

### Step 3: Guard the submissions read paths

In `backend/app/submissions/service.py`: `get_file_submissions` and
`get_interactive_submissions` call `lesson_in_user_org(db, lesson_id, user)` at the
top. `get_file_submission` (keyed by `submission_id`): after loading, for
non-students call `lesson_in_user_org(db, submission.lesson_id, user)`; keep the
existing student-owns-row branch. Import the helper.

**Verify**: `cd backend && ruff check app/submissions/` → exit 0.

### Step 4: Guard the highlights endpoints

In `backend/app/progress/router.py`, in `list_highlights_endpoint:225` and
`create_highlight_endpoint:250`, call `await lesson_in_user_org(db, lesson_id,
user)` before the query / insert. Org-scope only (not enrollment — avoid 403-ing
preview flows). Import the helper.

**Verify**: `cd backend && ruff check app/progress/` → exit 0.

### Step 5: Fix the journal group-name leak (S7)

In `backend/app/journal/service.py` (~line 583) the optional group-name lookup
`select(StudentGroup).where(StudentGroup.id == group_id)` has no org filter. Add
`.where(StudentGroup.org_id == user.org_id)`. If `StudentGroup` has no `org_id`,
STOP and report.

**Verify**: `cd backend && ruff check app/journal/` → exit 0.

### Step 6: Full backend suite

**Verify**: `cd backend && pytest -q` → all pass. Happy-path tests use same-org
fixtures and must not regress. If a pre-existing test fails because it relied on
cross-org access, that test encoded the bug — STOP and report; do not weaken the
helper.

## Test plan

Cross-org tests are **Plan 002** (separate commit). This plan's gate is the
existing suite staying green (`pytest -q`). Write no new tests here.

## Done criteria

- [ ] `backend/app/common/auth.py` exists and exports `lesson_in_user_org`
- [ ] `cd backend && ruff check app/ tests/` exits 0
- [ ] `cd backend && pytest -q` exits 0 (no regressions)
- [ ] quiz (`get_quiz`/`get_quiz_by_lesson`/`submit_quiz`), three submissions
      readers, both highlights endpoints, journal group lookup all run the check
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` row 001 set to DONE

## STOP conditions

- Any "Current state" excerpt doesn't match live code (drift).
- `StudentGroup` has no `org_id` column (Step 5 assumption false).
- A pre-existing test fails for a reason other than reliance on cross-org access.
- super_admin global read breaks — re-check the exemption branch.

## Maintenance notes

- Any NEW endpoint taking a `lesson_id` (or lesson-keyed resource id) MUST call
  `lesson_in_user_org`. Canonical guard.
- Reviewer: confirm `super_admin` keeps global read and the highlights change
  didn't break the enrolled-student preview flow.
- Deferred: enrollment-level scoping on highlights; a full sweep of every other
  `lesson_id`-keyed endpoint.
