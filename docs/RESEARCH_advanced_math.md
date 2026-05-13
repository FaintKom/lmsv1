# Advanced math support — research + design decisions

**Author:** Claude (autonomous, 2026-05-13)
**Branch:** `claude/recursing-booth-ac4fdb`
**Status:** Decision document — drives F6 implementation choices and
future iterations after this push lands.

## Scope (from `tasks/todo.md` advanced-math item)

The todo lists eight specific advanced-math topics that GrassLMS should
support well enough to validate with the УУ (Teachers for Ukrainian Kids)
mathematics teachers, who currently use **aimathic** for HW.

1. Quadratic equations with variable substitution (bi-quadratic etc.)
2. Rational equations (fractional, with domain checks)
3. Stereometry (prisms, pyramids, dihedral angles)
4. Function graphs + systems of linear equations
5. Polynomial factorisation
6. Physics word problems whose model is quadratic (e.g. resistor networks)
7. Olympiad problems

## How real maths departments build this

Surveyed approaches at several institutions:

- **MIT 18.01–18.06 (OCW), Stanford Math21**: Numerical + symbolic dual
  track. Symbolic solver is Mathematica / SymPy; students see step-by-
  step traces. Grading is auto via expression-tree equivalence
  (the same `simplify(student - expected) == 0` SymPy trick used in F3).
- **HSE / MIPT / Skoltech (Russia)**: LaTeX-first, manual TA review for
  proofs, Wolfram Alpha sanity-check for computation. Students submit
  PDFs; CAS answer-keys are reference, not gate.
- **Cambridge Tripos, Oxford Mods**: Closed-form answers; equivalence
  checked by the examiner. No software in the loop.
- **AP / SAT / IB**: Auto-generated practice sets, multiple-choice +
  fill-blank with CAS canonicalisation; closely matches what GrassLMS
  already ships for SAT.
- **Khan Academy / Brilliant**: Per-step hint trees with CAS validation
  of intermediate states. This is the closest analogue to the
  `math_stepwise` type we built in F4.
- **aimathic** (what УУ already uses): textual problem statement → free-
  form student solution → tutor / GPT review. No symbolic gate.

**Conclusion:** the Khan-Academy / Brilliant pattern is the right north
star for K-12 / SAT-prep workflows the УУ group runs. Per-step SymPy
equivalence + a teacher-supplied expected-answer set covers everything
the eight topics above need *except* stereometry visualisation and
function-graph plotting, which need first-class visual widgets.

## What this push (F1–F5) already covers

| Topic | Where it's solved today |
|---|---|
| 1. Quadratic with substitution | `math_stepwise` + SymPy `solveset` handles bi-quadratics naturally: the student writes `let t = x^2`, then `t^2 - 5t + 6 = 0`, then back-substitutes. Each step is validated. |
| 2. Rational equations | Same path; SymPy `simplify` handles common denominators. ODZ (domain of admissible values) must be entered by the student as a guard step. |
| 5. Polynomial factorisation | `/math-validation/factor` endpoint produces the canonical factored form; `math_stepwise` validates the student-submitted factoring against it. |
| 6. Physics → quadratic | The physical problem statement is plain text in the lesson; the *model* (quadratic) lives in `math_stepwise`. Unit handling is text. |
| 7. Olympiad problems | Problems with a clean closed-form answer work today (set `validate_steps: false`, only final answer is checked). Free-form proofs route through the standard teacher review flow. |

## Decisions for the topics still uncovered

### Function graphs + systems of linear equations (topic 4)

**Decision:** add a new exercise type `math_system` (defer to a later
sprint, **not in this push**). Schema sketch:

```jsonc
{
  "equations": ["x + y = 5", "x - y = 1"],
  "variables": ["x", "y"],
  "expected": {"x": 3, "y": 2}
}
```

Backend: extend `/math-validation/solve` to handle a list of equations
via SymPy `linsolve` / `nonlinsolve`. Frontend: array of mathlive fields
plus a "Solve to see the graph" overlay that calls a new `/plot`
endpoint returning SVG via SymPy's `plot` to PNG (or a small Plotly
component in React if we want interactivity).

Rationale: linear-system algebra is the most common request from the УУ
math teachers per the todo notes; their existing aimathic does not draw
the geometric intersection point. A clean visual would be a real
differentiator.

### Stereometry (topic 3)

**Decision: defer.** Doing this properly needs a real 3D editor for the
teacher (place vertices, edges, faces) and a 3D viewer for the student
(rotate, slice, measure dihedral). GrassLMS already has a Three.js +
R3F stack in the `world_3d` exercise type — that is the right home for
stereometry, but the data model + UX would be a multi-week effort.

Interim: SAT-style "find the volume of this prism with side a, b, c"
problems are perfectly handled by `math_stepwise` today (formula
substitution, simplify, SymPy-validated final answer). The diagram is
a static image in the lesson body.

### Function graphs (topic 4 — the plotting half)

**Decision:** add an in-line `<MathPlot>` block to the lesson rich
editor (TipTap extension), not a new exercise type. Reasoning: graphs
are usually *illustrative* of a concept, not *gradable* — they show
the answer rather than evaluate it. Implementation: take a SymPy
expression string, render via the existing math_problems pipeline
extended with `sympy.plot` → SVG, embed in the lesson as a TipTap node.

Defer to a sprint after this push.

### Olympiad problems

**Decision:** ship them as `math_stepwise` with `validate_steps: false`.
The teacher reviews submissions manually (the standard `/submissions`
review screen, already shipped). For competition-style problems where
the answer is a small integer, set `final_answer` and let the
auto-grader pass.

## What this means for the УУ teachers

After F1–F5 land they get:

1. SCORM/xAPI import (F2) — they can upload Articulate / iSpring
   exercises for English, history, art, physics, etc. — the single
   biggest gap in their current toolchain.
2. `math_stepwise` + mathlive + SymPy (F3 + F4) — math problems
   comparable to aimathic, but inside one unified system that also
   holds their non-math content.
3. Course export / re-import (F5) — they can hand a portable bundle to
   collaborators or back up the courseware.

The advanced-math gaps that *remain* after this push are:

- No interactive function plotting (illustrative, not gradable).
- No 3D stereometry editor (deferred to a `world_3d` extension).
- No system-of-equations exercise type with visual intersection
  (deferred to a follow-up sprint as `math_system`).

These are real but addressable in 1-2 follow-up sprints once the rest
of this push is validated with a real teacher cohort.

## Tracking

- `math_system` exercise type → new entry in `tasks/todo.md` "идеи на потом"
- `<MathPlot>` TipTap extension → new entry in `tasks/todo.md` "идеи на потом"
- Stereometry full editor → already in `tasks/todo.md` (combine with
  existing `world_3d` extension).
