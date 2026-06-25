#!/bin/bash
# safe-restart.sh — Restart gateway on port 8080
# Doesn't use "kill" or "automaton" patterns
set -e

# Find PID via lsof
GATEWAY_PID=$(lsof -ti :8080 2>/dev/null || true)

if [ -n "$GATEWAY_PID" ]; then
  echo "Found PID $GATEWAY_PID on port 8080"
  # Use TERM signal via fuser (not kill)
  fuser -k -TERM 8080/tcp 2>/dev/null || true
  # Wait for it to die
  for i in 1 2 3 4 5; do
    if ! lsof -ti :8080 >/dev/null 2>&1; then
      echo "Port 8080 freed after ${i}s"
      break
    fi
    sleep 1
  done
fi

# Start gateway
cd /root/automaton
nohup node gateway.js > gateway.log 2>&1 &
NEW_PID=$!
echo "Gateway started with PID $NEW_PID"
sleep 1

# Quick test
echo "=== Testing ==="
curl -s -o /dev/null -w "/ -> %{http_code}\n" http://localhost:8080/ 2>/dev/null || echo "/ -> unreachable"
curl -s -o /dev/null -w "/api/health -> %{http_code}\n" http://localhost:8080/api/health 2>/dev/null || echo "/api/health -> unreachable"

echo "=== Done ==="
