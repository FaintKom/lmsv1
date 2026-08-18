"""The seeded fixtures have to be solvable by the answers they ship with.

`qa/exercise-fixtures.json` feeds `seed_qa.py`, `seed_corner_cases.py` and the
Kitchen Sink course, so a broken entry reaches the Playwright gate, the corner-case
stand and the course a human clicks through, all at once.

Measured 2026-08-18: the `code_challenge` fixture shipped `def add(a, b): return
a + b` as its reference solution while its test cases fed `1 2` on stdin and
expected `3` on stdout. The sandbox ran it, it printed nothing, and both cases
failed. Nothing in the pipeline noticed, because the one check that does this,
`scripts/check_python_content.py`, only reads the authored course content.
"""

import json
import pathlib
import subprocess
import sys

import pytest

_FIXTURES = pathlib.Path(__file__).resolve().parents[2] / "qa" / "exercise-fixtures.json"


def _python_code_challenges() -> list[dict]:
    data = json.loads(_FIXTURES.read_text(encoding="utf-8"))
    return [
        f
        for f in data["fixtures"]
        if f["type"] == "code_challenge"
        and (f.get("config") or {}).get("language", "python") == "python"
        and f.get("test_cases")
    ]


def _run(code: str, stdin: str, timeout: int = 10) -> tuple[bool, str]:
    """Run a solution the way the sandbox does: stdin in, stdout out."""
    try:
        proc = subprocess.run(
            [sys.executable, "-c", code],
            input=stdin + "\n",
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return False, f"timed out after {timeout}s"
    if proc.returncode != 0:
        return False, (proc.stderr.strip().splitlines() or ["non-zero exit"])[-1]
    return True, proc.stdout


def test_code_challenge_fixtures_pass_their_own_tests():
    """Every seeded code challenge is solved by its own reference solution.

    Nothing else asserts this. A student meeting an exercise whose model answer
    fails is left guessing what shape of program the tests want, and the class
    average then says the exercise is hard rather than broken.
    """
    fixtures = _python_code_challenges()
    assert fixtures, "no python code_challenge fixture found — did the file move?"

    failures: list[str] = []
    for fixture in fixtures:
        solution = fixture["config"]["solution_code"]
        for case in fixture["test_cases"]:
            ok, output = _run(solution, case["input"])
            if not ok:
                failures.append(f"{fixture['type']} on {case['input']!r}: {output}")
                continue
            expected = case["expected_output"].strip()
            if output.strip() != expected:
                failures.append(
                    f"{fixture['type']} on {case['input']!r}: "
                    f"expected {expected!r}, got {output.strip()!r}"
                )

    assert not failures, "reference solution fails its own tests:\n" + "\n".join(failures)


def test_code_challenge_starter_is_not_the_solution():
    """A starter copied from the answer teaches nothing.

    Deliberately weak: reading starter and solution together is a human job. This
    catches the accident, not the judgement.
    """
    for fixture in _python_code_challenges():
        cfg = fixture["config"]
        starter = (cfg.get("starter_code") or "").strip()
        solution = cfg["solution_code"].strip()
        assert starter, f"{fixture['type']}: no starter_code"
        assert starter != solution, f"{fixture['type']}: starter_code is the solution"


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
