"""Перенос хвостовых заданий в блоки, проверенный отдельно от таблицы.

Задание, привязанное к уроку полем `lesson_id`, но не показанное ни одним
блоком, ученик сегодня видит — плеер дорисовывает такие в конце урока. После
specs/030 урок читает только блоки, и без переноса эти задания исчезнут в
момент выката. На 2026-08-21 их в проде десять, одно с решениями учеников.

Решение на строку таблицы принимает чистая функция — её и проверяем.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "z3a4b5c6d7e8_exercise_library_lesson_optional.py"
)
_spec = importlib.util.spec_from_file_location("exercise_library", MIGRATION)
_module = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_module)
with_detached_blocks = _module._with_detached_blocks


def _text(block_id: str) -> dict:
    return {"id": block_id, "type": "text", "sort_order": 0, "page": 1, "body": "x"}


def _exercise(block_id: str, exercise_id: str) -> dict:
    return {
        "id": block_id,
        "type": "exercise",
        "sort_order": 0,
        "page": 1,
        "exercise_id": exercise_id,
    }


def test_detached_exercise_gets_a_block_at_the_end_of_the_last_page():
    content = {
        "version": 3,
        "pages": [
            {"id": "page_1", "blocks": [_text("b1")]},
            {"id": "page_2", "blocks": [_text("b2")]},
        ],
    }
    out = with_detached_blocks(content, ["e1"])

    assert out is not None
    assert [b["id"] for b in out["pages"][0]["blocks"]] == ["b1"]
    last = out["pages"][1]["blocks"]
    assert [b["id"] for b in last] == ["b2", "adopted_e1"]
    assert last[1] == {
        "id": "adopted_e1",
        "type": "exercise",
        "sort_order": 1,
        "page": 2,
        "exercise_id": "e1",
    }


def test_already_shown_exercise_is_not_duplicated():
    content = {"version": 3, "pages": [{"id": "page_1", "blocks": [_exercise("b1", "e1")]}]}
    assert with_detached_blocks(content, ["e1"]) is None


def test_nothing_to_add_means_nothing_changes():
    content = {"version": 3, "pages": [{"id": "page_1", "blocks": [_text("b1")]}]}
    assert with_detached_blocks(content, []) is None


def test_order_follows_the_list_the_player_used():
    # Плеер показывал хвост в порядке `sort_order` заданий — тот же порядок
    # приходит сюда списком, и он сохраняется.
    content = {"version": 3, "pages": [{"id": "page_1", "blocks": []}]}
    out = with_detached_blocks(content, ["e2", "e1"])
    assert [b["exercise_id"] for b in out["pages"][0]["blocks"]] == ["e2", "e1"]


def test_a_lesson_with_no_pages_gets_one():
    # Старый формат: `extractPages` на фронте даёт такому уроку одну пустую
    # страницу, и плеер показывал хвост под ней. Делаем так же.
    out = with_detached_blocks({"content_type": "text", "body": "старое"}, ["e1"])
    assert out["version"] == 3
    assert len(out["pages"]) == 1
    assert out["pages"][0]["blocks"][0]["exercise_id"] == "e1"


def test_existing_blocks_are_left_untouched():
    content = {
        "version": 3,
        "pages": [{"id": "page_1", "blocks": [_text("b1"), _exercise("b2", "e9")]}],
    }
    out = with_detached_blocks(content, ["e1"])
    assert out["pages"][0]["blocks"][:2] == content["pages"][0]["blocks"]
