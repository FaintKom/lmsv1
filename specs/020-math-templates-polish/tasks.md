# Tasks: Math Templates Polish

**Input**: specs/020-math-templates-polish/ (plan.md, spec.md, research.md)

## Phase 3: US1 — sliders → numeric inputs (P1) 🎯

- [ ] T001 [P] [US1] function-graph.tsx: number inputs with min/max/step +
      NaN fallback.
- [ ] T002 [P] [US1] inequality-graph.tsx: same for slope/intercept.
- [ ] T003 [P] [US1] graph-transform.tsx: same for h/v/a.

## Phase 4: US2 — Visual Fractions (P1)

- [ ] T004 [US2] visual-fractions.tsx: `prompt` (absent=default, ""=hidden),
      `show_count` (default true), count beside the shape.
- [ ] T005 [US2] math-editor.tsx VisualFractionsConfig: prompt + show_count
      fields (add the form section if missing).

## Phase 5: US3 — Equation Solver distractors (P2)

- [ ] T006 [US3] Pure choice-builder extracted + Vitest (authored
      distractors verbatim; blanks/dupes cleaned; fallback pool when
      absent) in templates/equation-solver-choices.ts (+ .test.ts).
- [ ] T007 [US3] equation-solver.tsx uses the builder; config form gains
      per-step distractor inputs (comma-separated).

## Phase 6: US4/US5/US6 — small fixes (P2/P3)

- [ ] T008 [P] [US4] numeric-input.tsx: unconditional MathRenderer; editor
      hint "LaTeX supported".
- [ ] T009 [P] [US5] math-editor.tsx ScatterConfig: mode descriptions.
- [ ] T010 [P] [US6] math-editor.tsx EquationBalanceConfig: negative-term
      hint; verify negatives round-trip.

## Phase 7: Polish

- [ ] T011 Gates: tsc, Vitest, build; browser pass over all six templates
      via the 018 preview; screenshots.
- [ ] T012 After merge+prod: mark этап 5а in tasks/feedback file (robot
      #10 → specs/021 next).

## Dependencies

All [P] parallel; T006→T007; polish last. Single PR, commits per story.
