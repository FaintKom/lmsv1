import asyncio
import logging
import os
import tempfile
import time

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

LANGUAGES = {
    "python": {
        "extension": ".py",
        "compile_cmd": None,
        "run_cmd": "python3 {file}",
    },
    "javascript": {
        "extension": ".js",
        "compile_cmd": None,
        "run_cmd": "node {file}",
    },
}


async def _execute_locally(
    language: str,
    source_code: str,
    stdin: str = "",
    timeout_seconds: int = 10,
    memory_limit_mb: int = 256,
) -> dict:
    """Execute code directly on the server (fallback when sandbox is unavailable)."""
    lang_config = LANGUAGES.get(language)
    if not lang_config:
        return {
            "stdout": "",
            "stderr": f"Language '{language}' is not available in fallback mode. Supported: {', '.join(LANGUAGES.keys())}",
            "exit_code": 1,
            "execution_time_ms": 0,
            "status": "error",
        }

    ext = lang_config["extension"]
    with tempfile.TemporaryDirectory() as tmpdir:
        filepath = os.path.join(tmpdir, f"solution{ext}")
        with open(filepath, "w") as f:
            f.write(source_code)

        run_cmd = lang_config["run_cmd"].format(file=filepath, dir=tmpdir)

        # Apply memory limits on Linux
        ulimit_prefix = (
            f"ulimit -v {memory_limit_mb * 1024} 2>/dev/null; "
            if os.name != "nt"
            else ""
        )
        full_cmd = f"{ulimit_prefix}{run_cmd}"

        start_time = time.monotonic()
        try:
            proc = await asyncio.create_subprocess_shell(
                full_cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=tmpdir,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(input=stdin.encode()),
                timeout=timeout_seconds,
            )
            elapsed_ms = int((time.monotonic() - start_time) * 1000)

            return {
                "stdout": stdout.decode(errors="replace"),
                "stderr": stderr.decode(errors="replace"),
                "exit_code": proc.returncode,
                "execution_time_ms": elapsed_ms,
                "status": "success" if proc.returncode == 0 else "error",
            }
        except asyncio.TimeoutError:
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            try:
                proc.kill()
            except Exception:
                pass
            return {
                "stdout": "",
                "stderr": f"Time limit exceeded ({timeout_seconds}s)",
                "exit_code": -1,
                "execution_time_ms": elapsed_ms,
                "status": "timeout",
            }


async def execute_code_remote(
    language: str,
    source_code: str,
    stdin: str = "",
    timeout_seconds: int = 10,
    memory_limit_mb: int = 256,
) -> dict:
    """Send code to sandbox microservice, fall back to local execution."""
    try:
        async with httpx.AsyncClient(timeout=timeout_seconds + 10) as client:
            response = await client.post(
                f"{settings.sandbox_url}/execute",
                json={
                    "language": language,
                    "source_code": source_code,
                    "stdin": stdin,
                    "timeout_seconds": timeout_seconds,
                    "memory_limit_mb": memory_limit_mb,
                },
            )
            return response.json()
    except Exception as e:
        logger.info(f"Sandbox unavailable ({e}), using local execution")
        return await _execute_locally(
            language, source_code, stdin, timeout_seconds, memory_limit_mb
        )
