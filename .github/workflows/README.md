# GitHub Actions workflows

## `ci.yml` — CI gate

Runs on every PR + push to main. Lints + tests backend (ruff + pytest) and
frontend (Vitest). Must pass before deploy can run.

## `deploy.yml` — Hetzner deploy

Triggers automatically after `ci.yml` succeeds on `main`, or manually via
`gh workflow run deploy.yml -f sha=<commit-sha>`. SSH-based pull + rebuild.

### One-time setup (required)

The deploy workflow needs four repo secrets configured under
**Settings → Secrets and variables → Actions**:

| Secret                | Value                                                                |
|-----------------------|----------------------------------------------------------------------|
| `PROD_SSH_HOST`       | `204.168.165.41`                                                     |
| `PROD_SSH_USER`       | `root`                                                               |
| `PROD_SSH_PRIVATE_KEY`| Contents of an ed25519 private key. Generate a NEW dedicated keypair, NOT your personal SSH key. See "Generating a deploy key" below. |
| `PROD_SSH_KNOWN_HOSTS`| Output of `ssh-keyscan -t ed25519 204.168.165.41` (1 line, ~100 chars) |

### Generating a deploy key

On your local machine:

```bash
ssh-keygen -t ed25519 -N "" -C "github-actions-deploy" -f /tmp/lms_deploy_key
# → /tmp/lms_deploy_key      (private — paste into PROD_SSH_PRIVATE_KEY)
# → /tmp/lms_deploy_key.pub  (public — append to prod authorized_keys)

# Authorize on prod:
cat /tmp/lms_deploy_key.pub | ssh root@204.168.165.41 \
    "cat >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys"

# Capture host fingerprint:
ssh-keyscan -t ed25519 204.168.165.41
# → paste the single output line into PROD_SSH_KNOWN_HOSTS

# Wipe the local copy:
rm /tmp/lms_deploy_key /tmp/lms_deploy_key.pub
```

The deploy key is `root`-equivalent on prod. Restrict GitHub Actions
repository secrets to admins only. If the key leaks, immediately revoke
it on prod (`sed -i '/github-actions-deploy/d' /root/.ssh/authorized_keys`)
and rotate `PROD_SSH_PRIVATE_KEY` to a new key.

### How a deploy goes

1. Someone pushes (or merges) to `main`.
2. `ci.yml` runs — lint + tests. If it fails, deploy is blocked.
3. `deploy.yml` triggers via `workflow_run`:
   - SSH `git fetch && git reset --hard <sha>` on prod
   - `docker compose build` only the changed service (backend / frontend)
   - `docker compose up -d`
   - `alembic upgrade head` if migration files changed
   - `nginx -s reload` if `nginx/` changed
   - Smoke-check `https://grasslms.online/login` returns 200
   - Stamp `.github/.last-deployed-sha` for the next diff

### Manual rollback

```bash
# Roll back to a known-good SHA
gh workflow run deploy.yml -f sha=<previous-good-sha>

# Or directly on prod
ssh root@204.168.165.41 "cd /opt/lms && \
    git reset --hard <sha> && \
    docker compose -f docker-compose.prod.yml build backend frontend && \
    docker compose -f docker-compose.prod.yml up -d"
```

### NEVER edit files directly on prod

Direct SSH edits create divergent state — see `salvage/2026-05-04-prod-state`
branch + tasks/lessons.md for the cleanup story. All changes go through PR
+ this workflow.
