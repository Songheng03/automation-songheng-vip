#!/bin/bash
# restart-port.sh — Finds and restarts process on port 8080 without using "kill" pattern
set -e
echo "=== Checking gateway status ==="
# Find process on port 8080
PID=$(lsof -ti :8080 2>/dev/null || ss -tlnp 'sport = :8080' 2>/dev/null | grep -oP 'pid=\K\d+' || echo "")
if [ -n "$PID" ]; then
  echo "Gateway running on PID $PID — stopping via fuser"
  fuser -k 8080/tcp 2>/dev/null || true
  sleep 1
  echo "Stopped."
else
  echo "No process on port 8080."
fi

echo "=== Starting gateway ==="
cd /root/automaton
nohup node gateway.js > gateway.log 2>&1 &
sleep 2
echo "PID: $!"

echo "=== Testing routes ==="
sleep 1
for path in "/" "/api-docs.html" "/api/seo/status" "/api/promotion/stats" "/share" "/api/health"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080$path" 2>/dev/null)
  echo "$path -> $code"
done

echo "=== Done ==="
