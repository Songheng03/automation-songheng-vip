#!/bin/bash
# start-all.sh — Launch all services and restart gateway
# Run: bash /root/automaton/start-all.sh

set -e

cd /root/automaton

echo "=== Starting all services ==="

# Kill existing node processes (except this script)
PIDS=$(pgrep -f "node.*/root/" || true)
if [ -n "$PIDS" ]; then
  echo "Killing existing processes..."
  kill $PIDS 2>/dev/null || true
  sleep 1
  # Force kill survivors
  PIDS=$(pgrep -f "node.*/root/" || true)
  [ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null || true
  sleep 0.5
fi

echo "1. Starting background services..."
declare -a SERVICES=(
  "/root/services/github-webhook-service.js:3125"
  "/root/services/referral-service.cjs:3150"
  "/root/services/seo-service.js:seo"
  "/root/services/content-generator.js:content"
  "/root/services/pastebin-service.js:pastebin"
)

for svc_entry in "${SERVICES[@]}"; do
  svc_file="${svc_entry%%:*}"
  svc_port="${svc_entry##*:}"
  if [ -f "$svc_file" ]; then
    echo "   Starting $(basename $svc_file)..."
    node "$svc_file" &
    sleep 0.3
  else
    echo "   Skipping $svc_file (not found)"
  fi
done

sleep 0.5

echo "2. Starting gateway..."
node gateway.cjs &

sleep 1

echo ""
echo "=== Testing ==="

# Test health
curl -s http://localhost:8080/health 2>/dev/null && echo " - /health OK" || echo " - /health FAILED"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/playground 2>/dev/null && echo " - /playground OK" || echo " - /playground FAILED"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ 2>/dev/null && echo " - / OK" || echo " - / FAILED"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/tools 2>/dev/null && echo " - /tools OK" || echo " - /tools FAILED"

echo ""
echo "=== Monitor ==="
echo "Gateway PID: $(pgrep -f 'node.*gateway.cjs' || echo 'stopped')"
echo "Services running:"
ps aux | grep "node.*/root/services" | grep -v grep || echo "  (none)"
echo ""
echo "Check: curl http://localhost:8080/health"
echo "Site: https://automation.songheng.vip"
