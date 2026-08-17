"""How much a program may say.

Output is the one resource a program consumes on *our* side of the wire: the
runner buffers it, the backend carries it, and the browser renders it. A single
`while True: print(...)` fills the container's memory with a pipe buffer, and the
pupil's browser with a wall of text nobody can read.

FR-006: bounded, and the pupil is told it was cut short. Silent truncation is
worse than either — a pupil comparing their output against an expected value
cannot tell whether their program is wrong or their output was clipped.
"""

from __future__ import annotations

# Roughly 2MB, printed fast, in a program that also terminates on its own. A
# non-terminating one would be testing the time limit instead.
SHOUTS = "line = 'x' * 1000\nfor _ in range(2000):\n    print(line)\n"


def test_a_program_that_says_too_much_is_cut_short_and_says_so(run_code):
    result = run_code("python", SHOUTS, timeout_seconds=20)

    assert result["limit_hit"] == "output", (
        "a 2MB flood of output was carried in full rather than bounded. "
        f"limit_hit={result['limit_hit']} bytes={len(result['stdout'])}"
    )
    # The pupil keeps what fits, and is told the rest is gone.
    assert result["stdout"].startswith("x" * 100)
    assert "truncated" in result["stdout"].lower() or "truncated" in result["stderr"].lower(), (
        "the output was cut short without saying so, so a pupil comparing it "
        "against an expected value cannot tell why it does not match"
    )


def test_ordinary_output_is_untouched(run_code):
    """The control. Without it the assertion above passes on a runner that
    truncates everything, including a program that printed three lines."""
    result = run_code("python", "for i in range(3):\n    print(i)\n", timeout_seconds=15)

    assert result["stdout"] == "0\n1\n2\n"
    assert result["limit_hit"] is None
