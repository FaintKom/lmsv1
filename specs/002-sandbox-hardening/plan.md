# Implementation Plan: The sandbox holds under a real class

**Branch**: `fix/sandbox-hardening` | **Date**: 2026-08-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-sandbox-hardening/spec.md`

## Summary

Five stories, one of which is a defect already in production. The work divides
cleanly along the code it touches: the runner's execution path, the runner's
front door, and the compose files.

Phase 0 settled every mechanism by measurement (see [research.md](research.md)),
and found one thing the audit had missed: `/tmp` is mounted `noexec` in both QA
and production, so Go and C++ — which compile to a native binary and then run it
from the working directory — cannot execute at all. Fixing the memory limit
repairs Java and leaves those two broken, so User Story 1 needs both changes.

The chosen mechanisms:

| Requirement | Mechanism | Why not the obvious one |
|---|---|---|
| Per-execution memory (FR-003) | `RLIMIT_DATA` | cgroup delegation is unavailable — `/sys/fs/cgroup` is read-only in the container, measured; `RLIMIT_AS` is the current bug |
| Compiled languages run (FR-001) | a second, execute-permitted scratch mount | dropping `noexec` from `/tmp` would weaken a property that holds today |
| Concurrency bound (FR-007) | read `cpu.max` | `nproc` reports the host's processors: 4 in QA where the quota is 1 |
| Waiting at capacity (FR-008) | `asyncio.Semaphore` + `wait_for` | an explicit queue adds a second place to lose a request |
| Reaping descendants (FR-005) | `start_new_session` + `killpg` | `proc.kill()` kills only the shell |
| Naming the limit (FR-002) | the runner reports which limit fired | matching runtime error strings is permanent debt for a worse answer |
| Process cap (FR-012) | `pids_limit` in compose | nothing inside the runner can bound forks from outside |
| Network deny (FR-011) | wire up the seccomp profile that already exists | a default-deny allow-list for five runtimes is a much larger, riskier change |
| Unprivileged execution (FR-013) | `USER runner` | — |

## Technical Context

**Language/Version**: Python 3.12 (sandbox runner), same as the backend.

**Primary Dependencies**: FastAPI and asyncio in the runner; the standard
library's `resource`, `os` and `signal` for the limits. No new dependency is
introduced by this feature, and `psutil` was considered and rejected.

**Storage**: none. The sandbox writes nothing that survives an execution.

**Testing**: pytest for the runner's own tests; the existing backend suite for
the exercise path that calls it; a burst check for twenty-five simultaneous
submissions. The QA compose stack is the environment for anything needing the
real container, because the limits under test are container properties and
cannot be exercised on a developer's host.

**Target Platform**: Linux container on a Hetzner CX22. Measured, not assumed:
2 processors (`cpu.max` = `200000 100000`), 512MB for this container
(`memory.max` = 536870912), sharing a box with roughly fourteen containers.

**Project Type**: an internal HTTP service — the sandbox runner — plus the
compose files that constrain it, plus the backend module that calls it.

**Performance Goals**: twenty-five submissions inside one second all return
correct results (SC-002); the slowest within ten seconds for a program that runs
in under one second on its own (SC-003).

**Constraints**: no more production capacity than the box already provides
(FR-015); no isolation property weakened (FR-014); no new paid service.

**Scale/Scope**: one class at a time. The upper end of the schools this is sold
to is about twenty-five pupils, and the demonstration audience is the same size.

## Constitution Check

*GATE: must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Applies? | How this plan satisfies it |
|---|---|---|
| I — Tenant isolation | Not directly | The sandbox holds no tenant data and takes no ids. The backend's authorisation on the exercise path is untouched. |
| II — A test that cannot fail is worse than no test | **Yes, heavily** | Every limit here is invisible when it works, which is the exact shape of a test that passes for the wrong reason. Each gets a test demonstrated failing against today's behaviour first: the memory test must fail under `RLIMIT_AS`, the reaping test must find a surviving descendant, the concurrency test must show unbounded parallelism. |
| III — The server is the only judge | Not directly | Grading is unchanged; this is the execution layer beneath it. |
| IV — Product and documentation tell the same story | **Yes** | Go and C++ are offered and do not work. Either they are fixed (this plan) or removed from every list that offers them. Leaving them advertised and broken is the violation. |
| V — The smallest change that works | **Yes** | No new dependency. The seccomp profile already exists. The shell disappears rather than being made safer. `RLIMIT_AS` is deleted, not tuned. The one place this plan *adds* — a second scratch mount — is argued in research.md against both smaller alternatives. |

**Gate result: pass.** Three tensions are recorded in Complexity Tracking below.

**Risk this plan carries knowingly**: a limit that is set but never enforced
looks identical, from outside, to one that works. That is why every mechanism in
research.md was measured rather than reasoned, and why the quickstart runs each
limit against a program built to breach it rather than against a program that
behaves.

## Project Structure

### Documentation (this feature)

```text
specs/002-sandbox-hardening/
├── plan.md              # This file
├── research.md          # Phase 0 — the measurements and what they settled
├── data-model.md        # Phase 1 — execution request, result, allowance, capacity
├── quickstart.md        # Phase 1 — how to prove each limit actually fires
├── contracts/
│   └── runner-api.md    # Phase 1 — the /execute contract and its timeout arithmetic
├── checklists/
│   └── requirements.md  # Spec quality, from /speckit-specify
└── tasks.md             # Phase 2 — created by /speckit-tasks, not here
```

### Source code (repository root)

```text
sandbox/
├── Dockerfile                  # USER runner; HOME and GOCACHE somewhere writable
├── policies/
│   └── seccomp.json            # exists; referenced by compose for the first time
└── runner/
    ├── main.py                 # the concurrency bound and the bounded wait
    ├── executor.py             # exec not shell, RLIMIT_DATA, process-group reaping,
    │                           #   the execute-permitted working area, limit outcomes
    └── languages.py            # unchanged unless a compiler needs a cache path

