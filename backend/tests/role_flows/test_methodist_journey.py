"""Methodist happy path: log in -> browse knowledge entries -> view facets.

Note: the knowledge module only exposes read endpoints (search, list,
facets, by-id) over HTTP. There is no POST /knowledge endpoint -
entries are ingested out-of-band via the F:\\sources pipeline (see
project CLAUDE.md). The methodist test therefore covers read paths only.
"""


async def test_methodist_can_list_knowledge(role_client_factory):
    c = await role_client_factory("methodist")
    r = await c.get("/api/v1/knowledge", params={"limit": 5})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "items" in body
    assert "total" in body


async def test_methodist_can_view_facets(role_client_factory):
    c = await role_client_factory("methodist")
    r = await c.get("/api/v1/knowledge/facets")
    assert r.status_code == 200, r.text


async def test_methodist_can_view_dashboard(role_client_factory):
    """Methodist (modelled as role=teacher) sees the admin dashboard
    because /admin/dashboard accepts admin OR teacher."""
    c = await role_client_factory("methodist")
    r = await c.get("/api/v1/admin/dashboard")
    assert r.status_code == 200, r.text
