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


def test_fixture_configs_only_use_keys_the_product_declares():
    """A fixture key nobody reads is how three defects here started.

    The crossword shipped `grid_width`/`clues[]` while both readers wanted
    `words`, so the board was empty and the grader awarded full marks. The bubble
    sheet shipped `correct_answers` while both readers wanted `questions`, with
    the same two symptoms. The maths fixture shipped `success_condition`, which
    nothing anywhere reads, next to an instruction that contradicted what the
    template actually asks.

    All twenty-seven types declare a `*Config` model in `app/exercises/schemas.py`. Where one exists it is the closest thing to a
    written contract, so a fixture key outside it is either a typo or a field the
    product forgot to implement. A type that loses its model fails here rather than
    quietly dropping out of the check.
    """

    from app.exercises import schemas as schema_module

    newline = chr(10)

    fixtures = json.loads(_FIXTURES.read_text(encoding="utf-8"))["fixtures"]

    def config_model(exercise_type: str):
        name = "".join(part.capitalize() for part in exercise_type.split("_"))
        name = {"Robot2d": "Robot2D", "World3d": "World3D"}.get(name, name)
        return getattr(schema_module, f"{name}Config", None)

    unmodelled: list[str] = []
    problems: list[str] = []
    for fixture in fixtures:
        model = config_model(fixture["type"])
        if model is None:
            unmodelled.append(fixture["type"])
            continue
        declared = set(model.model_fields)
        extra = sorted(set(fixture.get("config") or {}) - declared)
        if extra:
            problems.append(f"{fixture['type']}: {extra} — not in {model.__name__}")

    assert not problems, "fixture keys nobody declares:" + newline + newline.join(problems)
    # Informational, and deliberately not an assertion: these types have no model
    # to check against, which is a gap in the schemas rather than in the fixtures.
    assert not unmodelled, (
        "these types have no config model, so nothing checks their fixture keys: "
        + ", ".join(sorted(unmodelled))
    )


def test_fixture_asset_paths_are_shipped_with_the_frontend():
    """A fixture that points at a file nobody serves leaves a pupil stuck.

    The map pin drop asked a pupil to tap a map at /static/qa-fixtures/world-map.png.
    Nothing serves /static: production answered 404, the widget drew a blank
    gradient, and the exercise could not be done. Measured through a student
    session on 2026-08-19.

    Anything the fixtures reference by absolute path has to exist under
    frontend/public, which Next serves from the site root.
    """
    public = _FIXTURES.parent.parent / "frontend" / "public"
    assert public.is_dir(), f"frontend/public not found at {public}"

    fixtures = json.loads(_FIXTURES.read_text(encoding="utf-8"))["fixtures"]
    missing = []
    checked = 0
    for fixture in fixtures:
        for key, value in (fixture.get("config") or {}).items():
            if not isinstance(value, str) or not value.startswith("/"):
                continue
            if not any(
                value.endswith(ext)
                for ext in (".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".zip")
            ):
                continue
            checked += 1
            if not (public / value.lstrip("/")).exists():
                missing.append(f"{fixture['type']}.{key} -> {value}")

    assert checked, "no asset paths in the fixtures — has the shape changed?"
    assert not missing, "fixtures point at files nobody ships: " + ", ".join(missing)
