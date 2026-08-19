# Quickstart — validating the climb

Phase 1 of [plan.md](plan.md). Each section proves one part and says what a pass
looks like. Sections 1 to 3 and 6 are automated; 4 and 5 need a person, and this
document says so rather than pretending otherwise.

## Prerequisites

- Backend tests run against real PostgreSQL, as `docs/TESTING.md` describes.
- The browser sections need a running stack. Any will do; the numbers below are
  the isolated one used while this was written — backend on 8010, front on 3010.
- Section 5 needs someone who has not read this document.

## 1. The rules, with no server at all

The height contract, checked against the simulator directly.

```bash
cd backend && python -m pytest tests/test_world_height.py -q
```

**Passes when** every rule in [contracts/height.md](contracts/height.md) has a
case:

- a square with no platform has surface 0; with a platform at floor 0, surface 1;
  with platforms at floors 0 and 1, surface 2 (**H2**);
- a platform at floor 3 with nothing below it gives surface 4 (**H2**, the
  floating case);
- walking climbs one floor and refuses two; jumping climbs two and refuses three
  (**H3**);
- a step too high reports `too_high`, and a wall, a door and the edge each report
  their own (**H4**);
- a character on a platform beside a wall of the same floor cannot enter the wall
  (**H5**);
- a refused movement leaves square, height and facing untouched (**H4**).

**Before trusting any of it**: run this file against the *old* rule first. The
climb cases must fail. A test written after the behaviour it describes proves
nothing, and that is the whole of Principle II.

## 2. The search and the validator follow the rules

```bash
cd backend && python -m pytest tests/test_world_solver.py tests/test_world_validate.py -q
```

**Passes when**:

- a level whose only route is a one-floor step is reported solvable, and the step
  count is one a person can count by hand;
- the same level with the step raised to two floors is solvable only when jumping
  is offered;
- a platform on the goal's square is refused with the buried-goal blocker,
  whatever floor the platform is on — this is the rule that moves with the
  meaning;
- a sound level still reports nothing. Without that control, a validator that
  refused everything would pass every case above.

## 3. The server and the scene agree

```bash
cd backend && python -m pytest tests/test_world_runner.py -q
```

```bash
cd frontend && npx vitest run
```

**Passes when** a program run through the sandbox and replayed on the client
gives the same height at every step (**H6**). This is what stops the front's copy
of the surface rule drifting from the server's.

## 4. In the browser, as a teacher

Against a running stack, in the level editor.

1. Open a 3D exercise. Pick the platform tool. **Without touching the floor
   control**, click an empty square. → A block appears on that square in the
   preview, standing on the ground. (**SC-002**, and the fault this feature came
   from.)
2. Switch to floor 1 and click the same square. → A second block sits on the
   first, and the first is still there.
3. Place a wall on floor 0 beside the platform on floor 0. → Both occupy the same
   height in the preview. (**FR-001**.)
4. Press Check. → Solvable, and the count matches a path counted by hand
   including the step up.
5. Place a platform on the goal's square and press Check. → Refused, naming the
   buried goal.
6. Read the command palette. → The movement group states how far each command
   climbs. (**FR-006**.)

## 5. In the browser, as a pupil — and by eye

The part no test stands in for. Find someone who has not read this spec.

1. Open a level with a one-floor step, saying nothing about it. Ask which command
   gets the character up. → They answer from the screen, first time. (**SC-003**.)
2. Write a program that walks into a two-floor step and run it. → The message
   names the height as the reason, and the character does not move. (**FR-007**.)
3. Run one program containing a walk, a climb and a fall. Ask them to name the
   three. → All three, without sound or text. (**SC-004**.)
4. Watch the jetpack. → Visible while the character stands still; fires on the
   climb; silent on the walk; silent on the fall. (**FR-010, FR-011**.)
5. Turn on reduced motion in the operating system and run the same program. →
   Every change of square and height is instant, the scene stays readable, and
   the replay controls still work. (**FR-013**.)

Write what was seen into the pull request. "Walked section 5" with no observation
is the same as not walking it.

## 6. The journey

```bash
cd frontend && npx playwright test e2e/journeys/world-3d.spec.ts
```

**Passes when** the existing four tests still pass and the level they build now
contains a step the pupil climbs.

**And**: break the surface rule on purpose — return the platform's own floor
rather than one above it — and watch this file go red on the climb. Restore it. A
journey nobody has seen fail is a journey nobody should trust.

## 7. Gates

Before the pull request opens:

```bash
cd backend && python -m pytest tests -q
```

```bash
cd frontend && npx tsc --noEmit && npx eslint src/ e2e/ && npx vitest run
```

- Sections 4 and 5 walked, with what was seen written down.
- `specs/012-world-3d-rework/data-model.md` corrected, so two documents do not
  state two meanings of a floor. (**Principle IV**.)
