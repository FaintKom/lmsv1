import httpx

r = httpx.post("http://localhost:8000/api/v1/auth/login",
    json={"email": "final@test.com", "password": "Pass123!"})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# List courses
r2 = httpx.get("http://localhost:8000/api/v1/admin/courses", headers=headers)
print(f"COURSES: {r2.status_code}")
courses = r2.json()
for c in courses:
    print(f"  {c['id']} - {c['title']} ({c['status']})")

if courses:
    draft = [c for c in courses if c['status'] == 'draft']
    if draft:
        cid = draft[0]['id']
        print(f"\nPublishing {cid}...")
        r3 = httpx.post(f"http://localhost:8000/api/v1/courses/{cid}/publish", headers=headers)
        print(f"PUBLISH: {r3.status_code}")
        print(f"BODY: {r3.text[:300]}")
    else:
        print("No draft courses to publish")
