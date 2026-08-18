# Quickstart — validating World 3D

How to prove this feature works, in the order that makes a failure easy to
place. Sections 1–4 are checkable without opening a browser; 5–7 are the
opposite, and say so.

## Prerequisites

The isolated stack, so the shared ports and the other session's database are
left alone:

```bash
docker compose -p world3d -f docker-compose.yml -f scratch/world3d-ports.yml up -d
```

Backend on 8010, sandbox and database internal. The frontend runs on the host at
3010 under node 22.

## 1. The rules, with no server at all

The simulator is one module with no application imports, so it tests directly.

```bash
docker exec world3d-backend-1 sh -c "cd /app && python -m pytest tests/test_world_sim.py tests/test_world_height.py tests/test_world_doors.py -q"
```

What must be covered, and must fail against today's code:

- `while not at_goal(): move_forward()` reaches the goal and **stops** — the
  direct regression for the loop that unrolls a hundred copies
- walking onto a surface one level up succeeds; two levels up is refused
- `jump()` onto two levels up succeeds; three is refused
- walking off a ledge **falls**, and the frame says `motion: "fall"`
- `press()` opens the door its button names, and no other door
- a door, once open, is still open ten commands later
- `take()` then `drop()` leaves the number of items on the grid unchanged
- a refusal still costs a step and still produces a frame

## 2. The search, and the point where it gives up

```bash
docker exec world3d-backend-1 sh -c "cd /app && python -m pytest tests/test_world_solver.py tests/test_world_validate.py -q"
```

- a corridor answers `shortest`, with a number countable by hand
- a walled-off goal answers `unsolvable`
- a level needing a button pressed before a door answers with the longer path,
  not the shorter one through a closed door
- thirteen targets answers `reference_only` with `reason: too_many_targets` —
  and never `shortest`
- a button naming a door that does not exist is `button_without_door`, reported
  together with every other fault rather than one at a time

## 3. The server is the judge

```bash
docker exec world3d-backend-1 sh -c "cd /app && python -m pytest tests/test_world_submit.py -q"
```

The test that matters, with its control in the same test — an assertion that
only ever rejects is green against an endpoint that rejects everything:

```bash
curl -sX POST localhost:8010/api/v1/exercises/$ID/submit -H "Content-Type: application/json" -b cookies.txt -d '{"world":{"source":"turn_left()","mode":"python"},"game_result":{"completed":true,"score":1.0}}'
```

Loses, and claims to have won. Expect `passed: false`, `score: 0`, and no trace
of the claimed figures in `answers`.

Then the same request with a winning program: expect `passed: true`, and
`answers.world` holding the server's own step count.

Also assert here: a pupil reading the exercise through **all three** read
endpoints never receives `solution_code`, and a teacher reading the same one
does.

## 4. Tampering, from inside the sandbox

The reason the server replays rather than trusting. Submit a program that
attacks the simulator running beside it:

```python
import world_sim
world_sim.WORLD.won = True
```

Expect `passed: false`. The command list is empty, the replay moves nothing, and
the level is not won. If this ever returns true, the design failed and the test
says so plainly.

## 5. In the browser, as a pupil

At `http://localhost:3010`, on a seeded 3D lesson:

1. The starter comment lists exactly the commands the teacher ticked — no more.
2. Solve it in blocks. Note the step count.
3. Switch to Python, write the same solution, run it. **Same path, same step
   count** — one execution path, or the two halves are different exercises.
4. Write `move_forwardd()`. The message names the line, and the character does
   not move.
5. Write `while True:` with `move_forward()` under it. It stops at the allowance
   and says so in a sentence, with no exception text underneath.
6. Write `print(2 + 2)` beside the moves. `4` appears in the output pane, apart
   from the level's own messages.
7. Press Run twenty times. Attempts remaining does not move.
8. Pause, step one command at a time, change the speed.
9. Walk off a ledge on purpose. The character falls, and lands.

## 6. In the browser, as a teacher

1. Paint walls by dragging; switch height and paint again — **the lower level is
   still there** when you switch back.
2. Place a button and a door. Link them from the dropdown; confirm no free-text
   id exists anywhere.
3. Press Check. It reports a step count; count the path by hand and agree.
4. Wall the goal off. Check reports unsolvable and names what blocks it.
5. Delete the door the button names. Check reports `button_without_door` in
   words, together with anything else wrong.
6. Playtest without saving.
7. Paste a reference solution that loses. It is refused, and nothing is stored.
8. Paste one that wins. It is accepted, and a pupil reading the exercise never
   receives it.
9. Undo twenty times. Everything comes back.
10. Switch the locale to each of the other five. No English is left.

## 7. The look

Not automatable, and not optional:

1. Every object is identifiable in a still screenshot by someone who has not
   been told what they are looking at (SC-011).
2. Walk, turn, jump, fall, take, press and bump each animate distinctly.
3. Toggle the theme. The scene follows.
4. Narrow the window to phone width. The silhouettes still read.
5. Turn on reduced motion in the operating system. The scene is still, and still
   readable.
6. A ten-by-ten level with every object type holds a smooth frame rate.

## 8. Gates

```bash
cd frontend && npx tsc --noEmit && npx eslint . && npx vitest run
```

```bash
cd frontend && npx playwright test e2e/journeys/world-3d.spec.ts --workers=1
```

Then CI green, merge, watch the deploy, and check the thing you shipped in
production — for each stage, not once at the end.
