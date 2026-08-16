# Phase 1 — Interface contract: the sandbox runner

One endpoint, and the arithmetic that has to hold between three timeouts. Only
what changes is listed; the request shape is unchanged and the response gains
two fields.

The runner is reachable only from the backend, over `sandbox-net`. It takes no
identifiers, holds no credentials, and this feature gives it none.

## `POST /execute`

### Request

Unchanged. `memory_limit_mb` changes meaning rather than shape — see
[data-model.md](../data-model.md).

The runner MUST reject an unsupported `language` before writing anything to
disk, as it does today.

### Response

Always `200` with a body. A refused execution is a result, not an HTTP error:
either the pupil's program ran and was stopped, or it did not run and we know
why. Both are things the caller renders rather than retries.

Added:

- `limit_hit` — `"time" | "memory" | "processes" | "output" | "busy" | null`
- `queued_ms` — integer, milliseconds spent waiting for a slot

Existing callers that ignore both keep working, which is what lets the runner
ship before the backend renders them.

### What each outcome means for the caller

| `limit_hit` | `status` | What the backend shows | Retry? |
|---|---|---|---|
| `null` | `success` / `error` | The program's own output | — |
| `time` | `timeout` | "Your program ran longer than N seconds" | No — it will do it again |
| `memory` | `error` | "Your program used more than N MB" | No |
| `processes` | `error` | "Your program tried to start too many processes" | No |
| `output` | `success` / `error` | The output, and that it was cut short | No |
| `busy` | `error` | "The class is busy — try again in a moment" | **Yes** — the only outcome where the same program would succeed unchanged |

`busy` being the only retryable outcome is why it is worth distinguishing at
all. Every other value is a property of the program; this one is a property of
the minute it arrived in.

## The timeout arithmetic

Three timeouts sit in a line, and if they are ordered wrongly the pupil gets a
network error instead of the message this feature exists to produce.

```
backend HTTP client timeout   >   queue ceiling + execution timeout + margin
```

- **Execution timeout** — per request, from the exercise.
- **Queue ceiling** — how long a request may wait for a slot before answering
  `busy`. Derived from the execution timeout rather than configured separately,
  so the two cannot drift apart when somebody raises one.
- **Backend client timeout** — must exceed the sum, or the backend gives up
  while the runner is still working and the pupil sees a connection failure for
  a program that was about to answer.

Measured (T003), `backend/app/sandbox/executor.py:46`:

```python
async with httpx.AsyncClient(timeout=timeout_seconds + 30) as client:
```

So the caller allows the execution timeout plus **30 seconds**. With the queue
ceiling set to the execution timeout — 10 seconds at the default — the sum is
20 seconds against a 40-second budget, leaving 20 seconds of margin. Comfortable
today, and precisely the kind of headroom that disappears quietly when somebody
raises one of the three. That is why T021 asserts the relationship from the real
values rather than trusting this paragraph.

This relationship MUST be asserted by a test rather than left in a comment. It
is exactly the kind of thing that holds on the day it is written and quietly
stops holding when one of the three is tuned.

## Failure modes the contract has to name

**The runner is down.** The backend sees a connection error, which is not
`limit_hit: busy` and must not be rendered as it — "the class is busy" tells a
teacher to wait when the truth is that something needs restarting.

**The runner is at capacity and the backend has already given up.** Prevented by
the arithmetic above. If it happens anyway, the ordering was broken and the test
above should have caught it.

**A limit fires that the caller does not know.** Callers MUST treat an
unrecognised `limit_hit` as a generic refusal and show the program's own stderr,
rather than crashing or claiming success. That is what makes adding `disk` later
free.

## What this contract does not add

- No identity: no pupil id, no exercise id. The runner does not need them to run
  a program, and giving them to it would create data to protect in the one
  service designed to hold none.
- No streaming. A pupil waits for a result; partial output during execution is a
  different feature with a different spec.
- No cancellation endpoint. A program that is stopped is stopped by its own time
  allowance, and a pupil who navigates away costs one slot for at most that
  long.
