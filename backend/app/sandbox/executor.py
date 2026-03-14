import httpx

from app.config import settings


async def execute_code_remote(
    language: str,
    source_code: str,
    stdin: str = "",
    timeout_seconds: int = 10,
    memory_limit_mb: int = 256,
) -> dict:
    """Send code to the sandbox microservice for execution."""
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
