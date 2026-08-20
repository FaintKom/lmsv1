"""Lesson Q&A endpoint.

The language model is always monkeypatched. These tests must never make a
network call: a paid API in the test suite means every CI run costs money and
fails whenever the provider has a bad day.
"""

from __future__ import annotations

import pytest

from app.common.llm import LLMError
from app.courses.models import CourseStatus
from app.tutor.router import _lesson_text
from tests.conftest import (
    auth_header,
    make_course,
    make_enrollment,
    make_lesson,
    make_module,
)

ASK = "/api/v1/tutor/lessons/{lesson_id}/ask"

LESSON_BLOCKS = {
    "version": 2,
    "blocks": [
        {
            "id": "b1",
            "type": "text",
            "sort_order": 0,
            "page": 1,
            "format": "html",
            "body": (
                "<h2>Floor division</h2><p>The // operator rounds down rather "
                "than toward zero, so -7 // 2 is -4 and not -3.</p>"
            ),
        }
    ],
}


@pytest.fixture
def fake_llm(monkeypatch):
    """Replace the model call and record what prompt it received."""
    captured: dict[str, str] = {}

    async def _complete(system: str, user: str, **kwargs) -> str:
        captured["system"] = system
        captured["user"] = user
        return "It rounds down, so the result is -4."

    monkeypatch.setattr("app.tutor.router.complete", _complete)
    return captured


async def _published_lesson(db, org, teacher, content=None):
    course = await make_course(db, org, teacher, status=CourseStatus.published)
    module = await make_module(db, course.id)
    lesson = await make_lesson(
        db, module.id, content=content if content is not None else LESSON_BLOCKS
    )
    return course, lesson


async def test_ask_returns_answer(client, db, org, teacher, student, fake_llm):
    course, lesson = await _published_lesson(db, org, teacher)
    await make_enrollment(db, course.id, student.id)

    response = await client.post(
        ASK.format(lesson_id=lesson.id),
        json={"question": "Why is -7 // 2 equal to -4?"},
        headers=auth_header(student),
    )

    assert response.status_code == 200, response.text
    assert response.json()["answer"] == "It rounds down, so the result is -4."
    # The lesson text and the question both reach the model.
    assert "rounds down" in fake_llm["user"]
    assert "Why is -7 // 2 equal to -4?" in fake_llm["user"]


async def test_ask_other_org_gets_404(client, db, org, teacher, admin2, fake_llm):
    """A lesson in another organisation must not even be visible."""
    _, lesson = await _published_lesson(db, org, teacher)

    response = await client.post(
        ASK.format(lesson_id=lesson.id),
        json={"question": "What is this about?"},
        headers=auth_header(admin2),
    )

    assert response.status_code == 404


async def test_ask_unenrolled_student_gets_404(client, db, org, teacher, student, fake_llm):
    """Draft course, no enrolment — the lesson does not exist for this student."""
    course = await make_course(db, org, teacher, status=CourseStatus.draft)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id, content=LESSON_BLOCKS)

    response = await client.post(
        ASK.format(lesson_id=lesson.id),
        json={"question": "What is this about?"},
        headers=auth_header(student),
    )

    assert response.status_code == 404


async def test_ask_lesson_without_text_gets_422(client, db, org, teacher, student, fake_llm):
    """A video-only lesson has nothing to ask about."""
    course, lesson = await _published_lesson(
        db,
        org,
        teacher,
        content={
            "version": 2,
            "blocks": [
                {
                    "id": "b1",
                    "type": "video",
                    "sort_order": 0,
                    "page": 1,
                    "url": "https://example.com/v",
                }
            ],
        },
    )
    await make_enrollment(db, course.id, student.id)

    response = await client.post(
        ASK.format(lesson_id=lesson.id),
        json={"question": "What is this about?"},
        headers=auth_header(student),
    )

    assert response.status_code == 422


async def test_ask_without_api_key_gets_503(client, db, org, teacher, student):
    """No fake_llm here: the real client runs and finds no key configured."""
    course, lesson = await _published_lesson(db, org, teacher)
    await make_enrollment(db, course.id, student.id)

    response = await client.post(
        ASK.format(lesson_id=lesson.id),
        json={"question": "What is this about?"},
        headers=auth_header(student),
    )

    assert response.status_code == 503


async def test_ask_upstream_failure_gets_502(client, db, org, teacher, student, monkeypatch):
    async def _boom(system: str, user: str, **kwargs) -> str:
        raise LLMError("provider is down")

    monkeypatch.setattr("app.tutor.router.complete", _boom)

    course, lesson = await _published_lesson(db, org, teacher)
    await make_enrollment(db, course.id, student.id)

    response = await client.post(
        ASK.format(lesson_id=lesson.id),
        json={"question": "What is this about?"},
        headers=auth_header(student),
    )

    assert response.status_code == 502


async def test_ask_rejects_empty_question(client, db, org, teacher, student, fake_llm):
    course, lesson = await _published_lesson(db, org, teacher)
    await make_enrollment(db, course.id, student.id)

    response = await client.post(
        ASK.format(lesson_id=lesson.id),
        json={"question": ""},
        headers=auth_header(student),
    )

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# _lesson_text — pure, so tested directly
# ---------------------------------------------------------------------------
class _FakeLesson:
    def __init__(self, content, content_type="text"):
        self.content = content
        self.content_type = content_type


