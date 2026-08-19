# Implementation Plan: Climbing a floor, made visible

**Branch**: `feat/world-3d-climb` | **Date**: 2026-08-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/013-world-3d-climb/spec.md`

## Summary

One sentence carries the whole change: **a platform recorded at floor `N`
occupies floor `N`**, as a wall already does, and a character standing on it
stands at `N + 1`.

Everything else follows. The platform stops being drawn below the ground,
because floor `N` is above floor `N`. The floor control in the editor means one
thing instead of two. The first platform a teacher places — on floor 0, where
the editor opens — becomes a step a character can walk onto, which is what the
teacher expected when they clicked.

Two smaller pieces sit beside it, neither of which needs the first: the climb is
stated where a pupil looks, and the character gets a jetpack that fires when it
climbs. Together they answer the question this feature came from — *how does the
robot get from one floor to another?* — three times over: in the geometry, in
words, and in the animation.

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5 with React 19 (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2 async, Pydantic v2; Next.js 16,
three 0.185.1, @react-three/fiber 9.7.0, @react-three/drei 10.7.8. Nothing new
is added.

**Storage**: PostgreSQL. No migration: the level lives in `exercises.config`, a
JSON column, and production holds zero `world_3d` rows.

**Testing**: pytest against real PostgreSQL; Vitest and Playwright on the front.

**Target Platform**: browser, on a desktop or a school laptop.

**Project Type**: web application — `backend/` and `frontend/`.

**Performance Goals**: the scene holds a smooth frame rate on a 10×10 level with
every prop type present. The jetpack adds two small meshes and one frame-loop
branch to a character that already has one.

**Constraints**: the six locales stay in step; reduced motion collapses every
animation this feature adds; the server stays the only judge.

**Scale/Scope**: two backend modules and one validator rule; five frontend files;
one journey; roughly a dozen strings in six locales.

## Constitution Check

*GATE: must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How this feature satisfies it |
|---|---|
| **I. Tenant isolation is a rule** | No endpoint is added or changed. The three that exist keep their guards; nothing here reads an id from a request. |
| **II. A test that cannot fail is worse than none** | The height change is demonstrated failing first: the climb tests are re-pointed at the new meaning and watched to fail against the current rule before the rule moves. The jetpack gets no assertion pretending to check a look — SC-004 is walked by a person, and the plan names when. |
| **III. The server is the only judge** | The rule changes on both sides and the server keeps grading off its own replay. The frontend copy exists to draw, never to decide; a determinism check comparing the server's trace against the client's replay is what stops the two drifting. |
| **IV. Product and documentation agree** | `specs/012-world-3d-rework/data-model.md` states the old meaning of `y`. It is corrected here rather than left to contradict the code. The pupil's starter header gains the climb rule, so what the product says matches what it does. |
| **V. The smallest change that works** | No new cell type, though the request offered one: a platform already is the block a character climbs onto, and a second name would double every rule that mentions height. No new command, no new config field. The change is a definition, and the diff is mostly the removal of the offset the old meaning needed. |

**Gate result**: pass. No violation to justify, so *Complexity Tracking* stays
empty.

## Project Structure

### Documentation (this feature)

```text
specs/013-world-3d-climb/
├── plan.md              # This file
├── research.md          # Phase 0 — the decisions, and what was rejected
├── data-model.md        # Phase 1 — what a level records, and what a floor means
├── quickstart.md        # Phase 1 — how to prove it works
├── contracts/
│   └── height.md        # Phase 1 — the height rules, as a contract
├── checklists/
│   └── requirements.md  # Spec quality (already written)
└── tasks.md             # Phase 2 — /speckit-tasks, not this command
```

### Source code

```text
backend/app/exercises/
├── world_sim.py           # CHANGED — surface() returns one above the tallest
│                          #   platform, and the docstring that states otherwise
├── world_validate.py      # CHANGED — a goal is buried by any platform on its
│                          #   square, not only by one above floor 0
└── world_solver.py        # UNCHANGED — it builds a World and asks it, so the
                           #   new meaning arrives through surface()

backend/tests/
├── test_world_height.py   # CHANGED — the climb cases at the new meaning, plus
│                          #   a platform on floor 0 being a step
├── test_world_solver.py   # CHANGED — the jump case's platform drops a floor
└── test_world_validate.py # CHANGED — the buried-goal case

frontend/src/components/game/world-3d/
├── scene-engine.ts        # CHANGED — surfaceAt(), the front's copy of the rule
├── world-3d-exercise.tsx  # CHANGED — the starter header states what each
│                          #   movement command does about height
└── scene/
    ├── props.tsx          # CHANGED — a platform is drawn above the floor it
    │                      #   occupies, not below the height it used to mean
    └── character.tsx      # CHANGED — a jetpack, and thrust on climb and jump

