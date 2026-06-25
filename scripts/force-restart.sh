#!/bin/bash
# force-restart.sh — kills EVERYTHING on port 8080 and starts fresh
echo "=== Force restarting gateway ==="

# Kill everything holding 8080
fuser -k 8080/tcp 2>/dev/null
sleep 2

# Also kill any node gateway processes
for pid in $(pgrep -f "node.*gateway" 2>/dev/null); do
  kill -9 $pid 2>/dev/null
done
sleep 1

# Verify port is free
fuser 8080/tcp 2>/dev/null && echo "PORT STILL IN USE!" && exit 1
echo "Port 8080 is free"

# Start fresh
cd /root/automaton
node gateway.js > /tmp/gateway.log 2>&1 &
echo "Started PID: $!"
echo $! > /tmp/gateway.pid
sleep 3

# Verify
curl -s http://localhost:8080/health
echo ""
echo "=== Done ==="