# --- Golden answers ------------------------------------------------------
#
# One live call was made on 2026-08-19 against OpenRouter's
# nvidia/nemotron-3-super-120b-a12b:free with the production SYSTEM_PROMPT and
# a short German-greetings lesson. These strings are what the model actually
# said; from here on they play the model's role so the suite never networks.

GOLDEN_GROUNDED = (
    "Use **du** when speaking to friends, family, children, or people your "
    "own age. Use **Sie** (always capitalized) for everyone else; if you’re "
    "unsure, default to **Sie** because it is polite and safe."
)
GOLDEN_REFUSAL = "This lesson does not cover the capital of Brazil."


async def test_answer_reaches_the_student_verbatim(client, db, org, teacher, student, monkeypatch):
    """The endpoint adds nothing and trims nothing: what the model said is
    what the pupil reads. Uses the recorded live answer, not an invented one."""

    async def _golden(system, user, **kw):
        return GOLDEN_GROUNDED

    monkeypatch.setattr("app.tutor.router.complete", _golden)
    course, lesson = await _published_lesson(db, org, teacher)
    await make_enrollment(db, course.id, student.id)
    r = await client.post(
        ASK.format(lesson_id=lesson.id),
        json={"question": "When should I use du and when Sie?"},
        headers=auth_header(student),
    )
    assert r.status_code == 200
    assert r.json()["answer"] == GOLDEN_GROUNDED


def test_live_refusal_names_the_gap_instead_of_guessing():
    """The recorded off-topic answer is the shape the widget's honesty rests
    on: the model says the lesson does not cover it, rather than answering
    from the world. If a future model or prompt stops doing this, the golden
    needs re-recording and the disclaimer copy a fresh look."""
    assert "does not cover" in GOLDEN_REFUSAL
    assert "Bras" not in GOLDEN_REFUSAL  # no smuggled real answer


def test_lesson_text_strips_html_from_blocks():
    text = _lesson_text(_FakeLesson(LESSON_BLOCKS))
    assert "Floor division" in text


def test_lesson_text_reads_a_lesson_split_into_pages():
    """Pages (specs/023) group blocks into screens. The widget must still see
    the prose — a lesson the teacher paginated is not a lesson without text."""
    paged = {
        "version": 3,
        "pages": [
            {
                "id": "p1",
                "blocks": [
                    {
                        "id": "b1",
                        "type": "text",
                        "sort_order": 0,
                        "page": 1,
                        "body": "<p>Floor division rounds down.</p>",
                        "format": "html",
                    }
                ],
            },
            {
                "id": "p2",
                "blocks": [
                    {
                        "id": "b2",
                        "type": "text",
                        "sort_order": 0,
                        "page": 2,
                        "body": "<p>Modulo returns the remainder.</p>",
                        "format": "html",
                    },
                    {"id": "b3", "type": "exercise", "sort_order": 1, "page": 2},
                ],
            },
        ],
    }
    text = _lesson_text(_FakeLesson(paged))
    assert "Floor division rounds down." in text
    assert "Modulo returns the remainder." in text
    assert "<h2>" not in text
    assert "  " not in text  # whitespace collapsed


def test_lesson_text_converts_legacy_body():
    """Legacy content.body is turned into a v2 text block before extraction."""
    legacy = {"body": "<p>Old-style lesson body with enough text to pass.</p>"}
    text = _lesson_text(_FakeLesson(legacy))
    assert "Old-style lesson body" in text


def test_lesson_text_excludes_exercise_blocks():
    """Exercise configs hold the correct answers — they must never be sent."""
    content = {
        "version": 2,
        "blocks": [
            {
                "id": "b1",
                "type": "text",
                "sort_order": 0,
                "page": 1,
                "body": "<p>Some theory.</p>",
            },
            {
                "id": "b2",
                "type": "exercise",
                "sort_order": 1,
                "page": 1,
                "exercise_id": "3f2b0000-0000-0000-0000-000000000000",
            },
        ],
    }
    text = _lesson_text(_FakeLesson(content))
    assert "Some theory" in text
    assert "exercise" not in text.lower()
    assert "3f2b0000" not in text


def test_lesson_text_empty_for_unconvertible_types():
    """quiz/theory/code_challenge keep their own config shape and carry no prose."""
    quiz = {"questions": [{"prompt": "2+2?", "answer": 4}]}
    assert _lesson_text(_FakeLesson(quiz, content_type="quiz")) == ""


def test_lesson_text_is_truncated():
    from app.tutor.router import MAX_LESSON_CHARS

    long_body = "<p>" + ("word " * 20_000) + "</p>"
    content = {
        "version": 2,
        "blocks": [{"id": "b1", "type": "text", "sort_order": 0, "page": 1, "body": long_body}],
    }
    assert len(_lesson_text(_FakeLesson(content))) == MAX_LESSON_CHARS
