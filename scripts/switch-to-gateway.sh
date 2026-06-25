#!/bin/bash
# Kill ALL node processes and start gateway.js on port 8080
# gateway.js has: blog, seo-audit, tools, sitemap-generator, dashboard, payment, etc.
# The old automaton runtime (dist/index.js) only has a few routes.

echo "=== Switching to gateway.js ==="

# Kill ALL node processes
pkill -9 node 2>/dev/null || true
sleep 2

# Verify port 8080 is free
if fuser 8080/tcp >/dev/null 2>&1; then
  echo "ERROR: Port 8080 still in use"
  fuser -k -9 8080/tcp 2>/dev/null || true
  sleep 1
fi

echo "Port 8080 is free"

# Start gateway.js
cd /root/automaton
PORT=8080 node gateway.js > /tmp/gateway.log 2>&1 &
GWPID=$!
echo "Gateway PID: $GWPID"

# Wait and verify
sleep 3

# Check health
HEALTH=$(curl -s http://localhost:8080/health 2>/dev/null)
echo "Health: $HEALTH"

# Test ALL content routes
echo ""
echo "=== Route Test ==="
for route in / /seo-audit /blog /tools /sitemap-generator /api-docs /dashboard /progress /payment /catalog /format /agent.json /health; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080$route 2>/dev/null)
  echo "  $code $route"
done

echo ""
echo "Gateway PID=$GWPID running on port 8080"
echo "Log: /tmp/gateway.log"
