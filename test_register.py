import httpx
r = httpx.post(
    "http://localhost:8000/api/v1/auth/register",
    json={"org_name": "Demo2", "full_name": "Admin2", "email": "a2@test.com", "password": "Pass123!"}
)
print(f"STATUS: {r.status_code}")
print(f"BODY: {r.text}")