frontend/src/lib/i18n/locales/{en,es,ru,tr,de,uk}.ts
                           # CHANGED — the climb strings, six times

frontend/e2e/journeys/world-3d.spec.ts
                           # CHANGED — the level gains a step, and a pupil climbs it

qa/exercise-fixtures.json  # UNCHANGED — its world_3d level is flat
```

**Structure Decision**: the existing web layout. No directory is added; every
file above already exists.

## The one change, and its blast radius

`surface(x, z)` answers *what height does a character stand at here*. Today it
returns the tallest platform's floor. It will return one more than that.

Everything on the server reads a height through `surface()`, so the server's
blast radius is one function. Three things do not, and each needs its own edit:

1. **The buried-goal rule** in `world_validate` tests for a platform above floor
   0, which used to mean "above the ground". Every platform now stands above the
   ground, so the test becomes "any platform on the goal's square".
2. **`surfaceAt` in `scene-engine.ts`** is the front's copy of the same rule,
   kept because the scene must draw a level before any program has run. It
   changes identically, and the determinism check is what stops the two drifting.
3. **The platform's geometry** in `props.tsx`. Today a platform spans from one
   floor below its recorded height up to it; it will span from its own floor up
   to one above — which is what a wall already does, so the two become the same
   expression with a different height.

**What does not change**: the climb limits keep their values. A character still
climbs one floor by walking and two by jumping, and the refusal for a step too
high already exists and is already distinct from a wall, a door and the edge.
FR-007 and FR-008 are satisfied by what is there — the work is to say so on
screen, not to build it.

## Where the climb gets stated

Two places, because a pupil meets a level in two ways.

- **The starter header** above the pupil's program already lists the commands the
  level offers. Each movement command gains what it does about height. That is
  one existing function and one string per command.
- **The editor's command palette** already groups the commands a teacher may
  offer. The movement group gains the same sentence, so a teacher choosing
  whether to offer jumping can see what the choice buys.

Both are ordinary translated strings, so both land in six locales at once —
which is the reason to put the rule in words and not only in the animation.

## The jetpack

`character.tsx` already reads `motion` off the frame: the simulator records
walking, climbing, jumping, falling, turning or nothing per step, and the
character already lifts and squashes differently for some of them. The jetpack
is

- two small boxes on its back, present at rest, so it reads as equipment rather
  than an effect that appears from nowhere;
- a cone of thrust below each, scaled from zero, driven by the frame loop that
  already interpolates position.

Thrust fires on a climb and a jump and on nothing else. A fall keeps its drop
with no thrust, and that is what makes the three tell apart — SC-004 asks a
viewer to name all three, and two of them already differ from each other.

Reduced motion is a state this scene already reads. The jetpack collapses with
everything else: no thrust, no travel, the character simply at its new height.
One branch, in the place the existing collapse lives.

## Testing strategy

**Backend, and each able to fail.** The climb tests exist and assert the old
meaning. Re-pointing them proves nothing on its own — a test rewritten to match
new behaviour always passes. So: change the tests first, watch them fail against
the current rule, then change the rule. State that in the pull request, as
Principle II requires.

New cases worth their own test:

- a platform on floor 0 is a step: a character walks onto it and stands at 1;
- a platform on floor 0 under the goal buries it, and the validator says so;
- a wall and a platform on the same floor are the same height, and the wall
  still blocks a character standing level with its top;
- two platforms on one square, floors 0 and 1, put the character at 2;
- SC-006 as a test: a level whose shortest path was N steps is N steps after.

**Frontend.** The journey gains a step in its level and a pupil who climbs it —
the same file that already proves painting at one height leaves the floor below
alone. The determinism check that server and client agree on heights guards
`surfaceAt` against drifting from `surface`.

**By eye, by a person.** SC-003 and SC-004 cannot be automated and will not be
claimed as automated. Both are walked in the browser before the pull request
opens, and the walk goes into the PR body with what was seen.

## Delivery

**One pull request, not five.** The meaning of a platform cannot be half
changed: between two merges the server and the scene would disagree about what a
level looks like, and any level built in that window would be built against a
rule about to move. The change is small enough — one function, one validator
rule, one geometry expression, one character, a dozen strings — that staging it
would cost more than it buys.

Order within the branch, which is also the order of `tasks.md`:

1. The height rule and its tests, backend, watched failing first.
2. The same rule on the front, and the platform's geometry.
3. The words: starter header, palette, six locales.
4. The jetpack.
5. The journey, and the walk by eye.

## Complexity Tracking

No constitution violation to justify.
