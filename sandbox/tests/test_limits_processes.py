"""The cheapest attack there is: create processes until nothing else can start.

It needs no skill and no knowledge of the platform. A pupil who reads about fork
bombs on the internet can write one in three lines.

The second assertion is the one that matters. A fork bomb that is stopped while
leaving the service unusable for everybody else has not been contained — it has
merely been survived, which is a different and much weaker claim.
"""

from __future__ import annotations

FORK_BOMB = "import os\nwhile True:\n    os.fork()\n"


def test_a_fork_bomb_is_stopped_and_the_next_pupil_still_works(run_code):
    bomb = run_code("python", FORK_BOMB, timeout_seconds=5, http_timeout=180)

    assert bomb["limit_hit"] == "processes", (
        "a program that forks without limit was not refused for processes. "
        f"limit_hit={bomb['limit_hit']} status={bomb['status']} "
        f"stderr={bomb['stderr'][:200]}"
    )

    # The point of the whole story. An attack that takes the lesson down with it
    # has cost twenty-five people their work rather than one person their
    # submission.
    after = run_code("python", "print(6 * 7)", timeout_seconds=10, http_timeout=180)
    assert after["stdout"].strip() == "42", (
        "the sandbox did not recover: the next submission after the fork bomb "
        f"returned status={after['status']} stderr={after['stderr'][:200]}"
    )
    assert after["limit_hit"] is None
