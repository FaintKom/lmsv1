"""Fixtures for the sandbox runner's own tests.

These run against the **real QA container**, not an in-process copy of the app.
That is not a preference: every limit this service enforces is a property of the
container — its memory cap, its mount flags, its process cap, its syscall
filter. A test that imported `runner.main` and called it directly would exercise
none of them, and would pass on a laptop while the deployed thing was broken.
That is how `/tmp` came to be `noexec` in production without anyone noticing.

Bring the stack up first:

    docker compose -f docker-compose.qa.yml up -d --build sandbox

Then:

    python -m pytest sandbox/tests/ -q
"""

from __future__ import annotations

import json
import subprocess
import urllib.error
import urllib.request

import pytest

SANDBOX_URL = "http://localhost:8101"
CONTAINER = "lms-qa-sandbox-1"


def _post(payload: dict, *, http_timeout: float) -> dict:
    request = urllib.request.Request(
        f"{SANDBOX_URL}/execute",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=http_timeout) as response:
        return json.loads(response.read().decode())


@pytest.fixture(scope="session", autouse=True)
def _require_sandbox():
    """Fail loudly rather than skip silently.

    A suite that skips itself when the stack is down reports green and proves
    nothing, which is the failure constitution principle II exists to prevent.
    If the container is not there, say so and stop.
    """
    try:
        with urllib.request.urlopen(f"{SANDBOX_URL}/health", timeout=5) as response:
            assert json.loads(response.read().decode())["status"] == "ok"
    except (urllib.error.URLError, OSError) as exc:  # pragma: no cover - environment
        pytest.fail(
            f"The QA sandbox is not answering on {SANDBOX_URL}: {exc}. "
            "Start it with: docker compose -f docker-compose.qa.yml up -d --build sandbox"
        )


@pytest.fixture
def run_code():
    """Submit a program and return the parsed result.

    `http_timeout` is deliberately generous and separate from `timeout_seconds`:
    several tests are about what the *runner* does at its own deadline, so the
    client must not give up first and turn a result into a network error.
    """

    def _run(
        language: str,
        source_code: str,
        *,
        stdin: str = "",
        timeout_seconds: int = 10,
        memory_limit_mb: int = 256,
        http_timeout: float | None = None,
    ) -> dict:
        return _post(
            {
                "language": language,
                "source_code": source_code,
                "stdin": stdin,
                "timeout_seconds": timeout_seconds,
                "memory_limit_mb": memory_limit_mb,
            },
            http_timeout=http_timeout if http_timeout is not None else timeout_seconds + 60,
        )

    return _run


@pytest.fixture
def running_commands():
    """Every command line running inside the sandbox container, right now.

    Used to assert that nothing a stopped program started is still alive. The
    assertion has to be made from outside the request, because the request
    returned perfectly well before descendants were ever reaped.
    """

    def _snapshot() -> list[str]:
        out = subprocess.run(
            ["docker", "exec", CONTAINER, "ps", "-eo", "args"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        assert out.returncode == 0, out.stderr
        return [line.strip() for line in out.stdout.splitlines()[1:] if line.strip()]

    return _snapshot
