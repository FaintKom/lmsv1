# Feature Specification: Climbing a floor, made visible

**Feature Branch**: `feat/world-3d-climb`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "как робот из одного этажа попадает на другой? платформы сейчас проходят сквозь пол визуально, нужно сделать их чуть выше, чтобы они выходили за пределы пола. нужно сделать возможность роботу прыгать, чтобы он поднимался на одну платформу наверх перед собой, и добавть в редактор такую платформу (по сути, это можено сделать просто как еще один блок, просто робот сможет на него забираться с анимацией ракетного ранца (добавь ему ракетный ранец)"

## Context

The question that opened this — *how does the robot get from one floor to
another?* — already has an answer in the rules. Walking climbs one level;
jumping climbs two. Nothing on any screen says so, nothing looks different when
it happens, and the block a child climbs onto is invisible when a teacher first
places it. Three faults, one symptom: height exists and cannot be seen.

Verified in the code on 2026-08-19, not recalled:

| # | Fault | Evidence |
|---|---|---|
| 1 | A block's floor means two different things | A wall recorded at level `y` occupies level `y`. A platform recorded at level `y` is the height a character *stands at*, so the platform itself occupies `y − 1`. The editor offers one "Floor" control for both tools. |
| 2 | The first platform a teacher places does nothing and shows nothing | The editor opens on floor 0. A platform at floor 0 raises the standing height to 0 — which it already was — and is drawn entirely below the ground, so the teacher sees an unchanged, empty square. |
| 3 | Climbing looks like walking | The character moves the same way whether it walks, climbs or jumps. A child cannot tell a step from a lift, or either from a fall. |

Production holds zero `world_3d` levels (recorded in
`specs/012-world-3d-rework/research.md`), so the meaning of the stored level may
change without owing anybody a migration.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A teacher builds a step and can see it (Priority: P1)

A teacher opens a 3D level, picks the platform tool and clicks a square. A block
appears on that square, standing above the ground, and the preview shows a
character able to climb onto it. The teacher did not have to know that platforms
are counted differently from walls, and did not have to change the floor first.

**Why this priority**: without it, nothing else is reachable. A teacher who
places a block and sees nothing concludes the tool is broken and stops. Every
other story here assumes a level with a step in it.

**Independent Test**: place a platform on the floor the editor opens on, and
confirm the preview shows a block standing above the ground on that square, and
that Check reports the level solvable by walking onto it.

**Acceptance Scenarios**:

1. **Given** a new level and the platform tool, **When** the teacher clicks a
   square without touching the floor control, **Then** a block appears on that
   square standing above the ground, and a character can reach its top.
2. **Given** a platform already placed on floor 0, **When** the teacher switches
   to floor 1 and clicks the same square, **Then** a second block appears on top
   of the first, and the one below is untouched.
3. **Given** a wall and a platform placed on the same floor number, **When** the
   teacher looks at the preview, **Then** both occupy that floor — the same
   number means the same height for both tools.

---

### User Story 2 - A pupil can tell how to get up (Priority: P2)

A pupil opens a level with a step in it. Before writing anything, they can see
which commands the level offers and what each one does about height — that
walking carries them up one floor and jumping carries them two. When their
program is refused for climbing too far, the refusal says so in those terms.

**Why this priority**: the rule already works; a child who does not know it
writes `jump()` where walking would do, or gives up. Second, because a level
they cannot see (Story 1) cannot be reasoned about at all.

**Independent Test**: open a level containing a step as a pupil and, without
running anything, read from the screen how to get onto it.

**Acceptance Scenarios**:

1. **Given** a level offering both movement commands, **When** a pupil reads the
   command list, **Then** each one states how far it climbs.
2. **Given** a step two floors high and a program that walks into it, **When**
   the pupil runs it, **Then** the refusal names the height as the reason, and
   the character does not move.
3. **Given** a step one floor high, **When** the pupil walks into it, **Then**
   the character arrives on top of it.

---

### User Story 3 - A pupil can see the robot climb (Priority: P3)

The character wears a jetpack. When it climbs, the jetpack fires and lifts it;
when it walks, the jetpack is idle; when it falls, it drops without thrust. A
child watching from across the room can say which of the three just happened.

**Why this priority**: it teaches the rule without words, in six locales at
once, and it is the part the pupil enjoys. Third because a level with a visible
step and a stated rule already works without it.

**Independent Test**: run one program containing a walk, a climb and a fall, and
have someone who has not read this spec name each of the three from the
animation alone.

**Acceptance Scenarios**:

1. **Given** a character about to climb, **When** the climb plays, **Then** the
   jetpack fires for the length of the lift and stops on arrival.
2. **Given** a character walking on the flat, **When** the step plays, **Then**
   the jetpack does not fire.
3. **Given** a character walking off a ledge, **When** the fall plays, **Then**
   it drops without thrust and lands.
4. **Given** a viewer who has asked for reduced motion, **When** any of the three
   plays, **Then** the character arrives at its new square and height without
   travelling, and the scene stays readable.

