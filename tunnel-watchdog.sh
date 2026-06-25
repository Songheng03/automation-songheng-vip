#!/bin/bash
# Tunnel Watchdog — Monitors and recovers Cloudflare Tunnel
# Runs as a background process to keep the tunnel alive

WATCHDOG_LOG="/root/automaton/data/tunnel-watchdog.log"
TUNNEL_STATE_FILE="/root/automaton/data/tunnel-live.json"
GATEWAY_URL="http://localhost:8080"
DOMAIN="automation.songheng.vip"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$WATCHDOG_LOG"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

check_gateway() {
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY_URL" 2>/dev/null)
  echo "$code"
}

check_tunnel_public() {
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$DOMAIN/" 2>/dev/null)
  echo "$code"
}

start_quick_tunnel() {
  log "Starting quick tunnel (trycloudflare)..."
  # Kill any existing cloudflared
  pkill -f "cloudflared tunnel" 2>/dev/null
  sleep 2
  
  # Start in background - captures the URL
  nohup cloudflared tunnel --url "$GATEWAY_URL" > /tmp/cloudflared.log 2>&1 &
  local pid=$!
  sleep 5
  
  # Extract the URL from logs
  local tunnel_url
  tunnel_url=$(grep -oP 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' /tmp/cloudflared.log 2>/dev/null | head -1)
  
  if [ -n "$tunnel_url" ]; then
    log "Quick tunnel started: $tunnel_url (PID: $pid)"
    echo "{\"status\":\"quick\",\"url\":\"$tunnel_url\",\"pid\":$pid,\"ts\":\"$(date -Iseconds)\"}" > "$TUNNEL_STATE_FILE"
    return 0
  else
    log "Quick tunnel might not be ready yet. PID: $pid"
    echo "{\"status\":\"starting\",\"pid\":$pid,\"ts\":\"$(date -Iseconds)\"}" > "$TUNNEL_STATE_FILE"
    return 1
  fi
}

try_start_tunnel_with_token() {
  # Try to find tunnel token in common locations
  local token_file="/root/automaton/data/tunnel-token.json"
  if [ -f "$token_file" ]; then
    local token
    token=$(cat "$token_file" | jq -r '.token // empty' 2>/dev/null)
    if [ -n "$token" ] && [ "$token" != "null" ]; then
      log "Found tunnel token, starting tunnel..."
      nohup cloudflared tunnel run --token "$token" > /tmp/cloudflared.log 2>&1 &
      return $?
    fi
  fi
  
  # Try config file
  for cfg in /root/.cloudflared/config.yml /etc/cloudflared/config.yml; do
    if [ -f "$cfg" ]; then
      log "Found config at $cfg, starting tunnel..."
      nohup cloudflared tunnel --config "$cfg" run > /tmp/cloudflared.log 2>&1 &
      return $?
    fi
  done
  
  return 1
}

# Generate a gateway status endpoint script too
write_gateway_status_endpoint() {
  # We'll embed status into the gateway later
  log "Gateway status endpoint ready at /api/tunnel-status"
}

# Main loop
log "=== Tunnel Watchdog Started ==="
log "Gateway: $GATEWAY_URL → Domain: $DOMAIN"

# First check gateway
GW=$(check_gateway)
log "Gateway local check: HTTP $GW"

if [ "$GW" != "200" ]; then
  log "ERROR: Gateway is not running! Cannot start tunnel."
  echo "{\"status\":\"gateway_down\",\"gateway_http\":$GW,\"ts\":\"$(date -Iseconds)\"}" > "$TUNNEL_STATE_FILE"
  exit 1
fi

# Try to start with token/config first
try_start_tunnel_with_token
TUNNEL_STARTED=$?

if [ $TUNNEL_STARTED -ne 0 ]; then
  log "No tunnel config found. Trying quick tunnel..."
  start_quick_tunnel
fi

# Monitor loop
COUNTER=0
while true; do
  sleep 60
  COUNTER=$((COUNTER + 1))
  
  # Check public access
  PUBLIC=$(check_tunnel_public)
  
  # Check if cloudflared is still running
  if ! pgrep -f "cloudflared tunnel" > /dev/null 2>&1; then
    log "cloudflared process died! Restarting..."
    try_start_tunnel_with_token || start_quick_tunnel
  fi
  
  # Every 10 minutes, log status
  if [ $((COUNTER % 10)) -eq 0 ]; then
    log "Status check #$COUNTER: Public=$PUBLIC, Process=$(pgrep -f 'cloudflared tunnel' | wc -l)"
    
    # Update state file
    if [ -f "$TUNNEL_STATE_FILE" ]; then
      local current
      current=$(cat "$TUNNEL_STATE_FILE")
      echo "$current" | jq --arg ts "$(date -Iseconds)" --arg pub "$PUBLIC" '. + {last_check: $ts, public_http: $pub}' > "$TUNNEL_STATE_FILE" 2>/dev/null
    fi
  fi
done
