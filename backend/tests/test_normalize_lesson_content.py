"""Regression tests for normalize_lesson_content (courses/service.py).

Guards the bug where legacy type-specific lessons (quiz / theory /
code_challenge / file_upload / interactive) had their config overwritten with
an empty v2 text block on the single-lesson GET, so the student saw a blank
lesson. These types must be returned UNCHANGED so the player falls back to the
legacy type-specific viewer (content.version !== 2).
"""
from __future__ import annotations

from app.courses.service import normalize_lesson_content


def test_text_lesson_with_body_converts_to_v2_text_block():
    lesson = {"content_type": "text", "content": {"body": "Hello", "format": "html"}}
    out = normalize_lesson_content(dict(lesson))
    assert out["content"]["version"] == 2
    blocks = out["content"]["blocks"]
    assert len(blocks) == 1
    assert blocks[0]["type"] == "text"
    assert blocks[0]["body"] == "Hello"


def test_video_lesson_converts_to_v2_video_block():
    lesson = {"content_type": "video", "content": {"url": "https://youtu.be/x"}}
    out = normalize_lesson_content(dict(lesson))
    assert out["content"]["version"] == 2
    assert out["content"]["blocks"][0]["type"] == "video"
    assert out["content"]["blocks"][0]["url"] == "https://youtu.be/x"


def test_already_v2_returned_unchanged():
    content = {"version": 2, "blocks": [{"id": "b0", "type": "text", "body": "hi"}]}
    out = normalize_lesson_content({"content_type": "text", "content": content})
    assert out["content"] is content


def test_interactive_legacy_content_preserved_not_blanked():
    # InteractiveBuilder writes type-specific config with no body/url/exercises.
    content = {
        "exercise_type": "true_false",
        "instruction": "Answer:",
        "statement": "Python is dynamically typed.",
        "correct_answer": True,
    }
    out = normalize_lesson_content({"content_type": "interactive", "content": dict(content)})
    # Must NOT have been converted to a v2 empty-text block.
    assert out["content"].get("version") != 2
    assert out["content"]["exercise_type"] == "true_false"
    assert out["content"]["statement"] == "Python is dynamically typed."


def test_quiz_legacy_content_preserved():
    content = {"questions": [{"prompt": "2+2?", "options": ["3", "4"], "answer": 1}]}
    out = normalize_lesson_content({"content_type": "quiz", "content": dict(content)})
    assert out["content"].get("version") != 2
    assert out["content"]["questions"][0]["prompt"] == "2+2?"


def test_theory_legacy_content_preserved():
    content = {"title": "Slides", "source": {"kind": "gslides", "url": "https://x/embed"}}
    out = normalize_lesson_content({"content_type": "theory", "content": dict(content)})
    assert out["content"].get("version") != 2
    assert out["content"]["source"]["kind"] == "gslides"


def test_exercise_rows_become_exercise_blocks():
    out = normalize_lesson_content(
        {"content_type": "interactive", "content": {}},
        exercises=[{"id": "e1"}, {"id": "e2"}],
    )
    assert out["content"]["version"] == 2
    types = [b["type"] for b in out["content"]["blocks"]]
    assert types == ["exercise", "exercise"]
