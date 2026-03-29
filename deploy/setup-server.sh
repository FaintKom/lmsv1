#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# LearnHub LMS — Hetzner Server Setup Script
# Run this on a fresh Ubuntu 24.04 VPS
# Usage: ssh root@YOUR_IP 'bash -s' < setup-server.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

echo "════════════════════════════════════════"
echo "  LearnHub LMS — Server Setup"
echo "════════════════════════════════════════"

# 1. System update
echo "[1/6] Updating system..."
apt-get update -qq && apt-get upgrade -y -qq

# 2. Install Docker
echo "[2/6] Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi
docker --version

# 3. Install Docker Compose
echo "[3/6] Docker Compose..."
if ! command -v docker-compose &>/dev/null; then
  apt-get install -y -qq docker-compose-plugin
fi

# 4. Install Coolify
echo "[4/6] Installing Coolify..."
if [ ! -d "/data/coolify" ]; then
  curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
  echo "Coolify installed! Access it at http://YOUR_IP:8000"
else
  echo "Coolify already installed"
fi

# 5. Firewall
echo "[5/6] Configuring firewall..."
apt-get install -y -qq ufw
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 8000/tcp  # Coolify dashboard (remove after setup)
ufw --force enable
echo "Firewall configured"

# 6. Swap (for 4GB RAM server)
echo "[6/6] Setting up swap..."
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "2GB swap created"
fi

echo ""
echo "════════════════════════════════════════"
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Open http://YOUR_IP:8000 in browser"
echo "  2. Create Coolify admin account"
echo "  3. Add GitHub repo as a new project"
echo "  4. Configure environment variables"
echo "════════════════════════════════════════"
