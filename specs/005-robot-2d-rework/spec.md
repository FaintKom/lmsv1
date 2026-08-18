# Feature Specification: Robot 2D rework

**Feature Branch**: `feat/robot-2d-rework`

**Created**: 2026-08-18

**Status**: Draft

**Input**: Rework the Robot 2D exercise type so it teaches programming: short, readable commands; a level editor a teacher can trust; and a server that decides who won.

## Why this now

Robot 2D is one of the two exercise types built to teach programming. A pupil
drives a robot across a grid, either by dragging blocks or by writing Python,
and the level is a small puzzle a teacher composed.

Every part of that sentence is currently false in practice:

| What a user expects | What happens today |
|---|---|
| A loop repeats until the robot arrives | `while` runs the body a fixed number of times and ignores the condition |
| Python behaves like Python | Lines are matched against a handful of regular expressions; a variable, an expression or a function call is silently skipped |
| The level offers the commands the teacher chose | The teacher's choice is saved and never read; every pupil gets one of three preset lists |
| A saved level is solvable | Nothing checks; a teacher can publish a level with no path to the goal and hear about it from pupils |
| Finishing the level earns the stars | The star thresholds exist in the data and have no field in the editor, so they are never set |
| The code editor follows the theme the pupil chose | It is pinned to a light theme. The player works out whether the pupil is in dark mode and then discards the answer |
| A level can ask for something other than "reach the goal" | It can, through a field holding arbitrary JavaScript that is stored on the level, shipped to the pupil's browser, and run there — an answer key and an execution surface at once |
| Finishing the level is what earns credit | The browser reports the verdict, and the server records it verbatim |

The last line violates Constitution principle III — the server is the only judge
of an answer — and is the half of `specs/004-exercise-answer-leak` that was
deferred rather than fixed.

The outcome this spec is written for: a teacher composes a level and knows,
before pupils see it, that it can be solved and in how many steps; a pupil
writes real Python or real blocks and is told the truth about both.

## Clarifications

### Session 2026-08-18

- Q: The level has a third win condition, `custom`, backed by a free-text
  `custom_win_js` field. What happens to it? → A: Replace it with a fixed list of
  ready-made conditions the teacher joins with logical operators. The list must
  cover painting marked cells and checking the values a level holds.
- Q: What counts as one step? → A: Any command the robot performs — a turn,
  `take`, `drop`, and a move refused by a wall all count.
- Q: What do the second and third stars measure? → A: The second measures steps,
  the third measures program size — blocks in the block editor, statements in
  Python.
- Q: Does pressing Run consume an attempt? → A: No. Only submitting does. Runs
  are limited by rate, not by quota.
- Q: Which win-condition vocabulary ships in v1? → A: The full set, including
  cells that carry values and the commands to read and write them. Nothing is
  deferred to a later feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A pupil's program runs, and the server judges it (Priority: P1)

A pupil opens a robot level, drags blocks or writes Python, and presses Run.
The program runs as written — loops loop, conditions branch, a misspelling
produces an error naming the line. The robot walks the path the program
describes. When it reaches the goal the pupil is credited, because the program
won and not because the browser said so.

**Why this priority**: Every other story sits on this one. A teacher cannot be
told "solvable in six steps" by a system that cannot faithfully run six steps,
and a command palette is worth nothing if the commands are then interpreted by a
regular expression. It also delivers alone: the levels that exist become
playable, and the credit stops being forgeable.

**Independent Test**: Write `while not at_goal(): move_forward()` on a level with
a clear corridor. The robot walks to the goal and stops. Then post a submission
claiming victory with a program that loses, and see it recorded as not passed.

**Acceptance Scenarios**:

1. **Given** a level whose goal is four cells ahead, **When** the pupil runs a
   loop that moves forward until `at_goal()`, **Then** the robot takes four
   steps, stops, and the level is complete.
2. **Given** a program with a misspelled command, **When** the pupil runs it,
   **Then** the pupil is shown the line number and what was not recognised, and
   the robot does not move.
3. **Given** a program that never reaches the goal, **When** the pupil submits a
   claim that the level was completed, **Then** the recorded result is not
   passed and no experience is awarded.
4. **Given** the same solution expressed once in blocks and once in Python,
   **When** each is run, **Then** the robot's path and step count are identical.
5. **Given** a program that loops forever, **When** it is run, **Then** it stops
   at the level's step allowance and the pupil is told the allowance ran out.

---

### User Story 2 - A teacher chooses which commands a level offers (Priority: P2)

