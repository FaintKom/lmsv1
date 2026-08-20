"""Deleting an exercise or an assignment takes its block off the page.

A lesson page holds a *reference*, not the thing: `{"type": "exercise",
"exercise_id": "..."}`. Deleting the exercise used to leave that reference
pointing at nothing, and nobody was told. The pupil's player skips a block it
cannot resolve, so the lesson silently gets shorter; the teacher's editor
treats it as a block whose type has not been picked yet and offers the type
chooser. Neither says "this was deleted".

Four such blocks are sitting in production today, in published maths courses,
and each of those lessons was authored with two exercises and shows one.

These tests were written against the old behaviour first and run against it:
eight failed, five passed. The five that passed are the ones asserting that
something is *left alone* — the bystander lesson, the page numbering, and the
three shapes of non-page content. They pass for free, because before the fix
nothing was rewritten at all. A file made only of those would have been a
green suite proving nothing, which is why every one of them is paired with a
test that says what must change.

`test_another_school_keeps_its_lesson` belongs to that free-pass family too.
It is here anyway: it is the assertion that fails first if the cleanup is
ever written without its organisation filter.
"""

import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import (
    auth_header,
    make_assignment,
    make_course,
    make_exercise,
    make_lesson,
    make_module,
)


def block(kind: str, order: int, page: int = 1, **extra) -> dict:
    return {"id": f"b{order}", "type": kind, "sort_order": order, "page": page, **extra}


def pages(*page_blocks: list[dict]) -> dict:
    """Lesson content in the one shape the product stores."""
    return {
        "version": 3,
        "pages": [
            {"id": f"page_{i + 1}", "blocks": blocks} for i, blocks in enumerate(page_blocks)
        ],
    }


def blocks_of(lesson, page_index: int = 0) -> list[dict]:
    return lesson.content["pages"][page_index]["blocks"]


async def a_lesson_showing(db, org, teacher, content: dict):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    return await make_lesson(db, module.id, content=content)


async def delete_exercise_via_api(client: AsyncClient, teacher, exercise_id) -> int:
    resp = await client.delete(f"/api/v1/exercises/{exercise_id}", headers=auth_header(teacher))
    return resp.status_code


# ─── User Story 1: the reference goes ────────────────────────────────


async def test_deleting_an_exercise_takes_its_block_off_the_page(
    client: AsyncClient, db, org, teacher
):
    lesson = await a_lesson_showing(db, org, teacher, pages([]))
    ex = await make_exercise(db, lesson.id, org.id)
    lesson.content = pages(
        [
            block("text", 0, body="<p>Before.</p>"),
            block("exercise", 1, exercise_id=str(ex.id)),
            block("text", 2, body="<p>After.</p>"),
        ]
    )
    await db.flush()

    assert await delete_exercise_via_api(client, teacher, ex.id) == 200

    await db.refresh(lesson)
    kinds = [b["type"] for b in blocks_of(lesson)]
    assert kinds == ["text", "text"], "the exercise block should be gone, the text kept"
    assert not any(b.get("exercise_id") == str(ex.id) for b in blocks_of(lesson))


async def test_the_same_exercise_goes_from_every_page_that_showed_it(
    client: AsyncClient, db, org, teacher
):
    lesson = await a_lesson_showing(db, org, teacher, pages([]))
    ex = await make_exercise(db, lesson.id, org.id)
    lesson.content = pages(
        [block("exercise", 0, page=1, exercise_id=str(ex.id))],
        [
            block("text", 0, page=2, body="<p>Middle.</p>"),
            block("exercise", 1, page=2, exercise_id=str(ex.id)),
        ],
    )
    await db.flush()

    await delete_exercise_via_api(client, teacher, ex.id)

    await db.refresh(lesson)
    remaining = [b for p in lesson.content["pages"] for b in p["blocks"]]
    assert not any(b.get("exercise_id") == str(ex.id) for b in remaining)
    assert len(remaining) == 1, "only the text block survives"


async def test_the_same_exercise_goes_from_every_lesson_that_showed_it(
    client: AsyncClient, db, org, teacher
):
    first = await a_lesson_showing(db, org, teacher, pages([]))
    ex = await make_exercise(db, first.id, org.id)
    ref = block("exercise", 0, exercise_id=str(ex.id))
    first.content = pages([ref])
    second = await a_lesson_showing(db, org, teacher, pages([dict(ref)]))
    await db.flush()

    await delete_exercise_via_api(client, teacher, ex.id)

    await db.refresh(first)
    await db.refresh(second)
    assert blocks_of(first) == []
    assert blocks_of(second) == [], "a second lesson referencing it is cleaned too"


async def test_a_lesson_that_never_showed_it_is_left_alone(client: AsyncClient, db, org, teacher):
    """FR-005: the cleanup does not rewrite what it does not touch."""
    lesson = await a_lesson_showing(db, org, teacher, pages([]))
    ex = await make_exercise(db, lesson.id, org.id)
    bystander = await a_lesson_showing(
        db, org, teacher, pages([block("text", 0, body="<p>Untouched.</p>")])
    )
    before = bystander.content
    lesson.content = pages([block("exercise", 0, exercise_id=str(ex.id))])
    await db.flush()

    await delete_exercise_via_api(client, teacher, ex.id)

    await db.refresh(bystander)
    assert bystander.content == before


