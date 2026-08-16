import asyncio
import errno
import os
import resource
import shlex
import signal
import tempfile
import time

from runner.languages import LANGUAGES

# A small tmpfs mounted *without* noexec, for the one thing that needs it: a
# binary our own compiler produced, from source we are about to run anyway.
#
# /tmp stays noexec, and so does /dev/shm — both were measured. Four of the five
# languages never touch this directory; only the two that compile to a native
# binary and then execute it do. Giving the whole scratch area execute
# permission would have been fewer lines and would have weakened the property
# for everybody (spec FR-014, research.md Finding A).
EXEC_DIR = os.environ.get("SANDBOX_EXEC_DIR", "/sandbox-exec")

# What a runtime says when it cannot create another process or thread.
#
# Checked BEFORE the memory markers, and that order is load-bearing: the JVM
# reports an exhausted thread limit as `java.lang.OutOfMemoryError: unable to
# create new native thread`, which the memory list below would otherwise claim.
# A pupil whose program spawned too many threads would have been told to use
# less memory — advice that cannot help, about a limit they did not hit.
_TOO_MANY_PROCESSES_MARKERS = (
    "resource temporarily unavailable",  # EAGAIN from fork(), every libc
    "unable to create new native thread",  # JVM
    "failed to create new os thread",  # Go
    "blockingioerror",  # Python's own name for EAGAIN
    "can't fork",
    "fork failed",
)

# What a runtime says when the kernel refuses it memory. With RLIMIT_DATA the
# kernel refuses the allocation and the runtime reports it in its own words, so
# there is nothing else to read.
#
# Only allocation failures are listed — deliberately not reservation failures
# ("Could not reserve enough space for code cache"), which are what the old
# address-space limit produced for programs that were doing nothing wrong. If
# one of those ever appears again it must NOT be reported as the pupil's fault;
# it means a limit is bounding the wrong quantity again.
_OUT_OF_MEMORY_MARKERS = (
    "memoryerror",
    "out of memory",
    "cannot allocate memory",
    "java.lang.outofmemoryerror",
    "bad_alloc",
    "javascript heap out of memory",
    "runtime: out of memory",
)


# Errno the kernel returns when no more processes may be created. The runner
# hits this itself: once a pupil's program has used up the container's process
# budget, the runner cannot fork to start or manage anything either.
#
# Unhandled, that surfaced as HTTP 500 — the pupil is told the service is broken
# when in fact their own program used everything up. Measured, not imagined: a
# three-line fork bomb produced exactly that.
_NO_MORE_PROCESSES = (errno.EAGAIN, errno.ENOMEM)


# The kernel counts how many times this container has been refused a new
# process, in the pids cgroup. Unlike every other signal available here it is a
# fact rather than a reading of somebody else's error message: if the counter
# moved while a program ran, that program was refused a process.
#
# It is container-wide, not per-execution — per-execution cgroups need write
# access to /sys/fs/cgroup, which this container deliberately does not have
# (research.md Finding B). With up to four programs running at once, two hitting
# the cap in the same second could be credited to each other. Both failed
# anyway, and the alternative is telling a pupil their fork loop ran out of
# *time*, so the trade is worth naming rather than avoiding.
_PIDS_EVENTS = "/sys/fs/cgroup/pids.events"


def _pids_refused() -> int | None:
    """How many times the container has been refused a new process, or None."""
    try:
        with open(_PIDS_EVENTS) as handle:
            for line in handle:
                key, _, value = line.partition(" ")
                if key == "max":
                    return int(value)
    except (OSError, ValueError):
        return None
    return None


def _is_fork_failure(exc: OSError) -> bool:
    return exc.errno in _NO_MORE_PROCESSES


def _limits(memory_limit_mb: int):
    """Applied in the child, between fork and exec.

    RLIMIT_DATA, not RLIMIT_AS. The difference is the whole of User Story 1:
    RLIMIT_AS bounds address space, which modern runtimes reserve far more of
    than they use, so at the platform's default allowance the JVM, Node's V8 and
    the Go runtime all refused to start — for correct programs. RLIMIT_DATA
    bounds what a program actually allocates, which is what the allowance was
    always meant to mean.
    """

    def _apply() -> None:
        limit = memory_limit_mb * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_DATA, (limit, limit))

    return _apply


