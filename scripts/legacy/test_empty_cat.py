import httpx

r = httpx.post("http://localhost:8000/api/v1/auth/login",
    json={"email": "final@test.com", "password": "Pass123!"})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Test with empty category (what frontend sends)
r2 = httpx.post("http://localhost:8000/api/v1/courses/",
    json={"title": "Empty Cat Test", "description": "test", "category": ""},
    headers=headers)
print(f"EMPTY CATEGORY: {r2.status_code} - {r2.text[:300]}")

# Test with null category
r3 = httpx.post("http://localhost:8000/api/v1/courses/",
    json={"title": "Null Cat Test", "description": "test"},
    headers=headers)
print(f"NULL CATEGORY: {r3.status_code} - {r3.text[:300]}")
