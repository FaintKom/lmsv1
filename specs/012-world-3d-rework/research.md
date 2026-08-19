# Research — World 3D rework

Decisions taken before writing code, each with what was rejected. Written
2026-08-19, against the tree as it stands after spec 005 shipped.

## Finding A — share the runner, not the world

**Decision**: `robot_runner.py` becomes parameterised by a simulator module;
`world_sim.py` is a separate module beside `robot_sim.py`.

**Rationale**: the runner is coupled to `robot_sim` through exactly four names —
the module source it embeds, `_boot`, `RobotError`, `StepsExhaustedError`. The
rest of it is the sentinel protocol, the `compile(source, "program.py")` trick
that keeps line numbers honest, the output cap, and the trace parser. Every one
of those is identical for 3D, and every one is the kind of detail that silently
diverges once copied.

The worlds themselves share almost nothing: 3D has heights, jumping and doors;
2D has painting and numbers written into cells. A single generalised world would
have to model both, and would be edited every time either changed.

**Alternatives considered**:
- *Copy the runner.* Rejected: two copies of the sentinel protocol is how the
  sentinel protocol becomes two protocols.
- *Generalise the simulator.* Rejected: an abstraction over two concrete worlds,
  written before either has settled, is the definition of premature.

## Finding B — the solver, and the point at which it gives up

**Decision**: breadth-first search over
`(x, z, y, facing, items_taken_mask, doors_open_mask)`. If the number of things
that must be interacted with — items plus buttons — exceeds twelve, the search
is not run; the answer becomes `reference_only` with a named reason, exactly as
2D does.

**Rationale**: the state space is `width × depth × heights × 4 × 2^items ×
2^buttons`. At 10×10 with a few heights that is fine until the masks grow; at
twelve targets it is already millions of states, and a teacher pressing Check
must get an answer or an honest refusal, never a hung tab.

The reason is a *code*, not a sentence: `too_many_targets`. The editor turns it
into words, in six languages.

**Alternatives considered**:
- *A\* with a heuristic.* Rejected: an admissible heuristic across a locked door
  is not obvious, and being wrong makes the answer wrong rather than slow.
- *Search anyway, with a timeout.* Rejected: "sometimes it answers" is worse for
  a teacher than "it will not answer, and here is why".

## Finding C — a cartoon look with nothing downloaded

**Decision**: `MeshToonMaterial` with a three-step gradient ramp built in code as
a tiny data texture with nearest-neighbour filtering; rounded boxes for every
solid; drei's `Outlines` (inverted hull) for the drawn line; `ContactShadows`
for grounding; no fog, no metalness, no shadow maps.

**Rationale**: the Duolingo read comes from three things — a flat band of colour
instead of a gradient, a visible outline, and rounded corners. All three are
available in what is already installed (drei 10.7.8, three 0.185). The gradient
map is four bytes.

**Alternatives considered**:
- *A downloaded character model.* Rejected twice over: the page's content
  security policy blocks external hosts, and a model carries a licence nobody in
  this project has read.
- *A post-processing outline pass.* Rejected: it needs
  `@react-three/postprocessing`, which is not installed, for an effect inverted
  hulls already give at this scale.
- *A hand-written toon shader.* Rejected under Constitution V: more code, same
  picture.

## Finding D — colours must come from the tokens, and WebGL cannot read CSS

**Decision**: read the computed values of the design tokens from a probe element
at mount and whenever the theme changes, and convert them once into colours the
scene holds.

**Rationale**: the project has already paid for this lesson — a raw colour value
stays put when the theme flips, while a token follows it. Three.js cannot read a
CSS custom property, so something has to carry the value across; doing it at
mount and on theme change is cheap and keeps one source of truth.

The palette is already right for this brief: `--green-*`, `--sun-*`, `--clay-*`
and `--lagoon-*` are saturated and friendly rather than corporate. The standing
rule holds — anything on a sun-tinted surface takes `ink-900`, never white.

