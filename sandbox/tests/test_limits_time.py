"""A program that waits for input nobody is going to send.

From spec.md's edge cases. It is not an attack and not even a mistake — an
exercise author writes a task that reads a line, a pupil tests it against a case
with no input, and the program blocks on stdin.

What must not happen is that it holds one of four slots until its whole time
allowance expires. Twenty-five pupils doing the ordinary thing would then queue
behind four programs waiting for nothing.
"""

from __future__ import annotations

READS_A_LINE = "value = input()\nprint('got', value)\n"


def test_a_program_reading_absent_input_ends_rather_than_waiting(run_code):
    """stdin is closed after what the exercise supplies, so `input()` gets EOF.

    If the runner left the pipe open instead, this would take its full ten
    seconds and return a timeout. The assertion is on the clock as well as the
    outcome, because "it ended" and "it ended promptly" are different claims and
    only the second keeps a slot free.
    """
    result = run_code("python", READS_A_LINE, stdin="", timeout_seconds=10)

    assert result["limit_hit"] != "time", (
        "a program reading absent input held its slot until the time allowance "
        f"expired: {result['execution_time_ms']}ms"
    )
    assert result["execution_time_ms"] < 5000, (
        f"it ended, but only after {result['execution_time_ms']}ms — a slot was "
        "held for a program waiting on nothing"
    )
    # Python's own answer to EOF on input(). The pupil should see their own
    # error, which is the truthful one: they asked for input that was not there.
    assert "EOFError" in result["stderr"] or "got" in result["stdout"]


def test_input_that_is_supplied_still_arrives(run_code):
    """The control: closing stdin must not mean nobody can read it."""
    result = run_code("python", READS_A_LINE, stdin="hello\n", timeout_seconds=10)

    assert result["stdout"].strip() == "got hello"
    assert result["limit_hit"] is None
