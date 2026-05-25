# Enabling the public `/demo`

Owner-only runbook. Turns on the `/auth/demo-login` endpoint and seeds the
sandbox tenant that prospects land on when they click "Try as student" on
https://grasslms.online/demo.

The frontend page (`frontend/src/app/demo/page.tsx`) and the backend
endpoint (`backend/app/auth/router.py:163`) are already in the code. They
gate on `settings.demo_mode_enabled` — until you flip the env var, the
endpoint returns 404 and the page shows an error toast.

## One-time setup

1. **Pull latest `main` on the server.**

   ```bash
   ssh root@204.168.165.41
   cd /opt/lms
   git pull
   ```

2. **Edit `/opt/lms/.env`** — add or set:

   ```
   DEMO_MODE_ENABLED=true
   # Optional overrides (defaults are demo-student@ / demo-teacher@grasslms.online):
   # DEMO_STUDENT_EMAIL=demo-student@grasslms.online
   # DEMO_TEACHER_EMAIL=demo-teacher@grasslms.online
   ```

3. **Rebuild the backend** (frontend doesn't need a rebuild):

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build backend
   ```

4. **Seed the demo organization** — idempotent, safe to re-run after edits:

   ```bash
   docker compose -f docker-compose.prod.yml exec backend \
       python scripts/seed_demo_org.py
   ```

   Expected output ends with `OK: org=… users=6 courses=3 badges=3 events=4`.

5. **Smoke test** the endpoint:

   ```bash
   curl -sX POST https://grasslms.online/api/v1/auth/demo-login \
       -H 'content-type: application/json' \
       -d '{"role":"student"}'
   ```

   Expect HTTP 200 with `access_token`. HTTP 404 = `DEMO_MODE_ENABLED` not
   picked up by the container (re-check step 3).

6. **Browser check** — open https://grasslms.online/demo, click **Try as
   student**. Verify the dashboard shows three enrolled courses with
   progress bars, an XP / streak badge, an upcoming deadline, and one
   certificate. Then sign out, click **Try as teacher**, confirm the
   admin dashboard shows three courses and a few students.

## Refreshing demo content

Edits to course / lesson / exercise content in `scripts/seed_demo_org.py`
only propagate to **lesson body blocks** automatically on re-run. New
exercises, badges, calendar events etc. are created if missing but
existing rows are left as-is. To do a full refresh:

```bash
docker compose -f docker-compose.prod.yml exec -T db \
    psql -U lms -d lms -c "DELETE FROM organizations WHERE slug='demo';"
docker compose -f docker-compose.prod.yml exec backend \
    python scripts/seed_demo_org.py
```

The `ON DELETE CASCADE` from `organizations.id` wipes the entire demo org
(users, courses, enrollments, badges, calendar) in one statement.
Re-running the seed rebuilds everything.

## Turning it off

Either:

- Set `DEMO_MODE_ENABLED=false` in `/opt/lms/.env` and `up -d backend`
  (endpoint returns 404; demo org rows stay in DB), or
- Run the `DELETE FROM organizations` snippet above and leave the env var
  on (endpoint returns 400 "Demo account is not available").

Prefer the env-var route — keeps the demo seedable again with one command.