---

### Edge Cases

- **A platform under the goal.** The flag is on the ground; a platform on the
  same square now stands above it. The level must still refuse to be saved as
  unreachable rather than quietly burying the flag.
- **A stack of platforms.** Several platforms on one square at successive
  floors: the character stands on the highest, and the ones below stay drawn.
- **A platform beside a wall of the same height.** A character standing on the
  platform is level with the wall's top; the wall must still block, because a
  wall is not a floor.
- **A climb of exactly the walking limit, and one more.** One floor is walkable;
  two is not, and must be refused with the height as the reason.
- **A fall of several floors.** Walking off a high platform lands on whatever is
  below, however far down, without harm and without leaving the board.
- **The floor control at its top.** A platform at the highest floor the editor
  offers still draws and still behaves.

## Requirements *(mandatory)*

### Functional Requirements

**One meaning of height**

- **FR-001**: A block recorded at floor `N` MUST occupy floor `N`, whichever
  kind of block it is. The floor number MUST mean the same thing for every tool
  the editor's floor control applies to.
- **FR-002**: A character standing on a platform that occupies floor `N` MUST
  stand at height `N + 1`.
- **FR-003**: A platform MUST be drawn standing above the surface it rests on,
  so a teacher placing one on bare ground sees a block above the ground rather
  than a change they cannot see.
- **FR-004**: Placing a platform on one floor MUST leave the platforms on every
  other floor of that square untouched.
- **FR-005**: The stored level MUST carry each block's floor explicitly, and the
  same stored level MUST produce the same heights on the server and on screen.

**A climb a pupil can find**

- **FR-006**: The list of commands a pupil sees MUST state, for each movement
  command the level offers, how many floors it can climb.
- **FR-007**: When a movement is refused because the step is too high, the
  refusal MUST say so specifically, distinguishably from being blocked by a
  wall, a closed door or the edge of the board.
- **FR-008**: Walking MUST climb one floor and jumping MUST climb two, and both
  MUST refuse anything higher. This is the existing rule; the requirement is
  that it stays true and is now stated.
- **FR-009**: A teacher MUST be able to see, without leaving the editor, that a
  level they have built can be finished — including levels whose only route is a
  climb.

**A climb a pupil can see**

- **FR-010**: The character MUST carry a jetpack that is visible at rest.
- **FR-011**: The jetpack MUST fire while the character climbs or jumps, and MUST
  NOT fire while it walks on the flat.
- **FR-012**: Walking, climbing and falling MUST each look different from the
  other two.
- **FR-013**: A viewer who has asked for reduced motion MUST get every change of
  square and height instantly, with the scene still readable and every control
  still working.

**What must not change**

- **FR-014**: The server MUST remain the only judge of whether a level was
  finished. Nothing here may move a verdict into the browser.
- **FR-015**: Every string this feature adds MUST exist in all six locales.

### Key Entities

- **Block** — something a teacher places on a square at a floor. A *wall* blocks
  movement at the floor it occupies and cannot be stood on. A *platform* can be
  stood on, and standing on it means standing one floor above it.
- **Surface** — the height a character stands at on a square: one above the
  highest platform there, or the ground when there is none.
- **Movement** — what one command did: walked, climbed, jumped, fell, turned, or
  nothing. Recorded per step, so the scene can play the right animation and a
  refusal can name its reason.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A teacher who has never built a 3D level places a block a
  character can climb onto within one minute of opening the editor, without
  being told which floor to use.
- **SC-002**: 100% of platforms placed anywhere in the editor are visible in the
  preview immediately after placement.
- **SC-003**: Given a level containing a step, a pupil who has not been told the
  rule can say from the screen alone which command gets them up, first time.
- **SC-004**: Shown one recording containing a walk, a climb and a fall, a viewer
  names all three correctly without sound or text.
- **SC-005**: A movement refused for height reports height as the reason in 100%
  of cases, and never reports it when the obstacle is a wall, a door or the edge.
- **SC-006**: Every level that could be finished before this change can still be
  finished after it, in the same shortest number of steps.

## Assumptions

- The editor's floor control keeps its current range; this feature changes what
  a floor number means, not how many there are.
- One floor stays the unit of height. A platform is one floor tall, and a
  character on it stands one floor up.
- The jetpack is decoration and a signal, not a command: a pupil cannot fly it,
  and no command exists to use it. It fires because the character climbed.
- No level needs migrating, because production holds none.
- The six locales are the ones already shipped; no new language arrives here.

## Out of Scope

- **A new kind of block.** A platform already is the thing a character climbs
  onto. A second name for it would leave a teacher choosing between two words
  for one object, and would double every rule that mentions height.
- **A command that flies.** The jetpack signals a climb; it does not add a way to
  move. Flying would make most levels trivial and every solver answer wrong.
- **`robot_2d`.** It has no height, and nothing here applies to it.
- **Falling damage, stamina, or anything else that can end a run.** A fall stays
  survivable.
