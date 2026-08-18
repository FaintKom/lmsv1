# Feature Specification: The instruction and the check are the same task

**Feature Branch**: `fix/instruction-matches-the-check`

**Created**: 2026-08-18

**Status**: Draft

**Input**: Finding 7 of the corner-case run, `tasks/qa-audit-exercise-types-2026-08-17.md`.

**One file, like 007–010.**

## What is wrong, and what turned out to be wrong about the finding

The audit recorded a `math_interactive` exercise showing two instructions at once:

```
📝 Click the origin.
Drag each point to its target:  A → (3, 2)   B → (-2, 4)
```

and grading `success_condition: {"kind": "click_origin"}` — so a pupil who placed
both points carefully failed, and one who ignored them and clicked the origin
passed. The finding called this a disagreement between the task and its marking,
and noted that nothing checks the two describe the same thing.

Measured again on `main`: `success_condition` is read by **nobody**. Not the
templates, which build their task from `template_config` — the coordinate plane
draws "Drag each point to its target" from `target_points`, defaulting to A(3, 2)
and B(-2, 4), which is where the audit's second line came from. Not the server,
which does not mark this type at all. Its only appearances were a field in
`MathInteractiveConfig` and the fixture that set it.

So the exercise had one task, drawn by the widget, and a free-text line above it
contradicting the widget. The "grading condition" was never a condition.

## Requirements *(mandatory)*

- **FR-001**: A field the product does not read MUST be removed rather than
  documented, so nobody writes content against it again.
- **FR-002**: The seeded exercise's instruction MUST describe the task its widget
  sets.
- **FR-003**: The seeded exercise MUST state its own points rather than lean on a
  template default, so the instruction and the widget cannot drift apart silently.
- **FR-004**: A test MUST fail when a fixture carries a config key the product does
  not declare — the class of defect behind this finding, the crossword and the
  bubble sheet.

## Success Criteria *(mandatory)*

- **SC-001**: The seeded exercise asks for one thing and marks that thing.
- **SC-002**: `success_condition` appears nowhere in the codebase.
- **SC-003**: Adding an undeclared key to any fixture fails the suite.
- **SC-004**: The nine types with no config model are named by the test rather than
  skipped quietly.

## Plan

**Files**: `backend/app/exercises/schemas.py` (drop the dead field, say why),
`qa/exercise-fixtures.json` (real `target_points`, matching instruction, no
`success_condition`), `backend/tests/test_qa_fixtures.py` (the guard).

**The guard uses declarations that already exist.** Seventeen of the twenty-six
types declare a `*Config` model in `schemas.py`. Where one exists it is the closest
thing to a written contract for that type's config, so a fixture key outside it is
either a typo or a field the product forgot to implement. Both are worth failing
on. The nine types without a model are counted and named in the assertion message
rather than skipped, because that gap is in the schemas.

**Why not compare the prose with the condition instead**: that needs to understand
both, and the pair which prompted this finding had no condition to compare with.
The checkable defect is the undeclared key. The prose is a human's job, and the
note now in the fixture says which side is the task.

## Tasks

- [x] T001 Guard first, green on today's data — the schema still declared the
      field.
- [x] T002 Remove `success_condition` from `MathInteractiveConfig`. The guard turns
      red on `math_interactive: ['success_condition']`, which is the proof it
      works.
- [x] T003 Fixture: real `target_points`, an instruction matching the widget, and a
      note explaining which side is the task.
- [x] T004 Green. Backend suites against real PostgreSQL.
- [ ] T005 Record it in the audit and close the finding list.

## Assumptions

- No content in production uses `success_condition`: the type has had no exercises
  there since 2026-08-18, and the editor never wrote the field.
- The nine missing config models stay missing here. Writing them is worth doing and
  is separate work.