A teacher building a level ticks the commands this level teaches. A first lesson
offers only `move_up`, `move_down`, `move_left`, `move_right`. A later one drops
those and offers `move_forward`, `turn_left`, `turn_right` and the sensors,
because that is the lesson where facing matters. Whatever the teacher ticks is
what the pupil sees — in the block palette, in the Python autocompletion, and in
the comment header of the starter file.

**Why this priority**: This is what makes a sequence of levels a course rather
than a pile of grids. It also repairs a promise the UI has been making all
along: the editor has offered this choice since it shipped, and discarded it.

**Independent Test**: Tick only the four absolute moves, save, open the level as
a pupil. The block palette shows four blocks, the starter lists four commands,
and no turning command is offered anywhere.

**Acceptance Scenarios**:

1. **Given** a level where the teacher ticked only the absolute moves, **When** a
   pupil opens it, **Then** exactly those four commands appear in the blocks, in
   the autocompletion, and in the starter header.
2. **Given** a pupil writes a command the level does not offer, **When** the
   program runs, **Then** the pupil is told that command is unavailable in this
   level, naming the line.
3. **Given** a teacher picks a difficulty preset, **When** the preset is applied,
   **Then** the tick boxes change to match it and stay editable — the preset sets
   the choice, it does not replace it.

---

### User Story 3 - A teacher proves the level works before pupils see it (Priority: P3)

Before saving, the teacher presses Check. The editor answers with either the
shortest solution's step count, or the reason there is none — the goal is walled
off, no start was placed, the level asks for all items and holds none. The
teacher can play the level then and there without saving, and can paste a
reference solution, which the editor refuses unless it wins. The step count
fills the star thresholds, so the rating a pupil sees is tied to a solution that
exists.

**Why this priority**: It turns the editor from a drawing tool into an authoring
tool. Composing a good grid is judgement and stays the teacher's; knowing
whether the grid can be finished is arithmetic and should not be.

**Independent Test**: Wall the goal off completely and press Check. The editor
reports that no path exists and names the goal cell. Remove one wall and press
Check again: it reports a step count, which matches a hand-counted path.

**Acceptance Scenarios**:

1. **Given** a level with a reachable goal, **When** the teacher presses Check,
   **Then** the editor reports the shortest solution's step count under the
   commands this level offers.
2. **Given** a level whose goal is unreachable, **When** the teacher presses
   Check, **Then** the editor says so and identifies what blocks it.
3. **Given** a level offering only absolute moves and a goal reachable only by
   turning, **When** the teacher presses Check, **Then** the answer accounts for
   the command set, not for commands the level withholds.
4. **Given** a reference solution that loses, **When** the teacher tries to save
   it, **Then** the editor refuses and shows where the run ended.
5. **Given** a saved reference solution, **When** a pupil reads the exercise,
   **Then** the solution is absent from everything the pupil receives.
6. **Given** the teacher presses Check, **When** it reports a step count, **Then**
   the star thresholds are filled with it and stay editable.
7. **Given** a level whose win condition depends on values the program writes,
   **When** the teacher presses Check, **Then** the editor reports that it
   verified the reference solution and did not compute a shortest one, and never
   presents that result as a shortest step count.
8. **Given** a win condition asking for every marked cell to be painted, **When**
   the grid marks none, **Then** the editor refuses the level and says which part
   of the condition nothing can satisfy.

---

### Edge Cases

- A level with no start cell, two start cells, or a start on top of a wall.
- A goal reachable only through a cell holding an item the level requires.
- A win condition demanding every item be collected on a level holding none, or
  every marked cell be painted on a level that marked none.
- A win condition demanding a cell be painted where a wall stands.
- A win condition joined by `or` where one branch is satisfiable and the other
  never is — the level is playable and the editor should say which branch is dead.
- A pupil paints the same cell twice, and paints a cell nobody marked.
- A pupil reads a cell that carries no value, or writes to one.
- A pupil picks an item up and puts it down again — the level must not count as
  collected what is lying on the grid.
- A pupil drops an item on the cell they are standing on, twice.
- A program that runs long: the step allowance ends it and says so, rather than
  the pupil watching an animation that never stops.
- A program printing its own output alongside its moves.
- A grid resized smaller, with walls and items outside the new bounds.
- Two pupils submitting the same level at the same moment.
- A level at the maximum grid size whose solution uses every step of the
  allowance.

## Requirements *(mandatory)*

### Functional Requirements

**Running a program**

