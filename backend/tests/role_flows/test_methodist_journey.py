"""Methodist happy path.

This file used to walk the methodist through the knowledge base (list
entries, view facets). That module went dormant on 2026-05-31 - the router
is not mounted in main.py and /api/v1/knowledge/* returns 404 - so those two
tests were removed on 2026-08-11 rather than left failing. Restore them
together with the router.

A methodist is modelled as role=teacher with is_methodist=True, so what is
left to assert here is the elevated view they get over a plain student.
"""


async def test_methodist_can_view_dashboard(role_client_factory):
    """Methodist (modelled as role=teacher) sees the admin dashboard
    because /admin/dashboard accepts admin OR teacher."""
    c = await role_client_factory("methodist")
    r = await c.get("/api/v1/admin/dashboard")
    assert r.status_code == 200, r.text
