# Feature Specification: Robot Colours & Item Kinds

**Feature Branch**: `feat/robot-colors-items`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Этап 5б плана tasks/feedback-2026-08-19-authoring.md, замечание 10: «в 2д роботе нужно добавить работу с разными цветами и предметами»."

The robot already paints (one colour) and takes items (one look). This adds
coloured paint with colour-aware goals, and visually distinct item kinds, so
levels can say "paint the marked cells in the right colours" and read as a
scene instead of identical dots.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Coloured paint (Priority: P1)

A teacher marks cells to be painted in specific colours; the pupil's program
calls paint with a colour (`paint("red")`); the level is won only when every
marked cell wears its required colour. Plain `paint()` and colourless marks
keep working exactly as today.

**Acceptance Scenarios**:

1. **Given** a cell marked red, **When** the pupil paints it red, **Then**
   the mark counts as satisfied; painted blue, it does not.
2. **Given** a colourless mark, **When** painted with any colour or with
   plain `paint()`, **Then** it counts as satisfied (today's behaviour).
3. **Given** a painted cell, **When** painted again in any colour, **Then**
   nothing changes — painting stays one-way and idempotent.
4. **Given** an unknown colour name, **Then** the run stops with a readable
   robot error on that line, like other misuse.
5. **Given** existing levels (no colours anywhere), **Then** they behave
   byte-for-byte as before.

---

### User Story 2 - Item kinds (Priority: P2)

A teacher gives item cells a kind (gem, key, apple, flag); the grid renders
each kind distinctly. `take`/`drop` semantics are unchanged — kinds are how
a level reads, not a new rule.

**Acceptance Scenarios**:

1. **Given** items of different kinds, **Then** the grid shows them
   distinctly for pupil and editor alike.
2. **Given** existing levels, **Then** their items render as today.

---

### User Story 3 - Author support (Priority: P1)

The level editor lets the teacher pick a mark colour per cell and an item
kind per item; validation refuses a level whose coloured marks cannot be
satisfied (paint not offered); Check still answers honestly — levels with
coloured marks fall back to reference-only verification with a stated
reason, like value levels do today.

**Acceptance Scenarios**:

1. **Given** the editor, **Then** a marked cell offers a colour choice and
   an item cell offers a kind choice.
2. **Given** coloured marks with `paint` not offered, **Then** saving is
   refused with the existing style of validation message.
3. **Given** coloured marks, **When** the teacher runs Check, **Then** the
   answer says the search declined because of colours and uses the
   reference solution, exactly as value levels do.

---

### Edge Cases

- Replay tampering: a doctored command list may claim any colours — the
  replay repaints against the real grid, so a wrong colour still loses.
- `mark_color` on a cell without `mark`, or on a wall: refused at save.
- The colour palette is fixed (red, green, blue, yellow); the API rejects
  anything else at run time.
- Sandbox and server run the same module, so colour rules cannot drift.

## Requirements *(mandatory)*

- **FR-001**: `paint(colour)` paints the current cell in that colour;
  `paint()` keeps painting in the neutral colour. Both record into the
  command list and replay identically.
- **FR-002**: Painting stays one-way and idempotent per cell.
- **FR-003**: `all_marks_painted` is colour-aware: a coloured mark is
  satisfied only by that colour; a colourless mark by any paint.
- **FR-004**: Unknown colours raise the standard robot error with the
  offending line.
- **FR-005**: Levels without colours behave exactly as before (sim, win,
  frames, stars).
- **FR-006**: Item cells MAY carry a kind from a fixed set; kinds render
  distinctly everywhere the grid renders; `take`/`drop` semantics unchanged.
- **FR-007**: The editor offers mark-colour and item-kind pickers; level
  validation refuses impossible colour setups alongside today's checks.
- **FR-008**: The shortest-path search declines levels with coloured marks
  with a stated reason (reference-only), like value levels.
- **FR-009**: Frames carry the paint colour so the browser animation shows
  what the pupil painted.

## Success Criteria *(mandatory)*

- **SC-001**: A "paint the flag in three colours" level is authorable,
  validated, playable and honestly graded end-to-end.
- **SC-002**: All existing robot tests stay green untouched (no-colour
  grandfathering).
- **SC-003**: A tampered command list cannot win a coloured level it did
  not actually solve (replay is the judge).

## Assumptions

- Palette fixed at four colours + neutral; extending it later is data, not
  design.
- Item kinds are visual (fixed set: gem, key, apple, flag); per-kind win
  conditions are out of scope until asked.
- `drop` puts down a kindless item (the robot does not remember kinds) —
  stated in the editor, revisit only if levels need it.
