# Tasks: Robot Colours & Item Kinds

**Input**: specs/021-robot-colors-items/

## Phase 3: US1 â€” coloured paint (P1) ðŸŽ¯

- [x] T001 [US1] RED-first pytest additions in backend/tests/test_robot_sim.py
      (or a new test_robot_colors.py): coloured mark satisfied only by its
      colour; colourless mark by anything; repaint no-op; unknown colour â†’
      RobotError; grandfather: no-colour level replays identically;
      tampered `["paint","red"]` list still loses when the grid says so.
- [x] T002 [US1] robot_sim.py: PAINT_COLORS, marks/painted as dicts,
      paint(colour) API + arg recording without int(), colour-aware
      all_marks_painted, frames carry color, snapshot/restore.
- [x] T003 [US1] robot_solver.py: `win_uses_colors` decline reason (+ test
      in test_robot_solver.py).
- [x] T004 [US1] robot_validate.py: mark_color rules (palette, only on
      marked floor, paint offered) (+ tests in test_robot_validate.py).

## Phase 4: US2/US3 â€” kinds + authoring (P1/P2)

- [x] T005 [US2] grid-engine.ts: Cell.mark_color/kind, paintColor via
      change.color.
- [x] T006 [US2] grid-renderer.tsx: colour fills, tinted mark outline,
      kind sprites (emoji map: gem/key/apple/flag).
- [x] T007 [US3] robot-2d-editor.tsx: mark-colour and item-kind pickers;
      note that coloured marks need `paint` offered and that Check falls
      back to the reference solution.
- [x] T008 [US3] robot-2d-exercise.tsx: command reference mentions
      `paint("red")` when the level has coloured marks.

## Phase 5: Polish

- [ ] T009 Gates: full robot pytest files, backend suite; tsc, Vitest,
      build; browser run of a coloured level end-to-end.
- [ ] T010 After merge+prod: mark ÑÑ‚Ð°Ð¿ 5 fully done in the feedback plan.

## Dependencies

T001 red â†’ T002 â†’ T003/T004; frontend after sim contract settles. Single
PR, commits per story.
