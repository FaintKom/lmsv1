import httpx

# Login first
r = httpx.post("http://localhost:8000/api/v1/auth/login",
    json={"email": "final@test.com", "password": "Pass123!"})
print(f"LOGIN: {r.status_code}")
if r.status_code != 200:
    # Try register
    r = httpx.post("http://localhost:8000/api/v1/auth/register",
        json={"org_name": "CourseTest", "full_name": "Course Admin", "email": "course@test.com", "password": "Pass123!"})
    print(f"REGISTER: {r.status_code}")

token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Create course
r2 = httpx.post("http://localhost:8000/api/v1/courses/",
    json={"title": "Test Course", "description": "A test", "category": "programming"},
    headers=headers)
print(f"CREATE COURSE: {r2.status_code}")
print(f"BODY: {r2.text[:500]}")
