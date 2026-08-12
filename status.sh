#!/usr/bin/env bash
# Show the current live URLs and service health.
echo "== saved public URLs =="
cat "$HOME/atharv-site-urls.txt" 2>/dev/null || echo "(none yet - run ./go-live.sh first)"
echo ""
echo "== local health =="
echo "backend : $(curl -s -m 4 http://localhost:4000/health 2>/dev/null || echo DOWN)"
echo "frontend: $(curl -s -m 4 -o /dev/null -w 'HTTP %{http_code}' http://localhost:3000 2>/dev/null || echo DOWN)"
echo ""
echo "== processes =="
pgrep -af 'dist/index.js|run.sh|next dev|cloudflared' | grep -v grep || echo "nothing running"
