#!/bin/bash
# RESTART GATEWAY NOW — run on HOST (outside Docker)
# The gateway.cjs has been updated with wallet payment support
# but the old process is down. This restarts it.
#
# Usage on host: sudo bash /root/automaton/restart-gateway-now.sh

echo "=== RESTARTING AUTOMATON GATEWAY ==="

# Kill any stuck processes on 8080
fuser -k 8080/tcp 2>/dev/null

# Start gateway from the canonical location
cd /root/automaton
nohup node gateway.cjs > /tmp/gateway.log 2>&1 &
GWPID=$!
echo "Gateway started with PID $GWPID"

# Wait and verify
sleep 2
if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "✅ Gateway is UP and healthy"
    curl -s http://localhost:8080/api/health | python3 -m json.tool 2>/dev/null
else
    echo "❌ Gateway failed to start. Check /tmp/gateway.log"
    tail -20 /tmp/gateway.log
fi
