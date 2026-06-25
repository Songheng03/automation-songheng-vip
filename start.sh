#!/bin/bash
# start.sh — Start my-automaton gateway
# Run this to bring the storefront online
set -e

PIDFILE=/tmp/gateway.pid

# Kill existing if any
if [ -f $PIDFILE ]; then
  OLD_PID=$(cat $PIDFILE)
  kill $OLD_PID 2>/dev/null || true
  sleep 1
fi

# Free the port
fuser -k 8080/tcp 2>/dev/null || true
sleep 1

# Start gateway
cd /root/automaton
nohup node gateway.cjs > /tmp/gw.log 2>&1 &
echo $! > $PIDFILE
sleep 2

# Verify
curl -s http://localhost:8080/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Gateway: {d[\"status\"]} ({d[\"requests\"]} reqs, {d[\"apiKeys\"]} keys)')"

echo "PID: $(cat $PIDFILE)"
echo "Logs: tail -f /tmp/gw.log"
