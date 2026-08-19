# Feature Specification: World 3D rework

**Feature directory**: `specs/012-world-3d-rework/`
**Branch**: `feat/world-3d-rework`
**Created**: 2026-08-19
**Status**: Draft
**Pairs with**: [`specs/005-robot-2d-rework`](../005-robot-2d-rework/spec.md), shipped 2026-08-18

> The number is 012, not the 006 the plan named: `006-exhausted-attempt-verdict`
> already exists. Nothing else changes.

## Why this now

`world_3d` and `robot_2d` are the two exercise types meant to teach
programming. 2D was rebuilt in specs/005; 3D still runs on everything that
rework threw away, and a school buying the platform for its 3D levels would
find none of it works.

Each line was verified in the tree on 2026-08-19, not recalled:

| # | What is broken | How it shows |
|---|---|---|
| 1 | Over half the block palette does nothing | The 3D toolbox offers `move_up/down/left/right` and `pick_up/place_item`; the engine understands only `moveForward, turnLeft, turnRight, jump, pickUp, interact`. A child drags a block, presses Run, and the character ignores it. |
| 2 | `while` never re-reads its condition | The executor copies the loop body up to a hundred times *before* running any of it, so the condition is read once, at a moment when it cannot yet be true. |
| 3 | Python is not Python | It is a regular expression. No variables, no expressions, no functions; `if` and `while` are matched by looking for a substring. |
| 4 | The teacher's choice of commands is discarded | The editor writes `available_blocks` and nothing reads it. Both the pupil view and the editor pass a difficulty label to the palette instead. |
| 5 | The browser declares its own victory | The submission stores whatever the page posts. A pupil who never opens the exercise can post `{"completed": true, "score": 1.0}` and be marked as having finished it. This is Constitution III. |
| 6 | The editor destroys stacked platforms | Placing a platform at one height deletes the one below it, because the cell being replaced is matched on position and kind while ignoring height. |
| 7 | A door is linked to its button by typing an id | Free text, no list, no check. A typo produces a door that never opens and a level nobody can finish, with nothing to say so. |
| 8 | Nothing tells the teacher the level is solvable | No solvability check, no step thresholds for stars, no way to play the level before saving, no reference solution. All four exist in 2D. |
| 9 | It looks like a spreadsheet at night | Dark slate greys, metallic shading, fog. The audience is children. |
| 10 | No tests | Nothing covers the engine, the editor or the submission path. |

One more is inherited: `custom_win_js` — arbitrary JavaScript stored on the
level and shipped to the pupil's browser — is still in the 3D configuration.
Deleting it was left as T071 of spec 005, blocked precisely because `world_3d`
still reads it. This feature closes that.

**No 3D level exists in production.** Counted on 2026-08-19: zero rows of
`world_3d` across every organisation. The configuration shape is therefore free
to change, exactly as 2D's was, and no migration is owed to anybody.

## Decisions taken without asking

The owner delegated this explicitly: *"это будет твоя полностью автономная
работа, где ты принимаешь решения"*. The decisions that shape the scope are
recorded here, so a reader can disagree with a decision rather than guess at one.

| Decision | Why |
|---|---|
| The rules live once, in Python, and run in the sandbox | The same move as 2D. It is what makes a real `while`, real Python and a server-side verdict fall out together instead of being three separate features. |
| Commands are bare and facing-relative: `move_forward()`, `jump()`, `press()` | Children move between the two exercise types. A different calling convention in each is a tax paid by the child, not by us. |
| Shapes are generated, not downloaded | External hosts are blocked by the page's own security policy, and a downloaded model carries a licence nobody has checked. |
| The level is painted on a top-down grid with a height selector, and shown live in 3D beside it | Aiming a click at a rotating perspective scene is hard for a teacher and harder for a test. Painting a grid is neither. |
| Both blocks and Python are always available | 3D currently hides Python behind a flag that defaults to off, so the harder half of the exercise is invisible. 2D dropped the flag. |
| The v2 isometric world (`world-3d-v2.tsx`) is out of scope | Different lesson runner, flat drawing, no shared code. Saying so here is cheaper than someone discovering it mid-review. |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A pupil's program runs, and the server decides who won (Priority: P1)

