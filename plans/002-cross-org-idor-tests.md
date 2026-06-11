# Plan 002: Cross-org IDOR regression tests

> **Executor instructions**: Follow step by step. Run every verification command.
> If a STOP condition occurs, stop and report. When done, update the 002 row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0521717..HEAD -- backend/tests backend/app/common/auth.py`
> If `backend/app/common/auth.py` does not exist, STOP — Plan 001 must land first.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (test-only)
- **Depends on**: 001 (asserts the behavior 001 introduces)
- **Category**: tests
- **Planned at**: commit `0521717`, 2026-06-11

## Why this matters

Plan 001 closes cross-org read access on lesson-keyed endpoints, but nothing
proves it stays closed. The existing suites for assessments, submissions,
assignments, exercises, peer_review, and team_projects test happy paths and role
separation only — none assert that a user in org B cannot reach org A's
resources. Without these tests, any future refactor silently reopens the IDOR.

## Current state

`backend/tests/conftest.py` provides: `org` (line 169), `org2` (183); `student`
(236), `teacher` (229), `admin` (222) in `org`; `admin2` (250) in `org2`;
`auth_header(user)` (260); `make_course` (269), `make_module` (285), `make_lesson`
(297), `make_enrollment` (312); `client` (httpx ASGITransport); `db`
(transactional rollback). `asyncio_mode = "auto"` — `async def test_*` needs no
marker. Cross-org access expects **404** (Plan 001 raises `NotFoundError`). See
`tests/test_journal.py` and `tests/test_rbac.py` for the org-isolation pattern.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| New tests | `cd backend && pytest tests/test_cross_org_isolation.py -q` | all pass |
| Full suite | `cd backend && pytest -q` | all pass |
| Lint | `cd backend && ruff check tests/` | exit 0 |

## Scope

**In scope:** `backend/tests/test_cross_org_isolation.py` (create — one file).
**Out of scope:** app code (Plan 001 owns the fix — if a test fails because the
fix is missing/wrong, STOP, do not edit app code here); broader coverage of the 9
untested modules (deferred).

## Steps

### Step 1: Two-org scaffold
Per case: build course+module+lesson+quiz/submission in `org`, plus an `org2`
actor (`admin2` and a second-org student). Use `client` + `auth_header`.

### Step 2: Assert 404 boundaries (one test each)
`org2` actor calls, expect 404, on: quiz get, quiz-by-lesson, quiz submit, file
list, file download, interactive list, highlights GET, highlights POST. Confirm
route prefixes against `backend/app/main.py` `include_router(...)` before
asserting — use real prefixes, do not invent.

### Step 3: Same-org positive controls
For quiz-read and highlights, assert the same-org owner still gets 200 (proves
isolation, not blanket denial).

### Step 4: Highlights cross-student isolation (T5)
Two students, same org/course: A creates a highlight; B's list excludes it; B
cannot DELETE A's (404).

**Verify**: `cd backend && pytest tests/test_cross_org_isolation.py -q` → pass.

### Step 5: Full suite
**Verify**: `cd backend && pytest -q` → pass.

## Test plan

This plan IS the test plan: cross-org 404 on 8 endpoints, ≥2 same-org 200
controls, cross-student highlight isolation. Structure after `tests/test_journal.py`.

## Done criteria

- [ ] `backend/tests/test_cross_org_isolation.py` exists, ≥10 tests
- [ ] `pytest tests/test_cross_org_isolation.py -q` all pass
- [ ] `cd backend && pytest -q` exit 0
- [ ] `ruff check tests/` exit 0
- [ ] Only the new test file added (`git status`)
- [ ] `plans/README.md` row 002 set to DONE

## STOP conditions

- `backend/app/common/auth.py` missing (Plan 001 not done).
- A cross-org test returns 200 (fix incomplete) → report, don't patch app code.
- A route prefix unconfirmable in `main.py` → report, don't guess.

## Maintenance notes

- New lesson-keyed endpoint → add its cross-org case here.
- Reviewer: assert 404 (not 403); same-org positive controls present.
