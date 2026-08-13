"""Linear systems: the solver behind the math_system exercise type.

The three outcomes are the topic itself — a class meets "no solution" and
"infinitely many" precisely here — so each gets its own test rather than being
folded into a happy path.
"""

import pytest
from httpx import AsyncClient

from app.math_validation.service import (
    MathParseError,
    solutions_match,
    solve_linear_system,
)
from tests.conftest import auth_header, make_course, make_lesson, make_module


class TestSolveLinearSystem:
    def test_unique_solution(self):
        result = solve_linear_system(["x + y = 5", "x - y = 1"], ["x", "y"])
        assert result["kind"] == "unique"
        assert result["values"] == {"x": "3", "y": "2"}

    def test_fractional_solution_stays_exact(self):
        # 0.5 as a float would start a rounding argument during marking.
        result = solve_linear_system(["2x = 1", "y = 3"], ["x", "y"])
        assert result["values"]["x"] == "1/2"

    def test_parallel_lines_have_no_solution(self):
        result = solve_linear_system(["x + y = 1", "x + y = 2"], ["x", "y"])
        assert result["kind"] == "none"

    def test_the_same_line_twice_has_infinitely_many(self):
        result = solve_linear_system(["x + y = 2", "2x + 2y = 4"], ["x", "y"])
        assert result["kind"] == "infinite"

    def test_one_equation_two_unknowns_is_infinite(self):
        result = solve_linear_system(["x + y = 2"], ["x", "y"])
        assert result["kind"] == "infinite"

    def test_three_variables(self):
        result = solve_linear_system(
            ["x + y + z = 6", "x - y = 0", "z = 3"],
            ["x", "y", "z"],
        )
        assert result["kind"] == "unique"
        assert result["values"] == {"x": "3/2", "y": "3/2", "z": "3"}

    def test_equation_without_equals_is_read_as_zero(self):
        result = solve_linear_system(["x - 4", "y - 1"], ["x", "y"])
        assert result["values"] == {"x": "4", "y": "1"}

    def test_implicit_multiplication(self):
        result = solve_linear_system(["2x + 3y = 12", "x - y = 1"], ["x", "y"])
        assert result["kind"] == "unique"
        assert result["values"] == {"x": "3", "y": "2"}


class TestSolverRefusals:
    def test_rejects_a_nonlinear_system(self):
        with pytest.raises(MathParseError):
            solve_linear_system(["x^2 + y = 1", "x - y = 0"], ["x", "y"])

    def test_rejects_an_empty_system(self):
        with pytest.raises(MathParseError):
            solve_linear_system([], ["x"])

    def test_caps_the_size_of_the_system(self):
        with pytest.raises(MathParseError, match="Too many equations"):
            solve_linear_system(["x = 1"] * 7, ["x"])
        with pytest.raises(MathParseError, match="Too many variables"):
            solve_linear_system(["a = 1"], ["a", "b", "c", "d", "e"])

    def test_rejects_a_variable_name_that_is_not_one(self):
        with pytest.raises(MathParseError, match="Invalid variable"):
            solve_linear_system(["x = 1"], ["__class__"])

    # The sanitiser is why this module has one parser and not two.
    def test_refuses_tokens_that_could_execute(self):
        for hostile in ["__import__('os')", "eval('1')", "x + exec('1')"]:
            with pytest.raises(MathParseError):
                solve_linear_system([f"{hostile} = 1"], ["x"])


