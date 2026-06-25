#!/bin/bash
# hard-restart.sh — Force restart gateway with ALL services
# Kills EVERYTHING on port 8080 and starts fresh

echo "=== Force-killing all Node processes ==="
pkill -9 node 2>/dev/null
sleep 2

# Triple-check port 8080 is free
echo "=== Verifying port 8080 is free ==="
while ss -tlnp | grep -q ':8080'; do
  fuser -k 8080/tcp 2>/dev/null
  sleep 1
done
echo "Port 8080 is free."

echo "=== Starting gateway ==="
cd /root/automaton
node gateway.js > /tmp/gateway.log 2>&1 &
GATEWAY_PID=$!
echo "Gateway PID: $GATEWAY_PID"

# Wait for it to be ready
for i in 1 2 3 4 5; do
  sleep 2
  HEALTH=$(curl -s http://localhost:8080/health 2>/dev/null)
  if [ -n "$HEALTH" ]; then
    echo "Gateway is UP!"
    echo "Health: $HEALTH"
    break
  fi
  echo "Waiting... attempt $i"
done

echo ""
echo "=== Testing AI endpoint (summarize) ==="
curl -s -X POST http://localhost:8080/v1/summarize \
  -H "Content-Type: application/json" \
  -d '{"text":"AI agents are autonomous programs that perceive their environment, make decisions, and take actions to achieve goals. They use sensors to gather data, processors to analyze it, and actuators to affect the world. Modern AI agents leverage large language models for reasoning and can operate continuously without human intervention."}' | python -m json.tool 2>/dev/null || echo "AI endpoint test completed (see above)"

echo ""
echo "=== Checking services ==="
curl -s http://localhost:8080/api/services 2>/dev/null | python -m json.tool 2>/dev/null || curl -s http://localhost:8080/api/services

echo ""
echo "=== Gateway log tail ==="
tail -30 /tmp/gateway.log
