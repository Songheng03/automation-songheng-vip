#!/bin/bash
# reload.sh — Kill old gateway, start new v3 gateway
# This is the single command to reload the revenue engine

cd /root/automaton

# Kill anything on port 8080
fuser -k 8080/tcp 2>/dev/null
sleep 1

# Start v3 gateway
nohup node gateway.js > /tmp/gateway-v3.log 2>&1 &
echo "Gateway v3 started (PID: $!)"
sleep 2

# Verify
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health)
if [ "$STATUS" = "200" ]; then
  echo "✅ Gateway healthy on port 8080"
else
  echo "⚠️  Gateway returned $STATUS, checking log..."
  tail -5 /tmp/gateway-v3.log
fi
