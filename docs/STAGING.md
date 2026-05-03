# GrassLMS — Staging Environment

Staging mirrors prod on the **same Hetzner VPS** (`204.168.165.41`).
It runs alongside prod under a separate Docker compose project
(`lms-staging`) with its own database, Redis, uploads, and containers.
Public URL: **https://staging.grasslms.online**.

Use staging to test changes before promoting them to prod. Never push
straight to prod for anything non-trivial.

---

## Layout

| Item                | Prod                       | Staging                                      |
|---------------------|----------------------------|----------------------------------------------|
| Compose project     | `lms`                      | `lms-staging`                                |
| Compose file        | `docker-compose.prod.yml`  | `docker-compose.staging.yml`                 |
| Containers          | `lms-db-1`, `lms-backend-1`, `lms-frontend-1`, `lms-sandbox-1`, `lms-redis-1`, `lms-nginx-1`, `lms-cloudflared-1` | `lms-staging-db-1`, `lms-staging-backend-1`, `lms-staging-frontend-1`, `lms-staging-sandbox-1`, `lms-staging-redis-1` |
| Project path        | `/opt/lms`                 | `/opt/lms-staging`                           |
| Postgres volume     | `lms_pgdata`               | `lms-staging_pgdata`                         |
| Uploads volume      | `lms_uploads`              | `lms-staging_uploads`                        |
| Database name       | `lms`                      | `lms_staging`                                |
| Env file            | `.env`                     | `.env.staging`                               |
| Public URL          | `grasslms.online`          | `staging.grasslms.online`                    |
| Nginx               | shared `lms-nginx-1`       | shared `lms-nginx-1` (server block in `nginx/staging.conf`) |
| SSL cert            | `nginx/ssl/cert.pem`       | `nginx/ssl/staging.cert.pem`                 |

Both stacks share the `lms_internal` Docker network. Staging containers
attach to it via the `shared` network alias in `docker-compose.staging.yml`,
so the prod nginx can resolve them by container name.

---

## First-time setup (server-side)

These steps are one-shot and require root SSH on the VPS.

### 1. DNS

Add an `A` record:
```
staging.grasslms.online   A   204.168.165.41   (TTL 300)
```
Wait for propagation (`dig staging.grasslms.online +short` from a
different machine should return the IP).

### 2. Project directory

```bash
ssh root@204.168.165.41
mkdir -p /opt/lms-staging
rsync -a --exclude=node_modules --exclude=.git --exclude=.next \
  /opt/lms/ /opt/lms-staging/
```

### 3. `.env.staging`

```bash
cd /opt/lms-staging
cp .env .env.staging
# Edit .env.staging:
#   - POSTGRES_DB=lms_staging
#   - POSTGRES_PASSWORD=<NEW PASSWORD, different from prod>
#   - JWT_SECRET=<NEW SECRET>
#   - STRIPE_* keys can stay in test mode
#   - SMTP password can be reused or swapped for a noop sandbox
#   - VOYAGE_API_KEY can be reused (read-only embeddings)
#   - PUBLIC_BASE_URL=https://staging.grasslms.online
```

### 4. SSL cert (Let's Encrypt)

```bash
# certbot must already be installed on the host
certbot certonly --webroot -w /opt/lms/nginx/certbot \
  -d staging.grasslms.online \
  --email faintkom@gmail.com --agree-tos --no-eff-email

cp /etc/letsencrypt/live/staging.grasslms.online/fullchain.pem \
   /opt/lms/nginx/ssl/staging.cert.pem
cp /etc/letsencrypt/live/staging.grasslms.online/privkey.pem \
   /opt/lms/nginx/ssl/staging.key.pem
```

### 5. Nginx server block

The prod nginx mounts `./nginx/nginx.conf:/etc/nginx/conf.d/default.conf`.
Add `staging.conf` alongside it.

