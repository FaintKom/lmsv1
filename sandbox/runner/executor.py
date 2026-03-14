import asyncio
import os
import tempfile
import time

from runner.languages import LANGUAGES


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

    with tempfile.TemporaryDirectory() as tmpdir:
        filepath = os.path.join(tmpdir, filename)
        with open(filepath, "w") as f:
            f.write(source_code)

        # Compile if needed
        if lang_config["compile_cmd"]:
            compile_cmd = lang_config["compile_cmd"].format(file=filepath, dir=tmpdir)
            try:
                proc = await asyncio.create_subprocess_shell(
                    compile_cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=tmpdir,
                )
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
                if proc.returncode != 0:
                    return {
                        "stdout": "",
                        "stderr": stderr.decode(errors="replace"),
                        "exit_code": proc.returncode,
                        "execution_time_ms": 0,
                        "status": "error",
                    }
            except asyncio.TimeoutError:
                return {
                    "stdout": "",
                    "stderr": "Compilation timed out",
                    "exit_code": 1,
                    "execution_time_ms": 0,
                    "status": "timeout",
                }

        # Run
        run_cmd = lang_config["run_cmd"].format(file=filepath, dir=tmpdir)

        # Apply resource limits on Linux
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
            proc.kill()
            return {
                "stdout": "",
                "stderr": f"Time limit exceeded ({timeout_seconds}s)",
                "exit_code": -1,
                "execution_time_ms": elapsed_ms,
                "status": "timeout",
            }
