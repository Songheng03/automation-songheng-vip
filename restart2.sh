#!/bin/bash
# Force restart gateway - no dependencies
set +e

echo "=== FORCE RESTART ==="

# Kill everything on port 8080 hard
fuser -k 8080/tcp 2>/dev/null
sleep 1

# Start fresh
cd /root/automaton
node gateway.js &
PID=$!

sleep 3
if kill -0 $PID 2>/dev/null; then
    echo "ALIVE on PID $PID"
    curl -s http://localhost:8080/api/health
    echo ""
    echo "OK"
else
    echo "DEAD"
    cat /var/log/gateway.log
fi