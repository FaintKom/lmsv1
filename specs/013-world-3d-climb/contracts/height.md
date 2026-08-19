# Contract — height

Phase 1 of [plan.md](../plan.md). The rules of height, written so a test can
check each one and a person can argue with it. Two implementations answer to
this contract: the simulator on the server, which decides outcomes, and the
scene engine on the front, which draws a level before any program has run.

## H1 — a block occupies the floor it is recorded at

A cell recorded with floor `y` occupies floor `y`. This holds for a wall and a
platform alike; the two kinds differ in what may be done with them, never in how
their floor is counted.

## H2 — surface

The **surface** of a square is:

```
surface(x, z) = 1 + max(y of every platform on that square)   if any
              = 0                                              otherwise
```

A character on that square stands at its surface.

Worked, on a square holding nothing else:

| Platforms there | Surface |
|---|---|
| none | 0 |
| floor 0 | 1 |
| floors 0 and 1 | 2 |
| floor 3 alone | 4 |

The last row is deliberate. A platform with nothing beneath it is a legal level,
and the character stands on top of it; nothing requires a stack to be
contiguous.

## H3 — climbing

A movement onto a neighbouring square is allowed when the rise is within the
command's limit:

```
surface(target) - height(character) <= limit
```

| Command | `limit` |
|---|---|
| `move_forward` | 1 |
| `jump` | 2 |

There is no lower bound. A drop of any depth is allowed, and the character lands
on the target's surface unharmed.

## H4 — refusals are distinct, and exactly one applies

A movement is refused for one reason, chosen in this order:

1. `edge` — the target is off the board.
2. `door_closed` — a closed door stands on the target.
3. `wall` — a wall occupies the target's surface height or above it.
4. `too_high` — the rise exceeds the command's limit.

The order matters where two could apply: a closed door at the top of a tall step
reports the door, because opening it is the thing the pupil must do next.

A refused movement changes nothing — not the square, not the height, not the
facing.

## H5 — a wall is not a floor

A wall never contributes to a surface. Standing on a platform level with a wall's
top does not let a character walk into the wall: the wall blocks at the height it
occupies and above.

Worked — a platform at floor 0 (surface 1) beside a wall at floor 0. The
character stands at 1 and the wall occupies 0. Moving into the wall's square asks
for `surface = 0`, a drop of 1, which H3 allows; H4's `wall` test refuses it,
because a wall at floor 0 sits at or above the height being moved into.

## H6 — the two implementations agree

For any level and any program, the heights the server records in its trace and
the heights the scene computes for the same steps are equal.

This is checkable and must be checked. The front keeps its own copy of H2 so it
can draw a level with no trace to read, and a copy that drifts draws a level
different from the one being graded.

## H7 — what a movement was

Each step records one of:

| Movement | When |
|---|---|
| `walk` | the height did not change |
| `climb` | the height rose, under a walking command |
| `jump` | the command was a jump, whatever the height did |
| `fall` | the height dropped |
| `turn` | the character turned |
| `none` | nothing moved |

The scene chooses its animation from this and nothing else. The jetpack fires on
`climb` and `jump`.

## H8 — a platform is drawn where it stands

A platform occupying floor `y` is drawn from `y` to `y + 1` in floors — above the
surface it rests on, never below it. A teacher who places one on bare ground sees
a block standing on the ground.

This is the contract's only statement about drawing, and it belongs here because
it is the same fact as H1: a block occupies the floor it is recorded at, on
screen as well as in the rules.

## What this contract does not cover

- The block a teacher paints with, and the control they pick a floor on. That is
  the editor's business, and it obeys H1 like everything else.
- Falling damage, stamina, or any way for a run to end other than the step
  allowance. There is none.
- Flight. The jetpack signals that H3 allowed a climb; no command moves the
  character through the air of its own accord.
