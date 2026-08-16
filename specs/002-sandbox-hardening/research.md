# Phase 0 — Research: the sandbox holds under a real class

Every decision below was measured inside the running containers — in QA, and
where it mattered in production — rather than reasoned from documentation. The
constitution requires that of production facts; the same discipline found two
things the audit had not.

Commands are recorded so anyone can repeat them.

---

## Finding A — `/tmp` is `noexec`, so Go and C++ cannot run at all

**Not in the original audit.** Found while testing the memory fix.

```
docker exec lms-qa-sandbox-1 grep " /tmp " /proc/mounts
tmpfs /tmp tmpfs rw,nosuid,nodev,noexec,relatime,size=102400k 0 0
```

Production, read-only over SSH:

```
tmpfs /tmp tmpfs rw,nosuid,nodev,noexec,relatime,size=102400k,inode64 0 0
```

Copying any binary into `/tmp` and running it gives `Permission denied`.

Two of the five supported languages compile to a native binary and then execute
it from the working directory, which is a `tempfile` directory under `/tmp`:

| Language | run command | executes a file from /tmp? |
|---|---|---|
| python | `python3 {file}` | no — the interpreter lives in /usr/bin |
| javascript | `node {file}` | no |
| java | `java -cp {dir} Main` | no — the JVM loads class *data* |
| **cpp** | `{dir}/a.out` | **yes — cannot run** |
| **go** | `{dir}/a.out` | **yes — cannot run** |

**Decision**: give compiled languages a small execute-permitted working area,
separate from the general scratch space, and keep `noexec` on everything else.
The area holds only what the sandbox's own compiler just produced from the
pupil's source; it is wiped per execution and never receives an upload.

**Rationale**: `noexec` on a scratch directory exists to stop *downloaded or
uploaded* content being run. Here the only executable that can appear is one our
own compiler emitted seconds earlier inside the same isolated container, from
source that is about to be run anyway. Removing `noexec` from the whole of
`/tmp` would weaken the property for every language; a second, smaller mount
keeps it for four of five and grants it only where the feature is impossible
without it.

**Alternatives rejected**:

- *Drop `noexec` from `/tmp` entirely* — simplest, and weakens a property that
  holds today. FR-014 forbids that.
- *Remove Go and C++ from the language table* — honest, and a smaller diff, but
  it deletes two advertised languages rather than fixing them. Constitution
  principle IV would then require removing them from every list that offers
  them, which is a bigger change than a second tmpfs, not a smaller one.
- *Compile into a directory inside the image* — the image is read-only by
  design.

**Consequence for scope**: fixing the memory limit alone does **not** deliver
User Story 1. Java is fixed by the memory work; Go and C++ need this as well.

---

## Finding B — per-execution memory: `RLIMIT_DATA`, because cgroup delegation is not available

The spec requires a per-execution allowance measured against memory *used*
rather than address space *reserved* (FR-003), keeping the per-exercise value
authors already set (FR-003a). Three candidates.

### cgroup v2 per execution — ruled out by measurement

The controllers are present:

```
docker exec lms-qa-sandbox-1 cat /sys/fs/cgroup/cgroup.controllers
cpuset cpu io memory hugetlb pids rdma
```

But the filesystem is mounted read-only inside the container:

```
docker exec lms-qa-sandbox-1 mkdir -p /sys/fs/cgroup/probe
mkdir: cannot create directory '/sys/fs/cgroup/probe': Read-only file system
```

Making it writable means either a privileged container or explicit
cgroup-namespace delegation, and both hand the sandbox more than it has today.
FR-014 says this feature may only add. **Rejected.**

### `RLIMIT_AS` (`ulimit -v`) — what is there now, and the bug

Bounds address space. The JVM and the Go runtime reserve far more than they
use, so at the platform default of 256MB neither starts. This is the P1 defect;
it is not a candidate.

**Correction found during implementation (T011): Node is broken too.** The
failing-test run flagged javascript, which nothing in the audit predicted and
which I had not expected either. Measured:

```
docker exec lms-qa-sandbox-1 sh -c '(ulimit -v 262144; node -e "console.log(42)")'
Fatal process OOM in Failed to reserve virtual memory for CodeRange
```

V8 reserves a large virtual code range for exactly the same reason the JVM and
the Go runtime do. So the count is not two languages broken but **four**:

| Language | Runs at the default 256MB allowance today? |
|---|---|
| python | yes |
| javascript | **no** — V8 cannot reserve its code range |
| java | **no** — the JVM cannot reserve its code cache |
| go | **no** — twice over: the runtime cannot reserve, and the binary is on a noexec mount |
| cpp | **no** — the binary is on a noexec mount |

