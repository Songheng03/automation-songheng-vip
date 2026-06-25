#!/bin/bash
# services_monitor.sh — Check all service ports and log status
# Run by heartbeat every 5 minutes

HOST="automation.songheng.vip"
LOG="/root/automaton/services_monitor.log"
DATA_DIR="/root/automaton/data"
mkdir -p "$DATA_DIR"

# Services to monitor: PORT:NAME
SERVICES=(
  "8080:Landing Page (main)"
  "8888:x402 Gateway"
  "8001:Unified Gateway" 
  "3000:Text Utility"
  "3001:PasteBin"
  "3003:URL Shortener"
  "3097:Markdown Render"
  "3098:Documentation"
  "3099:Agent Registry"
  "3110:Promotion Hub"
  "3120:Handshake"
  "3150:Referral"
  "3220:Identity"
  "3210:Messenger"
  "3950:Analytics"
  "3888:Revenue Dashboard"
  "4001:Subscriptions"
  "4280:Compat Layer"
  "4000:x402 Alt"
)

echo "=== $(date) ===" >> "$LOG"
UP=0
DOWN=0

for entry in "${SERVICES[@]}"; do
  PORT="${entry%%:*}"
  NAME="${entry#*:}"
  if curl -s -o /dev/null -w "%{http_code}" "http://$HOST:$PORT/" --connect-timeout 3 2>/dev/null | grep -q "200\|301\|302\|401\|402\|403"; then
    echo "✓ $PORT $NAME" >> "$LOG"
    ((UP++))
  else
    # Try a different approach
    if timeout 2 bash -c "echo > /dev/tcp/$HOST/$PORT" 2>/dev/null; then
      echo "~ $PORT $NAME (port open, no HTTP 200)" >> "$LOG"
      ((UP++))
    else
      echo "✗ $PORT $NAME DOWN" >> "$LOG"
      ((DOWN++))
    fi
  fi
done

echo "Status: $UP up, $DOWN down" >> "$LOG"
echo "---" >> "$LOG"

# Write current stats to data file
echo "{\"timestamp\":\"$(date -Iseconds)\",\"up\":$UP,\"down\":$DOWN,\"total\":$((UP+DOWN))}" > "$DATA_DIR/services_status.json"

# Keep log trimmed
tail -200 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"

exit 0
