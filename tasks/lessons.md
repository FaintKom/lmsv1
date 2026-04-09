# Lessons Learned

## 2026-04-02: Deployment broke SSL and DB connectivity

### What happened
- `docker compose up -d --force-recreate` recreated DB container, resetting password
- nginx lost network connections to new backend/frontend containers
- SSL was already configured via Let's Encrypt but I didn't check before deploying
- Generated unnecessary self-signed cert instead of finding existing LE cert

### Rules to prevent recurrence
1. **Before ANY deploy**: run `docker ps`, check networks, test `curl https://...` and save the output
2. **Never use `--force-recreate`** unless absolutely necessary — use `docker compose restart` instead
3. **Check `.env` vs `docker-compose.yml`** for password/config mismatches BEFORE touching containers
4. **Check `/etc/letsencrypt/`** before generating any SSL certs
5. **Deploy order**: pull code → rebuild images → restart containers one by one → verify after each step
6. **Don't fix what isn't broken** — if SSL works, don't touch nginx SSL config
