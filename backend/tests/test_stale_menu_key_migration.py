"""Мёртвый ключ в карте видимости меню, проверенный отдельно от таблицы.

Пункт «Meetings» удалён вместе с модулем Jitsi в specs/033, но в настройках
школ остался `"meetings": true`. Меню его игнорирует — оно читает карту по
ключам существующих пунктов, — поэтому вреда нет. Есть ложь: тот, кто откроет
настройки школы, прочтёт про пункт, которого в продукте нет.

Решение на строку таблицы принимает чистая функция — её и проверяем.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "dr0pm33tk3y_drop_stale_menu_key.py"
)
_spec = importlib.util.spec_from_file_location("stale_menu_key", MIGRATION)
_module = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_module)
without_stale_key = _module._without_stale_key


def test_the_dead_key_goes():
    before = {"menu_visibility": {"gradebook": True, "meetings": True}}
    assert without_stale_key(before) == {"menu_visibility": {"gradebook": True}}


def test_everything_else_in_the_map_stays_exactly_as_it_was():
    # Including the ones set to False. A school that hid its gradebook must
    # still have it hidden afterwards — this migration is about a key that
    # names nothing, not about what any school decided.
    before = {
        "menu_visibility": {
            "gradebook": False,
            "meetings": True,
            "live": True,
            "analytics": False,
        }
    }
    after = without_stale_key(before)
    assert after == {"menu_visibility": {"gradebook": False, "live": True, "analytics": False}}


def test_the_rest_of_the_settings_are_not_touched():
    before = {
        "display_name": "Prog School",
        "primary_color": "#54c13e",
        "menu_visibility": {"meetings": True},
    }
    after = without_stale_key(before)
    assert after["display_name"] == "Prog School"
    assert after["primary_color"] == "#54c13e"


def test_a_school_without_the_key_is_left_alone():
    # None means "no update for this row" — the migration writes nothing, and
    # a school that never had the key is not rewritten for nothing.
    assert without_stale_key({"menu_visibility": {"gradebook": True}}) is None


def test_a_school_with_no_map_and_a_school_with_no_settings_are_left_alone():
    assert without_stale_key({"display_name": "Prog School"}) is None
    assert without_stale_key({}) is None
    assert without_stale_key(None) is None


def test_a_map_that_is_not_a_map_is_left_alone_rather_than_crashing_the_run():
    # A corrupt row must not take the whole migration down with it. Every
    # school in the database is behind this one statement.
    assert without_stale_key({"menu_visibility": "meetings"}) is None
    assert without_stale_key({"menu_visibility": ["meetings"]}) is None
    assert without_stale_key({"menu_visibility": None}) is None


def test_running_it_twice_changes_nothing_the_second_time():
    before = {"menu_visibility": {"gradebook": True, "meetings": True}}
    once = without_stale_key(before)
    assert without_stale_key(once) is None


def test_the_original_is_not_mutated():
    # The migration reads a row, decides, and writes back. Mutating in place
    # would make "did anything change?" impossible to answer.
    before = {"menu_visibility": {"gradebook": True, "meetings": True}}
    without_stale_key(before)
    assert before["menu_visibility"] == {"gradebook": True, "meetings": True}
