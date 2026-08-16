"""What a stopped program leaves behind.

The runner starts a shell and, on timeout, kills it. Anything that shell started
survives and keeps consuming the same two processors — the concurrency problem
made worse, because the slot is freed while the work is not.

The assertion here is deliberately not "the request returned". It returned before
this change too, promptly and with a sensible-looking timeout result. That is
exactly how a leak like this stays invisible: everything the caller can see is
correct, and the damage is only visible from outside the request.
"""

from __future__ import annotations

import time

# A distinctive duration, so the process is unmistakable in a process list and
# cannot plausibly have exited on its own.
MARKER = "313"

SPAWNS_A_CHILD_THEN_HANGS = (
    "import subprocess, time\n"
    f"subprocess.Popen(['sleep', '{MARKER}'])\n"
    "print('child started', flush=True)\n"
    "time.sleep(120)\n"
)


def test_nothing_a_stopped_program_started_is_left_running(run_code, running_commands):
    before = [line for line in running_commands() if MARKER in line]
    assert not before, f"the marker process was already running before the test: {before}"

    result = run_code(
        "python",
        SPAWNS_A_CHILD_THEN_HANGS,
        timeout_seconds=5,
        http_timeout=120,
    )

    # The part that already worked: the pupil is told their program ran too long.
    assert result["limit_hit"] == "time", result
    assert result["status"] == "timeout"

    # A moment for the kill to land — a process group is signalled, not waited on.
    time.sleep(2)

    survivors = [line for line in running_commands() if MARKER in line]
    assert not survivors, (
        "a stopped program left descendants running, still holding the "
        f"processors the next pupil needs: {survivors}"
    )
