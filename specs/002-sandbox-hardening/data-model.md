# Phase 1 — Data model: the sandbox holds under a real class

No database change. The sandbox stores nothing, and this feature adds no table,
column or migration. What follows is the shape of what crosses the wire and what
lives for the length of one execution.

## Execution request

What the backend sends the runner. Unchanged in shape; one field changes
meaning.

| Field | Type | Notes |
|---|---|---|
| `language` | string | One of the supported set. Rejected before anything is written to disk. |
| `source_code` | string | The pupil's program, length-capped by the caller. |
| `stdin` | string | What the exercise supplies. Empty is the common case. |
| `timeout_seconds` | integer | The time allowance for this execution. Now covers compilation as well as running (FR-004). |
| `memory_limit_mb` | integer | The memory allowance. **Meaning changes**: it used to bound address space, which is why Java and Go could not start; it now bounds memory actually allocated (FR-003). The value authors already set keeps its intent — a 256MB exercise still means "this program may allocate 256MB" — and for the first time it means it truthfully. |

Defaults come from the exercise (`memory_limit_mb: int = 256` in the backend's
schema). Nothing content authors have written needs to change.

## Execution result

What the runner returns. Two fields are added; the rest keep their shapes so
every existing caller keeps working.

| Field | Type | Notes |
|---|---|---|
| `stdout` | string | Bounded, and truncation is signalled rather than silent (FR-006). |
| `stderr` | string | Same. |
| `exit_code` | integer | As now. `-1` when the program never exited on its own. |
| `execution_time_ms` | integer | Wall-clock milliseconds, as now. Excludes time spent waiting for a slot, which is reported separately — a pupil's program did not take four seconds because it waited three. |
| `status` | string | As now: `success`, `error`, `timeout`. |
| `limit_hit` | string or null | **New.** Which allowance stopped this execution, if any. Null when the program finished on its own terms. |
| `queued_ms` | integer | **New.** How long this request waited for a slot. Zero when it ran immediately. Present so "the sandbox was slow" can be answered from data (FR-016). |

### `limit_hit` values

The point of FR-002 is that the pupil is told which allowance they exceeded, so
this is a closed set with a defined meaning each, not free text.

| Value | Meaning | How the runner knows |
|---|---|---|
| `time` | The execution passed its time allowance. | The deadline elapsed, or the child died on the group kill that followed. |
| `memory` | The program tried to allocate beyond its allowance. | The child failed with an allocation error, or the kernel's out-of-memory killer took it. |
| `processes` | The program tried to create more processes than it is allowed. | A fork failed once the container's process cap was reached. |
| `output` | The program produced more output than will be carried. | The runner stopped reading at the cap. |
| `busy` | Nothing was run: every slot was occupied for longer than the platform will make a pupil wait. | The wait for a slot timed out. |

`busy` sits in the same field rather than a separate one on purpose. From the
pupil's side it answers the same question — *why did my program not run?* — and
splitting it would let a caller handle four cases and forget the fifth.

Values are a Python tuple of strings, not a database enum, for the reason
recorded in `crm/models.py`: a Postgres enum only grows, and there is no
database here to grow one in. Adding `disk` later must cost nothing.

## Allowance

Not a stored entity — a property of one execution, arriving with the request.

- **Time**: seconds, applied to compilation and execution together.
- **Memory**: megabytes, applied to what the program allocates.
- **Output**: bytes, a platform constant rather than a per-exercise field. No
  exercise author has a reason to care, and one fewer field is one fewer thing
  to get wrong.
- **Processes**: a container-level cap, not per-execution. It cannot be
  per-execution without cgroup delegation the container does not have
  (research.md, Finding B). Stated here as a property of the service so nobody
  later reads `limit_hit: processes` and hunts for a request field that
  explains it.

## Capacity

A property of the running service, not of any request.

| Concept | Where it comes from | Notes |
|---|---|---|
| Slots | `cpu.max`, quota ÷ period, times a small factor | Never `nproc`, which reports the host's processors — 4 in QA where the quota is 1 (research.md, Finding C). Overridable by environment variable, because the right factor is a measurement. |
| Wait ceiling | Derived from the time allowance | Held in a fixed relationship to the execution timeout so the two cannot drift apart, and so the caller's own timeout can be shown to exceed both (contracts/runner-api.md). |
| Occupancy | Live count of running executions | Logged when a limit fires, so a slow lesson can be explained rather than guessed at (FR-016). |

## What deliberately has no model

- **No execution history.** The sandbox does not record what it ran. It has no
  database credentials and gains none here; keeping pupil source code in the
  execution service would create a new class of data to protect, for no stated
  requirement.
- **No per-pupil quota.** Fairness between pupils inside one class is not a
  requirement in this spec, and a queue that is fair per user needs an identity
  the sandbox is deliberately not given.
