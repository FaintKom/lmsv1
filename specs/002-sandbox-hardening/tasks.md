---
description: "Task list for the sandbox that has to hold under a real class"
---

# Tasks: The sandbox holds under a real class

**Input**: Design documents from `/specs/002-sandbox-hardening/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/runner-api.md, quickstart.md

**Tests**: Required, not optional. Every limit here is invisible when it works,
which is the exact shape of a test that passes for the wrong reason. Constitution
principle II — each limit gets a task that demonstrates it failing against
today's behaviour, and that demonstration is its own task, because a limit whose
test never went red has been described rather than tested.

**Organization**: grouped by user story, in the plan's order — by what is broken
now rather than by the audit's numbering.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelisable — different files, no dependency on an unfinished task
- **[Story]**: US1…US5 from spec.md

## Path Conventions

`sandbox/runner/` for the execution service, `sandbox/tests/` for its own tests
(new — it has none today), `backend/tests/` for the caller's view, and the four
compose files at the repository root.

---

## Phase 1: Setup

**Purpose**: know the ground before standing on it. Two of these are measurements
the plan depends on and deliberately did not guess.

- [X] T001 Bring up the QA sandbox with `docker compose -f docker-compose.qa.yml up -d --build sandbox` and confirm a correct Python program returns its output through the existing path
- [X] T002 [P] Record the resting and peak thread count of each of the five languages — `docker exec lms-qa-sandbox-1 sh -c 'ps -eLf | wc -l'` while each runtime is up — into `specs/002-sandbox-hardening/research.md` under Finding G, because `pids_limit` in T032 must be chosen against the JVM's real thread count and not a generous-looking number
- [X] T003 [P] Confirm the backend's current HTTP client timeout to the sandbox in `backend/app/exercises/service.py` and record it in `specs/002-sandbox-hardening/contracts/runner-api.md` — the timeout arithmetic in T021 has to be checked against a real number

---

## Phase 2: Foundational

**Purpose**: two things every story below needs, and neither exists.

The runner has no tests of its own — `sandbox/` contains only `Dockerfile`,
`policies/` and `runner/`. And the QA sandbox is not reachable from the host: the
compose file gives the backend `SANDBOX_URL: http://sandbox:8001` and maps no
port. Every limit in this feature is a runner property, so without both of these
each story would invent its own way to observe one.

- [X] T004 Add a host port mapping for the sandbox service in `docker-compose.qa.yml` only — QA is the test environment, and production must keep the sandbox unreachable except over `sandbox-net`
- [X] T005 Create `sandbox/tests/conftest.py` with a fixture that posts to the running QA sandbox and returns the parsed result, plus a helper that asserts no descendant of a submission survives (used by T022)
- [X] T006 Add `limit_hit` and `queued_ms` to the result returned by `sandbox/runner/executor.py` and `sandbox/runner/main.py`, per data-model.md — `limit_hit` null and `queued_ms` zero on every path that exists today, so nothing changes behaviour yet and every story below has one field to assert on
- [X] T007 [P] Add a test in `backend/tests/test_sandbox_api.py` asserting an unrecognised `limit_hit` value is rendered as a generic refusal showing the program's own stderr, never as success — contracts/runner-api.md requires this so that adding a limit later costs nothing

**Checkpoint**: the runner can be driven directly and can say why it stopped
something. No limit has changed yet.

---

## Phase 3: User Story 1 — A pupil's Java or Go exercise runs at all (P1)

**Goal**: the five supported languages all run at the platform's default
allowance, and a program that really exceeds its memory is told so.

**Independent Test**: run a correct program in each of the five languages at the
default 256MB allowance and get its output; run a 400MB allocation at the same
allowance and get `limit_hit: memory`.

**Why first**: the only story about something already broken. Two independent
causes — the address-space limit stops Java, and `noexec` on `/tmp` stops Go and
C++ — so both fixes are here. Fixing one and shipping would leave the story half
delivered while looking complete.

### Tests for User Story 1 — write first, prove they fail

