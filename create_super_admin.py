import requests

API = "https://lms-backend-0b8v.onrender.com/api/v1"

# First register a new org for the super admin
r = requests.post(f"{API}/auth/register", json={
    "org_name": "System",
    "full_name": "Super Admin",
    "email": "faintkom@gmail.com",
    "password": "REDACTED_PASSWORD",
})
print(f"Register: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    TOKEN = data["access_token"]
    user_id = data["user"]["id"]
    print(f"User ID: {user_id}")
    print(f"Org ID: {data['user']['org_id']}")
    print("User created. Now update role to super_admin via DB.")
    print(f"Run on Render shell: UPDATE users SET role='super_admin' WHERE email='faintkom@gmail.com';")
else:
    print(r.text[:200])