async def _reap(pgid: int) -> None:
    """Stop everything in a submission's process group.

    Called on *every* path, not only on timeout. A program that exits does not
    take its children with it: a fork bomb's own process dies the moment its
    fork fails, `communicate()` returns normally, and the runner would have
    called that a completed execution while several hundred of its children went
    on holding the container's entire process budget. The next pupil was then
    refused for a limit somebody else had reached — measured, exactly that.

    `start_new_session=True` makes the child a group leader, so its pid *is* the
    group id. That is captured while it is alive rather than looked up here:
    once the leader has exited its pid may already be reaped, and `getpgid`
    would fail at precisely the moment this matters.

    SIGTERM first, so a program that installed a handler gets to run it, then
    SIGKILL for whatever is still there.
    """
    for sig in (signal.SIGTERM, signal.SIGKILL):
        try:
            os.killpg(pgid, sig)
        except (ProcessLookupError, PermissionError):
            return
        await asyncio.sleep(0.15)


def _limit_from_failure(stderr: str, returncode: int | None) -> str | None:
    """Which allowance killed this child, as far as the runner can tell.

    Processes are checked before memory, and the order is not cosmetic: the JVM
    announces an exhausted thread limit as `java.lang.OutOfMemoryError: unable
    to create new native thread`. Reading the memory list first would tell a
    pupil to use less memory about a limit they never reached.

    This is the one place the service reads a failure it did not itself cause:
    the kernel refuses the fork or the allocation, and the runtime reports it in
    its own words. Every other limit here — time, busy — is reported from
    something the runner knows for certain. The OOM killer's SIGKILL is the one
    hard signal available, and it means memory.
    """
    lowered = stderr.lower()
    if any(marker in lowered for marker in _TOO_MANY_PROCESSES_MARKERS):
        return "processes"
    if returncode == -signal.SIGKILL or any(m in lowered for m in _OUT_OF_MEMORY_MARKERS):
        return "memory"
    return None


def _hit_process_cap(before: int | None) -> bool:
    """Did the container get refused a process while this execution ran?"""
    if before is None:
        return False
    after = _pids_refused()
    return after is not None and after > before


def _result(
    *,
    stdout: str = "",
    stderr: str = "",
    exit_code: int = 0,
    execution_time_ms: int = 0,
    status: str,
    limit_hit: str | None = None,
) -> dict:
    return {
        "stdout": stdout,
        "stderr": stderr,
        "exit_code": exit_code,
        "execution_time_ms": execution_time_ms,
        "status": status,
        "limit_hit": limit_hit,
        "queued_ms": 0,
    }


