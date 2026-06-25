#!/bin/bash
# reload-gateway.sh — Graceful gateway restart
# Sends SIGHUP to the gateway process which triggers a reload
# If that fails, starts a new gateway on the same port

set -e

GATEWAY_DIR="/root/automaton"
GATEWAY_JS="$GATEWAY_DIR/gateway.js"
PID_FILE="/tmp/gateway.pid"

echo "[reload] Checking gateway status..."

# Try to reload via SIGHUP
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    # Gateway is running — try graceful reload via HTTP
    echo "[reload] Gateway PID $PID — sending reload request..."
    curl -s -X POST http://localhost:8080/api/reload 2>/dev/null && echo "[reload] Reload successful" && exit 0
    # If reload endpoint doesn't exist, send SIGHUP
    kill -HUP "$PID" 2>/dev/null && echo "[reload] SIGHUP sent" && exit 0
  fi
fi

echo "[reload] Starting fresh gateway..."
cd "$GATEWAY_DIR"
node gateway.js > /tmp/gateway.log 2>&1 &
echo $! > "$PID_FILE"
sleep 2
echo "[reload] Gateway started on PID $(cat $PID_FILE)"