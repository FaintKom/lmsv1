import asyncio
import logging
import os
import tempfile
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel

from runner.executor import EXEC_DIR, execute_code
from runner.languages import LANGUAGES

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

    result = await execute_code(
        language=request.language,
        source_code=request.source_code,
        stdin=request.stdin,
        timeout_seconds=request.timeout_seconds,
        memory_limit_mb=request.memory_limit_mb,
    )
    return result


@app.get("/languages")
async def list_languages():
    return {"languages": list(LANGUAGES.keys())}


@app.get("/health")
async def health():
    return {"status": "ok"}
