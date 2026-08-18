# Command contract — what a child types

**Feature**: `specs/005-robot-2d-rework` · **Date**: 2026-08-18

This is the surface children program against. It is a contract in the strictest
sense: rename one of these and every level, every hint and every worksheet a
teacher wrote stops matching.

Two rules shaped it (FR-011):

- **No object prefix.** `move_up()`, not `robot.move_up()`. Six characters off
  every line a child types, on lines they type twenty times.
- **Nothing over fourteen characters.** The longest here is `move_forward`, at
  twelve.

A level offers a subset (FR-013). What it does not offer does not exist for that
pupil — not in the palette, not in autocompletion, not in the starter header
(FR-014) — and calling it anyway is refused by name and line (FR-015).

---

## Moving by the grid

Four commands, absolute. The robot turns to face the direction and takes one
cell. These are the first lesson: a child who knows up from left can use them.

| Command | Chars | Effect | Refuses when |
|---|---|---|---|
| `move_up()` | 7 | one cell toward the top | a wall or the grid edge is there |
| `move_down()` | 9 | one cell toward the bottom | same |
| `move_left()` | 9 | one cell left | same |
| `move_right()` | 10 | one cell right | same |

## Moving by facing

Three commands, relative. This is the lesson where the robot has a state the
child must hold in their head, and where the sensors start to mean something.

| Command | Chars | Effect | Refuses when |
|---|---|---|---|
| `move_forward()` | 12 | one cell the way it faces | a wall or the edge is there |
| `turn_left()` | 9 | a quarter turn left, no movement | never |
| `turn_right()` | 10 | a quarter turn right, no movement | never |

A turn costs a step (FR-027). Deliberately: it makes `turn_left()` three times
worse than `turn_right()` once, which is the first optimisation a child finds on
their own.

## Items

| Command | Chars | Effect | Refuses when |
|---|---|---|---|
| `take()` | 5 | pick up the item under the robot | there is none |
| `drop()` | 5 | put one item down where the robot stands | carrying nothing, or the floor is occupied |

An item is collected once it is off the grid, and `drop()` puts it back — both
the item and the count (FR-024). A child cannot satisfy "collect them all" by
carrying one item in circles.

## Paint

| Command | Chars | Effect | Refuses when |
|---|---|---|---|
| `paint()` | 6 | paint the floor under the robot | standing on a wall, which cannot happen |

Paint is one-way (FR-033). Painting a painted cell is allowed, changes nothing,
and still costs a step. There is no `unpaint()`, and its absence is the reason
"paint every marked cell" cannot be gamed.

## Values

| Command | Chars | Effect | Refuses when |
|---|---|---|---|
| `read()` | 4 | return the number on this floor, as an `int` | the floor carries no number |
| `write(n)` | 5 | put `n` on this floor | the floor was not given a number to begin with |

`read()` on a bare floor is a refusal naming the line, not a `0` (FR-034). A zero
would be a number the child then reasons from, and the mistake would surface
three lines later as a wrong answer instead of here as a wrong call.

## Asking

Each returns `True` or `False`, costs no step, and is meant for `if` and `while`.

| Command | Chars | True when |
|---|---|---|
| `wall_ahead()` | 10 | a wall or the edge is directly in front |
| `item_here()` | 9 | an item lies under the robot |
| `at_goal()` | 7 | the robot stands on the goal |
| `painted()` | 7 | the floor under the robot is painted |
| `value_here()` | 10 | this floor carries a number |

Sensors are relative to facing, so a level offering `wall_ahead()` also offers
the facing commands (spec Assumptions, checked by FR-020).

---

## The rest of Python

Everything. `for`, `while`, `if`/`elif`/`else`, variables, arithmetic,
comparisons, `def`, `print`, `range`, `len`, `abs`, `min`, `max`, lists.

That is the point of the feature. A child who writes

```python
def go(n):
    for i in range(n):
        move_forward()

go(3)
turn_right()
go(2)
```

gets a robot that walks three, turns, walks two. Today they get a robot that does
nothing, and no explanation.

`import` works and is useless: the sandbox has no network, and nothing a child
imports can reach the level. Programs that try are not blocked — they simply find
nothing.

---

## Blocks generate exactly this

Block mode produces the same Python and submits it (research Finding F). One
execution path, so FR-003 — blocks and Python judged alike — holds by
construction.

| Block | Python it writes |
|---|---|
| move up | `move_up()` |
| move forward | `move_forward()` |
| turn left | `turn_left()` |
| take | `take()` |
| paint | `paint()` |
| repeat _n_ times | `for i in range(n):` |
| repeat until at goal | `while not at_goal():` |
| if _condition_ | `if <condition>:` |
| wall ahead? | `wall_ahead()` |

A child who has dragged blocks all term can press the Python tab and read what
they have been writing all along. That is the ramp this exercise type was built
for and has never delivered.

---

## Refusals a pupil can see

Every refusal is a key, translated in the player (FR-023) — never an English
string out of the engine.

| Key | The pupil reads, in their language |
|---|---|
| `wall` | a wall is in the way |
| `edge` | that is the edge of the grid |
| `no_item` | there is nothing here to pick up |
| `carrying_nothing` | the robot is not carrying anything |
| `floor_taken` | something is already lying here |
| `no_value` | this square has no number on it |
| `not_offered` | that command is not available in this level |
| `steps_exhausted` | the program used all its steps |
