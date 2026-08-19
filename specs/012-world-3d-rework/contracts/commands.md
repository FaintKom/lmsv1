# Command contract — what a child types

Bare names, no prefix, no object to remember. The same convention as 2D
(`specs/005-robot-2d-rework/contracts/commands.md`), because children move
between the two and a second calling convention is a tax they pay.

A level offers a subset. `commands` in the level is the only list: it drives the
block palette, the Python autocompletion and the comment at the top of the
starter program (FR-019). Calling something the level does not offer stops the
run and names the command and the line (FR-020).

## Actions — these cost a step

| Command | What it does | Refused when |
|---|---|---|
| `move_forward()` | walks one square the way the character faces | a wall, a closed door or the grid's edge is in the way, or the surface ahead is more than one level up |
| `turn_left()` | turns a quarter, anticlockwise | never |
| `turn_right()` | turns a quarter, clockwise | never |
| `jump()` | leaps one square forward, climbing up to **two** levels instead of one | the surface ahead is more than two levels up, a wall stands at or above the surface ahead, a closed door is in the way, or it is the grid's edge |
| `take()` | picks up the item on this square | there is nothing here |
| `drop()` | puts down what is held | nothing is held, or this square already holds an item |
| `press()` | presses the button in front, opening the door it names | never — a press with nothing in front is allowed, does nothing, and still costs the step |

A refusal still costs a step, and still produces a frame with `ok: false`. That
is what lets the scene shake the character rather than freeze, and what stops a
program looping for ever against a wall without the allowance noticing.

Walking down has no limit: the character falls to whatever surface is below,
however far (research Finding E).

## Sensors — these cost nothing and answer true or false

| Command | True when |
|---|---|
| `wall_ahead()` | a wall or a closed door blocks the next square, or it is off the grid |
| `gap_ahead()` | the surface of the next square is lower than the one underfoot |
| `step_ahead()` | the surface of the next square is exactly one level higher |
| `item_here()` | an item is on this square |
| `at_goal()` | the character stands on the goal |
| `button_ahead()` | an unpressed button is on the next square |
| `door_ahead()` | a closed door is on the next square |

Sensors are facing-relative, like the actions. A level offering a sensor without
offering anything it could guard is a fault the validator names
(`sensor_without_use`).

## Control flow

Plain Python: `for`, `while`, `if`, functions, variables, arithmetic. Nothing to
enable and nothing to offer — a level withholds `jump()`, never `if`.

`print()` works, and what it prints is shown to the pupil, apart from the level's
own messages (FR-007).

## Refusals a pupil can see

Each refusal is a key, translated in six locales, never a sentence built in
Python:

| Key | When |
|---|---|
| `wall` | a wall blocked the move |
| `door_closed` | a closed door blocked the move |
| `edge` | the move left the grid |
| `too_high` | the surface ahead was too far up to walk or jump onto |
| `nothing_here` | `take()` on an empty square |
| `hands_empty` | `drop()` holding nothing |
| `square_taken` | `drop()` where an item already lies |
| `not_offered` | the level does not offer this command |

## The starter program

Generated from `commands`, so it can never advertise something the level
withholds:

```python
# Commands you can use in this level:
# move_forward()  turn_left()  turn_right()  jump()  at_goal()

```

Blocks generate the same calls. One execution path and one set of names,
whichever half of the exercise a child is working in.
