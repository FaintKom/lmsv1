"""A class of twenty-five, and what happens when they all press Run.

This is the ordinary case, not an attack. It is also the moment a teacher
decides whether the platform is usable, so the assertions here are about the
whole class being served rather than about any one program working.
"""

from __future__ import annotations

import json
import re
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from conftest import SANDBOX_URL

CLASS_SIZE = 25

# Runs in well under a second on its own, so anything slower is queueing rather
# than computing.
QUICK = "print(21 * 2)"

# Occupies a slot for a while without burning a processor, so filling every slot
# does not also starve the runner itself.
SLOW = "import time\ntime.sleep(20)\nprint('done')"


def _submit(payload: dict, http_timeout: float) -> tuple[dict, float]:
    started = time.monotonic()
    request = urllib.request.Request(
        f"{SANDBOX_URL}/execute",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=http_timeout) as response:
        body = json.loads(response.read().decode())
    return body, time.monotonic() - started


def _ceilings_from_container(timeouts: list[int]) -> dict[int, float]:
    """The runner's own queue ceiling for each allowance, computed by the runner."""
    import subprocess

    from conftest import CONTAINER

    script = (
        "import json,sys;from runner.main import queue_ceiling_seconds;"
        f"print(json.dumps({{t: queue_ceiling_seconds(t) for t in {timeouts!r}}}))"
    )
    out = subprocess.run(
        ["docker", "exec", "-w", "/app", CONTAINER, "python3", "-c", script],
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert out.returncode == 0, out.stderr
    return {int(k): float(v) for k, v in json.loads(out.stdout).items()}


def test_a_whole_class_pressing_run_all_get_their_own_answer():
    """SC-002 and SC-003.

    Three assertions, because the first two pass today and the third does not:
    with no bound at all, twenty-five programs contend for the same processors
    and the slowest is dragged out by every other one.
    """
    payload = {
        "language": "python",
        "source_code": QUICK,
        "stdin": "",
        "timeout_seconds": 10,
        "memory_limit_mb": 256,
    }

    with ThreadPoolExecutor(max_workers=CLASS_SIZE) as pool:
        futures = [pool.submit(_submit, payload, 120) for _ in range(CLASS_SIZE)]
        outcomes = [future.result() for future in futures]

    bodies = [body for body, _ in outcomes]
    elapsed = [seconds for _, seconds in outcomes]

    assert len(bodies) == CLASS_SIZE
    assert all(body["stdout"].strip() == "42" for body in bodies), (
        "not every pupil got their own correct answer: "
        f"{[b['stdout'].strip() for b in bodies if b['stdout'].strip() != '42'][:3]}"
    )
    assert all(body["limit_hit"] is None for body in bodies), (
        f"somebody was refused: {[b['limit_hit'] for b in bodies if b['limit_hit']][:5]}"
    )
    assert max(elapsed) < 10, (
        f"the slowest pupil waited {max(elapsed):.1f}s for a program that runs in "
        "well under a second — the class is contending rather than queueing"
    )
    # The one that proves a bound exists rather than that the machine was fast.
    # Twenty-five submissions cannot all have run at once on a container with a
    # one-processor quota, so somebody must have waited. Without a bound every
    # queued_ms is zero and this fails — which is the whole point, because the
    # three assertions above pass today on a quick enough machine.
    assert any(body["queued_ms"] > 0 for body in bodies), (
        "nobody waited for a slot, so twenty-five programs ran at once — the "
        "class is contending for the processors, not queueing for them"
    )


def test_a_submission_beyond_capacity_waits_and_then_says_the_class_is_busy():
    """FR-008. Waiting is the owner's choice; the ceiling is what makes it safe.

    Every slot is filled with a long program, then one more arrives. It must come
    back saying the class is busy — not hang, and not fail as a network error,
    which is what an unbounded wait looks like from the outside.
    """
    slow = {
        "language": "python",
        "source_code": SLOW,
        "stdin": "",
        "timeout_seconds": 25,
        "memory_limit_mb": 256,
    }
    quick = {
        "language": "python",
        "source_code": QUICK,
        "stdin": "",
        "timeout_seconds": 10,
        "memory_limit_mb": 256,
    }

    # More long programs than any plausible bound, so the slots are certainly
    # full when the next submission arrives.
    with ThreadPoolExecutor(max_workers=12) as pool:
        holders = [pool.submit(_submit, slow, 120) for _ in range(12)]
        time.sleep(3)

        body, seconds = _submit(quick, 120)

        for future in holders:
            future.result()

    assert body["limit_hit"] == "busy", (
        "a submission arriving at a full sandbox was not told the class was busy. "
        f"limit_hit={body['limit_hit']} status={body['status']} "
        f"stdout={body['stdout'][:60]!r} after {seconds:.1f}s"
    )
    assert seconds < 30, f"it waited {seconds:.1f}s before saying so"


def test_the_caller_waits_longer_than_the_runner_can_take():
    """The timeout arithmetic, asserted from the real numbers.

        backend client timeout  >  queue ceiling + execution timeout + margin

    If that ordering breaks, the pupil sees a connection failure instead of the
    message this whole phase exists to produce — and it breaks silently, the
    moment somebody raises one of the three. A comment would not have caught it.
    """
    # Read the caller's timeout from its source rather than restating it here.
    # A copy of the number would agree with itself forever.
    source = Path(__file__).resolve().parents[2] / "backend" / "app" / "sandbox" / "executor.py"
    text = source.read_text(encoding="utf-8")
    match = re.search(r"AsyncClient\(timeout=timeout_seconds \+ (\d+)\)", text)
    assert match, (
        "the backend's sandbox client timeout is no longer written the way this test reads it"
    )
    client_margin = int(match.group(1))

    # Ask the container for its own ceilings rather than importing the module.
    # The runner uses `resource`, which does not exist on Windows, so a host
    # import would restrict this test to Linux developers — and asking the
    # running service is closer to the truth anyway.
    ceilings = _ceilings_from_container([5, 10, 30])

    for execution_timeout, ceiling in ceilings.items():
        # The caller allows execution_timeout + client_margin in total. The
        # runner may take up to ceiling + execution_timeout.
        assert ceiling + execution_timeout + 2 <= execution_timeout + client_margin, (
            f"at a {execution_timeout}s allowance the runner may take "
            f"{ceiling + execution_timeout}s while the caller waits only "
            f"{execution_timeout + client_margin}s"
        )
