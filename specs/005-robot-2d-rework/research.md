# Phase 0 research — Robot 2D rework

**Feature**: `specs/005-robot-2d-rework` · **Date**: 2026-08-18

Every finding below was read out of this repository or derived from it. Where a
number is a guess, it says so.

---

## Finding A — The sandbox runs one Python file, so a traceback counts lines from the top of that file

`sandbox/runner/languages.py` runs Python as `python3 {file}`. The harness we
generate is therefore a single file: simulator, level, and the pupil's program.
A naive concatenation turns the pupil's line 3 into `SyntaxError: line 214`.

**Decision**: the pupil's program is never concatenated. It is embedded as a
string and compiled under its own name:

```python
code = compile(STUDENT_SRC, "program.py", "exec")
exec(code, ns)
```

`compile` numbers lines from the start of the string it is given, and
`SyntaxError` carries `.lineno` relative to it. The harness catches both
`SyntaxError` and any runtime exception, walks the traceback to the last frame
whose filename is `program.py`, and reports that line.

**Alternatives rejected**:

- *Concatenate and subtract a prelude offset* — works until the prelude changes
  length, then reports the wrong line and nobody notices for months.
- *Parse the pupil's code with `ast` first* — a second implementation of Python's
  own grammar, which is the mistake this feature exists to undo.

**Embedding safely**: `json.dumps(source)` emits `\"`, `\\`, `\n`, `\r`, `\t`,
`\b`, `\f` and `\uXXXX` — every one a valid Python escape. With
`ensure_ascii=True` the result is a valid Python string literal for any input,
including a program that is nothing but quotes and backslashes. The level is
embedded the same way and read back with `json.loads`.

---

## Finding B — The sandbox's verdict cannot be trusted, and does not need to be

This is the finding that changed the design.

The pupil's program runs in the same interpreter as the simulator. Nothing stops
it reaching into that simulator — rebinding a function, setting the win flag,
editing the grid — and then letting the harness print a trace that says it won.
The sandbox is hardened against escaping the container. It is not, and cannot be,
hardened against a program editing the process it runs in.

**Decision**: the sandbox decides nothing. It answers one question — *which
commands did this program attempt, in what order?* — and returns that list, the
pupil's printed output, and any error. The server replays the list through its
own copy of the simulator, in-process, with no pupil code present, and that
replay produces the frames, the step count and the verdict.

```
program ──► sandbox ──► ["move_up", "move_up", "turn_left", …]
                        + printed output
                        + error {line, type, message}
                              │
                              ▼
                   server replays the list
                   through robot_sim (trusted)
                              │
                              ▼
                   frames · won · steps · size
```

The simulator still runs *inside* the sandbox, because `wall_ahead()` has to
answer truthfully or the pupil's `if` branches the wrong way. Its verdict is
discarded. A program that lies to itself about the walls produces a command list
the honest replay then fails.

**Why this is also the smaller design**: it deletes the question "how do we
verify the trace the sandbox sent us". A list of command names has nothing to
verify — it is replayed, and the replay is the truth.

**Alternatives rejected**:

- *Trust the sandbox's `won` flag* — a pupil who can write Python can write
  `import robot_sim; robot_sim.WORLD.won = True`. Same class of hole as the
  browser reporting its own verdict, moved one machine over.
- *Sign or checksum the trace inside the sandbox* — the key would sit in a file
  the pupil's program can read.
- *Run the pupil's code in a subprocess inside the sandbox, simulator in the
  parent, talking over a pipe* — this works, and is what a full remote API would
  look like. Rejected as more moving parts than replay, for the same guarantee.

---

## Finding C — Getting the trace out through stdout, past the pupil's own printing

FR-007 requires the pupil's `print` output to be shown. The sandbox returns one
`stdout` string, so both share a channel.

**Decision**: the harness prints a sentinel line, then one line of JSON, as the
last thing it does. The backend splits on the **last** occurrence of the
sentinel. A pupil who prints the sentinel themselves moves nothing: ours is still
last.

Sentinel: `\x1e--ROBOT-TRACE--` (U+001E, the ASCII record separator, which no
child types by accident).

**Size**: a command list capped at `max_steps` (default 500), each entry a short
name — roughly 6 KB of JSON at the cap, plus the error object. Printed output is
capped separately at 8 KB and truncated with a marker, so `while True: print`
cannot return a megabyte.

---

## Finding D — What the shortest-solution search can and cannot answer

The search is a breadth-first walk over `(x, y, facing, collected_mask,
painted_mask)`, expanding only the commands the level offers.

State-space arithmetic, for a 10×10 grid:

| Targets (items + marks) | States | Verdict |
|---|---|---|
| 0 | 400 | instant |
| 6 | 25 600 | instant |
| 10 | 409 600 | well under a second |
| 12 | 1 638 400 | ~1–3 s in CPython — the cap |
| 16 | 26 214 400 | no |

**Decision**: cap at **12 targets combined**. Above it the editor reports that it
did not compute a shortest solution and falls back to verifying the teacher's
reference solution — which is what FR-035 and SC-011 require it to say out loud.