A child writes `while not at_goal(): move_forward()` — in blocks or in Python —
presses Run, and watches the character walk. The loop checks the world each time
round. When they press Submit, the server runs their program itself and marks
the attempt on what it saw, not on what the page claimed.

**Why P1**: everything else is decoration on top of this. It is also the
security fix: without it the exercise grades itself in a place the pupil
controls.

**Independent test**: write a losing program, post it alongside
`{"completed": true, "score": 1.0}`, and confirm the attempt is not passed —
with a winning program in the same test, so an endpoint that rejects everything
cannot pass by accident.

**Acceptance scenarios**:

1. **Given** a level whose goal is four squares ahead, **when** the pupil runs
   `while not at_goal(): move_forward()`, **then** the character walks four
   squares, stops, and the level is won.
2. **Given** the same level, **when** the pupil writes `move_forwrd()`, **then**
   the message names the line they wrote it on and the character does not move.
3. **Given** any level, **when** the pupil submits a program that does not
   finish it, **then** the attempt is recorded as not passed, whatever the
   request body claims about the outcome.
4. **Given** a program that prints, **when** it runs, **then** what it printed is
   shown to the pupil, apart from the level's own messages.
5. **Given** a program with no end, **when** it runs, **then** it stops at the
   level's step allowance and says so in a sentence, not as an error.

### User Story 2 - A teacher chooses what the level offers (Priority: P2)

A teacher building a level ticks the commands it offers. The block palette, the
Python autocompletion and the starter comment all follow that one list. A level
about climbing offers `jump()` and `step_ahead()`; a level about corridors does
not.

**Why P2**: it is the difference between a level and a sandbox, and it is the
defect that makes today's editor a lie.

**Independent test**: build a level offering only `move_forward` and `at_goal`,
open it as a pupil, and confirm the palette offers those two and nothing else.

**Acceptance scenarios**:

1. **Given** a level offering three commands, **when** a pupil opens it, **then**
   the palette shows exactly those three.
2. **Given** the same level, **when** a pupil calls a command it does not offer,
   **then** the run stops with a message naming the command and the line.
3. **Given** a teacher who presses a preset, **when** they then untick one
   command, **then** the tick list is what the level saves — the preset is a
   shortcut, not a second source of truth.

### User Story 3 - A teacher proves the level works before pupils see it (Priority: P3)

Before saving, the teacher presses Check. The editor answers with the shortest
solution in steps, or says the level cannot be finished and names what blocks
it. The teacher can play the level without saving, and can store a reference
solution — which the editor refuses if it does not win.

**Why P3**: an impossible level reaches a child as an accusation that they are
bad at this.

**Independent test**: wall the goal off, press Check, confirm the answer is
"cannot be finished" with the reason named; open a gap, press Check, confirm a
step count a human can count by hand.

**Acceptance scenarios**:

1. **Given** a solvable level, **when** the teacher presses Check, **then** the
   shortest number of steps is reported and kept as the star threshold.
2. **Given** a level whose goal is walled off, **when** the teacher presses
   Check, **then** the answer says so and lists what stands in the way.
3. **Given** a level with a button and a door, **when** the button is linked to
   no door, **then** Check reports it as a fault before a pupil ever sees it.
4. **Given** a reference solution that does not win, **when** the teacher saves
   it, **then** it is refused and nothing is stored.
5. **Given** a stored reference solution, **when** a pupil reads the exercise,
   **then** it is not in what they receive.

### User Story 4 - The level looks like something a child wants to touch (Priority: P2)

A child opens a 3D level and finds a bright, rounded, outlined world with a
character that has weight — it leans before it turns, squashes when it lands,
and bobs while it waits. Not a grey grid.

**Why P2 rather than P3**: this is half of what was asked for, and the reason
the type exists at all. A working 3D level nobody wants to open has failed.