- **FR-001**: A pupil's program MUST be executed as Python, including variables,
  expressions, `for`, `while`, `if`/`else` and function definitions.
- **FR-002**: A `while` loop MUST re-evaluate its condition against the robot's
  current state on every iteration.
- **FR-003**: A program written in blocks and the same program written in Python
  MUST produce the same robot behaviour, judged by the same rules.
- **FR-004**: Execution MUST stop at the level's step allowance and report that
  the allowance ran out.
- **FR-005**: A program that fails to parse or raises an error MUST report the
  line number and a message a child can act on.
- **FR-006**: The pupil MUST be able to watch the run, pause it, advance it one
  step at a time, and change its speed.
- **FR-007**: Output the pupil printed MUST be shown to the pupil, separately
  from the robot's moves.

**Judging**

- **FR-008**: The system MUST decide whether a level was completed by running the
  submitted program itself. A completion claim sent by the client MUST NOT be
  recorded.
- **FR-009**: The score and stars MUST come from the run the system performed —
  its step count and command count — not from figures supplied with the
  submission.
- **FR-010**: A reference solution stored on a level MUST NOT reach a pupil or a
  parent, by any route that serves them the exercise.
- **FR-026**: Pressing Run MUST NOT consume one of the pupil's attempts. Only
  submitting does.
- **FR-027**: A step is any command the robot performs. A turn, a `take`, a
  `drop` and a move a wall refused each count as one.
- **FR-028**: The second star MUST be awarded when the run's step count falls
  within the level's step threshold. The third MUST be awarded when the program's
  size falls within the level's size threshold, where size is the number of
  statements in the program the system ran. Because a block program is turned
  into the same statements before it runs, one rule serves both editors and
  neither side reports its own size.

**What counts as winning**

- **FR-029**: A level's win condition MUST be an expression built from a fixed
  vocabulary of conditions, combined with `and`, `or` and `not`. A teacher MUST
  NOT be able to store executable code as a win condition.
- **FR-030**: The vocabulary MUST cover: the robot stands on the goal; every item
  has been collected; every marked cell has been painted; the robot faces a given
  direction; the run took no more than a given number of steps; every cell
  carrying a value has been read; the values written to the grid satisfy a stated
  total.
- **FR-031**: The win condition is the pupil's instructions and MUST be shown to
  them, in words, before they write anything. What MUST NOT reach the pupil is
  the verdict: whether the condition holds is decided by the system, never
  reported to it.
- **FR-032**: The editor MUST refuse a win condition no arrangement of the grid
  can satisfy — asking for painted cells on a grid with none marked, or for a
  collection on a grid holding no items.

**Commands**

- **FR-011**: Command names MUST carry no object prefix, and no command name may
  exceed 14 characters.
- **FR-012**: The vocabulary MUST cover:
  - moving by grid direction — `move_up`, `move_down`, `move_left`, `move_right`
  - moving and turning by facing — `move_forward`, `turn_left`, `turn_right`
  - handling items — `take`, `drop`
  - marking the floor — `paint`
  - working with a cell's value — `read`, `write`
  - asking about the surroundings — `wall_ahead`, `item_here`, `at_goal`,
    `painted`, `value_here`
- **FR-013**: A level MUST record which of those commands it offers.
- **FR-014**: The offered set MUST drive the block palette, the Python
  autocompletion and the starter file's header, from one stored list.
- **FR-015**: Using a command the level does not offer MUST be reported to the
  pupil as unavailable, naming the line, rather than failing silently.

**Authoring**

- **FR-016**: A teacher MUST be able to ask whether a level is solvable and, if it
  is, receive the shortest solution's step count under that level's command set.
- **FR-035**: Where the win condition depends on values the program writes, an
  exhaustive answer is not available. The editor MUST say which of the two
  answers it is giving — a shortest step count, or only that the reference
  solution passes — and MUST never present the second as the first.
- **FR-017**: A shortest step count MUST fill the star thresholds, which stay
  editable. Where only the reference solution could be checked, the thresholds
  MUST be filled from that solution's run, labelled as such.
- **FR-018**: A teacher MUST be able to play a level without saving it.
- **FR-019**: A teacher MUST be able to store a reference solution, and the editor
  MUST refuse one that does not win.
- **FR-020**: The editor MUST show, in one place, every reason a level is not
  ready: no start, no goal, unreachable goal, start or item on a wall, a win
  condition nothing on the grid can satisfy, sensors offered without any facing
  command, and a win condition naming a command the level withholds.