backend/
├── app/exercises/
│   ├── schemas.py              # memory_limit_mb keeps its meaning (FR-003a)
│   └── service.py              # render the limit the runner names, not raw stderr
└── tests/
    └── test_sandbox_limits.py  # new — the backend's view of a refused execution

docker-compose.yml              # pids_limit, seccomp, the exec-permitted mount
docker-compose.prod.yml         #   (the same keys in each; values may differ)
docker-compose.staging.yml
docker-compose.qa.yml
```

**Structure decision**: the runner keeps its current three-module shape. The
limits belong in `executor.py`, next to the process they constrain; the capacity
belongs in `main.py`, next to the request it admits. No new module — a
`limits.py` holding four constants and one `preexec_fn` would be an abstraction
with a single caller, which principle V rules out.

## Phasing

The order follows dependency and what is broken now, not the audit's numbering.

1. **Make the compiled languages run, and fix the memory limit.** One change to
   `executor.py`, one to the compose files. Together they deliver User Story 1 —
   the only story about something broken rather than unprotected.
2. **Bound the concurrency and reap descendants.** One problem from two sides
   (User Story 2). Reaping removes the shell, which is why it follows the memory
   work rather than preceding it: the shell exists to carry the `ulimit` prefix
   that step 1 deletes.
3. **Cap processes.** `pids_limit` (User Story 3), after the value has been
   measured against each runtime's real thread count rather than guessed.
4. **Wire up seccomp.** (User Story 4.) Every language is run under it before it
   ships, because a broken syscall filter fails silently.
5. **Switch to `USER runner`.** (User Story 5.) Last, because it depends on the
   writable areas created in step 1 and is the change most likely to expose a
   path assumption.

Each step is independently shippable and independently revertible, which matters
in a repository where merging to `main` deploys.

## Complexity Tracking

| Tension | Why it is accepted | Simpler alternative rejected because |
|---|---|---|
| A second scratch mount, where one existed | Go and C++ cannot execute from a `noexec` directory, and the product offers both today | Dropping `noexec` from `/tmp` is fewer lines and weakens the property for all five languages, which FR-014 forbids. Deleting the two languages is smaller in the sandbox and larger everywhere else: principle IV then requires removing them from every list that advertises them. |
| `RLIMIT_DATA` bounds mistakes, not attackers | It is the only per-execution mechanism available without giving the container cgroup write access | Per-execution cgroups are the correct tool and need privileges the container does not have. Taking them would weaken isolation to strengthen a limit — a bad trade, and forbidden by FR-014. The container cap stays behind it as the backstop, and research.md states the gap rather than hiding it. |
| The seccomp profile is a deny-list | It exists, it has been reviewed, and it closes the route this feature is about | A default-deny allow-list is stronger and means enumerating the syscalls of five language runtimes; its failure mode is one runtime breaking for one pupil, found late. Not the smallest change that works. |
