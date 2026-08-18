# Feature Specification: A game verdict is recorded, not believed

**Feature Branch**: `fix/game-verdict-not-from-client`

**Created**: 2026-08-18

**Status**: Draft

**Input**: The client-graded half of `004-exercise-answer-leak`, measured again in the corner-case run.

**One file, like 007–009**: one branch in the submit path, one panel branch, tests.

## What is wrong

`math_interactive` and `world_3d` are marked by the browser. `_submit_game_level`
read `completed` and `score` straight off the request body, so

```
POST /api/v1/exercises/<id>/submit   {"game_result": {"completed": true, "score": 1.0}}
→ 200, score: 100, passed: true
```

without the exercise being opened at all. Measured on the QA stack 2026-08-18 for
both types, and XP was paid on the same claim.

This is the half of `004-exercise-answer-leak` that was written down and deferred:
the answer keys of these types cannot be stripped without breaking them, and
leaving them is only half the hole, because the verdict comes from the same place.
`robot_2d` closed it in `005-robot-2d-rework` by sending the pupil's program and
having the server replay it. These two have no server-side judge yet: `world_3d`
needs the robot simulator extended to three dimensions, and `math_interactive`
needs a check per template, of which there are eight.

## Scope

**In scope**: stop the forgery. An attempt is recorded with the pupil's own report
of what happened, and nothing marks it. No score, no pass, no XP.

**Out of scope, named**: the marking itself. Two follow-ups, each its own spec — a
3D replay for `world_3d`, and per-template checks for `math_interactive`.

## Requirements *(mandatory)*

- **FR-001**: A submission for these two types MUST NOT be recorded as passed or
  scored on the strength of the request body.
- **FR-002**: The browser's report MUST be stored — steps, time, code snapshot,
  replay log — because a teacher marking by hand needs it.
- **FR-003**: XP MUST NOT be awarded for an unmarked attempt.
- **FR-004**: The student MUST be told their work went to a teacher rather than
  shown a failure. An unmarked submission is not a wrong one.
- **FR-005**: `robot_2d` MUST keep being marked by the server, as it is now.

## Success Criteria *(mandatory)*

- **SC-001**: `{"completed": true, "score": 1.0}` returns `passed: null`,
  `score: null`, `status: "submitted"`.
- **SC-002**: The stored row still carries what the browser reported.
- **SC-003**: A pupil who submits sees "Sent to your teacher", not "Not quite".
- **SC-004**: The robot suites keep passing unchanged.

## Plan

**Files**: `backend/app/exercises/service.py` (`_submit_game_level`, `GAME_XP`),
`backend/tests/test_submissions.py`,
`frontend/src/components/exercises/exercise-renderer.tsx`.

**Why not keep marking until the replay exists**: the mark is worth nothing. It
says a pupil finished a level on the word of the page that pupil controls, and it
lands in the journal a school reads. An unmarked submission is worse for the pupil
and honest; a forged pass is better for the pupil and false.

**Why now rather than with the replay**: production holds no content of either
type. All nine client-graded exercises were removed on 2026-08-18 after the
measurement, with no submissions through `/submit`, so dropping automatic marking
costs nothing today and the hole closes now instead of after two features.

**The panel** already had this problem for `web_editor`, which is teacher-marked
and returns a null verdict: the result panel read that as "Not quite". One branch
fixes both.

## Tasks

- [x] T001 Test first: a forged completion is stored unmarked, and the report
      survives.
- [x] T002 `_submit_game_level` records instead of marking, and stops paying XP.
- [x] T003 Trim the two dead XP rates, naming why.
- [x] T004 Result panel: an unmarked submission reads as sent, not failed.
- [x] T005 Backend suites plus the robot suite against real PostgreSQL.
- [ ] T006 Record it in the audit and in `tasks/todo.md`, with both follow-ups
      named.

## Assumptions

- Teachers can already see submissions for these types in the review queue, so this
  adds rows there rather than a new surface.
- Nobody relies on the XP these two paid: there is no content and there were no
  submissions.