**Independent test**: open one level at phone width and at desk width; every
object is legible in silhouette at both, and no state changes without a
transition.

**Acceptance scenarios**:

1. **Given** any level, **when** it is displayed, **then** every object reads as
   its own colour and shape at a glance, with no grey on grey.
2. **Given** a character that moves, **when** it walks, turns, jumps or bumps
   into a wall, **then** each of those is a distinct, animated motion.
3. **Given** a viewer whose system asks for reduced motion, **when** they open a
   level, **then** the scene is still, and still readable.
4. **Given** either colour theme, **when** the theme is switched, **then** the
   scene follows it.

### Edge Cases

- A jump onto a surface two levels higher is refused; onto one level higher it
  succeeds. Walking onto one level higher succeeds; two, refused.
- Walking off a ledge falls to the surface below rather than hovering.
- `press()` with no button in front does nothing, and costs a step.
- A button pressed twice does not close its door again.
- A door that is open stays open for the rest of the run.
- `take()` on an empty square and `drop()` with nothing held are both refused,
  both named, and neither invents a value.
- Two items on one square, an item under a door, a goal under a platform: the
  editor names each as a fault rather than saving a level nobody can finish.
- A level with more than a dozen things to collect is not searched exhaustively;
  the teacher is told why, and the reference solution stands in.
- A program that prints a megabyte has its output cut, and is told so.

## Requirements *(mandatory)*

### Functional Requirements

**Running a program**

- **FR-001**: The system MUST execute the pupil's program as real Python, with
  variables, expressions, functions, `for`, `while` and `if`.
- **FR-002**: A `while` loop MUST re-read its condition against the world on
  every iteration.
- **FR-003**: Blocks and Python MUST take the same execution path, so a level
  behaves identically whichever the pupil chooses.
- **FR-004**: A syntax error MUST be reported with the line number of the
  pupil's own code.
- **FR-005**: A program that exceeds the level's step allowance MUST stop and be
  reported as having reached the allowance, not as a fault in the program.
- **FR-006**: The pupil MUST be able to play, pause, step one command at a time,
  and change the replay speed.
- **FR-007**: Anything the pupil's program prints MUST be shown to them, capped,
  and clearly apart from the level's own messages.
- **FR-008**: Running a program MUST NOT consume an attempt. Only submitting does.

**Who decides the outcome**

- **FR-009**: The server MUST determine whether a level was completed by running
  the submitted program itself.
- **FR-010**: The system MUST ignore any claim in the request about completion,
  score or steps.
- **FR-011**: A losing submission MUST still be recorded, and MUST still consume
  an attempt.
- **FR-012**: A program that tampers with the simulator running beside it MUST
  NOT be able to win. The verdict MUST come from a replay that runs no pupil
  code.

**The world**

- **FR-013**: The character MUST occupy a square on a grid with heights, facing
  one of four directions.
- **FR-014**: Walking MUST succeed onto a surface at most one level higher, and
  MUST fall to any surface lower.
- **FR-015**: Jumping MUST succeed onto a surface one level higher than walking
  allows — two rather than one. It MUST NOT pass through a wall: a jump crosses
  one square, so there is nothing to clear.
- **FR-016**: A wall, a closed door and the edge of the grid MUST each refuse
  movement, consume a step, and be distinguishable to the pupil.
- **FR-017**: `press()` MUST open the door linked to the button in front, and
  MUST leave every other door alone.
- **FR-018**: `take()` and `drop()` MUST change what is on the square, so a level
  asking for everything to be collected cannot be satisfied by holding one item
  and putting it down again.
- **FR-019**: The commands a level offers MUST come from one list, which drives
  the palette, the autocompletion and the starter comment.
- **FR-020**: Calling a command the level does not offer MUST stop the run and
  name the command and the line.

**Winning**

- **FR-021**: A win condition MUST be built from a fixed vocabulary — reaching
  the goal, collecting everything, pressing every button, opening every door,
  standing on a named square, reaching a height, finishing within a number of
  steps — combined with *and*, *or* and *not*.
