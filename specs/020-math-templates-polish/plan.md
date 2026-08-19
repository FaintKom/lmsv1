# Implementation Plan: Math Templates Polish

**Branch**: `feat/math-templates-polish` | **Date**: 2026-08-19 | **Spec**: [spec.md](spec.md)

## Summary

Frontend-only surgery over six template files plus their config forms in
`math-editor.tsx`. No backend changes: the server markers of specs/012 read
`work` payloads that none of these edits alter (FR-008), and grading logic
in the templates stays byte-identical.

1. **Sliders → numeric inputs** — `function-graph.tsx` (param loop),
   `inequality-graph.tsx` (slope/intercept), `graph-transform.tsx` (h/v/a):
   `input type="number"` with the same min/max/step; parse with fallback to
   the previous value.
2. **Visual Fractions** — `prompt` config (absent → today's default text,
   empty string → hidden), `show_count` (default true) and the count moved
   from the pie centre to a line beside the shape; editor fields for both
   (`VisualFractionsConfig` in math-editor — add if it lacks them).
3. **Equation Solver** — `Step.distractors?: string[]`; choice builder
   prefers authored distractors (cleaned of blanks/dupes), falls back to
   the generic pool; per-step distractor inputs in its config form.
4. **Numeric Input** — render the question through `MathRenderer`
   unconditionally; editor hint "LaTeX supported ($...$)".
5. **Scatter Plot** — mode select with one-line descriptions per mode.
6. **Equation Balance** — verify negative terms flow through
   (`parseInt` on comma-lists and per-term rows already parse negatives);
   editor hint "negative value = subtraction".

## Constitution Check

- I: no id handling. II: registry/vitest untouched stays green; behaviour
  changes are visual/config-additive — a Vitest for the solver's
  distractor-choice builder (pure) is the one new falsifiable test.
  III: server judges untouched (FR-008). IV: no claims change. V: additive
  config keys, no migrations, no new deps.

## Verification

- Vitest (solver choice builder + existing suites), tsc, build.
- Browser: each of the six templates exercised in the editor preview
  (live thanks to specs/018); screenshots for the PR.
