#!/usr/bin/env bash
# ============================================================
# Atharv Intelligence — go public from your PC in one command.
#
#   ./go-live.sh            start everything + print public URL
#   ./go-live.sh stop       stop all servers + tunnels
#
# All long-running processes detach into their own session
# (setsid) so they survive the launcher shell exiting.
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

CLOUDFLARED="$HOME/.local/bin/cloudflared"
WORK="${TMPDIR:-/tmp}/atharv-live"
mkdir -p "$WORK"

CLOUDFLARED_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"

stop_all() {
  echo "Stopping servers + tunnels..."
  pkill -f 'cloudflared tunnel' 2>/dev/null || true
  pkill -f 'tsx watch src/index.ts' 2>/dev/null || true
  pkill -f 'dist/index.js' 2>/dev/null || true
  pkill -f 'run.sh' 2>/dev/null || true
  pkill -f 'next-server' 2>/dev/null || true
  pkill -f 'next dev' 2>/dev/null || true
  sleep 1
  echo "Done."
}

if [ "${1:-}" = "stop" ]; then
  stop_all
  exit 0
fi

# --- preflight -------------------------------------------------
if ! command -v "$CLOUDFLARED" >/dev/null 2>&1; then
  echo "Downloading cloudflared (no sudo needed)..."
  mkdir -p "$(dirname "$CLOUDFLARED")"
  curl -sL -o "$CLOUDFLARED" "$CLOUDFLARED_URL"
  chmod +x "$CLOUDFLARED"
fi

if [ ! -f backend/.env ]; then
  echo "ERROR: backend/.env not found."
  echo "  cp backend/.env.example backend/.env"
  exit 1
fi

# Detach a process into its own session, fully detached from this shell.
# usage: detached <name> <working-dir> <command...>
detached() {
  local name="$1" dir="$2"
  shift 2
  (cd "$dir" && setsid bash -c 'exec "$@"' _ "$@" >"$WORK/$name.log" 2>&1 </dev/null &)
}

# Start a quick tunnel, wait for its URL, print it.
tunnel_url() {
  local name="$1" port="$2"
  local log="$WORK/tunnel-$name.log"
  rm -f "$log"
  detached "tunnel-$name" "$ROOT" "$CLOUDFLARED" tunnel --url "http://localhost:$port" --no-autoupdate
  for _ in $(seq 1 90); do
    local url
    url="$(grep -oE 'https://[a-z0-9-]{6,}\.trycloudflare\.com' "$log" | grep -v 'api\.trycloudflare\.com' | head -1 || true)"
    if [ -n "$url" ]; then
      echo "$url"
      return 0
    fi
    sleep 1
  done
  echo "TIMEOUT"
}

stop_all

# --- 1. backend -------------------------------------------------
echo "Starting backend (port 4000)..."
npm --prefix backend run build
detached backend "$ROOT/backend" bash run.sh
for _ in $(seq 1 40); do
  if curl -sf http://localhost:4000/health >/dev/null 2>&1; then
    echo "Backend healthy."
    break
  fi
  sleep 1
done
if ! curl -sf http://localhost:4000/health >/dev/null 2>&1; then
  echo "ERROR: backend did not become healthy. See $WORK/backend.log"
  exit 1
fi

echo "Opening backend tunnel..."
BACKEND_URL="$(tunnel_url backend 4000)"
if [ "$BACKEND_URL" = "TIMEOUT" ]; then
  echo "ERROR: backend tunnel did not open. See $WORK/tunnel-backend.log"
  exit 1
fi
echo "Backend public URL: $BACKEND_URL"

# --- 2. frontend -------------------------------------------------
cat > frontend/.env.local <<EOF
NEXT_PUBLIC_API_URL=$BACKEND_URL
NEXT_PUBLIC_SOCKET_URL=$BACKEND_URL
NEXT_PUBLIC_UPLOAD_FOLDER=user
EOF

echo "Starting frontend (port 3000)..."
detached frontend "$ROOT/frontend" npm run dev
for _ in $(seq 1 60); do
  if curl -sf http://localhost:3000 >/dev/null 2>&1; then
    echo "Frontend ready."
    break
  fi
  sleep 1
done

echo "Opening frontend tunnel..."
FRONTEND_URL="$(tunnel_url frontend 3000)"
if [ "$FRONTEND_URL" = "TIMEOUT" ]; then
  echo "ERROR: frontend tunnel did not open. See $WORK/tunnel-frontend.log"
  exit 1
fi

# --- 3. add frontend origin to backend CORS, restart backend ----
echo "Wiring CORS for $FRONTEND_URL ..."
sed -i.bak "s|^CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:3000,${FRONTEND_URL}|" backend/.env
pkill -f 'dist/index.js' 2>/dev/null || true
sleep 1
npm --prefix backend run build
detached backend "$ROOT/backend" bash run.sh
for _ in $(seq 1 40); do
  if curl -sf http://localhost:4000/health >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo ""
echo "================================================================"
echo "  ATHARV INTELLIGENCE IS LIVE"
echo ""
echo "  Share this link with visitors:"
echo "    $FRONTEND_URL"
echo ""
echo "  Command Center (log in as operator):"
echo "    $FRONTEND_URL/login"
echo ""
echo "  Backend health: $BACKEND_URL/health"
echo ""
echo "  Logs: $WORK/"
echo "  To stop everything:  ./go-live.sh stop"
echo "================================================================"
exit 0