- **FR-022**: Storing runnable code as a win condition MUST NOT be possible.
- **FR-023**: The win condition MUST be shown to the pupil in words. It is their
  instructions, not a secret.

**The teacher's editor**

- **FR-024**: The editor MUST let a teacher place and remove every kind of object
  at any height, and placing at one height MUST NOT disturb another.
- **FR-025**: The editor MUST link a button to a door by choosing from the doors
  that exist, never by typing an identifier.
- **FR-026**: The editor MUST report the shortest solution in steps, or that
  there is none, together with what blocks it.
- **FR-027**: The editor MUST list every fault in a level at once, in words,
  rather than one at a time.
- **FR-028**: The editor MUST let the teacher play the level without saving it.
- **FR-029**: The editor MUST refuse a reference solution that does not win the
  level, and MUST NOT store it.
- **FR-030**: A stored reference solution MUST NOT reach a pupil through any
  read of the exercise.
- **FR-031**: Star thresholds MUST be editable, and MUST be filled in by Check.
- **FR-032**: The editor MUST show the level as the pupil will see it, updating
  as the teacher edits.
- **FR-033**: An edit MUST be undoable, at least twenty steps back.

**The look**

- **FR-034**: Every object MUST be distinguishable by shape and colour alone,
  without reading a label.
- **FR-035**: Colours MUST come from the design tokens, so both themes are
  correct.
- **FR-036**: Moving, turning, jumping, collecting, pressing and bumping MUST
  each be animated distinctly.
- **FR-037**: When the viewer's system asks for reduced motion, the scene MUST
  become still without becoming unreadable.
- **FR-038**: The scene MUST stay interactive on a ten-by-ten level with every
  kind of object present.

**Language**

- **FR-039**: Every string a teacher or pupil sees MUST be translated in all six
  locales.

### Key Entities

- **Level**: grid width and depth, the character's start (square, height,
  facing), the objects on it, the commands offered, the win condition, the step
  allowance, star thresholds, an optional reference solution, hints.
- **Object**: a square, a height and a kind — floor, wall, platform, item,
  button, door, goal — plus, for a button, the door it opens.
- **Run**: what the program did — the frames to replay, whether it won, how many
  steps it took, how large the program was, why it stopped, what it printed, and
  any error with its line.
- **Attempt**: a pupil's submission, graded by the server from its own run.

## Success Criteria *(mandatory)*

- **SC-001**: A pupil can finish a level with a loop whose condition depends on
  the world, in both blocks and Python, and both produce the same path.
- **SC-002**: A submission claiming a win it did not earn is never recorded as
  passed. Verified alongside a genuine win, in the same test.
- **SC-003**: A teacher can build, check and save a working level without ever
  seeing the underlying configuration.
- **SC-004**: A level that cannot be finished is refused at the editor, with
  every reason listed, before any pupil opens it.
- **SC-005**: Pressing Run returns a result within three seconds for nineteen
  runs out of twenty.
- **SC-006**: A syntax error names the same line the editor highlights.
- **SC-007**: Running never changes the number of attempts remaining.
- **SC-008**: The same program scores the same on two consecutive runs.
- **SC-009**: A reference solution is unreachable through every read of the
  exercise available to a pupil.
- **SC-010**: A ten-by-ten level holds a smooth frame rate on a mid-range laptop
  with every kind of object present.
- **SC-011**: Every object in the scene is identifiable in a still screenshot by
  someone who has not been told what they are looking at.
- **SC-012**: No English text appears in any of the other five locales.

## Assumptions

- No production level exists, so the configuration shape may change without a
  migration. Counted, not assumed: zero rows on 2026-08-19.
- Levels are at most ten by ten, as in 2D, and heights are small — a few steps,
  not a tower.
- The sandbox that runs pupil code is unchanged by this work. It already runs
  programs for code challenges and for 2D.
- The pupil's browser can display 3D content; the platform already ships 3D
  elsewhere. Where it cannot, the exercise is expected to say so rather than
  show a blank rectangle.
- Sound is out of scope.
