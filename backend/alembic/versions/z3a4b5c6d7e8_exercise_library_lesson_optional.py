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


def upgrade() -> None:
    bind = op.get_bind()

    if not _lesson_id_is_nullable(bind):
        op.alter_column("exercises", "lesson_id", existing_type=sa.UUID(), nullable=True)

    if _constraint_exists(bind):
        op.drop_constraint(CONSTRAINT, "exercises", type_="foreignkey")
    op.create_foreign_key(
        CONSTRAINT, "exercises", "lessons", ["lesson_id"], ["id"], ondelete="SET NULL"
    )


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