async def execute_code(
    language: str,
    source_code: str,
    stdin: str = "",
    timeout_seconds: int = 10,
    memory_limit_mb: int = 256,
) -> dict:
    lang_config = LANGUAGES[language]
    ext = lang_config["extension"]
    filename = lang_config.get("filename", f"solution{ext}")

    # Only the languages that execute a file they compiled need the mount that
    # permits it. Everything else stays on noexec scratch.
    if lang_config.get("needs_exec"):
        os.makedirs(EXEC_DIR, exist_ok=True)
        parent = EXEC_DIR
    else:
        parent = None

    apply_limits = _limits(memory_limit_mb)

    with tempfile.TemporaryDirectory(dir=parent) as tmpdir:
        filepath = os.path.join(tmpdir, filename)
        with open(filepath, "w") as f:
            f.write(source_code)

        # The time allowance covers compilation as well as running (FR-004): a
        # compiler can be made to consume as much as a program can, and the
        # separate hardcoded 30s meant a pupil's 5s exercise could hold a slot
        # for 35. Compilation gets at most half, so a slow compile cannot leave
        # the program itself no time at all.
        started_at = time.monotonic()
        compile_budget = max(1.0, timeout_seconds / 2)

        if lang_config["compile_cmd"]:
            compile_cmd = lang_config["compile_cmd"].format(file=filepath, dir=tmpdir)
            proc = None
            pgid = None
            try:
                proc = await asyncio.create_subprocess_exec(
                    *shlex.split(compile_cmd),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=tmpdir,
                    start_new_session=True,
                    preexec_fn=apply_limits,
                )
                pgid = proc.pid  # it is its own group leader
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=compile_budget
                )
                if proc.returncode != 0:
                    text = stderr.decode(errors="replace")
                    return _result(
                        stderr=text,
                        exit_code=proc.returncode,
                        status="error",
                        limit_hit=_limit_from_failure(text, proc.returncode),
                    )
            except asyncio.TimeoutError:
                # See the note in the run phase: TimeoutError is an OSError
                # subclass, so this clause must come first.
                return _result(
                    stderr="Compilation took longer than its time allowance",
                    exit_code=1,
                    status="timeout",
                    limit_hit="time",
                )
            except OSError as exc:
                if not _is_fork_failure(exc):
                    raise
                return _result(
                    stderr="Your program tried to start too many processes.",
                    exit_code=1,
                    status="error",
                    limit_hit="processes",
                )
            finally:
                if pgid is not None:
                    await _reap(pgid)

        run_cmd = lang_config["run_cmd"].format(file=filepath, dir=tmpdir)
        remaining = max(1.0, timeout_seconds - (time.monotonic() - started_at))

        start_time = time.monotonic()
        refused_before = _pids_refused()
        proc = None
        pgid = None
        try:
            proc = await asyncio.create_subprocess_exec(
                *shlex.split(run_cmd),
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=tmpdir,
                # Makes the child a process-group leader, so one signal reaches
                # everything it starts. Without it a timed-out program's
                # descendants outlive it (see _reap).
                start_new_session=True,
                preexec_fn=apply_limits,
            )
            pgid = proc.pid  # it is its own group leader
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(input=stdin.encode()),
                timeout=remaining,
            )
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            out = stdout.decode(errors="replace")
            err = stderr.decode(errors="replace")

            if proc.returncode == 0:
                return _result(
                    stdout=out,
                    stderr=err,
                    exit_code=0,
                    execution_time_ms=elapsed_ms,
                    status="success",
                )

            limit = _limit_from_failure(err, proc.returncode)
            if limit != "processes" and _hit_process_cap(refused_before):
                limit = "processes"
            return _result(
                stdout=out,
                stderr=err,
                exit_code=proc.returncode,
                execution_time_ms=elapsed_ms,
                status="error",
                limit_hit=limit,
            )

            # Ordered before OSError deliberately: since Python 3.11 the builtin
            # TimeoutError — which asyncio.TimeoutError aliases — is a *subclass*
            # of OSError. With the clauses the other way round every timeout was
            # caught by the fork-failure handler, found not to be one, and
            # re-raised as a 500. The tests caught it; reading would not have.
        except asyncio.TimeoutError:
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            # A fork loop reaches the deadline only because something kept
            # refusing it processes. The deadline is the symptom; report the
            # cause, or the pupil is told to make their program faster when the
            # fix is to stop starting processes.
            if _hit_process_cap(refused_before):
                return _result(
                    stderr="Your program tried to start too many processes.",
                    exit_code=-1,
                    execution_time_ms=elapsed_ms,
                    status="error",
                    limit_hit="processes",
                )
            return _result(
                stderr=f"Time limit exceeded ({timeout_seconds}s)",
                exit_code=-1,
                execution_time_ms=elapsed_ms,
                status="timeout",
                limit_hit="time",
            )

        except OSError as exc:
            if not _is_fork_failure(exc):
                raise
            # The pupil's program ate the container's process budget, so the
            # runner cannot fork either. Their fault, their refusal — not a 500.
            return _result(
                stderr="Your program tried to start too many processes.",
                exit_code=1,
                execution_time_ms=int((time.monotonic() - start_time) * 1000),
                status="error",
                limit_hit="processes",
            )

        finally:
            # Every path, including the successful one. A program that exits
            # leaves its children behind unless somebody takes them.
            if pgid is not None:
                await _reap(pgid)
