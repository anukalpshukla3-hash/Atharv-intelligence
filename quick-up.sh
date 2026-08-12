#!/usr/bin/env bash
set -uo pipefail
ROOT=/home/anukalpshukla/myproject
CLOUDFLARED="$HOME/.local/bin/cloudflared"
mkdir -p /tmp/atharv-live

pkill -f 'dist/index.js' 2>/dev/null || true
pkill -f 'run.sh' 2>/dev/null || true
pkill -f 'next dev' 2>/dev/null || true
pkill -f 'next-server' 2>/dev/null || true
pkill -f 'cloudflared tunnel' 2>/dev/null || true
sleep 2

(cd "$ROOT/backend" && setsid bash run.sh >/dev/null 2>&1 </dev/null &)
for i in $(seq 1 20); do curl -sf -m 2 http://localhost:4000/health >/dev/null 2>&1 && break; sleep 1; done

(cd "$ROOT" && setsid "$CLOUDFLARED" tunnel --url http://localhost:4000 --no-autoupdate >/tmp/atharv-live/tunnel-backend.log 2>&1 </dev/null &)
BACKEND_URL=""
for i in $(seq 1 40); do BACKEND_URL=$(grep -oE 'https://[a-z0-9-]{6,}\.trycloudflare\.com' /tmp/atharv-live/tunnel-backend.log 2>/dev/null | grep -v 'api\.' | head -1); [ -n "$BACKEND_URL" ] && break; sleep 1; done
echo "BACKEND_URL=$BACKEND_URL"

cat > "$ROOT/frontend/.env.local" <<EOF
NEXT_PUBLIC_API_URL=$BACKEND_URL
NEXT_PUBLIC_SOCKET_URL=$BACKEND_URL
NEXT_PUBLIC_UPLOAD_FOLDER=user
EOF

(cd "$ROOT/frontend" && setsid bash -c 'npm run dev' >/tmp/atharv-live/frontend.log 2>&1 </dev/null &)
for i in $(seq 1 30); do curl -sf -m 2 http://localhost:3000 >/dev/null 2>&1 && break; sleep 1; done

(cd "$ROOT" && setsid "$CLOUDFLARED" tunnel --url http://localhost:3000 --no-autoupdate >/tmp/atharv-live/tunnel-frontend.log 2>&1 </dev/null &)
FRONTEND_URL=""
for i in $(seq 1 40); do FRONTEND_URL=$(grep -oE 'https://[a-z0-9-]{6,}\.trycloudflare\.com' /tmp/atharv-live/tunnel-frontend.log 2>/dev/null | grep -v 'api\.' | head -1); [ -n "$FRONTEND_URL" ] && break; sleep 1; done
echo "FRONTEND_URL=$FRONTEND_URL"

sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:3000,${FRONTEND_URL}|" "$ROOT/backend/.env"
pkill -f 'dist/index.js' 2>/dev/null || true
sleep 4

printf 'VISITOR : %s\nADMIN   : %s/login\nBACKEND : %s/health\n' "$FRONTEND_URL" "$FRONTEND_URL" "$BACKEND_URL" > "$HOME/atharv-site-urls.txt"
echo "QUICK_UP_DONE"
echo "VISITOR: $FRONTEND_URL"
echo "BACKEND: $BACKEND_URL"
