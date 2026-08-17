# Phase 1 — Quickstart: proving each limit actually fires

Every limit in this feature is invisible when it works. A test that runs a
well-behaved program proves nothing about a limit — it proves the program
behaved. So each check below runs a program built to breach the limit, and each
is expected to **fail against today's code** before the change and pass after.

Everything runs against the ephemeral QA stack, because these are container
properties and cannot be exercised on a developer's host.

## Prerequisites

```bash
docker compose -f docker-compose.qa.yml up -d --build sandbox
```

`--build` is not optional after a code change — a stale image is the trap
already recorded in the QA notes.

The checks use `docker exec` where the point is a container property, and HTTP
where the point is the contract.

## 1. The languages that do not work today (User Story 1)

**Before the change, both must fail.** That is the demonstration.

```bash
docker exec lms-qa-sandbox-1 sh -c '(ulimit -v 262144; java -version)'
```

Expected today: `Could not reserve enough space for code cache`.

```bash
docker exec lms-qa-sandbox-1 sh -c 'cp /bin/echo /tmp/p && /tmp/p hi'
```

Expected today: `Permission denied` — `/tmp` is `noexec`, which is what breaks
Go and C++.

**After the change**, a correct program in each of the five supported languages
returns its output through the API at the default 256MB allowance. Java and Go
are the two that could not before; C++ shares Go's cause and must be checked
alongside them.

## 2. The memory allowance bites (FR-003)

A program that allocates well past its allowance must be refused, and the
refusal must say `memory` rather than surfacing a runtime's own wording.

```bash
docker exec lms-qa-sandbox-1 sh -c '(ulimit -d 262144; python3 -c "b=bytearray(400*1024*1024)")'
```

Expected: `MemoryError`.

```bash
docker exec lms-qa-sandbox-1 sh -c 'python3 -c "b=bytearray(400*1024*1024); print(len(b))"'
```

Expected: `419430400` — the control. Without it the first command passes on a
machine that is merely short of memory, for the wrong reason.

Through the API: submit the same allocation and assert `limit_hit == "memory"`.

## 3. Descendants do not outlive the program (FR-005)

Submit a program that starts a long-lived child and then exceeds its own time
allowance. Today the shell is killed and the grandchild survives.

The check is not "the request returned" — it returned before this change too.
The check is that **nothing is still running afterwards**:

```bash
docker exec lms-qa-sandbox-1 ps -eo pid,etime,cmd
```

After a timed-out submission, no descendant of the killed program may remain.
Expected to fail before the change, with an orphan visible in that listing.

## 4. Twenty-five at once (SC-002, SC-003)

The burst is the scenario, so the check has to be a burst — twenty-five
concurrent submissions of a program that runs in well under a second.

Assert three things, because passing the first two while failing the third is
exactly what unbounded concurrency looks like:

- all twenty-five return correct output,
- none returns an error,
- the slowest completes within ten seconds of its submission.

Then read `queued_ms` across the twenty-five. Before the change it is absent;
after, it is non-zero for the ones that waited, which is what shows the bound is
doing something rather than the machine simply being fast enough that day.

## 5. The wait has a ceiling (FR-008)

Fill every slot with long-running programs, then submit one more.

Expected: `limit_hit == "busy"`, promptly — not a hang, and not a network error.
A network error here means the timeout arithmetic in
[contracts/runner-api.md](contracts/runner-api.md) is ordered wrongly, which is
the failure this check exists to catch.

## 6. Processes are capped (FR-012)

Submit a program that forks without limit. Two assertions:

- it is stopped, with `limit_hit == "processes"`;
- **and an ordinary submission immediately afterwards still returns correct
  output**, which is the whole point. A fork bomb that is stopped but leaves the
  service unusable has not been contained.

## 7. Nothing can reach the network (FR-011)

From inside the sandbox, under the seccomp profile:

```bash
docker exec lms-qa-sandbox-1 python3 -c "import socket; socket.create_connection(('backend', 8000), timeout=2)"
```

Expected after the change: the socket call fails. Expected before: it connects —
which is the finding.

`backend` rather than a public address on purpose: the internet route is already
closed, and the internal one is what this requirement is about.

Then run a correct program in **every** supported language under the profile. A
syscall filter that breaks a runtime breaks it silently, and only for whoever
happens to use that language.

## 8. Not running as root (FR-013)

```bash
docker exec lms-qa-sandbox-1 whoami
```

Expected after: `runner`. Today: `root`.

Then re-run the five languages. This step is last because it depends on the
writable areas created in step 1, and it is the change most likely to expose a
path that was only ever writable because everything ran as root.

## The regression that matters most

After all of it, run the existing backend exercise tests and the existing QA
journeys. This feature changes the layer every code exercise sits on; a green
sandbox with a broken exercise path is not a result.