- [X] T008 [US1] Failing test in `sandbox/tests/test_languages.py`: a correct program in each of python, javascript, java, cpp and go returns its output at `memory_limit_mb=256`. Expected to fail today on java (the VM cannot reserve its code cache) and on cpp and go (`Permission denied` — the binary sits on a `noexec` mount)
- [X] T009 [P] [US1] Failing test in `sandbox/tests/test_limits_memory.py`: a program allocating 400MB at `memory_limit_mb=256` returns `limit_hit == "memory"` — **and its control in the same test**, the same allocation at a 1024MB allowance succeeding. Without the control the test passes on a machine that is merely short of memory
- [X] T010 [P] [US1] Failing test in `sandbox/tests/test_limits_memory.py`: the message a pupil receives names the memory allowance and does not contain the runtime's own initialisation wording (FR-002)
- [X] T011 [US1] Run T008–T010 against the unchanged runner and record which failed and how in the pull request — this is the demonstration, not a formality

### Implementation for User Story 1

- [X] T012 [US1] Replace the `ulimit -v` prefix in `sandbox/runner/executor.py` with `RLIMIT_DATA` set through `preexec_fn` on the child, per research.md Finding B, and delete the shell prefix string entirely
- [X] T013 [US1] Add an execute-permitted working area to the sandbox service in all four compose files — `docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.staging.yml`, `docker-compose.qa.yml` — as a second small tmpfs without `noexec`, leaving `/tmp` itself `noexec` (research.md Finding A)
- [X] T014 [US1] Point compilation and execution of the compiled languages at that area in `sandbox/runner/executor.py`, wiping it per execution; leave interpreted languages on `/tmp`
- [X] T015 [P] [US1] Set `HOME` and `GOCACHE` to a writable path in `sandbox/Dockerfile` — Go's build cache defaulted to `/root/.cache` on a read-only filesystem, a second reason Go failed
- [X] T016 [US1] Map a memory refusal to `limit_hit: "memory"` in `sandbox/runner/executor.py`, from the child's allocation failure or an OOM kill, per data-model.md
- [X] T017 [US1] Apply the time allowance to compilation as well as execution in `sandbox/runner/executor.py` (FR-004) — a compiler can be made to consume as much as a program can
- [X] T018 [US1] Rebuild the QA sandbox, run T008–T010 green, and run the existing `backend/tests/test_sandbox_api.py` and `test_sandbox_demo.py` unchanged

**Checkpoint**: every advertised language works, and the product stops claiming
two it cannot run.

---

## Phase 4: User Story 2 — A whole class presses Run at the same moment (P2)

**Goal**: twenty-five simultaneous submissions all return correct results, and a
stopped program takes its children with it.

**Independent Test**: fire twenty-five concurrent submissions of a short program;
all return correct output and the slowest lands within ten seconds. Separately,
time out a program that started a child and confirm nothing survives.

**Why here**: one problem from two sides. It follows Phase 3 because the shell
exists only to carry the `ulimit` prefix T012 deletes — dropping the shell first
would mean writing that prefix twice.

### Tests for User Story 2 — write first, prove they fail

- [X] T019 [P] [US2] Failing test in `sandbox/tests/test_concurrency.py`: twenty-five concurrent submissions all return correct output, none errors, and the slowest completes within ten seconds (SC-002, SC-003)
- [X] T020 [P] [US2] Failing test in `sandbox/tests/test_concurrency.py`: with every slot filled by a long program, one more submission returns `limit_hit == "busy"` promptly — not a hang, and not a connection error
- [X] T021 [P] [US2] Failing test in `sandbox/tests/test_concurrency.py`: the backend's client timeout exceeds queue ceiling plus execution timeout plus margin, asserted from the real values rather than stated in a comment (contracts/runner-api.md)
- [X] T022 [P] [US2] Failing test in `sandbox/tests/test_reaping.py`: after a submission that starts a child and then exceeds its time allowance, **no descendant remains** — asserted against the container's process list, not against the request having returned. It returned before this change too
- [X] T023 [US2] Run T019–T022 against the unchanged runner and record the failures — expect unbounded parallelism in T019, no `busy` outcome at all in T020, and a surviving orphan in T022

