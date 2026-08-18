# Implementation Plan: Running out of attempts is not passing

**Branch**: `fix/exhausted-attempt-not-passed` | **Date**: 2026-08-18 | **Spec**: [spec.md](spec.md)

## Summary

One field on one row changes value, and the interface stops offering a retry that
cannot work. The value was `passed=True`, with a comment explaining it as "so
student can proceed"; proceeding turns out not to depend on it.

## Technical Context

**Language/Version**: Python 3.12 backend, TypeScript frontend.

**Files**: `backend/app/exercises/service.py` (the exhaustion branch of
`submit_exercise`), `backend/tests/test_submissions.py`,
`frontend/src/components/exercises/exercise-renderer.tsx`.

**Storage**: no schema change. The marker
`answers = {"max_attempts_exhausted": true}` is already written on that row, and
the response already carries `max_attempts_reached`.

**Testing**: pytest against real PostgreSQL. The test opens with a solved
submission, so it cannot pass against an exercise that refuses everything.

## Constitution Check

| Principle | How |
|---|---|
| II. A test that cannot fail | The regression asserts `passed is False` after exhaustion and `passed is True` for the real attempt before it. Shown failing first: today the code returns True for both. |
| IV. Product and docs tell the same story | The comment claiming the verdict exists "so student can proceed" is replaced by what actually holds, or the next reader restores the bug on purpose. |
| V. The smallest change that works | No new column, no new response field, no migration. The distinguishing marker already exists. |

## Risk, and what was checked before flipping the field

Setting `passed=False` would be a regression if anything treated the field as
permission to move on. Grepped across `backend/app`: `ExerciseSubmission.passed`
is read by `admin/student_profile_service.py`, `admin/analytics_service.py`,
`analytics/task_stats_service.py` and `journal/service.py`, all of them reporting.
The `progress` module never reads it, and marking a lesson complete is a separate
action the student takes.

In the browser, `exercise-renderer.tsx` already branches on
`max_attempts_reached` for both the toast and the answer reveal, so the honest
verdict only affects the result panel. That is what FR-006 covers.

## Order of work

1. Test first, red for the right reason.
2. Flip the verdict, rewrite the comment.
3. Result panel: name the exhausted state, drop the retry.
4. Full submissions and exercises suites against real PostgreSQL.
5. Mark finding 10 fixed in the audit once #339 has landed and the document exists
   on `main`.
