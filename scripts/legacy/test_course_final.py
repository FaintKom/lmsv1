import httpx

r = httpx.post("http://localhost:8000/api/v1/auth/login",
    json={"email": "final@test.com", "password": "Pass123!"})
token = r.json()["access_token"]

r2 = httpx.post("http://localhost:8000/api/v1/courses/",
    json={"title": "My First Course", "description": "Hello World", "category": "programming"},
    headers={"Authorization": f"Bearer {token}"})
print(f"STATUS: {r2.status_code}")
print(f"BODY: {r2.text[:300]}")
