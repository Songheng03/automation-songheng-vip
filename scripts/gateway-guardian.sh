#!/bin/bash
# Gateway Guardian — ensures gateway.js is running on port 8080
# Runs as a cron job every 5 minutes
# Logs to /var/log/gateway-guardian.log

PORT=8080
GATEWAY_DIR="/root/automaton"
GATEWAY_SCRIPT="$GATEWAY_DIR/gateway.js"
PID_FILE="/tmp/gateway-guardian.pid"
LOG_FILE="/var/log/gateway-guardian.log"

# Don't run if already running
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if [ -d "/proc/$OLD_PID" ] && grep -q "gateway" "/proc/$OLD_PID/cmdline" 2>/dev/null; then
    exit 0
  fi
fi

echo $$ > "$PID_FILE"

# Check if port 8080 is listening
LISTENING=$(cat /proc/net/tcp 2>/dev/null | grep -c "01F8" || echo 0)

# Also check process
GATEWAY_PIDS=$(ps aux | grep -v grep | grep -c "gateway.js")

if [ "$GATEWAY_PIDS" -eq 0 ]; then
  echo "[$(date)] Gateway not running on port 8080, starting..." >> "$LOG_FILE"
  cd "$GATEWAY_DIR"
  nohup node gateway.js >> /tmp/gateway.log 2>&1 &
  echo "[$(date)] Started gateway with PID $!" >> "$LOG_FILE"
  
  # Wait and verify
  sleep 3
  if ps aux | grep -v grep | grep -q "gateway.js"; then
    echo "[$(date)] Gateway started successfully" >> "$LOG_FILE"
  else
    echo "[$(date)] FAILED to start gateway!" >> "$LOG_FILE"
  fi
fi

rm -f "$PID_FILE"
