import asyncio
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

# What a runtime says when the kernel refuses it memory. Detecting the *cause*
# of a child's failure is the one place this service cannot simply know: with
# RLIMIT_DATA the kernel refuses the allocation and the runtime reports it in
# its own words, so there is nothing else to read.
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


async def _reap(proc) -> None:
    """Stop a program and everything it started.

    `proc.kill()` killed the process the runner launched and nothing beneath it.
    A program that spawned a child kept that child running after its own time
    allowance expired — still holding the processors the next pupil needs, while
    the slot it occupied had already been handed back. The request looked
    perfectly correct from the caller's side, which is how this survived.

    The child is a process-group leader (`start_new_session=True`), so one
    signal reaches every descendant. SIGTERM first, so a program that installed
    a handler gets to run it, then SIGKILL for anything still there.
    """
    try:
        group = os.getpgid(proc.pid)
    except ProcessLookupError:  # already gone
        return

    for sig in (signal.SIGTERM, signal.SIGKILL):
        try:
            os.killpg(group, sig)
        except ProcessLookupError:
            return
        try:
            await asyncio.wait_for(proc.wait(), timeout=1.0)
            return
        except asyncio.TimeoutError:
            continue


def _looks_out_of_memory(stderr: str, returncode: int | None) -> bool:
    """Did this child die because it ran out of its memory allowance?

    Two signals. The kernel's out-of-memory killer leaves SIGKILL, and a runtime
    whose allocation was refused says so. Neither is perfect alone, and the pair
    is honest about what it is: a best-effort reading of a failure the runner did
    not itself cause. Every other limit in this service is reported from
    something the runner knows for certain.
    """
    if returncode == -signal.SIGKILL:
        return True
    lowered = stderr.lower()
    return any(marker in lowered for marker in _OUT_OF_MEMORY_MARKERS)


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
            try:
                proc = await asyncio.create_subprocess_exec(
                    *shlex.split(compile_cmd),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=tmpdir,
                    start_new_session=True,
                    preexec_fn=apply_limits,
                )
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=compile_budget
                )
                if proc.returncode != 0:
                    text = stderr.decode(errors="replace")
                    memory = _looks_out_of_memory(text, proc.returncode)
                    return _result(
                        stderr=text,
                        exit_code=proc.returncode,
                        status="error",
                        limit_hit="memory" if memory else None,
                    )
            except asyncio.TimeoutError:
                await _reap(proc)
                return _result(
                    stderr="Compilation took longer than its time allowance",
                    exit_code=1,
                    status="timeout",
                    limit_hit="time",
                )

        run_cmd = lang_config["run_cmd"].format(file=filepath, dir=tmpdir)
        remaining = max(1.0, timeout_seconds - (time.monotonic() - started_at))

        start_time = time.monotonic()
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

            memory = _looks_out_of_memory(err, proc.returncode)
            return _result(
                stdout=out,
                stderr=err,
                exit_code=proc.returncode,
                execution_time_ms=elapsed_ms,
                status="error",
                limit_hit="memory" if memory else None,
            )

        except asyncio.TimeoutError:
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            await _reap(proc)
            return _result(
                stderr=f"Time limit exceeded ({timeout_seconds}s)",
                exit_code=-1,
                execution_time_ms=elapsed_ms,
                status="timeout",
                limit_hit="time",
            )