Only Python worked. That is the real size of the defect, and it was found by
running the tests before the fix rather than by reading the code — which is the
entire argument for making that demonstration its own task.

Under `RLIMIT_DATA` all three reserving runtimes start; verified in the same
container.

### `RLIMIT_DATA` (`ulimit -d`) — chosen

Bounds the data segment, which is what a program actually allocates.

Does the JVM survive it?

```
docker exec lms-qa-sandbox-1 sh -c '(ulimit -d 262144; java -version)'
openjdk version "21.0.12" 2026-07-21
```

It starts. Does the limit actually bite?

```
(ulimit -d 262144; python3 -c 'b=bytearray(400*1024*1024)')
MemoryError

(python3 -c 'b=bytearray(400*1024*1024)')
allocated 419430400
```

Refused at 400MB under a 256MB allowance; allowed without it.

**Decision**: enforce the per-execution allowance with `RLIMIT_DATA`, set on the
child process before it runs.

**Rationale**: it is the only one of the three that bounds real allocation,
survives every runtime we ship, and needs nothing the container does not
already have.

**Known limit, stated rather than hidden**: `RLIMIT_DATA` does not cover memory
obtained by `mmap` on every libc, so a determined program can exceed its
allowance. The container cap remains behind it as the backstop, and the
concurrency bound (Finding C) keeps the number of programs that could try
small. This bounds ordinary mistakes, which is what a pupil's runaway loop is.
It is not a security boundary and this plan does not claim it is.

**Availability**: `resource.setrlimit` is in the Python standard library on
Linux and cannot be missing at runtime, so there is no fallback to design. If
the platform ever lacks it, the runner refuses to start rather than running
without a limit — a sandbox that silently stops limiting is worse than one that
does not come up.

---

## Finding C — the concurrency bound: read `cpu.max`, never `nproc`

`nproc` reports the host's processors, not the container's quota. Measured in
QA, where the compose file grants 1.0 CPU:

```
docker exec lms-qa-sandbox-1 sh -c 'nproc; cat /sys/fs/cgroup/cpu.max'
4
100000 100000
```

Four reported, one available. Production happens to agree —

```
nproc -> 2 ; cpu.max -> 200000 100000
```

— which is exactly why `nproc` would have survived review: it is right on the
box that matters and wrong everywhere else, including every developer machine
and CI.

**Decision**: derive the bound from `cpu.max` (quota ÷ period), falling back to
`os.cpu_count()` only when the file is absent, and allow an environment
variable to override it.

**Rationale**: FR-007 asks for the processors *actually available*. That number
is in `cpu.max` and nowhere else. Reading it is four lines.

**The bound itself**: executions are mostly CPU-bound, so a small multiple of
the quota rather than a large one. Starting point `max(2, floor(cpus) * 2)` — 4
in production, 2 in QA. It is an environment variable because the right value is
a measurement (SC-003), not a belief.

---

## Finding D — waiting at capacity, with a ceiling

The owner chose waiting over refusal (FR-008), bounded.

**Decision**: an `asyncio.Semaphore` sized by Finding C, acquired through
`asyncio.wait_for`. On timeout the runner answers a distinct "the class is busy"
outcome rather than a generic error.

**Rationale**: this is the smallest thing that implements "wait, but not
forever". An explicit queue object would add a second place where a request can
be lost.

**The ceiling**: the wait must be shorter than whatever the caller will wait
for, or the pupil sees a network timeout instead of our message. The ceiling is
derived from the execution timeout so the two cannot drift apart, and the
backend's own client timeout must exceed queue-ceiling plus execution timeout.
That relationship is written into the contract so it is checked rather than
assumed.

---

## Finding E — reaping descendants, and dropping the shell

Today the runner starts a shell (`create_subprocess_shell`) and, on timeout,
calls `proc.kill()`. That kills the shell. Anything it started survives and
keeps consuming the same processors — Finding C's problem, made worse.

**Decision**: start the child with `create_subprocess_exec` and
`start_new_session=True`, then on timeout signal the whole process group with
`os.killpg`, escalating to `SIGKILL` after a short grace period.

**Rationale**: `start_new_session` makes the child a process-group leader, so a
single `killpg` reaches every descendant. It composes with dropping the shell:
the shell was only ever there to carry the `ulimit` prefix, and the limit now
goes on through `preexec_fn` instead. Findings B and E delete the same line.

**Alternatives rejected**:

- *Keep the shell and kill its group* — works, and leaves a shell parsing a
  string built from paths for no remaining reason.
