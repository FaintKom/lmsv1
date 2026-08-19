# Implementation Plan: Robot Colours & Item Kinds

**Branch**: `feat/robot-colors-items` | **Date**: 2026-08-19 | **Spec**: [spec.md](spec.md)

## Summary

The rules live once in `backend/app/exercises/robot_sim.py` (runs in the
sandbox AND replays on the server); the browser is a pure projection
(grid-engine.ts) — so colours are added in one place and shown in two.

1. **Sim** (`robot_sim.py`): `painted` becomes `dict[pos, str]`
   ("_" = neutral); `paint(colour=None)` validates against
   `PAINT_COLORS = ("red","green","blue","yellow")`, records
   `["paint", colour]` when coloured; frames' cell change gains `color`;
   `all_marks_painted` checks colour when the mark carries `mark_color`;
   `marks` becomes `dict[pos, str|None]`; snapshot/restore updated (dict →
   sorted tuple). Command recording stops int()-ing args (write validates
   its own int).
2. **Validation** (`robot_validate.py`): `mark_color` only on marked
   floor, from the palette; coloured marks require `paint` offered; item
   `kind` from the fixed set.
3. **Solver** (`robot_solver.py`): `_why_not_searchable` gains
   `win_uses_colors` when any cell has `mark_color` — reference-only, like
   values.
4. **Projection** (`grid-engine.ts`): Cell gains `mark_color`, `kind`,
   `paintColor`; applyChange reads `change.color`.
5. **Renderer** (`grid-renderer.tsx`): paint fill by colour; mark outline
   tinted by required colour; item sprite per kind (emoji set).
6. **Editor** (`robot-2d-editor.tsx`): mark-colour picker on marked cells,
   kind picker on items; palette hint for `paint("red")`.
7. **Player** (`robot-2d-exercise.tsx`): command reference shows
   `paint("red")` when colours are present.

No migrations (level JSONB), no new endpoints.

## Constitution Check

- I: no id handling. II: new sim tests (colour win match/mismatch, unknown
  colour error, idempotence, tampered-list replay loses, grandfather —
  no-colour level identical) fail red before the sim change. III:
  strengthened — replay stays the only judge, now colour-aware. IV: no
  claims change. V: one rules module, projection untouched in behaviour.

## Verification

pytest robot suite (existing 7 files stay green + new colour cases); tsc,
Vitest, build; browser: author a coloured level in the editor, run
`paint("red")` in the player, watch the replay paint it.
