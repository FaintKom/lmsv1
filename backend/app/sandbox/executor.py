import base64
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Judge0 CE (free, no auth required)
JUDGE0_URL = "https://ce.judge0.com"

# Map our language names to Judge0 language IDs (latest versions)
JUDGE0_LANGUAGES = {
    "python": 100,      # Python 3.12.5
    "javascript": 102,  # Node.js 22
    "java": 91,         # Java JDK 17
    "cpp": 105,         # C++ GCC 14
    "go": 107,          # Go 1.23.5
}


async def execute_code_remote(
    language: str,
    source_code: str,
    stdin: str = "",
    timeout_seconds: int = 10,
    memory_limit_mb: int = 256,
) -> dict:
    """Execute code via Judge0 CE API (free, sandboxed)."""
    lang_id = JUDGE0_LANGUAGES.get(language)
    if not lang_id:
        return {
            "stdout": "",
            "stderr": f"Unsupported language: {language}. Supported: {', '.join(JUDGE0_LANGUAGES.keys())}",
            "exit_code": 1,
            "execution_time_ms": 0,
            "status": "error",
        }

    # Judge0 accepts base64-encoded source code and stdin
    payload = {
        "language_id": lang_id,
        "source_code": base64.b64encode(source_code.encode()).decode(),
        "stdin": base64.b64encode(stdin.encode()).decode() if stdin else "",
        "cpu_time_limit": timeout_seconds,
        "memory_limit": memory_limit_mb * 1024,  # KB
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Submit and wait for result (synchronous mode)
            resp = await client.post(
                f"{JUDGE0_URL}/submissions?base64_encoded=true&wait=true",
                json=payload,
            )

            if resp.status_code != 200 and resp.status_code != 201:
                logger.error(f"Judge0 error: {resp.status_code} {resp.text}")
                return {
                    "stdout": "",
                    "stderr": f"Code execution service error: {resp.status_code}",
                    "exit_code": 1,
                    "execution_time_ms": 0,
                    "status": "error",
                }

            data = resp.json()

            # Decode base64 outputs
            stdout = ""
            stderr = ""
            compile_output = ""

            if data.get("stdout"):
                try:
                    stdout = base64.b64decode(data["stdout"]).decode(errors="replace")
                except Exception:
                    stdout = data["stdout"]

            if data.get("stderr"):
                try:
                    stderr = base64.b64decode(data["stderr"]).decode(errors="replace")
                except Exception:
                    stderr = data["stderr"]

            if data.get("compile_output"):
                try:
                    compile_output = base64.b64decode(data["compile_output"]).decode(errors="replace")
                except Exception:
                    compile_output = data["compile_output"]

            # Map Judge0 status to our status
            # Judge0 statuses: 1=In Queue, 2=Processing, 3=Accepted,
            # 4=Wrong Answer, 5=TLE, 6=Compilation Error,
            # 7-12=Runtime errors, 13=Internal Error, 14=Exec Format Error
            status_id = data.get("status", {}).get("id", 0)
            time_val = data.get("time")
            exec_time_ms = int(float(time_val) * 1000) if time_val else 0

            if status_id == 3:  # Accepted
                return {
                    "stdout": stdout,
                    "stderr": stderr,
                    "exit_code": 0,
                    "execution_time_ms": exec_time_ms,
                    "status": "success",
                }
            elif status_id == 5:  # Time Limit Exceeded
                return {
                    "stdout": stdout,
                    "stderr": f"Time limit exceeded ({timeout_seconds}s)",
                    "exit_code": -1,
                    "execution_time_ms": exec_time_ms,
                    "status": "timeout",
                }
            elif status_id == 6:  # Compilation Error
                return {
                    "stdout": "",
                    "stderr": compile_output or stderr,
                    "exit_code": 1,
                    "execution_time_ms": 0,
                    "status": "error",
                }
            else:  # Runtime errors, wrong answer, etc.
                error_msg = stderr or compile_output or data.get("status", {}).get("description", "Runtime error")
                return {
                    "stdout": stdout,
                    "stderr": error_msg,
                    "exit_code": data.get("exit_code") or 1,
                    "execution_time_ms": exec_time_ms,
                    "status": "error",
                }

    except httpx.TimeoutException:
        return {
            "stdout": "",
            "stderr": "Code execution service timed out. Please try again.",
            "exit_code": 1,
            "execution_time_ms": 0,
            "status": "timeout",
        }
    except Exception as e:
        logger.error(f"Judge0 request failed: {e}")
        return {
            "stdout": "",
            "stderr": "Code execution service is temporarily unavailable. Please try again later.",
            "exit_code": 1,
            "execution_time_ms": 0,
            "status": "error",
        }
