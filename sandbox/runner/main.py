import asyncio
import logging
import os
import tempfile
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel

from runner.executor import EXEC_DIR, execute_code
from runner.languages import LANGUAGES

# Without this the module logger has no handler and the root level is WARNING,
# so every INFO below is discarded — which would have left FR-016 ("each limit is
# observable in the service's own logs when it fires") satisfied in the source
# and not in the container. uvicorn configures only its own loggers, so nothing
# here collides with them.
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(name)s: %(message)s")
logger = logging.getLogger(__name__)


async def _warm_go_cache() -> None:
    """Compile a throwaway Go program once, at startup.

    Go's build cache lives on a tmpfs, so it is empty every time the container
    starts. Measured in the QA container: the first build takes **8.0s** and
    every later one 0.2s. With the time allowance now covering compilation, a
    10-second exercise gives compilation 5 seconds — so the first pupil to
    attempt a Go exercise after any deploy would have timed out, and the second
    would have been fine, which is about the worst bug shape there is.

    Paying that 8 seconds here means no pupil ever does. Best-effort: if it
    fails the service still starts, because a cold cache is slow rather than
    broken.
    """
    source = 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println(1)\n}\n'
    try:
        os.makedirs(EXEC_DIR, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=EXEC_DIR) as tmpdir:
            path = os.path.join(tmpdir, "warm.go")
            with open(path, "w") as handle:
                handle.write(source)
            proc = await asyncio.create_subprocess_exec(
                "go",
                "build",
                "-o",
                os.path.join(tmpdir, "warm.out"),
                path,
                cwd=tmpdir,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        if proc.returncode == 0:
            logger.info("Go build cache warmed")
        else:
            logger.warning("Go cache warm-up failed: %s", stderr.decode(errors="replace")[:200])
    except Exception as exc:  # pragma: no cover - startup best effort
        logger.warning("Go cache warm-up skipped: %s", exc)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await _warm_go_cache()
    yield


def available_cpus() -> float:
    """How many processors this container may actually use.

    From `cpu.max`, never `nproc`. `nproc` reports the *host's* processors and
    knows nothing about the quota: measured in QA it says 4 where the container
    is granted 1.0, and in production it says 2 where the container is granted
    2.0. Being right in production by coincidence is exactly why the wrong
    reading survives review — it is only wrong on every developer machine and in
    CI, where nobody is looking at the sandbox's capacity.

    Falls back to `os.cpu_count()` when the file is absent, which is the case
    outside a cgroup v2 container.
    """
    try:
        with open("/sys/fs/cgroup/cpu.max") as handle:
            quota, period = handle.read().split()
        if quota != "max":
            return int(quota) / int(period)
    except (OSError, ValueError):
        pass
    return float(os.cpu_count() or 1)


def concurrency_limit() -> int:
    """How many programs run at once.

    A small multiple of the quota rather than a large one, because executions
    are mostly processor-bound: two per available processor keeps a processor
    busy while another program is starting up or writing its output, without
    letting twenty-five programs contend for two cores.

    Overridable, because the right multiple is a measurement (SC-003) rather
    than a belief, and the box it runs on may change before this code does.
    """
    override = os.environ.get("SANDBOX_MAX_CONCURRENT")
    if override:
        try:
            return max(1, int(override))
        except ValueError:
            logger.warning("SANDBOX_MAX_CONCURRENT=%r is not a number; ignoring", override)
    return max(2, int(available_cpus()) * 2)


def queue_ceiling_seconds(timeout_seconds: int) -> float:
    """How long a submission may wait for a slot before being told to try again.

    Derived from the execution allowance rather than configured separately, so
    the two cannot drift apart when somebody raises one. The caller allows
    `timeout_seconds + 30` (backend/app/sandbox/executor.py), and the runner may
    take `ceiling + timeout_seconds`, so the ceiling must stay well under 30
    however large the allowance grows — hence the cap rather than a plain
    fraction.

    A test asserts that ordering from the real numbers, because a comment cannot.
    """
    return min(15.0, max(2.0, timeout_seconds * 1.0))


_slots = asyncio.Semaphore(concurrency_limit())

app = FastAPI(title="LMS Code Sandbox", lifespan=lifespan)


class ExecutionRequest(BaseModel):
    language: str
    source_code: str
    stdin: str = ""
    timeout_seconds: int = 10
    memory_limit_mb: int = 256


class ExecutionResult(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    execution_time_ms: int
    status: str  # "success", "error", "timeout", "memory_limit"

    # Which allowance stopped this execution, if any. Null when the program
    # finished on its own terms. A closed set — see specs/002-sandbox-hardening/
    # data-model.md — because the point is that a pupil is told *which* limit
    # they hit, and free text cannot be rendered into that sentence.
    #
    # Callers must treat an unrecognised value as a generic refusal rather than
    # as success, which is what lets a new limit be added without touching them.
    limit_hit: str | None = None

    # How long this request waited for a free slot. Zero when it ran at once.
    # Kept out of execution_time_ms on purpose: a pupil's program did not take
    # four seconds because it spent three of them queuing.
    queued_ms: int = 0


@app.post("/execute", response_model=ExecutionResult)
async def run_code(request: ExecutionRequest):
    if request.language not in LANGUAGES:
        return ExecutionResult(
            stdout="",
            stderr=f"Unsupported language: {request.language}",
            exit_code=1,
            execution_time_ms=0,
            status="error",
        )

    # Wait for a slot, but not forever. The owner chose waiting over refusing:
    # during a lesson, being told "no" while a neighbour is still computing is
    # worse than waiting three seconds. The ceiling is what makes that choice
    # safe — an unbounded wait is a button that never answers.
    ceiling = queue_ceiling_seconds(request.timeout_seconds)
    queue_started = time.monotonic()
    try:
        await asyncio.wait_for(_slots.acquire(), timeout=ceiling)
    except asyncio.TimeoutError:
        logger.info(
            "sandbox busy: refused after %.1fs waiting, %d slot(s) in use",
            ceiling,
            concurrency_limit(),
        )
        return ExecutionResult(
            stdout="",
            stderr="The class is busy right now. Try running your program again in a moment.",
            exit_code=1,
            execution_time_ms=0,
            status="error",
            limit_hit="busy",
            queued_ms=int(ceiling * 1000),
        )

    queued_ms = int((time.monotonic() - queue_started) * 1000)
    try:
        result = await execute_code(
            language=request.language,
            source_code=request.source_code,
            stdin=request.stdin,
            timeout_seconds=request.timeout_seconds,
            memory_limit_mb=request.memory_limit_mb,
        )
    finally:
        # Released here rather than after the response is built, so a stopped
        # program's slot is free the instant it stops (FR-010).
        _slots.release()

    result["queued_ms"] = queued_ms
    if result.get("limit_hit"):
        logger.info(
            "limit %s fired after %dms queued, %d concurrent allowed",
            result["limit_hit"],
            queued_ms,
            concurrency_limit(),
        )
    return result


@app.get("/languages")
async def list_languages():
    return {"languages": list(LANGUAGES.keys())}


@app.get("/health")
async def health():
    return {"status": "ok"}
