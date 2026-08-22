"""Drop the dead `meetings` key from every school's menu visibility map.

Revision ID: m3nukeycl3an
Revises: z3a4b5c6d7e8
Create Date: 2026-08-22

`dr0pm33t1ng5` dropped the meetings table when Jitsi left the product, and the
menu item went with it. What neither touched was `organizations.settings`, where
each school keeps a map of "menu item key -> show it or not". Two schools in
production still carry `"meetings": true` there, pointing at a menu item that
has not existed since.

Nothing reads it: the sidebar asks the map about the items it has, so a key
nobody asks about changes nothing. This is rubbish in data a human reads, not a
bug — and it does not clear itself, because only the settings form writes that
map and neither school has saved settings since.

Rerun-safe by its WHERE clause rather than by a separate guard: once the key is
gone no row matches, and a second pass reports UPDATE 0. That matters on this
project, where a deploy can replay a revision.
"""

from alembic import op

revision = "m3nukeycl3an"
down_revision = "z3a4b5c6d7e8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # jsonb_exists() rather than the `?` operator: a bare question mark inside
    # SQL is a parameter placeholder for some drivers, and the breakage lands
    # somewhere other than the line that caused it. The function is the same
    # test without that argument.
    #
    # jsonb_typeof() skips both a school with no map at all and one whose map is
    # somehow not an object — `- 'meetings'` would raise on the latter.
    op.execute(
        """
        UPDATE organizations
        SET settings = jsonb_set(
            settings,
            '{menu_visibility}',
            (settings -> 'menu_visibility') - 'meetings'
        )
        WHERE jsonb_typeof(settings -> 'menu_visibility') = 'object'
          AND jsonb_exists(settings -> 'menu_visibility', 'meetings')
        """
    )


def downgrade() -> None:
    # Nothing to put back. The key pointed at a menu item that no longer exists,
    # so restoring it would restore rubbish — and a downgrade that re-created it
    # would leave the database in a state no version of the code wants.
    pass
