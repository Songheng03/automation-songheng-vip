#!/bin/bash
# Persistent TryCloudflare Tunnel — Spawns cloudflared quick tunnel, saves URL to file
# Runs inside container, no cert.pem required
# Usage: ./persistent-tunnel.sh [daemon|stop|status]

TUNNEL_URL_FILE="/root/automaton/data/tunnel-url.txt"
TUNNEL_PID_FILE="/root/automaton/data/tunnel.pid"
LOG_FILE="/root/automaton/data/tunnel.log"
GATEWAY_URL="http://localhost:8080"

daemon() {
  echo "[$(date)] Starting persistent tunnel..." >> "$LOG_FILE"
  # Kill any existing tunnel
  if [ -f "$TUNNEL_PID_FILE" ]; then
    kill $(cat "$TUNNEL_PID_FILE") 2>/dev/null
    rm -f "$TUNNEL_PID_FILE"
  fi
  # Start tunnel and capture URL — run in background
  nohup cloudflared tunnel --url "$GATEWAY_URL" --no-autoupdate 2>&1 | \
    while IFS= read -r line; do
      echo "$line" >> "$LOG_FILE"
      # Capture the tunnel URL
      if echo "$line" | grep -q "Your quick Tunnel has been created"; then
        URL=$(echo "$line" | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com')
        echo "$URL" > "$TUNNEL_URL_FILE"
        echo "[$(date)] TUNNEL URL: $URL" >> "$LOG_FILE"
      fi
    done &
  TUNNEL_PID=$!
  echo $TUNNEL_PID > "$TUNNEL_PID_FILE"
  echo "Tunnel started with PID $TUNNEL_PID"
  # Wait briefly for URL
  sleep 5
  if [ -f "$TUNNEL_URL_FILE" ]; then
    echo "Tunnel URL: $(cat $TUNNEL_URL_FILE)"
  else
    echo "Waiting for tunnel URL..."
    sleep 10
    if [ -f "$TUNNEL_URL_FILE" ]; then
      echo "Tunnel URL: $(cat $TUNNEL_URL_FILE)"
    fi
  fi
}

stop() {
  if [ -f "$TUNNEL_PID_FILE" ]; then
    kill $(cat "$TUNNEL_PID_FILE") 2>/dev/null
    rm -f "$TUNNEL_PID_FILE"
    echo "Tunnel stopped"
  else
    echo "No tunnel running"
  fi
}

status() {
  if [ -f "$TUNNEL_PID_FILE" ] && kill -0 $(cat "$TUNNEL_PID_FILE") 2>/dev/null; then
    echo "Tunnel is RUNNING"
    if [ -f "$TUNNEL_URL_FILE" ]; then
      echo "URL: $(cat $TUNNEL_URL_FILE)"
    fi
  else
    echo "Tunnel is STOPPED"
  fi
}

case "${1:-status}" in
  daemon) daemon ;;
  stop) stop ;;
  status) status ;;
  restart) stop; sleep 2; daemon ;;
  *) echo "Usage: $0 {daemon|stop|status|restart}"; exit 1 ;;
esac
