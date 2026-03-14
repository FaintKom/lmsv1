from fastapi import FastAPI

from runner.executor import execute_code
from runner.languages import LANGUAGES

app = FastAPI(title="LMS Code Sandbox")


class ExecuteRequest:
    pass


from pydantic import BaseModel


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
