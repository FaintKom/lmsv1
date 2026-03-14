import httpx

# Test via nginx (port 80) like the browser does
r = httpx.post("http://localhost/api/v1/auth/login",
    json={"email": "final@test.com", "password": "Pass123!"})
print(f"LOGIN via nginx: {r.status_code}")
if r.status_code != 200:
    print(f"  Body: {r.text[:300]}")
else:
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r2 = httpx.post("http://localhost/api/v1/courses/",
        json={"title": "Via Nginx Test", "description": "test", "category": "math"},
        headers=headers)
    print(f"CREATE COURSE via nginx: {r2.status_code}")
    print(f"  Body: {r2.text[:300]}")