- *A `psutil` process-tree walk* — a new dependency to do what a process group
  does natively, and it races with processes forking while the tree is walked.

---

## Finding F — telling a pupil which allowance they exceeded

FR-002. Today a runtime's own initialisation error reaches the pupil verbatim,
which is how "Could not reserve enough space for code cache" became the error
message for a correct program.

**Decision**: the runner returns a machine-readable outcome — which limit was
reached, if any — alongside the text, and the backend renders that rather than
guessing from stderr.

**Rationale**: guessing from stderr means matching every runtime's wording in
every version: a permanent maintenance debt for a worse answer. The runner knows
exactly why it stopped a program, so it should say so.

**Signals available**, all local to the runner: the wait timed out (busy), the
execution deadline passed (time), the child died on `SIGKILL` after the group
kill (time), the child hit a memory error or was killed by the kernel's OOM
killer (memory), a fork failed once the process limit was reached (processes).

---

## Finding G — where `pids_limit` and the seccomp profile go

`pids_limit` is a top-level service key, not a `deploy.resources` one. It goes
on the sandbox service in all four compose files, and only there.

The `deploy.resources.limits` already in use *are* applied by Compose v2, which
is worth stating because the opposite is often assumed. Measured: the production
compose declares `memory: 512M`, and

```
docker exec lms-sandbox-1 cat /sys/fs/cgroup/memory.max
536870912
```

which is exactly 512MB. The mechanism works.

The seccomp profile is referenced from the same `security_opt` list that already
carries `no-new-privileges`. It denies socket, connect, sendto, recvfrom, bind,
listen and accept over a default-allow policy — a deny-list, weaker than a
default-deny allow-list, but it is what exists and what has been reviewed.
Writing a full allow-list for five language runtimes is a much larger change
with a much larger chance of breaking a runtime in a way that shows up for one
pupil only; that is not the smallest change that works.

**Verification is the point here**: a seccomp profile that breaks a runtime
breaks it silently and only under load. Every supported language must be run
under the profile before it ships, which the quickstart covers.

**The `pids_limit` value**: it must sit above what a legitimate program needs.
The JVM alone starts several threads, and threads count towards the process
limit. Measured (T002) in the QA container, `ps -eLf | wc -l` while each runtime
was up:

| State | Threads | Cost of one execution |
|---|---|---|
| Runner at rest | 6 | — |
| One Java program running | 19 | **13** |
| One Node program running | 13 | 7 |
| One Python program running | 7 | 1 |

Java is the expensive one by a wide margin, and `javac` is itself a JVM, so a
request can hold roughly that many threads in either of its two phases.

With the concurrency bound of Finding C — 4 in production — the worst
legitimate case is about `6 + 4 × 13 = 58` threads. A `pids_limit` of **256**
leaves more than four times that headroom while still stopping a fork bomb dead,
because a fork bomb reaches thousands within a second rather than dozens. The
number is chosen from that arithmetic, not from what looked generous.

---

## Finding H — running as `runner` rather than root

The Dockerfile creates the user and never switches to it. Measured in both
environments: `whoami` inside the sandbox container returns `root`.

**Decision**: add `USER runner`, and find out what breaks.

**Rationale**: it is one line, and it is the difference between a runtime escape
landing on an unprivileged account inside a locked-down container and landing on
root inside one.

**What it interacts with**, and why it is sequenced last: the execute-permitted
area from Finding A and the compiler caches must be writable by `runner` rather
than by root. Go in particular wanted `/root/.cache` during testing —

```
failed to initialize build cache at /root/.cache: mkdir /root/.cache: read-only file system
```

— so `HOME` and `GOCACHE` have to point somewhere writable regardless of which
user runs. Doing the user switch after the working-directory work keeps one
change under test at a time.

---

## What was measured, and where

| Fact | QA | Production |
|---|---|---|
| `/tmp` mount flags | `noexec` | `noexec` |
| cgroup version | v2 | v2 |
| cgroup fs writable in container | no | same compose options, no privileged flag |
| `nproc` | 4 | 2 |
| `cpu.max` | `100000 100000` (1.0) | `200000 100000` (2.0) |
| `memory.max` | 268435456 (256M) | 536870912 (512M) |
| user inside container | root | root |
| JVM under `ulimit -d 262144` | starts | not run — identical image |
| 400MB allocation under `ulimit -d 262144` | `MemoryError` | not run — identical image |

Production was probed read-only over SSH. No write of any kind was attempted
there: the cgroup write test ran in QA only, and the production conclusion rests
on both environments using the same compose options rather than on a production
experiment.
