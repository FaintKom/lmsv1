import httpx
r = httpx.post(
    "http://localhost:8000/api/v1/auth/register",
    json={"org_name": "FinalTest", "full_name": "Final User", "email": "final@test.com", "password": "Pass123!"}
)
print(f"STATUS: {r.status_code}")
print(f"BODY: {r.text[:500]}")
