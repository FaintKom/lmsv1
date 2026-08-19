# Research: Math Templates Polish

- Sliders live in exactly three files (grep `type="range"` over templates):
  function-graph (param loop, min/max/step from `getParamLabels`),
  inequality-graph (slope/intercept ±5 step .5), graph-transform (h/v ±5,
  a ±3). All three grade client-side; only graph_transform and
  inequality_graph have server markers, and those read the submitted
  values, not the control type — switching the control is contract-safe.
- Visual Fractions hardcodes "Shade X/Y of the shape" (line 48) and prints
  the running count in the pie centre (line 87). Config today:
  target_numerator/denominator/display_type only.
- Equation Solver builds distractors from a hardcoded six-string pool
  (lines 55-62 and 93-100); steps carry action/actionLabel/result only.
- Numeric Input renders the question via `containsMath(...)` detection —
  the heuristic is why "формулы не поддерживаются": undetected LaTeX prints
  raw. Unconditional MathRenderer removes the class of bug.
- Scatter Plot has three real modes (best_fit / read_value / correlation)
  with different student UIs; the editor names them without explaining.
- Equation Balance editor already offers left/right/target_side/terms; the
  "settings do nothing" half of #14 was the mount-staleness fixed in
  specs/018. Remaining ask = subtraction: negative values parse fine,
  nothing says so.
- Decision: all changes additive config keys + control swaps; robot #10
  split to specs/021 (game engine, server-judged win conditions — a
  different blast radius).