**Alternatives considered**:
- *Two hard-coded palettes.* Rejected: they drift, and the drift is invisible
  until someone opens the other theme.

## Finding E — what a fall is

**Decision**: walking or jumping onto a square resolves to the top walkable
surface there. If that surface is lower than where the character stood, it falls
— any distance — and the frame records that it fell, so the scene can animate
it. Climbing is limited: one level by walking, two by jumping.

**Rationale**: a ledge you cannot step off is not a ledge, and a child's first
instinct on seeing a drop is to walk off it. Refusing would teach nothing;
falling is legible, and the animation makes plain what happened.

**Alternatives considered**:
- *Refuse to walk off an edge.* Rejected: it makes height decorative.
- *Damage or failure on a long fall.* Rejected: this is a programming exercise,
  not a platformer, and a level that can become unwinnable from one wrong step
  makes the step allowance meaningless.

## Finding F — doors, and what `press()` must not do

**Decision**: `press()` acts on the button directly in front. That button opens
the door it is linked to, and only that one. An open door stays open for the
rest of the run. Pressing an already-pressed button changes nothing and still
costs a step.

**Rationale**: the current engine *toggles* the button while opening the door,
so pressing twice leaves a pressed button beside an open door — a state the
teacher cannot reason about. Making "open" one-way removes a whole class of
level that works only as long as the child does not experiment.

Buttons link to doors by choosing from the doors that exist. Free text produced
levels nobody could finish, with nothing to say why.

## Finding G — what a frame carries

**Decision**: a frame is the character's square, height, facing, whether the
command succeeded, its index, and the changes it made to the world — an item
taken or dropped, a button pressed, a door opened — plus, for 3D, whether the
move was a fall or a climb.

**Rationale**: the scene has to animate a jump differently from a walk, and a
fall differently from either. Deriving that by comparing consecutive frames is
possible and fragile; recording it costs one field.

## Finding H — reduced motion is a state, not a fallback

**Decision**: the scene reads the reduced-motion preference and makes every
interpolation instant — the character moves between squares without travelling,
props do not float, nothing eases. The replay controls keep working.

**Rationale**: `globals.css` already collapses CSS animation globally, but a
WebGL frame loop is invisible to it. A scene that keeps swooping for a viewer
who asked it not to is not merely rude; for some it is unusable.

## Finding I — measured, so it is not guessed later

Facts gathered on 2026-08-19 rather than recalled:

- Exercises of type `world_3d` in production: **zero**. The configuration shape
  is free.
- Installed and sufficient: three 0.185.1, @react-three/fiber 9.7.0,
  @react-three/drei 10.7.8 (`RoundedBox`, `Outlines`, `ContactShadows`, `Float`,
  `Sky` and `Environment` all present). Blockly 13.2.1.
- **Not** installed, despite an earlier note of mine claiming otherwise:
  `motion` / `framer-motion`. Nothing here may assume them.

## Finding J — SC-005, measured rather than asserted

**Decision**: SC-005 is met with room to spare, and the number is written down
here so the next person does not re-derive it from a feeling.

Twenty presses of Run against the real sandbox container, 2026-08-19, on the
development stack (backend on 8010, sandbox alongside it):

| Program | steps | min | median | p95 | max |
|---|---|---|---|---|---|
| `move_forward()` twice — an ordinary pupil run | 2 | 48 ms | 53 ms | **98 ms** | 167 ms |
| `while not at_goal(): move_forward()` — stopped by the step allowance | 200 | 47 ms | 53 ms | **77 ms** | 78 ms |

**Rationale for measuring both**: the second is the worst a pupil can do, and it
is the *faster* of the two at the tail. That is the useful finding. The cost is
the container hop, not the simulation: two hundred steps of `world_sim` are
noise beside starting a process and posting a result, so a runaway loop does not
punish the child who wrote one.

**What this does not measure**: production. That box is a CX22 sharing two vCPUs
with the rest of the stack, so its figures will be worse. The margin is
thirty-fold, which is the reason to record the measurement and move on rather
than repeat it under load.
