#!/usr/bin/env bash
# Runs the full live stack (backend + frontend + tunnels + CORS wiring)
# and saves the fresh public URLs to ~/atharv-site-urls.txt.
set -uo pipefail
cd "$(dirname "$0")"

OUT="$(./go-live.sh 2>&1)"
printf '%s\n' "$OUT"
printf '%s\n' "$OUT" | grep -oE 'https://[a-z0-9-]{6,}\.trycloudflare\.com' | sort -u > "$HOME/atharv-site-urls.txt"