async def test_another_school_keeps_its_lesson(client: AsyncClient, db, org, org2, teacher):
    """Tenant isolation. Passes before the fix too — see the module docstring."""
    from app.auth.models import UserRole
    from tests.conftest import _make_user

    lesson = await a_lesson_showing(db, org, teacher, pages([]))
    ex = await make_exercise(db, lesson.id, org.id)

    other_teacher = _make_user(db, org2, UserRole.teacher, suffix="-other")
    await db.flush()
    theirs = await a_lesson_showing(
        db, org2, other_teacher, pages([block("exercise", 0, exercise_id=str(ex.id))])
    )
    before = theirs.content
    lesson.content = pages([block("exercise", 0, exercise_id=str(ex.id))])
    await db.flush()

    await delete_exercise_via_api(client, teacher, ex.id)

    await db.refresh(theirs)
    assert theirs.content == before, "another school's lesson is never rewritten"


# ─── User Story 2: order and page numbers ────────────────────────────


async def test_sort_order_closes_the_gap(client: AsyncClient, db, org, teacher):
    lesson = await a_lesson_showing(db, org, teacher, pages([]))
    ex = await make_exercise(db, lesson.id, org.id)
    lesson.content = pages(
        [
            block("text", 0, body="<p>0</p>"),
            block("exercise", 1, exercise_id=str(ex.id)),
            block("text", 2, body="<p>2</p>"),
            block("text", 3, body="<p>3</p>"),
            block("text", 4, body="<p>4</p>"),
        ]
    )
    await db.flush()

    await delete_exercise_via_api(client, teacher, ex.id)

    await db.refresh(lesson)
    assert [b["sort_order"] for b in blocks_of(lesson)] == [0, 1, 2, 3]


async def test_page_numbers_do_not_shift(client: AsyncClient, db, org, teacher):
    lesson = await a_lesson_showing(db, org, teacher, pages([]))
    ex = await make_exercise(db, lesson.id, org.id)
    lesson.content = pages(
        [block("text", 0, page=1, body="<p>One.</p>")],
        [block("exercise", 0, page=2, exercise_id=str(ex.id))],
        [block("text", 0, page=3, body="<p>Three.</p>")],
    )
    await db.flush()

    await delete_exercise_via_api(client, teacher, ex.id)

    await db.refresh(lesson)
    assert len(lesson.content["pages"]) == 3
    assert blocks_of(lesson, 2)[0]["page"] == 3, "the third page keeps its number"


# ─── User Story 3: the page survives ─────────────────────────────────


async def test_a_page_left_empty_is_still_a_page(client: AsyncClient, db, org, teacher):
    lesson = await a_lesson_showing(db, org, teacher, pages([]))
    ex = await make_exercise(db, lesson.id, org.id)
    lesson.content = pages(
        [block("text", 0, page=1, body="<p>One.</p>")],
        [block("exercise", 0, page=2, exercise_id=str(ex.id))],
    )
    await db.flush()

    await delete_exercise_via_api(client, teacher, ex.id)

    await db.refresh(lesson)
    assert len(lesson.content["pages"]) == 2, "the teacher's screen is not deleted for them"
    assert blocks_of(lesson, 1) == []


@pytest.mark.parametrize("odd", [{}, {"version": 2, "blocks": []}, {"body": "<p>Old.</p>"}])
async def test_content_that_is_not_pages_survives(client: AsyncClient, db, org, teacher, odd):
    lesson = await a_lesson_showing(db, org, teacher, pages([]))
    ex = await make_exercise(db, lesson.id, org.id)
    stranger = await a_lesson_showing(db, org, teacher, odd)
    lesson.content = pages([block("exercise", 0, exercise_id=str(ex.id))])
    await db.flush()

    assert await delete_exercise_via_api(client, teacher, ex.id) == 200

    await db.refresh(stranger)
    assert stranger.content == odd


# ─── Assignments take the same path (FR-008) ─────────────────────────


async def test_deleting_an_assignment_takes_its_block_too(client: AsyncClient, db, org, teacher):
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    assignment = await make_assignment(db, org.id, course.id, teacher.id)
    lesson = await make_lesson(
        db,
        module.id,
        content=pages(
            [
                block("text", 0, body="<p>Read this.</p>"),
                block("assignment", 1, assignment_id=str(assignment.id)),
            ]
        ),
    )
    await db.flush()

    resp = await client.delete(f"/api/v1/assignments/{assignment.id}", headers=auth_header(teacher))
    assert resp.status_code in (200, 204)

    await db.refresh(lesson)
    assert [b["type"] for b in blocks_of(lesson)] == ["text"]


# ─── Two deletions into one lesson (FR-010) ──────────────────────────


def test_the_lesson_row_is_locked_while_it_is_rewritten():
    """The cleanup is read-modify-write, so the row must be locked.

    Reproducing a lost update needs two concurrent transactions, which the
    single rolled-back session these tests run in cannot give. So this asserts
    the guard itself: the statement that reads lessons for rewriting carries
    FOR UPDATE. Drop `.with_for_update()` and this fails.

    It matters concretely: of the 24 unusable exercises being removed from
    production, 21 live in one lesson. Without the lock, deleting them
    concurrently would leave some of those blocks behind.
    """
    from app.courses.lesson_blocks import lessons_holding

    sql = str(lessons_holding(uuid.uuid4(), str(uuid.uuid4())))
    assert "FOR UPDATE" in sql.upper()
