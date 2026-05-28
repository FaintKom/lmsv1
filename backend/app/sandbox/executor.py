import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Languages supported by the self-hosted sandbox runner (sandbox/runner/languages.py).
SUPPORTED_LANGUAGES = ("python", "javascript", "java", "cpp", "go")


async def execute_code_remote(
    language: str,
    source_code: str,
    stdin: str = "",
    timeout_seconds: int = 10,
    memory_limit_mb: int = 256,
) -> dict:
    """Execute untrusted student code via the self-hosted sandbox container.

    Routed to the in-cluster sandbox service (``settings.sandbox_url``) so code
    and any embedded personal data never leave our infrastructure. Previously
    this shipped student code to the public ce.judge0.com API — removed because
    sending children's submissions to an unvetted third party is a data-leak /
    exfiltration risk with no processing agreement.
    """
    if language not in SUPPORTED_LANGUAGES:
        return {
            "stdout": "",
            "stderr": f"Unsupported language: {language}. Supported: {', '.join(SUPPORTED_LANGUAGES)}",
            "exit_code": 1,
            "execution_time_ms": 0,
            "status": "error",
        }

    payload = {
        "language": language,
        "source_code": source_code,
        "stdin": stdin,
        "timeout_seconds": timeout_seconds,
        "memory_limit_mb": memory_limit_mb,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds + 30) as client:
            resp = await client.post(f"{settings.sandbox_url}/execute", json=payload)

        if resp.status_code != 200:
            logger.error("Sandbox error: %s %s", resp.status_code, resp.text)
            return {
                "stdout": "",
                "stderr": f"Code execution service error: {resp.status_code}",
                "exit_code": 1,
                "execution_time_ms": 0,
                "status": "error",
            }

        # Sandbox returns {stdout, stderr, exit_code, execution_time_ms, status}
        # — the exact shape callers expect.
        return resp.json()

    except httpx.TimeoutException:
        return {
            "stdout": "",
            "stderr": "Code execution service timed out. Please try again.",
            "exit_code": 1,
            "execution_time_ms": 0,
            "status": "timeout",
        }
    except Exception as e:
        logger.error("Sandbox request failed: %s", e)
        return {
            "stdout": "",
            "stderr": "Code execution service is temporarily unavailable. Please try again later.",
            "exit_code": 1,
            "execution_time_ms": 0,
            "status": "error",
        }