**Option A — modify `docker-compose.prod.yml`** to mount the whole nginx
directory (preferred):
```yaml
nginx:
  volumes:
    - ./nginx/:/etc/nginx/conf.d/:ro    # was: ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    - ./nginx/ssl:/etc/nginx/ssl:ro
```

**Option B — bind-mount one extra file:**
```yaml
nginx:
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    - ./nginx/staging.conf:/etc/nginx/conf.d/staging.conf:ro
    - ./nginx/ssl:/etc/nginx/ssl:ro
```

Apply:
```bash
cd /opt/lms
docker compose -f docker-compose.prod.yml up -d nginx
docker exec lms-nginx-1 nginx -t      # should show "test is successful"
docker exec lms-nginx-1 nginx -s reload
```

### 6. Bring up the staging stack

```bash
cd /opt/lms-staging
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build
```

### 7. Initial DB seed (clone prod into staging)

```bash
docker exec lms-db-1 pg_dump -U lms -d lms --no-owner --clean --if-exists \
  > /tmp/prod-snapshot.sql

cat /tmp/prod-snapshot.sql | \
  docker exec -i lms-staging-db-1 psql -U lms -d lms_staging

docker exec lms-staging-backend-1 alembic upgrade head

rm /tmp/prod-snapshot.sql
```

### 8. Verify

```bash
curl -I https://staging.grasslms.online           # 200 OK, X-Environment: staging
curl https://staging.grasslms.online/health       # {"status": "ok"}
```

Login at https://staging.grasslms.online with prod test accounts —
they were cloned over.

---

## Deploy workflow (after first-time setup)

The staging deploy is the same SSH file copy + rebuild as prod, but
targeting `/opt/lms-staging` and the staging compose file.

```bash
# 1. Copy file(s)
cat backend/app/courses/router.py | \
  ssh root@204.168.165.41 "cat > /opt/lms-staging/backend/app/courses/router.py"

# 2. Rebuild service
ssh root@204.168.165.41 \
  "cd /opt/lms-staging && docker compose -f docker-compose.staging.yml build backend"

# 3. Restart
ssh root@204.168.165.41 \
  "cd /opt/lms-staging && docker compose -f docker-compose.staging.yml up -d backend"

# 4. Test at https://staging.grasslms.online

# 5. If green, repeat the same copies into /opt/lms and rebuild prod.
```

For frontend / nginx changes, swap `backend` for `frontend` / `nginx`.

### Promoting to prod

Once a change tests cleanly on staging, re-run the same copy commands
but to `/opt/lms` instead of `/opt/lms-staging`, then rebuild + restart
the prod service. There is no automated promote — deploys are inspected
by hand.

---

## Refreshing staging DB from prod

Periodically (or before a high-stakes test), re-clone prod into staging:

```bash
ssh root@204.168.165.41
docker exec lms-db-1 pg_dump -U lms -d lms --no-owner --clean --if-exists \
  > /tmp/prod-snapshot.sql

docker exec lms-staging-db-1 psql -U lms -d postgres \
  -c "DROP DATABASE IF EXISTS lms_staging;"
docker exec lms-staging-db-1 psql -U lms -d postgres \
  -c "CREATE DATABASE lms_staging;"
cat /tmp/prod-snapshot.sql | \
  docker exec -i lms-staging-db-1 psql -U lms -d lms_staging

docker exec lms-staging-backend-1 alembic upgrade head
rm /tmp/prod-snapshot.sql
```

This wipes any test data in staging — that is the point.

---

## Tearing down staging

```bash
cd /opt/lms-staging
docker compose -f docker-compose.staging.yml down
# To also drop volumes (DB + uploads):
docker compose -f docker-compose.staging.yml down -v
```

The prod stack is unaffected.

---

## Cost

Staging adds ~5 containers on the same CX22 VPS. Memory headroom is
tight; if backend OOMs, scale the VPS to CX32 (€8/mo) or run staging
only on demand (`docker compose ... down` between sessions).
