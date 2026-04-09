"""Bootstrap a super admin user by registering and printing the role-upgrade SQL.

Credentials are read from environment variables — never hardcode in source.

Usage:
    export LMS_API=https://your-backend.example.com/api/v1
    export LMS_SUPER_ADMIN_EMAIL=you@example.com
    export LMS_SUPER_ADMIN_PASSWORD='strong-random-password'
    export LMS_SUPER_ADMIN_NAME='Super Admin'
    python create_super_admin.py

The preferred alternative is to set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in
the backend .env file — the server will create the super admin automatically on
first startup (see backend/app/main.py).
"""
import os
import sys

import requests

API = os.environ.get("LMS_API", "http://localhost:8000/api/v1")
EMAIL = os.environ.get("LMS_SUPER_ADMIN_EMAIL", "").strip()
PASSWORD = os.environ.get("LMS_SUPER_ADMIN_PASSWORD", "")
NAME = os.environ.get("LMS_SUPER_ADMIN_NAME", "Super Admin")
ORG_NAME = os.environ.get("LMS_SUPER_ADMIN_ORG", "System")

if not EMAIL or not PASSWORD:
    sys.stderr.write(
        "ERROR: LMS_SUPER_ADMIN_EMAIL and LMS_SUPER_ADMIN_PASSWORD must be set.\n"
        "Example:\n"
        "  export LMS_SUPER_ADMIN_EMAIL=you@example.com\n"
        "  export LMS_SUPER_ADMIN_PASSWORD='$(python -c \"import secrets; print(secrets.token_urlsafe(24))\")'\n"
    )
    sys.exit(2)

r = requests.post(
    f"{API}/auth/register",
    json={
        "org_name": ORG_NAME,
        "full_name": NAME,
        "email": EMAIL,
        "password": PASSWORD,
    },
)
print(f"Register: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    user_id = data["user"]["id"]
    print(f"User ID: {user_id}")
    print(f"Org ID: {data['user']['org_id']}")
    print("User created. Upgrade role to super_admin via DB:")
    print(f"  UPDATE users SET role='super_admin' WHERE email='{EMAIL}';")
else:
    print(r.text[:500])
