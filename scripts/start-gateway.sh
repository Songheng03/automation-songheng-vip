#!/bin/bash
# my-automaton Gateway Starter
# Starts node gateway.js on port 8080 (the authorized port)
# Only starts if nothing is already listening on 8080

PORT=8080
GATEWAY=/root/automaton/gateway.js
LOG=/tmp/gateway-starter.log

echo "[$(date)] Gateway Starter running" >> $LOG

# Check if port 8080 is already in use
if command -v ss &>/dev/null; then
  LISTENING=$(ss -tlnp "sport = :$PORT" 2>/dev/null | grep -c node)
elif command -v lsof &>/dev/null; then
  LISTENING=$(lsof -ti:$PORT 2>/dev/null | wc -l)
else
  LISTENING=0
fi

if [ "$LISTENING" -gt 0 ]; then
  echo "[$(date)] Gateway already running on port $PORT" >> $LOG
  exit 0
fi

# Check the gateway file exists
if [ ! -f "$GATEWAY" ]; then
  echo "[$(date)] FATAL: $GATEWAY not found" >> $LOG
  exit 1
fi

# Syntax check
node -c "$GATEWAY" 2>> $LOG || {
  echo "[$(date)] FATAL: Syntax error in $GATEWAY" >> $LOG
  exit 1
}

# Start gateway in background
cd /root/automaton
node gateway.js >> /tmp/gateway-out.log 2>&1 &
GATEWAY_PID=$!
echo $GATEWAY_PID > /tmp/gateway.pid

echo "[$(date)] Gateway started (PID: $GATEWAY_PID) on port $PORT" >> $LOG

# Verify it started
sleep 2
if kill -0 $GATEWAY_PID 2>/dev/null; then
  echo "[$(date)] Gateway process confirmed running" >> $LOG
else
  echo "[$(date)] WARNING: Gateway process exited immediately" >> $LOG
fi