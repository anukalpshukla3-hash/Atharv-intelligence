#!/usr/bin/env bash
# Supervised backend runner.
# Restarts `node dist/index.js` automatically if it crashes, so the
# servers can't stay dead. A bounded crash-loop guard stops it from
# retrying forever if the build is genuinely broken.
cd "$(dirname "$0")"

LOG=/tmp/atharv-backend.log
CRASHES=0

echo "[$(date '+%Y-%m-%d %H:%M:%S')] supervisor starting" >> "$LOG"

while true; do
  node dist/index.js >> "$LOG" 2>&1
  EC=$?
  CRASHES=$((CRASHES + 1))
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] backend exited (status $EC) - restarting in 3s (streak $CRASHES)" >> "$LOG"
  if [ "$CRASHES" -ge 10 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] too many rapid crashes - giving up" >> "$LOG"
    exit 1
  fi
  sleep 3
done
