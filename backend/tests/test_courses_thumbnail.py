"""Course picture via PUT /courses/{id} — specs/016-authoring-quick-fixes US1.

The endpoint predates the fix (the UI never exposed it); these tests pin the
contract the new course-editor control relies on: set, clear, absent-field
no-op, and cross-org isolation with a positive control.
"""

from tests.conftest import auth_header, make_course

THUMB = "/api/v1/courses/images/" + "a" * 32 + ".png"
THUMB2 = "/api/v1/courses/images/" + "b" * 32 + ".webp"


async def test_thumbnail_set_replace_clear_and_unset(client, db, org, teacher):
    course = await make_course(db, org, teacher)
    headers = auth_header(teacher)

    # Set
    r = await client.put(
        f"/api/v1/courses/{course.id}", json={"thumbnail_url": THUMB}, headers=headers
    )
    assert r.status_code == 200
    assert r.json()["thumbnail_url"] == THUMB

    # Replace
    r = await client.put(
        f"/api/v1/courses/{course.id}", json={"thumbnail_url": THUMB2}, headers=headers
    )
    assert r.status_code == 200
    assert r.json()["thumbnail_url"] == THUMB2

    # Absent field leaves it unchanged (exclude_unset semantics)
    r = await client.put(f"/api/v1/courses/{course.id}", json={"title": "Renamed"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["thumbnail_url"] == THUMB2

    # Explicit null clears it
    r = await client.put(
        f"/api/v1/courses/{course.id}", json={"thumbnail_url": None}, headers=headers
    )
    assert r.status_code == 200
    assert r.json()["thumbnail_url"] is None


async def test_thumbnail_cross_org_reads_as_404(client, db, org, teacher, admin2):
    """Another school's admin cannot touch the picture — and the course reads
    as absent, not forbidden. Positive control first: the owner CAN set it,
    so a green run can't come from a broken endpoint."""
    course = await make_course(db, org, teacher)

    r = await client.put(
        f"/api/v1/courses/{course.id}",
        json={"thumbnail_url": THUMB},
        headers=auth_header(teacher),
    )
    assert r.status_code == 200  # positive control

    r = await client.put(
        f"/api/v1/courses/{course.id}",
        json={"thumbnail_url": "/api/v1/courses/images/" + "c" * 32 + ".png"},
        headers=auth_header(admin2),
    )
    assert r.status_code == 404

    # And the value is untouched
    r = await client.get(f"/api/v1/courses/{course.id}", headers=auth_header(teacher))
    assert r.status_code == 200
    assert r.json()["thumbnail_url"] == THUMB