**Levels the search cannot answer at all**: any win condition mentioning values,
because `write(n)` makes the state space unbounded — a cell can hold any integer.
These fall back to the reference solution regardless of target count. That is the
cost the owner accepted when choosing the full vocabulary.

**Where it runs**: in the backend process, importing `robot_sim` directly. It is
our code over our data with no pupil input, so it has no business in the sandbox,
and putting it there would add a network round trip to a button a teacher presses
repeatedly.

---

## Finding E — One simulator, two callers, no second copy of the rules

`robot_sim.py` must be importable by the backend (for the replay and the search)
and must also run, as source text, inside the sandbox. Both hold if it imports
nothing but the standard library.

**Decision**: `backend/app/exercises/robot_sim.py` imports only `json`. The
runner reads its own source with `Path(__file__).read_text()` and prepends it to
the generated program. One file, one copy of the rules, two places they run.

This is what removes the duplication the feature exists to fix: today the rules
live in `frontend/src/components/game/robot-2d/grid-engine.ts` **and** are
re-derived by two hand-written parsers in `step-executor.ts`. Afterwards the
frontend holds no rules at all — it renders frames it is given.

---

## Finding F — Blocks and Python already share a path; nobody used it

`frontend/src/components/game/blockly/custom-blocks.ts` registers a
`pythonGenerator` for every block alongside the JavaScript one, and
`blockly-workspace.tsx` computes both on every change. The Python was generated,
handed to the caller, and ignored — `robot-2d-exercise.tsx` parses the
*JavaScript* in block mode.

**Decision**: block mode submits the generated Python. `parseCommands` (the
JavaScript parser) and `parsePythonCommands` (the regular-expression one) are
both deleted. FR-003 — blocks and Python judged the same — then holds by
construction, rather than by testing two code paths against each other.

The generators emit `robot.move_up()`; they change to `move_up()`. Blockly's
default indent is two spaces, which is valid Python.

---

## Finding G — `solution_code` is already stripped

`backend/app/exercises/router.py:531` filters `solution_code` out of `config` for
every non-staff reader, and `_may_see_answers` already counts a parent as one.

**Decision**: name the reference-solution field `solution_code`. FR-010 is then
satisfied by machinery that exists and is already under test, and its diff is
zero lines.

The win condition is **not** stripped. It is the pupil's instructions (FR-031)
and carries no verdict — only the description of one.

---

## Finding H — Rate limiting has a house pattern

`backend/app/exercises/router.py:256` uses `@limiter.limit("30/minute")` from
`app.common.rate_limit`. `backend/app/sandbox/router.py` uses the deferred form,
`@limiter.limit(lambda: settings.sandbox_demo_rate_limit)`, so the limit can be
tightened by environment without shipping code.

**Decision**: the run endpoint uses the deferred form with a new setting,
`robot_run_rate_limit`, defaulting to `60/minute`. A child pressing Run between
edits does not approach it; a script does. SC-010 asks that twenty runs in a row
cost nothing, which this satisfies with room over.

---

## Finding I — Execution limits for a run

A robot program walks a grid of at most a hundred cells under a step cap. It is
far cheaper than a code challenge.

**Decision**: 5 seconds, 128 MB — the figures `sandbox/router.py` already uses
for the public demo, and for the same reason: anything needing more is not a
child solving a maze.

The step cap is the real guard. `while True: move_up()` hits `max_steps` inside
the simulator and raises a named error long before the wall-clock limit, which is
what lets FR-004 say "you ran out of steps" instead of reporting a timeout.

---

## Finding J — Latency, and why the round trip should not show

SC-009 asks that the robot start moving within three seconds of Run, in nineteen
runs of twenty.

The round trip is: request → sandbox container on the same host → `python3` on a
6 KB file → response → replay. The dominant term is process start, which the
existing demo endpoint already pays and which the landing page runs
interactively today.

**Measured.** Twenty runs of a one-command program against the real sandbox
container, on the development machine:

| | seconds |
|---|---|
| fastest | 0.11 |
| median | 0.22 |
| 19th of 20 | 0.37 |
| slowest | 0.53 |

SC-009 asks for three seconds in nineteen runs of twenty. The slowest run was
about a fifth of that, so the round trip does not need hiding and the
optimistic-replay fallback was not built — there is no measured problem for it
to fix.

Two caveats on the figure. It is a development machine, not the CX22, which has
two vCPUs and runs a dozen other containers; and it is one program at a time,
not a class of twenty pressing Run together. Neither is a reason to build
against a guess now — the number to watch is the same one, measured again in
production after the deploy.

---

## Open questions carried into implementation

1. **The measured round trip** (Finding J). Measure before optimising.
2. **`write(n)` and the step cap.** A program writing values in a loop can run
   long without moving. The step cap counts commands, so it bounds this too; what
   is undecided is whether a level holding values wants a default above 500.
3. **Undo depth in the editor** (FR-022). One level of undo satisfies the
   requirement. Start with a stack bounded at 50 — the same amount of code, and
   the teacher will use it.
