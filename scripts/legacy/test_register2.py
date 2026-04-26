import httpx
r = httpx.post(
    "http://localhost:9000/api/v1/auth/register",
    json={"org_name": "Demo3", "full_name": "Admin3", "email": "a3@test.com", "password": "Pass123!"}
)
print(f"STATUS: {r.status_code}")
print(f"BODY: {r.text}")
