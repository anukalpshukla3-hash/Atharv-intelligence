#!/usr/bin/env bash
# VPS Bootstrap Script for Atharv Intelligence
# Run on a fresh Ubuntu 22.04/24.04 or Debian 12 VPS as root
# Usage: curl -sSL https://raw.githubusercontent.com/your/repo/main/vps-bootstrap.sh | bash -s your-domain.com your@email.com
# Or: ./vps-bootstrap.sh your-domain.com your@email.com

set -euo pipefail

DOMAIN="${1:-}"
ACME_EMAIL="${2:-}"

if [ -z "$DOMAIN" ] || [ -z "$ACME_EMAIL" ]; then
    echo "Usage: $0 <domain> <email>"
    echo "Example: $0 chat.example.com admin@example.com"
    exit 1
fi

echo "=== Atharv Intelligence VPS Bootstrap ==="
echo "Domain: $DOMAIN"
echo "Email:  $ACME_EMAIL"
echo ""

# 1. System updates & Docker
echo "Installing Docker..."
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg lsb-release git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 2. Clone / copy project
PROJECT_DIR="/opt/atharv"
echo "Setting up project at $PROJECT_DIR..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# If running locally, copy files; otherwise expect git clone
if [ -d "/home/anukalpshukla/myproject" ]; then
    cp -r /home/anukalpshukla/myproject/* "$PROJECT_DIR/"
else
    echo "Project files not found locally. Please clone your repo or copy files to $PROJECT_DIR"
    exit 1
fi

# 3. Create production .env
ENV_FILE="$PROJECT_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" <<EOF
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL
SUPABASE_URL=$(grep ^SUPABASE_URL /home/anukalpshukla/myproject/backend/.env | cut -d= -f2-)
SUPABASE_SERVICE_ROLE_KEY=$(grep ^SUPABASE_SERVICE_ROLE_KEY /home/anukalpshukla/myproject/backend/.env | cut -d= -f2-)
SUPABASE_ANON_KEY=$(grep ^SUPABASE_ANON_KEY /home/anukalpshukla/myproject/backend/.env | cut -d= -f2-)
JWT_SECRET=$(openssl rand -hex 32)
EOF
    echo "Created $ENV_FILE — please verify values!"
fi

# 4. Update Caddyfile with actual domain
sed -i "s|\${DOMAIN}|$DOMAIN|g; s|\${ACME_EMAIL}|$ACME_EMAIL|g" "$PROJECT_DIR/Caddyfile"

# 5. Build and start
echo "Building containers..."
cd "$PROJECT_DIR"
docker compose build --parallel

echo "Starting services..."
docker compose up -d

# 6. Verify
echo "Waiting for services to be healthy..."
sleep 10
if curl -sf "https://$DOMAIN/health" >/dev/null 2>&1; then
    echo ""
    echo "=== DEPLOYMENT SUCCESSFUL ==="
    echo "Visitor:  https://$DOMAIN"
    echo "Admin:    https://$DOMAIN/login"
    echo "Backend:  https://$DOMAIN/health"
    echo ""
    echo "Logs: docker compose logs -f"
else
    echo "Health check failed. Check logs: docker compose logs"
    exit 1
fi