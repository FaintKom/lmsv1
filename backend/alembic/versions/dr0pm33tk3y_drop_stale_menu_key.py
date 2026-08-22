"""Drop the menu key of a feature that no longer exists.

`meetings` was the Jitsi video-room entry. The module, its pages and its table
went in specs/033; the schools' settings kept a `"meetings": true` beside the
items that still exist.

Nothing reads it — the sidebar looks the map up by the keys of items it knows
about — so this changes no behaviour. It removes a line that describes nothing,
before somebody reads a school's settings and believes it.

The settings form already writes the current list (`live`, not `meetings`), so
the key would also disappear the first time any school saved its settings. None
has since, and "somebody will eventually" is not a plan.

Revision ID: dr0pm33tk3y
Revises: z3a4b5c6d7e8
Create Date: 2026-08-22
"""

from __future__ import annotations

import json

import sqlalchemy as sa

from alembic import op

revision = "dr0pm33tk3y"
# Behind the exercise-library migration, not beside it: both were written
# against the same parent in parallel sessions, and two heads stop alembic
# dead on the next deploy.
down_revision = "z3a4b5c6d7e8"
branch_labels = None
depends_on = None

#: The item this removes. Named once, so the test and the statement cannot
#: disagree about which key is the dead one.
STALE_KEY = "meetings"


def _without_stale_key(settings: dict | None) -> dict | None:
    """New settings for this row, or None when there is nothing to do.

    Returning None rather than an unchanged copy is what keeps the migration
    from rewriting every school in the database to change nothing.

    A `menu_visibility` that is not a dictionary is left alone rather than
    raised on: one corrupt row must not take down the statement that every
    other school is behind.
    """
    if not isinstance(settings, dict):
        return None

    visibility = settings.get("menu_visibility")
    if not isinstance(visibility, dict) or STALE_KEY not in visibility:
        return None

    trimmed = {k: v for k, v in visibility.items() if k != STALE_KEY}
    return {**settings, "menu_visibility": trimmed}


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.text("SELECT id, settings FROM organizations WHERE settings IS NOT NULL")
    ).fetchall()

    for org_id, settings in rows:
        # The driver hands JSONB back as a dict; be tolerant of the one that
        # hands back text rather than assuming.
        if isinstance(settings, str):
            try:
                settings = json.loads(settings)
            except ValueError:
                continue

        updated = _without_stale_key(settings)
        if updated is None:
            continue

        bind.execute(
            sa.text("UPDATE organizations SET settings = CAST(:s AS jsonb) WHERE id = :id"),
            {"s": json.dumps(updated), "id": org_id},
        )


def downgrade() -> None:
    """Deliberately nothing.

    Putting the key back would restore a line describing a feature that does
    not exist — the very thing this removed. There is nothing to recover.
    """
