# Research — Climbing a floor, made visible

Phase 0 of [plan.md](plan.md). Four decisions, and what each was chosen over.
Everything stated as fact here was read in the code on 2026-08-19.

## Finding A — one meaning of a floor, rather than a rule to remember

**Decision**: a block recorded at floor `N` occupies floor `N`, whichever kind of
block it is. A character standing on a platform at floor `N` stands at `N + 1`.

**Rationale**: the editor has one floor control and two tools it applies to. A
control that means one thing for the wall tool and another for the platform tool
is not a control a teacher can use; they must remember which they picked. Making
the two agree removes the rule instead of teaching it.

The clinching case is the default. The editor opens on floor 0. A platform there
used to raise the standing height to 0 — where it already was — and was drawn
entirely below the ground. The teacher's first click did nothing and showed
nothing. Under the new meaning the same click makes a step.

**Alternatives considered**:

- *Forbid a platform on floor 0, and start its floor control at 1.* Keeps the old
  arithmetic and teaches a rule about which numbers are legal for which tool. It
  also leaves the two tools disagreeing — the thing that caused the confusion —
  and puts an error message where a working click should be.
- *Offset in the editor, so the editor writes one more than the teacher chose.*
  The stored level would then disagree with the editor about what a floor is, and
  anyone reading the JSON — a test, a fixture, the next person — would meet the
  old trap with an extra indirection over it. A definition belongs in one place.
- *A new cell type, "step".* This was in the request. Rejected: a platform
  already is the block a character climbs onto. Two names for one object means a
  teacher choosing between them for no reason, and every rule that mentions
  height — the solver, the validator, the geometry, the refusals — written twice.
  Principle V.

## Finding B — the front keeps its own copy of the rule, and a test keeps them equal

**Decision**: the height rule changes in both places and stays two
implementations of one rule.

**Rationale**: the scene has to draw a level before any program has run — the
teacher's preview updates as they paint, and there is no trace to read. Asking
the server for the shape of a level on every brush stroke would put a network
round trip inside a drag.

The risk this carries is drift, and drift here would be invisible: a scene that
draws a level differently from the way it is graded is a level that lies to the
pupil. That is what the determinism check is for — it replays a server trace on
the client and compares heights step by step, so a divergence fails a test rather
than reaching a child.

**Alternatives considered**:

- *One implementation, on the server, fetched.* Correct and unusable: a drag
  fires many times a second.
- *One implementation in a shared schema, generated.* No such pipeline exists in
  this repo, and building one for a two-line function is the abstraction
  Principle V refuses.

## Finding C — the jetpack is equipment, not an effect

**Decision**: two small boxes on the character's back, visible at rest, with a
cone of thrust below each that scales from zero while it climbs.

**Rationale**: the point is to answer *how did it get up there*, and equipment
that exists before it fires answers that; an effect appearing from nowhere at the
moment of the climb only decorates it. A child who sees the pack while the
character stands still can predict what it is for.

Shape carries the meaning here as it does for every other prop in this scene: a
platform is a slab, a door is tall and thin, a jetpack is two cylinders and a
flame. Nobody has to be told.

**Alternatives considered**:

- *A particle system.* Costs a draw call per frame and a dependency this project
  does not have, to say what two cones already say.
- *Thrust with no pack.* Cheaper and worse: a flame would come out of the
  character's back with nothing producing it.
- *A separate field on the frame to say "fire the jetpack".* The frame already
  records what the movement was. A second field saying the same thing is two
  records of one fact, which is how the two drift apart.

## Finding D — the rule is written down, not only animated

**Decision**: the climb limits are stated in the pupil's starter header and in
the teacher's command palette, as translated strings.

**Rationale**: an animation teaches a child who has already run a program. It is
no help at all to one staring at an empty editor wondering which command to
write — which is the moment the question actually arrives. Words work before the
first run, the animation after it; neither replaces the other.

Strings also carry to six locales at once, which an animation cannot, and they
put the rule where the level's vocabulary already appears — so a pupil reads what
this level offers and what it costs in one place.

**Alternatives considered**:

- *A tooltip on each command.* Hidden until hovered, and on a school laptop's
  trackpad that is one more thing to discover. The starter header is already
  read.
- *Only the animation.* Leaves the pupil's first minute unhelped, and that is the
  minute the question is asked in.

## Finding E — measured, so it is not guessed later

Facts gathered on 2026-08-19 rather than recalled:

- Levels of type `world_3d` in production: **zero**, as recorded in
  `specs/012-world-3d-rework/research.md`. The meaning of a stored level is free
  to change and no migration is owed.
- The climb limits already exist and already differ for walking and jumping. The
  refusal for a step too high already exists and is already distinct from a wall,
  a closed door and the edge of the board. This feature states them; it does not
  build them.
- The frame already records which of walking, climbing, jumping, falling or
  turning happened, and the character already reads it. The jetpack has a signal
  to attach to.
- The solver builds the same simulator the grader does and asks it for heights,
  so it needs no edit of its own.
