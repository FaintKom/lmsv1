"""Solids: the formulas behind the stereometry exercise type.

The interesting cases are not the volumes — those are one multiplication
each. They are the ones where a wrong formula still looks plausible: a
pyramid's slant height measured to a corner instead of a base edge, a cone's
lateral area using the height instead of the slant, a sphere asked for its
"lateral" area, and a config that cannot be computed at all, which has to
refuse the exercise rather than fail the student.
"""

import math

import pytest
from httpx import AsyncClient

from app.math_validation.solids import SolidError, compute, dimensions_for
from tests.conftest import auth_header, make_course, make_lesson, make_module


class TestVolume:
    def test_box(self):
        assert compute("box", {"a": 2, "b": 3, "c": 4}, "volume") == 24

    def test_pyramid_is_a_third_of_its_box(self):
        assert compute("pyramid", {"a": 3, "h": 4}, "volume") == pytest.approx(12)

    def test_cylinder(self):
        assert compute("cylinder", {"r": 2, "h": 5}, "volume") == pytest.approx(20 * math.pi)

    def test_cone_is_a_third_of_its_cylinder(self):
        cylinder = compute("cylinder", {"r": 3, "h": 7}, "volume")
        cone = compute("cone", {"r": 3, "h": 7}, "volume")
        assert cone == pytest.approx(cylinder / 3)

    def test_sphere(self):
        assert compute("sphere", {"r": 3}, "volume") == pytest.approx(36 * math.pi)


class TestArea:
    def test_box_surface_and_lateral_differ_by_the_two_bases(self):
        d = {"a": 2, "b": 3, "c": 4}
        lateral = compute("box", d, "lateral_area")
        surface = compute("box", d, "surface_area")
        assert lateral == 40
        assert surface - lateral == 2 * 2 * 3

    def test_pyramid_slant_height_goes_to_the_base_edge(self):
        # a = 6, h = 4 gives an apothem of 5 — the 3-4-5 triangle. Measuring
        # to a corner instead would give sqrt(4^2 + (3*sqrt2)^2) ~= 5.83 and a
        # lateral area near 70 rather than 60.
        assert compute("pyramid", {"a": 6, "h": 4}, "lateral_area") == pytest.approx(60)
        assert compute("pyramid", {"a": 6, "h": 4}, "surface_area") == pytest.approx(96)

    def test_cylinder(self):
        d = {"r": 2, "h": 5}
        assert compute("cylinder", d, "lateral_area") == pytest.approx(20 * math.pi)
        assert compute("cylinder", d, "surface_area") == pytest.approx(28 * math.pi)

    def test_cone_uses_slant_height_not_height(self):
        # r = 3, h = 4 gives slant 5, so the lateral area is 15pi, not 12pi.
        assert compute("cone", {"r": 3, "h": 4}, "lateral_area") == pytest.approx(15 * math.pi)
        assert compute("cone", {"r": 3, "h": 4}, "surface_area") == pytest.approx(24 * math.pi)

    def test_a_sphere_has_no_base_to_leave_out(self):
        assert compute("sphere", {"r": 2}, "lateral_area") == compute(
            "sphere", {"r": 2}, "surface_area"
        )


class TestRefusals:
    def test_unknown_solid(self):
        with pytest.raises(SolidError):
            compute("dodecahedron", {"a": 1}, "volume")

    def test_unknown_quantity(self):
        with pytest.raises(SolidError):
            compute("box", {"a": 1, "b": 1, "c": 1}, "diagonal")

    def test_missing_measurement(self):
        with pytest.raises(SolidError):
            compute("box", {"a": 1, "b": 2}, "volume")

    def test_zero_and_negative_are_not_solids(self):
        with pytest.raises(SolidError):
            compute("sphere", {"r": 0}, "volume")
        with pytest.raises(SolidError):
            compute("cylinder", {"r": 2, "h": -1}, "volume")

    def test_a_string_measurement_is_refused_not_coerced(self):
        with pytest.raises(SolidError):
            compute("sphere", {"r": "3"}, "volume")

    def test_true_is_not_one(self):
        # bool is an int in Python; without the guard a sphere of radius True
        # would quietly have radius 1.
        with pytest.raises(SolidError):
            compute("sphere", {"r": True}, "volume")

    def test_dimensions_for_lists_what_a_solid_needs(self):
        assert dimensions_for("cone") == ("r", "h")
        with pytest.raises(SolidError):
            dimensions_for("torus")


