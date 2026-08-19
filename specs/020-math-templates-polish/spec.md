# Feature Specification: Math Templates Polish

**Feature Branch**: `feat/math-templates-polish`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Этап 5 плана tasks/feedback-2026-08-19-authoring.md, математическая половина (замечания 13, 14ч, 15, 17, 18, 19, 20). Решение владельца: слайдеры у ученика убрать. 2D-робот (10) — отдельная спека следующим PR."

Six math templates each break the owner's flow in a specific way: a baked-in
instruction no one can remove, sliders that let the answer be scrolled into
place, hardcoded distractors, a description that won't render formulas, and
modes nobody can tell apart.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sliders replaced by numeric input (Priority: P1)

In Function Graph, Inequality Graph and Graph Transformations the student
types parameter values (slope, intercept, shifts, stretch) instead of
dragging sliders. Owner's decision: a slider lets the answer be found by
scrolling until the curves overlap, which empties the task.

**Acceptance Scenarios**:

1. **Given** any of the three graph templates, **When** a student answers,
   **Then** parameters are entered as numbers — no slider exists.
2. **Given** existing exercises of these templates, **Then** their configs
   and grading behave unchanged; only the input control differs.

---

### User Story 2 - Visual Fractions owns its text and its number (Priority: P1)

The instruction line is authored, not baked in: the teacher can change or
remove the default "Shade 3/8 of the shape". Showing the running count is a
switch, and when shown, the number sits beside the shape, not inside the
pie.

**Acceptance Scenarios**:

1. **Given** the editor, **When** the teacher edits or clears the prompt,
   **Then** the student sees exactly that (or no line at all).
2. **Given** the count display on (default), **Then** it renders beside the
   shape; toggled off, no count anywhere.
3. **Given** existing exercises, **Then** they render with today's default
   prompt and count on.

---

### User Story 3 - Equation Solver steps carry their own distractors (Priority: P2)

Each authored step may define its own wrong-action options alongside the
correct action and result. Without authored distractors the template keeps
its current generic pool, so existing content is untouched.

**Acceptance Scenarios**:

1. **Given** a step with authored distractors, **Then** the student's
   choices for that step are the correct action plus exactly those
   distractors.
2. **Given** a step without them, **Then** the generic pool fills in as
   today.

---

### User Story 4 - Numeric Input renders formulas (Priority: P2)

The question/description of the Grid-in template renders mathematical
notation reliably; the editor says formulas are supported.

**Acceptance Scenario**: a question containing LaTeX (e.g. `$x^2$`) renders
as typeset math for the student and in the preview.

---

### User Story 5 - Scatter Plot modes are self-explanatory (Priority: P3)

The editor's mode picker states in plain words what each of the three modes
(best fit / read value / correlation) asks the student to do.

**Acceptance Scenario**: the mode control shows a one-line description of
the selected mode; switching modes switches the description.

---

### Edge Cases

- Numeric inputs clamp to each parameter's existing min/max/step; typed
  garbage falls back to the previous value rather than NaN on the graph.
- Empty visual-fractions prompt string means "no line", not the default.
- Authored distractor lists with blanks/duplicates are cleaned quietly.
- Equation Balance: settings completeness re-checked after the 018 preview
  fix — negative terms (subtraction) must work and the editor must say so.

## Requirements *(mandatory)*

- **FR-001**: The three graph templates MUST accept parameters via numeric
  input only; ranges/steps stay as constraints.
- **FR-002**: Visual Fractions MUST take its instruction line from config
  (`prompt`; empty = hidden; absent = today's default) and show the count
  beside the shape only when `show_count` (default on) allows.
- **FR-003**: Equation Solver steps MUST support authored per-step
  distractors, falling back to the generic pool when absent.
- **FR-004**: Numeric Input MUST typeset math in its question
  unconditionally (no detection heuristic).
- **FR-005**: The Scatter Plot editor MUST describe each mode in plain
  language.
- **FR-006**: Equation Balance MUST accept negative terms and its editor
  MUST state that a negative value subtracts.
- **FR-007**: Existing exercises of every touched template MUST render and
  grade unchanged under default configs.
- **FR-008**: Server marking contracts (the `work` payloads of specs/012)
  MUST NOT change.
- **FR-009**: New editor strings follow the file's local language
  convention; any key added to i18n exists in all six locales.

## Success Criteria *(mandatory)*

- **SC-001**: Zero slider controls remain in student-facing math templates.
- **SC-002**: A teacher can author a fractions task with a custom prompt (or
  none) and no stray default text appears.
- **SC-003**: Authored distractors appear verbatim; generic ones only when
  none authored.
- **SC-004**: Existing content: no grading or rendering diffs (registry
  test + markers untouched).

## Assumptions

- 2D robot colours/objects (owner #10) — separate spec/PR (021), it's a
  game-engine feature, not template polish.
- The math editor's config forms are English-hardcoded by design today; new
  form strings follow that convention (the i18n ratchet governs new files,
  not this one).
- Scatter plot keeps its three modes; the fix is explanation, not redesign.