### Implementation for User Story 2

- [X] T024 [US2] Derive the concurrency bound from `cpu.max` (quota ÷ period) in `sandbox/runner/main.py`, falling back to `os.cpu_count()` only when the file is absent, overridable by environment variable — never `nproc`, which reports 4 in QA where the quota is 1 (research.md Finding C)
- [X] T025 [US2] Guard `/execute` with an `asyncio.Semaphore` of that size in `sandbox/runner/main.py`, acquired through `asyncio.wait_for`, answering `limit_hit: "busy"` on timeout and reporting `queued_ms`
- [X] T026 [US2] Derive the queue ceiling from the execution timeout in `sandbox/runner/main.py` rather than configuring it separately, so the two cannot drift apart
- [X] T027 [US2] Replace `create_subprocess_shell` with `create_subprocess_exec` in `sandbox/runner/executor.py`, splitting the command instead of formatting a string
- [X] T028 [US2] Start the child with `start_new_session=True` and, on timeout, signal the process group with `os.killpg` — `SIGTERM`, then `SIGKILL` after a short grace period — in `sandbox/runner/executor.py` (research.md Finding E)
- [X] T029 [US2] Log the limit that fired and the occupancy at that moment in `sandbox/runner/main.py` (FR-016), so "the sandbox was slow" has an answer

**Checkpoint**: a class can work, and one pupil's runaway program is their own
problem.

---

## Phase 5: User Story 3 — Hostile code cannot take the sandbox down (P2)

**Goal**: a fork bomb is stopped and the next pupil's program still runs.

**Independent Test**: submit a program that forks without limit; it is stopped
with `limit_hit: processes`, and an ordinary submission immediately afterwards
returns correct output.

### Tests for User Story 3 — write first, prove they fail

- [X] T030 [P] [US3] Failing test in `sandbox/tests/test_limits_processes.py`: a forking program is stopped with `limit_hit == "processes"`, **and an ordinary submission immediately after it returns correct output**. The second assertion is the point — a fork bomb that is stopped while leaving the service unusable has not been contained
- [X] T031 [US3] Run T030 against the unchanged stack and record what happens — this is the one test that may take the QA sandbox down while failing, which is itself the finding

### Implementation for User Story 3

- [X] T032 [US3] Add `pids_limit` to the sandbox service in all four compose files, using the value measured in T002 rather than a generous-looking number — the JVM's threads count towards it
- [X] T033 [US3] Map a fork failure to `limit_hit: "processes"` in `sandbox/runner/executor.py`
- [X] T034 [US3] Rebuild, run T030 green, then re-run T008 to confirm no language lost threads it needs

**Checkpoint**: the cheapest attack costs the attacker their own submission and
nobody else's.

---

## Phase 6: User Story 4 — Pupil code cannot reach our own systems (P3)

**Goal**: a program cannot open, accept or listen for a connection — including to
our own backend, which shares `sandbox-net`.

**Independent Test**: a program attempting to connect to the platform's internal
service address fails, while every supported language still runs normally.

### Tests for User Story 4 — write first, prove they fail

- [X] T035 [P] [US4] Failing test in `sandbox/tests/test_network.py`: a submission that opens a socket to the backend's internal address fails. Expected to **succeed** today — that is the finding, and the test goes red before the profile is wired up
- [X] T036 [P] [US4] Failing test in `sandbox/tests/test_network.py`: a submission that listens for connections cannot
- [X] T037 [US4] Run T035–T036 unchanged and record that the connection succeeded

### Implementation for User Story 4

- [X] T038 [US4] Reference `sandbox/policies/seccomp.json` from `security_opt` alongside `no-new-privileges` in all four compose files
- [X] T039 [US4] Run a correct program in **every** supported language under the profile and record the result — a syscall filter that breaks a runtime breaks it silently, and only for whoever uses that language

