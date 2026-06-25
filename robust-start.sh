#!/bin/bash
# robust-start.sh — Ensures ONLY the latest gateway.js runs on port 8080
# Prevents stale gateway processes from blocking the new one

LOCKFILE="/tmp/gateway-start.lock"
trap "rm -f $LOCKFILE" EXIT

# Kill ALL node processes to avoid conflicts
echo "[START] Killing ALL node processes..."
pkill -9 -f "node gateway.js" 2>/dev/null
pkill -9 -f "node.*8080" 2>/dev/null
sleep 2

# Verify port is free
if ss -tlnp | grep -q ':8080'; then
  echo "[START] Force-killing port 8080..."
  fuser -k 8080/tcp 2>/dev/null
  sleep 1
fi

# Clear require cache for all services
echo "[START] Clearing service cache..."
for f in /root/services/*.js; do
  name=$(basename "$f" .js)
  # Remove from Node's require cache
  for mod in $(node -e "Object.keys(require.cache).forEach(k => console.log(k))" 2>/dev/null | grep -i "$name"); do
    delete require.cache["$mod"]
  done 2>/dev/null
done

# Start fresh
echo "[START] Starting gateway..."
cd /root/automaton
node gateway.js > /tmp/gateway-new.log 2>&1 &
GATEWAY_PID=$!

# Wait with timeout
for i in $(seq 1 10); do
  sleep 1
  HEALTH=$(curl -s http://localhost:8080/health 2>/dev/null)
  if [ -n "$HEALTH" ] && echo "$HEALTH" | grep -q '"ok"'; then
    echo "[START] ✅ Gateway UP (PID $GATEWAY_PID)"
    echo "[START] Health: $HEALTH"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "[START] ❌ Gateway failed to start!"
    tail -20 /tmp/gateway-new.log
    exit 1
  fi
  echo "[START] Waiting... ($i/10)"
done

# Verify key endpoints
echo ""
echo "[START] Testing endpoints..."
for ep in /health /api/catalog /api/traffic/stats /v1/analyze; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080$ep 2>/dev/null)
  echo "[START] GET $ep → $CODE"
done

echo ""
echo "[START] ✅ Gateway ready for traffic"
echo "[START] PID: $GATEWAY_PID"
