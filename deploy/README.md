# LearnHub LMS — Production Deployment (Hetzner + Coolify)

## Quick Start

### 1. Create Server
- Go to [hetzner.com/cloud](https://www.hetzner.com/cloud)
- Create Ubuntu 24.04, CX22 (€3.79/month)
- Note the IP address and root password

### 2. Run Setup Script
```bash
ssh root@YOUR_IP 'bash -s' < deploy/setup-server.sh
```

### 3. Configure Coolify
- Open `http://YOUR_IP:8000` in browser
- Create admin account
- Add GitHub repository
- Set environment variables from `.env.production.example`

### 4. Deploy
Coolify auto-deploys on push to main. Or:
```bash
ssh root@YOUR_IP
cd /app/lms
docker-compose -f deploy/docker-compose.hetzner.yml up -d --build
```

### 5. DNS (Cloudflare)
- Add A record: `yourdomain.com` → `YOUR_IP`
- Enable proxy (orange cloud)
- SSL: Full (strict)

## Architecture
```
Internet → Cloudflare CDN → Nginx (port 80/443)
                              ├→ Frontend (Next.js :3000)
                              └→ Backend (FastAPI :8000)
                                   └→ PostgreSQL (:5432)
```

## Costs
- Hetzner CX22: €3.79/month
- Coolify: Free (self-hosted)
- Cloudflare: Free plan
- **Total: ~€3.79/month ($4.10)**