# ─── End to end through the API ──────────────────────────────────────


async def _make_solid_exercise(client, db, teacher, org, config):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post(
        "/api/v1/exercises",
        json={
            "lesson_id": str(lesson.id),
            "exercise_type": "stereometry",
            "title": "Find the volume",
            "config": config,
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


BOX = {"solid": "box", "dimensions": {"a": 2, "b": 3, "c": 4}, "quantity": "volume"}
CONE = {"solid": "cone", "dimensions": {"r": 3, "h": 4}, "quantity": "volume"}


@pytest.mark.asyncio
async def test_correct_answer_passes(client: AsyncClient, teacher, student, org, db):
    exercise_id = await _make_solid_exercise(client, db, teacher, org, BOX)
    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/submit",
        json={"interactive_answers": {"value": 24}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["passed"] is True


@pytest.mark.asyncio
async def test_wrong_answer_fails(client: AsyncClient, teacher, student, org, db):
    exercise_id = await _make_solid_exercise(client, db, teacher, org, BOX)
    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/submit",
        json={"interactive_answers": {"value": 26}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["passed"] is False


@pytest.mark.asyncio
async def test_rounding_to_the_asked_places_is_accepted(
    client: AsyncClient, teacher, student, org, db
):
    # The cone's volume is 12pi = 37.699111..., and a student rounding to two
    # places types 37.7. Marking that wrong would mark the rounding.
    exercise_id = await _make_solid_exercise(client, db, teacher, org, CONE)
    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/submit",
        json={"interactive_answers": {"value": 37.7}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["passed"] is True


@pytest.mark.asyncio
async def test_a_number_of_places_further_out_still_passes(
    client: AsyncClient, teacher, student, org, db
):
    exercise_id = await _make_solid_exercise(client, db, teacher, org, CONE)
    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/submit",
        json={"interactive_answers": {"value": 37.699}},
        headers=auth_header(student),
    )
    assert resp.json()["passed"] is True


@pytest.mark.asyncio
async def test_an_unrounded_wrong_answer_still_fails(
    client: AsyncClient, teacher, student, org, db
):
    exercise_id = await _make_solid_exercise(client, db, teacher, org, CONE)
    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/submit",
        json={"interactive_answers": {"value": 37.5}},
        headers=auth_header(student),
    )
    assert resp.json()["passed"] is False


@pytest.mark.asyncio
async def test_a_blank_answer_fails_rather_than_erroring(
    client: AsyncClient, teacher, student, org, db
):
    exercise_id = await _make_solid_exercise(client, db, teacher, org, BOX)
    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/submit",
        json={"interactive_answers": {}},
        headers=auth_header(student),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["passed"] is False


@pytest.mark.asyncio
async def test_a_broken_config_is_refused_not_marked_wrong(
    client: AsyncClient, teacher, student, org, db
):
    # A negative edge cannot be a solid. The student must not carry the cost
    # of a config they cannot see, so this is a 400 rather than a failed
    # attempt against their record.
    exercise_id = await _make_solid_exercise(
        client,
        db,
        teacher,
        org,
        {"solid": "box", "dimensions": {"a": -2, "b": 3, "c": 4}, "quantity": "volume"},
    )
    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/submit",
        json={"interactive_answers": {"value": 24}},
        headers=auth_header(student),
    )
    assert resp.status_code == 400, resp.text


@pytest.mark.asyncio
async def test_the_student_config_carries_no_answer(client: AsyncClient, teacher, student, org, db):
    exercise_id = await _make_solid_exercise(client, db, teacher, org, BOX)
    resp = await client.get(
        f"/api/v1/exercises/{exercise_id}",
        headers=auth_header(student),
    )
    assert resp.status_code == 200, resp.text
    config = resp.json()["config"]
    assert "answer" not in config and "value" not in config
    assert config["dimensions"] == {"a": 2, "b": 3, "c": 4}
