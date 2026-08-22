"""an exercise may belong to a school and to no lesson (specs/030)

Revision ID: z3a4b5c6d7e8
Revises: dr0pm33t1ng5
Create Date: 2026-08-21 16:00:00.000000

Две вещи, обе на живой таблице.

`lesson_id` перестаёт быть обязательным: задание существует в библиотеке до
того, как его куда-нибудь поставили, и остаётся после того, как его оттуда
убрали.

Внешний ключ переходит с `CASCADE` на `SET NULL`. С каскадом удаление урока
уносило задания вместе с решениями учеников — а урок удаляют, чтобы убрать
урок.

Шаги рерун-безопасны: `_run_setup` в lifespan делает `create_all` до
`alembic upgrade` и повторяет часть шагов на каждом старте, поэтому перед
каждым `ALTER` состояние проверяется.
"""

import json
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "z3a4b5c6d7e8"
down_revision: Union[str, None] = "dr0pm33t1ng5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CONSTRAINT = "exercises_lesson_id_fkey"


def _lesson_id_is_nullable(bind) -> bool:
    columns = sa.inspect(bind).get_columns("exercises")
    return next(c["nullable"] for c in columns if c["name"] == "lesson_id")


def _constraint_exists(bind) -> bool:
    names = [fk["name"] for fk in sa.inspect(bind).get_foreign_keys("exercises")]
    return CONSTRAINT in names


def _with_detached_blocks(content: dict | None, exercise_ids: list[str]) -> dict | None:
    """Содержимое урока с блоками для заданий, которых в нём ещё нет.

    Возвращает новое содержимое или None, если дописывать нечего: так шаг
    остаётся рерун-безопасным — второй прогон не тронет ни одной строки.

    Блоки встают в конец последней страницы в том порядке, в каком пришёл
    список, — это порядок, в котором плеер показывал хвост ученику, так что
    после переноса он видит ровно то же, что видел.
    """
    content = dict(content or {})
    pages = [dict(p) for p in (content.get("pages") or []) if isinstance(p, dict)]

    shown: set[str] = set()
    for page in pages:
        for block in page.get("blocks") or []:
            if isinstance(block, dict) and block.get("exercise_id"):
                shown.add(str(block["exercise_id"]))

    missing = [eid for eid in exercise_ids if eid not in shown]
    if not missing:
        return None

    # Урок старого формата страниц не имеет; на фронте `extractPages` даёт ему
    # одну пустую страницу, и хвост показывался под ней.
    if not pages:
        pages = [{"id": "page_1", "blocks": []}]

    last = dict(pages[-1])
    blocks = list(last.get("blocks") or [])
    page_number = len(pages)
    for eid in missing:
        blocks.append(
            {
                "id": f"adopted_{eid}",
                "type": "exercise",
                "sort_order": len(blocks),
                "page": page_number,
                "exercise_id": eid,
            }
        )
    last["blocks"] = blocks
    pages[-1] = last

    return {**content, "version": 3, "pages": pages}


def _adopt_detached_exercises(bind) -> int:
    """Часть 2: каждому заданию с уроком и без блока — блок.

    Пока `lesson_id` ещё пишут, хвостовое задание может появиться между
    выкатом и миграцией, поэтому шаг не выбрасывается, даже если сегодня
    переносить нечего. Возвращает число изменённых уроков.
    """
    rows = bind.execute(
        sa.text(
            """
            SELECT e.lesson_id, e.id
            FROM exercises e
            WHERE e.lesson_id IS NOT NULL
            ORDER BY e.lesson_id, e.sort_order, e.created_at
            """
        )
    ).fetchall()

    by_lesson: dict[str, list[str]] = {}
    for lesson_id, exercise_id in rows:
        by_lesson.setdefault(str(lesson_id), []).append(str(exercise_id))

    changed = 0
    for lesson_id, exercise_ids in by_lesson.items():
        row = bind.execute(
            sa.text("SELECT content FROM lessons WHERE id = :i"), {"i": lesson_id}
        ).fetchone()
        if row is None:
            continue
        content = row[0]
        if isinstance(content, str):
            content = json.loads(content)
        updated = _with_detached_blocks(content, exercise_ids)
        if updated is None:
            continue
        bind.execute(
            sa.text("UPDATE lessons SET content = CAST(:c AS jsonb) WHERE id = :i"),
            {"c": json.dumps(updated), "i": lesson_id},
        )
        changed += 1
    return changed


def upgrade() -> None:
    bind = op.get_bind()

    if not _lesson_id_is_nullable(bind):
        op.alter_column("exercises", "lesson_id", existing_type=sa.UUID(), nullable=True)

    if _constraint_exists(bind):
        op.drop_constraint(CONSTRAINT, "exercises", type_="foreignkey")
    op.create_foreign_key(
        CONSTRAINT, "exercises", "lessons", ["lesson_id"], ["id"], ondelete="SET NULL"
    )

    # Часть 2 — данные. Плеер перестаёт дорисовывать хвост «задания урока»
    # (читает только блоки), и без этого шага задания, привязанные к уроку
    # полем, исчезли бы для ученика в момент выката.
    _adopt_detached_exercises(bind)


def downgrade() -> None:
    bind = op.get_bind()

    # Заданий без урока к этому моменту может не быть — но если есть, вернуть
    # NOT NULL нельзя, не выдумав им урок. Такие удаляются: они появились уже
    # после этой миграции и в старой модели существовать не могут.
    op.execute("DELETE FROM exercises WHERE lesson_id IS NULL")

    if _constraint_exists(bind):
        op.drop_constraint(CONSTRAINT, "exercises", type_="foreignkey")
    op.create_foreign_key(
        CONSTRAINT, "exercises", "lessons", ["lesson_id"], ["id"], ondelete="CASCADE"
    )

    if _lesson_id_is_nullable(bind):
        op.alter_column("exercises", "lesson_id", existing_type=sa.UUID(), nullable=False)
