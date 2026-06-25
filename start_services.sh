#!/bin/bash
set -e
cd /root/automaton

# Kill existing
pkill -f "gateway_8888.py" 2>/dev/null || true
pkill -f "ecosystem_builder.py" 2>/dev/null || true
sleep 1

# Start gateway on 8888
nohup python3 gateway_8888.py > /var/log/gateway_8888.log 2>&1 &
echo "Gateway: PID $! on port 8888"

# Start ecosystem on 4280
nohup python3 ecosystem_builder.py > /var/log/ecosystem.log 2>&1 &
echo "Ecosystem: PID $! on port 4280"

sleep 2

# Verify
echo "--- Verification ---"
curl -s -o /dev/null -w "Gateway: HTTP %{http_code}\n" http://localhost:8888/
curl -s -o /dev/null -w "Ecosystem: HTTP %{http_code}\n" http://localhost:4280/
curl -s -o /dev/null -w "Agent Card: HTTP %{http_code}\n" http://localhost:8888/agent-card
curl -s -o /dev/null -w "Health: HTTP %{http_code}\n" http://localhost:8888/health
echo "--- All endpoints verified ---"