- **FR-021**: Difficulty presets MUST set the command ticks and leave them
  editable, so a level keeps one record of what it offers.
- **FR-022**: The editor MUST let a teacher paint by dragging, undo the last
  change, and set the grid's width and height as numbers.
- **FR-023**: Every string a teacher or pupil reads in the editor and the player
  MUST be translatable, in every language the product ships.

**World rules**

- **FR-024**: An item counts as collected once it is no longer on the grid.
  Putting one down MUST return it to the grid and to the count of what remains.
- **FR-025**: Walking into a wall or off the grid MUST leave the robot where it
  is, consume a step, and read to the pupil as a refusal rather than as nothing
  happening.
- **FR-033**: Painting a cell that is already painted MUST leave it painted and
  still cost a step. Paint MUST NOT be removable by any command, so a level's
  paint requirement can only be met by covering the marked cells.
- **FR-034**: Reading a cell that carries no value, or writing to a cell that was
  not given one, MUST be reported to the pupil as a refusal naming the line,
  rather than returning a zero the pupil would then reason from.

### Key Entities

- **Level**: a grid of cells, a start, a win condition, the commands it offers, a
  step allowance, star thresholds, hints, and an optional reference solution.
- **Win condition**: an expression over the vocabulary in FR-030, combined with
  `and`, `or` and `not`. Held by the level, evaluated where the program runs,
  never sent to the pupil.
- **Cell**: a position on the grid. It holds nothing, a wall, an item, the start,
  or the goal; it may additionally be marked for painting, be painted, and carry
  a value.
- **Robot**: a position, a facing, and what it carries.
- **Run**: what happened when a program was executed — the sequence of the robot's
  states, whether the level was won, how many steps were taken, and any error
  with its line.
- **Submission**: a pupil's program, and the verdict the system reached by running
  it.

## Success Criteria *(mandatory)*

- **SC-001**: A teacher composes a level and confirms it is solvable in under ten
  minutes, without asking anyone whether it works.
- **SC-002**: No level a teacher saves is unsolvable. Every saved level carries
  either a known shortest step count, or a reference solution that was watched to
  pass, or was saved past a warning naming the obstruction.
- **SC-003**: A loop that runs until the robot arrives reaches the goal and stops,
  on every level where a path exists. Today this succeeds on none.
- **SC-004**: A submission claiming completion without a winning program is never
  recorded as passed — one hundred attempts, one hundred failures.
- **SC-005**: Every error a pupil's program raises is reported with the line it
  occurred on. A run that ends in an error and names no line is a defect.
- **SC-006**: A first level is solvable in four lines or fewer, and no command a
  child types runs longer than fourteen characters.
- **SC-007**: The same solution written in blocks and in Python is judged the
  same, on every level in the sample set.
- **SC-008**: The stars a pupil is awarded are reproducible: re-running the same
  program on the same level yields the same stars.
- **SC-009**: The robot starts moving within three seconds of the pupil pressing
  Run, in nineteen runs out of twenty.
- **SC-010**: A pupil can press Run twenty times in a row without losing an
  attempt, and is told plainly when they are running faster than the limit
  allows.
- **SC-011**: Where the editor could not compute a shortest solution, it says so.
  A step count labelled as shortest is always a shortest one.

## Assumptions

- No robot levels exist in production, so the stored shape of a level may change
  without a migration or a compatibility layer. Confirmed with the owner.
- Python is the text language. Other text languages are out of scope.
- Sensors report relative to the robot's facing. A level that wants sensors also
  offers the facing commands. Direction-specific sensors are a later addition, if
  a teacher asks for one.
- Grids stay small — at most ten by ten — which is what makes an exhaustive
  solvability answer cheap.
- Levels holding many items or many marked cells make the shortest-solution
  question expensive; above a dozen of them together the editor reports that it
  did not compute one, rather than stalling.
- Where a win condition depends on values the program writes, no shortest
  solution is computed at all. The teacher's reference solution is the evidence
  the level works, and the editor says so rather than implying more.
- When the service that runs programs is unavailable, the pupil is told to try
  again, nothing is recorded, and no attempt is consumed.
- Runs are limited by rate rather than by quota. The limit exists to protect a
  shared machine, not to ration practice, and a pupil working normally never
  meets it.
- `math_interactive`, which shares the same submission route and the same
  client-judged flaw, is out of scope here and stays tracked by
  `specs/004-exercise-answer-leak`.
- World 3D is out of scope for this spec and follows in its own, reusing whatever
  this one builds.
