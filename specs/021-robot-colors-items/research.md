# Research: Robot Colours & Item Kinds

- specs/005 already delivered items (`take`/`drop`), painting (`paint`,
  `mark`, `all_marks_painted`) and values; the owner's «цвета и предметы»
  therefore means COLOURED paint and DISTINCT item kinds.
- The rules module is single-source (`robot_sim.py`, sandbox + server
  replay); the browser holds a projection only (grid-engine.ts header
  explains the history). Colours therefore land in the sim once.
- Command entries already support `[name, arg]` (for `write`); recording
  int()s the arg — must be relaxed for string colours, with `write`
  validating its own int.
- The solver's decline mechanism (`_why_not_searchable`, reasons like
  `win_uses_values`) is the exact slot for `win_uses_colors`: coloured
  paint would force the search to enumerate colour choices per cell.
- `painted` today: `set[pos]`, one-way, idempotent (repaint = silent
  no-op). Colour design keeps both properties: first paint fixes the
  colour; repaint (any colour) = no-op. Decision over "repaint switches
  colour" because one-way-ness is what makes "paint every mark" honest.
- Item kinds: frames carry `item: bool` only; kinds never change at
  runtime except take/drop — take removes whatever is drawn, drop puts a
  kindless one. Visual-only is one renderer map; semantic per-kind wins
  would touch win grammar, solver and validator — deferred until asked.