class TestSolutionsMatch:
    VARS = ["x", "y"]
    EXPECTED = {"kind": "unique", "values": {"x": "3", "y": "2"}}

    def test_accepts_the_right_answer(self):
        given = {"kind": "unique", "values": {"x": "3", "y": "2"}}
        assert solutions_match(self.EXPECTED, given, self.VARS)

    def test_accepts_any_equivalent_form(self):
        # A student writing 6/2 has solved the system. Marking that wrong would
        # be marking the notation, not the maths.
        given = {"kind": "unique", "values": {"x": "6/2", "y": "4/2"}}
        assert solutions_match(self.EXPECTED, given, self.VARS)

    def test_accepts_a_decimal_for_a_fraction(self):
        expected = {"kind": "unique", "values": {"x": "1/2"}}
        assert solutions_match(expected, {"kind": "unique", "values": {"x": "0.5"}}, ["x"])

    def test_rejects_a_wrong_value(self):
        given = {"kind": "unique", "values": {"x": "3", "y": "5"}}
        assert not solutions_match(self.EXPECTED, given, self.VARS)

    def test_rejects_a_missing_variable(self):
        given = {"kind": "unique", "values": {"x": "3"}}
        assert not solutions_match(self.EXPECTED, given, self.VARS)

    def test_rejects_the_wrong_kind_of_answer(self):
        assert not solutions_match(self.EXPECTED, {"kind": "none"}, self.VARS)
        assert not solutions_match({"kind": "none"}, self.EXPECTED, self.VARS)

    def test_no_solution_needs_no_values(self):
        assert solutions_match({"kind": "none"}, {"kind": "none"}, self.VARS)
        assert solutions_match({"kind": "infinite"}, {"kind": "infinite"}, self.VARS)

    def test_rejects_unparseable_input_rather_than_raising(self):
        # Whatever a student types arrives here; it must mark wrong, not 500.
        given = {"kind": "unique", "values": {"x": ")(", "y": "2"}}
        assert not solutions_match(self.EXPECTED, given, self.VARS)


# ─── End to end through the API ──────────────────────────────────────


async def _make_system_exercise(client, db, teacher, org, config):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post(
        "/api/v1/exercises",
        json={
            "lesson_id": str(lesson.id),
            "exercise_type": "math_system",
            "title": "Solve the system",
            "config": config,
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_correct_answer_passes(client: AsyncClient, teacher, student, org, db):
    exercise_id = await _make_system_exercise(
        client,
        db,
        teacher,
        org,
        {"equations": ["x + y = 5", "x - y = 1"], "variables": ["x", "y"]},
    )
    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/submit",
        json={"interactive_answers": {"kind": "unique", "values": {"x": "3", "y": "2"}}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["passed"] is True


@pytest.mark.asyncio
async def test_wrong_answer_fails(client: AsyncClient, teacher, student, org, db):
    exercise_id = await _make_system_exercise(
        client,
        db,
        teacher,
        org,
        {"equations": ["x + y = 5", "x - y = 1"], "variables": ["x", "y"]},
    )
    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/submit",
        json={"interactive_answers": {"kind": "unique", "values": {"x": "1", "y": "4"}}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["passed"] is False


@pytest.mark.asyncio
async def test_recognising_no_solution_passes(client: AsyncClient, teacher, student, org, db):
    exercise_id = await _make_system_exercise(
        client,
        db,
        teacher,
        org,
        {"equations": ["x + y = 1", "x + y = 2"], "variables": ["x", "y"]},
    )
    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/submit",
        json={"interactive_answers": {"kind": "none"}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["passed"] is True


@pytest.mark.asyncio
async def test_config_carries_no_answer_for_the_student(
    client: AsyncClient, teacher, student, org, db
):
    """Integrity model B: there is nothing to strip, because nothing is stored.

    The equations are the whole config; the answer is solved at marking time.
    A student reading the payload finds no key to copy.
    """
    exercise_id = await _make_system_exercise(
        client,
        db,
        teacher,
        org,
        {"equations": ["x + y = 5", "x - y = 1"], "variables": ["x", "y"]},
    )
    resp = await client.get(f"/api/v1/exercises/{exercise_id}", headers=auth_header(student))
    assert resp.status_code == 200, resp.text
    config = resp.json()["config"]
    assert "solution" not in config
    assert "values" not in config
    assert config["equations"] == ["x + y = 5", "x - y = 1"]


@pytest.mark.asyncio
async def test_a_broken_config_is_refused_not_marked_wrong(
    client: AsyncClient, teacher, student, org, db
):
    # A student must not collect a fail for equations they cannot see.
    exercise_id = await _make_system_exercise(
        client,
        db,
        teacher,
        org,
        {"equations": ["x^2 + y = 1", "x - y = 0"], "variables": ["x", "y"]},
    )
    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/submit",
        json={"interactive_answers": {"kind": "unique", "values": {"x": "1", "y": "1"}}},
        headers=auth_header(student),
    )
    assert resp.status_code == 400
    assert "misconfigured" in resp.text
