# Staging environment

Staging lives on the **same Hetzner CX22 as production**. Cheap and easy
to start. When the box gets crowded (or we onboard real customers), we
move staging to its own VPS — see [variant B plan](#variant-b-separate-vps).

## Topology

```
                 nginx (lms-nginx-1, port 443)
                  ├── grasslms.online ─────────► lms-backend / lms-frontend
                  └── staging.grasslms.online ──► staging-backend / staging-frontend

  Shared docker network: lms_internal
  Containers (prod):     lms-{db,redis,backend,frontend,sandbox,nginx,cloudflared}
  Containers (staging):  staging-{db,redis,backend,frontend,sandbox}
  Volumes (separate):    staging_pgdata, staging_uploads, staging_redisdata
```

The prod nginx routes by `Host:` header. Staging containers run alongside
prod ones in the same Docker network — isolation comes from separate
DB credentials, separate volumes, and a separate JWT secret.

## Resource budget

CX22 = 4 GB RAM total. Approximate share:

| | Prod | Staging | Headroom |
|---|---:|---:|---:|
| RAM cap | ~1.5 GB | 1.6 GB (hard) | ~900 MB |

Staging memory limits are explicit in `docker-compose.staging.yml`:
- staging-db: 384 MB
- staging-backend: 768 MB
- staging-frontend: 384 MB
- staging-sandbox: 256 MB
- staging-redis: 96 MB

If staging starts being killed by OOM, **drop the limits or move to
variant B** — don't raise them past 1.6 GB total without a CX22 → CX32
upgrade (~€8/mo, doubles the RAM).

## First-time setup on the server

### 1. DNS (you do this once)

In Cloudflare DNS for `grasslms.online`, add:
- Type: A
- Name: `staging`
- Content: `204.168.165.41`
- Proxy: **DNS only (grey cloud)** — so Let's Encrypt can complete the
  HTTP-01 challenge against the origin

### 2. Clone the repo to /opt/lms-staging

```bash
ssh root@204.168.165.41
git clone https://github.com/FaintKom/lmsv1.git /opt/lms-staging
cd /opt/lms-staging
```

### 3. Create .env.staging

```bash
cp .env.staging.example .env.staging
# Edit and fill in:
#   POSTGRES_PASSWORD: openssl rand -hex 16
#   JWT_SECRET:        python -c "import secrets; print(secrets.token_hex(32))"
#   SUPER_ADMIN_PASSWORD: pick something
nano .env.staging
```

### 4. Get an SSL cert for the staging subdomain

```bash
# certbot is already installed for the prod cert; use it for staging too
certbot certonly --webroot -w /var/www/certbot -d staging.grasslms.online \
    --email faintkom@gmail.com --agree-tos --non-interactive

# Copy into the nginx ssl mount used by the prod stack
mkdir -p /opt/lms/nginx/ssl
cp /etc/letsencrypt/live/staging.grasslms.online/fullchain.pem \
   /opt/lms/nginx/ssl/staging-cert.pem
cp /etc/letsencrypt/live/staging.grasslms.online/privkey.pem \
   /opt/lms/nginx/ssl/staging-key.pem
```

Certbot renewal is set up via systemd timer; a renewal hook should also
copy the new cert into `/opt/lms/nginx/ssl/` and `nginx -s reload` the
prod nginx. Add `/etc/letsencrypt/renewal-hooks/deploy/copy-staging-cert.sh`:

```bash
#!/bin/bash
cp /etc/letsencrypt/live/staging.grasslms.online/fullchain.pem \
   /opt/lms/nginx/ssl/staging-cert.pem
cp /etc/letsencrypt/live/staging.grasslms.online/privkey.pem \
   /opt/lms/nginx/ssl/staging-key.pem
docker exec lms-nginx-1 nginx -s reload
```

`chmod +x` it.

### 5. Reload prod nginx with the staging server block

The staging server block already lives in `nginx/nginx.conf`. After step 4:

```bash
cd /opt/lms
git pull origin main   # picks up the new nginx.conf
docker exec lms-nginx-1 nginx -t   # validate config first
docker exec lms-nginx-1 nginx -s reload
```

### 6. First staging deploy

```bash
bash /opt/lms-staging/scripts/staging-deploy.sh
```

Visit https://staging.grasslms.online. Log in with the
`SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` from `.env.staging`.

## Day-to-day usage

### Deploy latest main to staging

```bash
ssh root@204.168.165.41 "bash /opt/lms-staging/scripts/staging-deploy.sh"
```

### Run a one-off DB query against staging

```bash
docker exec -it staging-db psql -U lms_staging -d lms_staging
```

### Reset staging DB (e.g. before a destructive test)

```bash
docker compose -p staging -f /opt/lms-staging/docker-compose.staging.yml down staging-db
docker volume rm staging_staging_pgdata
docker compose -p staging -f /opt/lms-staging/docker-compose.staging.yml up -d
# super admin re-bootstraps from .env.staging on next start
```

### Seed staging with a copy of prod data (when needed)

⚠️ Strips passwords + payment data — never restore raw prod into staging.
A scrub script lives at `scripts/seed-staging-from-prod.sh` (TODO — file an
issue if you need it before that script exists).

### Tail staging logs

```bash
docker compose -p staging -f /opt/lms-staging/docker-compose.staging.yml logs -f
```

## What staging is for

- **Try a risky migration** without nuking prod data
- **Demo new features to a customer** before they merge to prod
- **Test a Stripe webhook** with the test API key
- **Validate a Sentry / SMTP integration** end-to-end without spamming
  real users

## What staging is NOT for

- A failover / DR replica (it shares the host with prod — same blast
  radius for hardware failure)
- Load testing (would compete with prod for CPU/RAM)
- Storing real customer data

## Variant B — separate VPS

Trigger conditions to migrate:
- ≥1 paying customer (production isolation matters)
- Staging hits OOM more than once
- Need to test infra changes (Postgres major upgrade, OS upgrade,
  Cloudflare config) without risking prod
- A team forms and people run staging deploys on top of each other

Migration outline:
1. Provision a second Hetzner CX22 (~€4/mo)
2. Repoint `staging.grasslms.online` A-record to the new IP
3. Move `/opt/lms-staging/` to the new server
4. Reuse the same `docker-compose.staging.yml` (drop the `external` network,
   add a regular `internal` network like prod)
5. New SSL cert via certbot on the new box
6. Document the new host in the root `CLAUDE.md`

Estimated effort: 2-3 hours, no code changes — just compose tweaks
(drop the `external: true` on the network, add an nginx + cloudflared
service like prod has) and infra setup.
