# Data model — World 3D rework

Everything here lives in `exercises.config`, a JSON column. No table changes and
no migration: production holds zero `world_3d` rows (counted 2026-08-19).

## Level

The whole of a level — what a teacher builds, and what the server replays
against.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `grid_width` | int 2–10 | 6 | squares along x |
| `grid_depth` | int 2–10 | 6 | squares along z |
| `start` | object | `{x: 0, z: 0, y: 0, facing: "north"}` | where the character begins, and which way it looks |
| `cells` | list of Object | `[]` | sparse: a square absent from this list is bare floor at height 0 |
| `commands` | list of string | `["move_forward", "turn_left", "turn_right", "at_goal"]` | what this level offers; drives the palette, the autocompletion and the starter comment |
| `win` | Expression | `{"cond": "at_goal"}` | when the level is won |
| `max_steps` | int 10–5000 | 500 | the step allowance |
| `star_steps` | int or null | null | second star: finish within this many steps |
| `star_size` | int or null | null | third star: a program no larger than this |
| `solution_code` | string or null | null | the teacher's reference solution; never sent to a pupil |
| `hints` | list of string | `[]` | shown on request |
| `preset` | string | `"beginner"` | a label for the editor's preset buttons; `commands` is the truth |

Deleted with this feature rather than deprecated: `available_blocks` (written,
never read), `win_condition` (folded into `win`), `custom_win_js` (runnable code
shipped to the pupil), `difficulty` (became `preset`), `allow_python` (both modes
are always available), `max_blocks` (became `star_size`).

## Object

One entry in `cells`. Position is `(x, z)` on the grid; `y` is its height.

| Field | Type | Applies to | Meaning |
|---|---|---|---|
| `x`, `z` | int | all | the square |
| `y` | int 0–4 | all | height. Floor is 0 |
| `type` | enum | all | `wall`, `platform`, `item`, `button`, `door`, `goal` |
| `id` | string | `door` | how a button names the door it opens |
| `opens` | string | `button` | the `id` of the door this button opens |

Rules the editor enforces and the validator repeats:

- **Wall** blocks movement at its own height and one above, and is not walkable.
- **Platform** is walkable, and raises the surface of its square to its `y`.
- **Item** sits on the surface. One per square.
- **Button** sits on the surface, and must name a door that exists.
- **Door** blocks movement until opened. Once open, it stays open for the run.
- **Goal** sits on the surface. One per level.

A square's *surface height* is **one above** the tallest platform on it, or 0
when there is none — a block occupies the floor it is recorded at, so standing
on a platform means standing on top of it.

> Corrected by `specs/013-world-3d-climb`. This line originally said the surface
> *was* the tallest platform's floor, which put a platform a floor below its own
> number and made a wall and a platform count differently from the same control.
> `specs/013-world-3d-climb/contracts/height.md` has the rules in full.

## Expression — the win condition

The same shape as 2D's, so the editor's builder is the same idea and a teacher
who has met one has met both.

```
Expression := Leaf | {"op": "and"|"or", "of": [Expression, …]} | {"op": "not", "of": [Expression]}
Leaf       := {"cond": Name, …args}
```

| Leaf | Argument | True when |
|---|---|---|
| `at_goal` | — | the character stands on the goal |
| `all_items_taken` | — | no item is left on the grid |
| `all_buttons_pressed` | — | every button has been pressed |
| `all_doors_open` | — | every door is open |
| `at` | `x`, `z` | the character stands on that square |
| `height_at_least` | `n` | the character's height is `n` or more |
| `steps_at_most` | `n` | the run used no more than `n` steps |

Nothing here can carry code. That is the point: `custom_win_js` is gone.

## Run — what a program did

Returned by the run endpoint, and computed again server-side when a pupil
submits. Never taken from the client.

| Field | Type | Meaning |
|---|---|---|
| `frames` | list of Frame | the replay |
| `won` | bool | the level's `win` expression, evaluated at the end of the replay |
| `steps` | int | commands that reached the world, refusals included |
| `size` | int | statements in the program, counted the same way for blocks and Python |
| `stars` | int 0–3 | one for winning, one for `star_steps`, one for `star_size` |
| `stopped` | enum | `end_of_program`, `steps_exhausted`, `error` |
| `output` | string | what the pupil printed, capped |
| `output_truncated` | bool | whether the cap was reached |
| `error` | object or null | `{type, line, message}`; null when the allowance simply ran out |

## Frame — one command's worth of world

| Field | Type | Meaning |
|---|---|---|
| `i` | int | index of the command that produced it |
| `x`, `z`, `y` | int | where the character now stands |
| `facing` | enum | `north`, `east`, `south`, `west` |
| `ok` | bool | false when the world refused the command |
| `motion` | enum or null | `walk`, `climb`, `jump`, `fall`, `turn`, `none` — what the scene should animate |
| `cells` | list | what changed: `{x, z, y, item?: bool, pressed?: bool, open?: bool}` |

`motion` exists so the scene need not infer a jump from a pair of coordinates.

## Blockers — what the validator says

Codes, never sentences: the editor turns them into six languages.

| Code | Meaning |
|---|---|
| `no_goal` | the level has no goal, and its win condition needs one |
| `two_goals` | more than one goal |
| `start_on_wall` | the character begins inside a wall |
| `start_in_door` | the character begins inside a closed door |
| `start_off_grid` | the start is outside the grid |
| `item_on_wall` | an item sits where nothing can stand |
| `two_items_on_square` | two items on one square |
| `button_without_door` | a button names no door, or names one that does not exist |
| `door_without_button` | a door no button opens |
| `goal_under_platform` | the goal is buried |
| `win_needs_items_but_none` | the win condition asks for items and the level has none |
| `win_needs_buttons_but_none` | the same, for buttons |
| `no_commands` | the level offers nothing to write |
| `sensor_without_use` | the level offers a sensor but no command it could guard |
| `runner_unavailable` | Check could not reach the sandbox; nothing about the level is wrong |

## Solve — the answer to Check

| Field | Type | Meaning |
|---|---|---|
| `answer` | enum | `shortest`, `reference_only`, `unsolvable` |
| `steps` | int or null | the shortest solution, when there is one |
| `size` | int or null | the reference solution's size, when one exists |
| `reason` | enum or null | why no search was run: `too_many_targets`, `win_uses_steps` |
| `blockers` | list of Blocker | faults found while looking |

`reason` explains why the search did not happen; a fault in the level is a
blocker. Keeping those apart is a correction carried over from 2D, where one
field tried to do both jobs and the tests caught it.
