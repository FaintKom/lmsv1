# Plan 006: Kill bulk-op N+1 + add TanStack staleTime

> **Executor instructions**: Follow step by step. Run every verification command.
> If a STOP condition occurs, stop and report. When done, update the 006 row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0521717..HEAD -- backend/app/admin/router.py frontend/src/lib/api`
> Compare excerpts to live code; on mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `0521717`, 2026-06-11

## Why this matters

Two cheap wins. (1) Bulk "add group members" and "enroll group" issue one
existence-check query per user inside a loop — 100 users = ~100 round-trips — and
have no batch cap. (2) Several TanStack Query hooks omit `staleTime`, so
journal/attendance/schedule/rooms data refetches on every window focus.

## Current state

**Backend** `backend/app/admin/router.py`: `add_group_members` loop ~`1306-1316`
(per-user `select(StudentGroupMember)...`), `enroll_group` loop ~`1385-1399`
(per-user `select(Enrollment)...`). No max-batch guard.
**Frontend** `frontend/src/lib/api/`: `attendance.ts`, `journal.ts`, `schedule.ts`,
`rooms.ts`, `pacing.ts` have `useQuery` without `staleTime`. Confirm:
`grep -rn "useQuery" frontend/src/lib/api`.

Commands: backend `cd backend && pytest -q`, `ruff check app/`; frontend
`cd frontend && npx tsc --noEmit`, `npm run build`.

## Scope

**In scope:** `backend/app/admin/router.py` (the two loops);
`frontend/src/lib/api/{attendance,journal,schedule,rooms,pacing}.ts`.
**Out of scope:** leaderboard N+1 (deferred); admin-router restructuring;
response-shape changes.

## Steps

### Step 1: Batch the existence checks
`add_group_members`: before the loop, one query —
`existing = set((await db.execute(select(StudentGroupMember.user_id).where(StudentGroupMember.group_id == group_id, StudentGroupMember.user_id.in_(user_ids)))).scalars().all())`
— then skip ids in `existing`. Same for `enroll_group` with `Enrollment` on
`(course_id, student_id in user_ids)`. Preserve exact add/skip behavior + return.

### Step 2: Batch cap
Top of each endpoint: `MAX_BULK = 5000`; `if len(user_ids) > MAX_BULK: raise
HTTPException(400, "Too many users in one request")` (module's error convention).
**Verify**: `cd backend && ruff check app/admin/` → exit 0; `pytest tests/test_admin*.py -q`
(or `pytest -q`) → pass.

### Step 3: staleTime
Add `staleTime: 5 * 60 * 1000` to each `useQuery` in the five api files that lacks
it. Not on mutations; leave any query explicitly commented as real-time.
**Verify**: `cd frontend && npx tsc --noEmit` → exit 0.

### Step 4: Build + tests
**Verify**: `cd frontend && npm run build` → exit 0; `cd backend && pytest -q` → pass.

## Test plan

- Backend: extend the admin bulk test (if present) — a group with one already-member
  + one new: assert no duplicate, new one added. If no such test, rely on `pytest
  -q` green and note the gap.
- Frontend: no new test; typecheck + build gate.

## Done criteria

- [ ] Neither bulk loop issues a per-user existence query
- [ ] Both bulk endpoints reject lists over `MAX_BULK`
- [ ] `pytest -q` green; `ruff check app/` exit 0
- [ ] The five api files' `useQuery`s have `staleTime` (except deliberate real-time)
- [ ] `npx tsc --noEmit` exit 0; `npm run build` exit 0
- [ ] `plans/README.md` row 006 set to DONE

## STOP conditions

- A bulk loop does more than an existence check (per-iteration side-effects).
- A query intentionally needs `staleTime: 0`.

## Maintenance notes

- Reviewer: confirm batched membership check yields identical added/skipped result.
- If pagination is added to these endpoints, revisit `MAX_BULK`.
