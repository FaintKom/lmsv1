"""The lesson→pages conversion, tested on its own.

The migration itself walks a table; the decision it makes per row is this pure
function, so that is what the cases exercise. What matters is that nothing is
lost: a converted lesson holds exactly the blocks it held, and a shape pages
cannot express is left alone rather than blanked.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "p4g3sv3rs10n_lessons_to_pages.py"
)
_spec = importlib.util.spec_from_file_location("lessons_to_pages", MIGRATION)
_module = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_module)
as_pages = _module._as_pages


def test_v2_blocks_become_one_page_in_order():
    out = as_pages(
        {
            "version": 2,
            "blocks": [
                {"id": "b2", "type": "text", "sort_order": 1, "body": "second"},
                {"id": "b1", "type": "text", "sort_order": 0, "body": "first"},
            ],
        },
        "text",
    )
    assert out["version"] == 3
    assert len(out["pages"]) == 1
    assert [b["id"] for b in out["pages"][0]["blocks"]] == ["b1", "b2"]
    assert [b["sort_order"] for b in out["pages"][0]["blocks"]] == [0, 1]


def test_unversioned_block_list_is_converted_too():
    out = as_pages({"blocks": [{"id": "b1", "type": "text", "body": "hi"}]}, "text")
    assert out["version"] == 3
    assert out["pages"][0]["blocks"][0]["id"] == "b1"


def test_v1_text_lesson_becomes_a_text_block():
    out = as_pages({"body": "<p>Read me</p>", "format": "html"}, "text")
    block = out["pages"][0]["blocks"][0]
    assert block["type"] == "text"
    assert block["body"] == "<p>Read me</p>"


def test_v1_video_lesson_becomes_a_video_block():
    out = as_pages({"url": "https://example.test/v.mp4"}, "video")
    assert [b["type"] for b in out["pages"][0]["blocks"]] == ["video"]


def test_a_url_on_a_text_lesson_is_not_a_video():
    out = as_pages({"url": "https://example.test/v.mp4"}, "text")
    assert out is None  # nothing pages can hold; left as it is


def test_empty_content_becomes_a_blank_page():
    out = as_pages({}, "text")
    assert out == {"version": 3, "pages": [{"id": "page_1", "blocks": []}]}


def test_a_lesson_already_on_pages_is_left_alone():
    assert as_pages({"version": 3, "pages": []}, "text") is None


def test_a_legacy_typed_config_is_never_blanked():
    """A quiz lesson's config has no blocks and no body. Converting it would
    replace a lesson with an empty page — the exact failure this guards."""
    quiz = {"questions": [{"prompt": "2+2?", "options": ["3", "4"], "answer": 1}]}
    assert as_pages(quiz, "quiz") is None

    theory = {"title": "Slides", "source": {"kind": "gslides", "url": "https://x/embed"}}
    assert as_pages(theory, "theory") is None
