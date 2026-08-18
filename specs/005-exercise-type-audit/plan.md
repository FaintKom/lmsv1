# Implementation Plan: Finish the exercise-type corner-case run

**Branch**: `qa/exercise-axes-wave2` | **Date**: 2026-08-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-exercise-type-audit/spec.md`

## Summary

Twenty of the twenty-six exercise types have never been asked what happens when a
student clears a field, runs out of attempts, comes back to a solved task, or
opens the lesson on a phone. This run asks them, against a stack built from the
commit under test, and writes every answer into the existing audit next to the
response code or measurement that produced it.

The server axis is driven by a script talking to the API as the QA student, so
all 52 seeded exercises can be probed in one pass and re-probed after any fix.
The browser axes are driven by hand through the QA frontend, because what is
being measured is what a student sees.

## Technical Context

**Language/Version**: Python 3.12 for the probe. It runs inside the QA backend
container, which already ships `httpx`, so no new dependency lands anywhere.

**Primary Dependencies**: the running QA stack — `docker-compose.qa.yml` built
from `68dedf7`, seeded with `scripts/seed_qa.py` then
`scripts/seed_corner_cases.py`.

**Storage**: the ephemeral QA PostgreSQL. Nothing here touches prod, staging, or
the QA course the Playwright gate reads.

**Testing**: the probe is not a test suite. Where a defect is fixed, its
regression test goes where that kind of test already lives —
`backend/tests/test_submissions.py` or `test_exercises.py` — and runs against
real PostgreSQL.

**Target Platform**: QA stack on localhost, backend `:8000` and frontend `:3000`.

**Project Type**: a QA run producing a document, plus whatever fixes it earns.

**Constraints**: ports 8000, 3000 and 8101 are shared across worktrees, so
exactly one stack runs at a time. A rebuild costs about eight minutes and a data
reset about thirty-five seconds, which is why the data is what gets reset
between passes.

**Scale/Scope**: 26 types, 52 exercises, 4 axes. Wave 1 is already recorded and
is revisited only where findings 2 and 7 need a second data point.

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after design.*

| Principle | How this run satisfies it |
|---|---|
| I. Tenant isolation | Nothing new is exposed. The probe authenticates as the QA student and reads only that organisation's rows. Reaching a row it should not reach is a finding, not a flaw in the probe. |
| II. A test that cannot fail | Every axis opens with a positive control. On axis A a correct answer must score first, so a 200 on the corner case cannot be an endpoint that accepts everything. An empty-answer probe on its own would pass against a server that never grades. |
| III. The server is the only judge | Where a type is graded in the browser, the probe records that instead of scoring it. Four types are already known to work this way, and this run measures how far the list actually reaches. |
| IV. Product and docs tell the same story | FR-007 exists because the audit says finding 6 is unfixed while the fix is in `main`. That is the defect class this principle names. |
| V. The smallest change that works | One probe script and one document. No harness, no new test framework, no fixture rewrite beyond what a finding forces. |

No violations to justify, so Complexity Tracking is omitted.

## Project Structure

### Documentation (this feature)

```text
specs/005-exercise-type-audit/
├── spec.md
├── plan.md              # this file
├── research.md          # how each axis is driven, and what was rejected
├── quickstart.md        # bringing the stand up and re-running the probe
└── checklists/
    └── requirements.md
```

`data-model.md` and `contracts/` are deliberately absent. This run adds no entity
and no interface: the exercise, submission and attempt shapes it measures already
exist, and the finding record is described in the spec's Key Entities.

### Source (repository root)

```text
scripts/
├── seed_corner_cases.py     # existing; seeds the 52-exercise stand
└── qa_axis_probe.py         # new; drives axis A across every seeded exercise

tasks/
└── qa-audit-exercise-types-2026-08-17.md   # the deliverable, extended

backend/tests/
├── test_submissions.py      # where a grading regression test lands
└── test_exercises.py        # where an attempt or read regression test lands
```

**Structure Decision**: the probe lives in `scripts/` because
`docker-compose.qa.yml` already mounts that directory into the backend container
read-only. It runs beside the API with no host Python environment, no new
dependency and no rebuild when it changes, which is the same reason `seed_qa.py`
lives there.

## How each axis is driven

**Axis A, the server's answer to a bad submission.** The probe signs in as
`qa-student@qa.example.com`, lists the Corner Cases exercises, and sends, per
exercise: the answer the fixture says is correct, an empty answer, an answer of
the wrong shape, and against the V2 copy four submissions into a two-attempt
limit. Status code and score are recorded for every request. Any 5xx is a
finding by itself, and so is a 200 that passes a wrong answer.

**Axis B, whether the submit control tells the truth.** In the browser, per type:
read `disabled`, `aria-disabled`, computed `opacity` and `cursor` on the submit
control before anything is filled in, then press it and watch whether the page
says anything at all. Wave 1 found nine controls that look pressable and are
not, and this settles whether that is the house style or six accidents.

**Axis C, reload mid-answer.** One exercise with no prior submission, half filled
in, reloaded. The audit currently answers this from a grep and admits it; one
measurement replaces the caveat.

**Axis D, 375 x 812.** Page-level horizontal overflow, the widest element inside
the exercise, and every tap target under 44px.

## Order of work

1. Wave 2 on axes A, B and D. It is half done, and it holds the types whose
   grading moved server-side this week.
2. Axis C once, on any unsubmitted exercise.
3. Waves 3, 4 and 5 on all four axes, in the seeded order.
4. Findings 2 and 7 re-checked against everything walked here.
5. The audit's fix statuses corrected against `main`.

Each wave is written up as it finishes, so an interrupted run leaves recorded
results rather than notes.
