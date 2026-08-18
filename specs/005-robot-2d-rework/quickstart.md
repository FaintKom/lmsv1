# Quickstart — validating Robot 2D

**Feature**: `specs/005-robot-2d-rework` · **Date**: 2026-08-18

How to prove the feature works, end to end. Shapes live in
[`data-model.md`](data-model.md) and [`contracts/api.md`](contracts/api.md); this
file is what to run and what you should see.

## Prerequisites

This work happens in the worktree `.claude/worktrees/robot-2d-rework`. Ports
5432, 8000 and 3000 and the pytest database are **shared across worktrees** —
bring the stack up in one of them only.

```bash
npm ci --prefix frontend
```

`.env` and `.env.local` are not in git; copy them from the main checkout.

```bash
docker compose up -d db redis sandbox backend frontend
```

The sandbox container is required. Without it every run returns `503`, which is
correct behaviour and proves nothing.

---

## 1. The simulator, with no server at all

The rules are one Python module with no application imports, so they test
directly and fast.

```bash
docker compose exec backend pytest tests/test_robot_sim.py -v
```

What must be covered, and must fail against today's code:

- a `while not at_goal()` loop reaching the goal and **stopping** — the direct
  regression for the `_while` defect
- walls and edges refusing a move, consuming a step, reporting `wall` / `edge`
- `take` then `drop` leaving the item count where it started (FR-024)
- `paint` twice on one cell counting once toward the goal but twice in steps
- `read` on a bare floor refusing rather than returning `0` (FR-034)
- the step cap ending a runaway program with `steps_exhausted`
- every win-condition leaf, and `and` / `or` / `not` over them

## 2. The shortest-solution search

```bash
docker compose exec backend pytest tests/test_robot_solver.py -v
```

- a corridor level answers `shortest` with a step count you can count by hand
- walling the goal off answers `unsolvable`
- a level offering only absolute moves, whose goal needs a turn, answers for the
  command set it was given — not for commands the level withholds
- thirteen targets answers `reference_only` with `reason: too_many_targets`
- a win condition mentioning values answers `reference_only` with
  `reason: win_uses_values` — **and never `shortest`** (SC-011)

## 3. The server is the judge

```bash
docker compose exec backend pytest tests/test_robot_submit.py -v
```

The test that matters, with its positive control in the same test — an assertion
that only rejects is green against an endpoint that rejects everything:

```bash
curl -sX POST localhost:8000/api/v1/exercises/$ID/submit -H "Content-Type: application/json" -b cookies.txt -d '{"robot":{"source":"move_up()","mode":"python"},"game_result":{"completed":true,"score":1.0}}'
```

Loses, but claims to have won. Expect `passed: false`, `score: 0`, no experience
awarded, and the ignored `game_result` nowhere in `answers`.

```bash
curl -sX POST localhost:8000/api/v1/exercises/$ID/submit -H "Content-Type: application/json" -b cookies.txt -d '{"robot":{"source":"while not at_goal():\n    move_forward()\n","mode":"python"}}'
```

The same request with a winning program. Expect `passed: true` and
`answers.robot` holding the server's own step count.

Also assert here: a pupil reading the exercise through **all three** read
endpoints sees no `solution_code`, and a teacher reading the same one does.

## 4. Tampering, from inside the sandbox

The reason the server replays rather than trusting (research Finding B). Submit a
program that attacks the simulator it runs beside:

```python
import robot_sim
robot_sim.WORLD.won = True
```

Expect `passed: false`. The command list is empty, the replay moves nothing, and
the level is not won. If this ever returns `true`, the whole design failed and
the test says so plainly.

## 5. In the browser, as a teacher

`http://localhost:3000` → sign in as `teacher@grasslms.online` → an exercise of
type Robot 2D.

1. Set the grid to 6×6 by typing the numbers. Paint walls by dragging. Undo.
2. Tick `move_forward`, `turn_left`, `turn_right`, `wall_ahead`, `at_goal`.
3. Press a difficulty preset, then change one tick — the preset must set the
   boxes and leave them editable (FR-021).
4. Press **Check**. It reports a step count. Count the path by hand; they match.
5. Wall the goal off. Press Check. It reports unsolvable and says what blocks it.
6. Open it again, add a marked cell, set the win condition to
   `at_goal AND all_marks_painted` without offering `paint`. The editor refuses
   and names that (FR-020).
7. Paste a reference solution that loses. The editor refuses it and shows where
   the run ended (FR-019).
8. Playtest without saving (FR-018).

Then a value level: give a cell a number, set the win condition to
`all_values_read`, press Check. It must say it verified the reference solution
and did **not** compute a shortest one (SC-011). A step count labelled "shortest"
here is the bug this whole spec guards against.

## 6. In the browser, as a pupil

Sign in as `student@grasslms.online`, open the level.

1. The starter header lists exactly the commands the teacher ticked — no more.
2. Autocompletion offers exactly those.
3. Solve it in blocks. Note the step count.
4. Switch to Python, write the same solution, run it. **Same path, same step
   count** (FR-003, SC-007).
5. Type `move_forwardd()`. The error names line and cause, and the robot does not
   move (FR-005).
6. Type `while True:` with `move_forward()` under it. It stops at the allowance
   and says so — not a timeout, not a hung animation (FR-004).
7. Type `print(2 + 2)` beside the moves. `4` appears in the output pane, apart
   from the robot (FR-007).
8. Press Run twenty times. Attempts remaining does not move (FR-026, SC-010).
9. Pause, step one command at a time, change the speed (FR-006).

## 7. Latency

The number to beat is SC-009: moving within three seconds, nineteen runs of
twenty. Nothing has measured it yet (research Finding J).

```bash
for i in $(seq 1 20); do curl -so /dev/null -w "%{time_total}\n" -X POST localhost:8000/api/v1/exercises/$ID/robot/run -H "Content-Type: application/json" -b cookies.txt -d '{"source":"move_up()","mode":"python"}'; done | sort -n | tail -1
```

Record the figure in `research.md` under Finding J, whether it passes or not.

## 8. Gates

```bash
docker compose exec backend ruff check . && docker compose exec backend pytest
```

```bash
npm --prefix frontend run lint && npx --prefix frontend tsc --noEmit && npm --prefix frontend test
```

Vitest includes the six-locale parity gate — every key this feature adds must
exist in all six, or the editor and player go on the i18n allowlist instead, and
they must not.

```bash
npm --prefix frontend run test:e2e -- journeys/robot-2d
```

Then a pull request, CI green, and only then a merge — merging deploys.
