import httpx

r = httpx.post("http://localhost:8000/api/v1/auth/login",
    json={"email": "final@test.com", "password": "Pass123!"})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

r2 = httpx.get("http://localhost:8000/api/v1/admin/courses", headers=headers)
drafts = [c for c in r2.json() if c['status'] == 'draft']
if drafts:
    cid = drafts[0]['id']
    r3 = httpx.post(f"http://localhost:8000/api/v1/courses/{cid}/publish", headers=headers)
    print(f"PUBLISH: {r3.status_code} - {r3.text[:200]}")
else:
    print("No drafts")