**Checkpoint**: the route from a pupil's code to our own API is closed.

---

## Phase 7: User Story 5 — Pupil code runs with the fewest privileges that work (P3)

**Goal**: execution happens as `runner`, not root.

**Independent Test**: a program reporting its own user does not report root, and
all five languages still run.

**Why last**: it depends on the writable areas created in Phase 3 and is the
change most likely to expose a path that was only ever writable because
everything ran as root.

### Tests for User Story 5 — write first, prove they fail

- [ ] T040 [P] [US5] Failing test in `sandbox/tests/test_user.py`: a submission reporting its own user does not report root. Expected to fail today — `whoami` inside the container returns root in both QA and production
- [ ] T041 [US5] Run T040 unchanged and record that it reported root

### Implementation for User Story 5

- [ ] T042 [US5] Add `USER runner` to `sandbox/Dockerfile`, after the writable paths from T013 and T015 exist
- [ ] T043 [US5] Make the execute-permitted area and the compiler caches writable by `runner` rather than root, in `sandbox/Dockerfile` and the four compose files
- [ ] T044 [US5] Rebuild and run the whole of `sandbox/tests/` plus T008 — this step changes who touches every path in the service, so the full set is the check

**Checkpoint**: every control in this feature is in place.

---

## Phase 8: Polish & cross-cutting

- [ ] T045 [P] Render `limit_hit` in the pupil-facing message in `backend/app/exercises/service.py`, per the table in contracts/runner-api.md — the runner names the limit, and the product has to say it
- [ ] T046 [P] Bound the output returned to a pupil and signal truncation with `limit_hit: "output"` in `sandbox/runner/executor.py` (FR-006)
- [ ] T047 [P] Add a test in `sandbox/tests/test_limits_time.py` that a program reading from stdin when the exercise supplies none ends rather than holding a slot until its timeout (spec.md, Edge Cases)
- [ ] T048 Run the full backend suite and the QA journeys — this feature changes the layer every code exercise sits on, and a green sandbox with a broken exercise path is not a result
- [ ] T049 Update the sandbox documentation and `tasks/todo.md` to record which of the seven audit findings shipped, and that `/tmp` being `noexec` was an eighth, found by measurement
- [ ] T050 Measure the production box after the deploy — `free -h` and `docker stats --no-stream` over read-only SSH — and confirm the service still fits its budget (SC-007, FR-015). Never assert this from memory

---

## Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1) → Phase 4 (US2)
                                                |               |
                                                v               v
                                         Phase 7 (US5)   Phase 5 (US3) → Phase 6 (US4)
```

- **T002 → T032**: the process cap cannot be chosen before the thread counts are measured.
- **T003 → T021**: the timeout arithmetic cannot be asserted before the real client timeout is known.
- **T012 → T027**: the shell can only be dropped once the `ulimit` prefix it carries is gone.
- **T013, T015 → T042**: the user switch depends on the writable areas existing.
- **US3, US4 and US5 are independent of each other** and of US2 once US1 has landed. US1 blocks everything, because it changes the execution path all the others constrain.

## Parallel opportunities

- Phase 1: T002 and T003 together.
- Phase 3 tests: T009 and T010 together (T008 is a different file).
- Phase 4 tests: T019–T022 together — four files, no shared state.
- Phases 5 and 6 can run in parallel once Phase 4 lands; each adds compose keys and one mapping.
- Phase 8: T045, T046 and T047 together.

## Implementation strategy

**MVP is Phase 3 alone.** It is the only phase that repairs something already
broken, and it ships on its own: two of five advertised languages start working,
and a memory refusal starts saying so. Everything after it protects a lesson
that, until Phase 3, could not happen in Java, Go or C++ anyway.

Ship each phase as its own pull request. Merging deploys, and these changes touch
the layer every code exercise runs on — a phase that can be reverted alone is
worth more here than a phase that lands sooner.
