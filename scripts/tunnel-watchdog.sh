#!/bin/bash
# Tunnel Watchdog for my-automaton
# Run this script periodically to ensure cloudflared stays alive
# Does NOT open any ports - just checks and restarts

TUNNEL_URL_FILE="/root/automaton/data/tunnel-live.json"
GATEWAY="http://localhost:8080"
PIDFILE="/root/automaton/data/tunnel.pid"
LOGFILE="/root/automaton/data/tunnel-watchdog.log"

log() {
  echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOGFILE"
}

# Function to start tunnel
start_tunnel() {
  local metrics_port
  metrics_port=$(( 30000 + RANDOM % 35535 ))
  
  nohup cloudflared tunnel \
    --url "$GATEWAY" \
    --metrics "127.0.0.1:$metrics_port" \
    --no-autoupdate \
    > /root/automaton/data/cloudflared.log 2>&1 &
  
  local pid=$!
  echo $pid > "$PIDFILE"
  log "Started tunnel (PID: $pid, metrics: $metrics_port)"
  
  # Wait for tunnel URL
  sleep 6
  local url
  url=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /root/automaton/data/cloudflared.log | head -1)
  
  if [ -n "$url" ]; then
    echo "{\"url\":\"$url\",\"timestamp\":\"$(date -Iseconds)\",\"alive\":true}" > "$TUNNEL_URL_FILE"
    echo "$url" > /root/automaton/data/tunnel-url.txt
    log "Tunnel URL: $url ✓"
  else
    log "WARNING: Could not extract tunnel URL"
  fi
}

# Check if tunnel is alive by testing the gateway locally
check_tunnel() {
  # Can we reach the live tunnel URL?
  if [ -f "$TUNNEL_URL_FILE" ]; then
    local url
    url=$(node -e "const j=require('$TUNNEL_URL_FILE');console.log(j.url||'')" 2>/dev/null)
    if [ -n "$url" ]; then
      local code
      code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url/health" 2>/dev/null)
      if [ "$code" = "200" ]; then
        return 0
      fi
    fi
  fi
  return 1
}

# Main
log "=== Tunnel Watchdog ==="

if check_tunnel; then
  log "Tunnel is alive ✓"
  exit 0
fi

log "Tunnel is down! Attempting restart..."

# Kill existing cloudflared processes
for pid in $(ls /proc/*/cmdline 2>/dev/null | while read f; do 
  if grep -q "cloudflared tunnel" "$f" 2>/dev/null; then
    echo "$f" | cut -d/ -f3
  fi
done); do
  kill "$pid" 2>/dev/null
done

sleep 2
start_tunnel

if check_tunnel; then
  log "Tunnel restarted successfully ✓"
else
  log "FAILED to restart tunnel"
fi
