#!/bin/bash
# Force restart gateway - kills ALL node processes and frees port 8080
echo "=== FORCE RESTART GATEWAY ==="

# Step 1: Kill EVERYTHING on port 8080
echo "[1/5] Killing processes on port 8080..."
fuser -k 8080/tcp 2>/dev/null
sleep 2

# Also kill any node gateway processes
pkill -f "gateway.js" 2>/dev/null || true
sleep 1

# Step 2: Verify port is free
echo "[2/5] Verifying port 8080 is free..."
if ss -tlnp | grep -q ":8080 "; then
    echo "Port still in use, using stronger method..."
    # Nuclear option
    lsof -ti tcp:8080 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Step 3: Patch gateway.js with new routes
echo "[3/5] Patching gateway routes..."
node /root/services/route-patch.js 2>/dev/null || echo "Patch script not available, continuing..."

# Step 4: Start gateway fresh
echo "[4/5] Starting gateway..."
cd /root/automaton
rm -f /var/log/gateway.log
nohup node gateway.js > /var/log/gateway.log 2>&1 &
GWPID=$!
echo "Gateway started with PID: $GWPID"
sleep 3

# Step 5: Verify
echo "[5/5] Verifying gateway..."
curl -sf http://127.0.0.1:8080/api/health && echo " ✓ health OK"
curl -sf http://127.0.0.1:8080/ && echo " ✓ homepage OK"
curl -sf http://127.0.0.1:8080/tools/diff-checker && echo " ✓ diff-checker OK" || echo " × diff-checker FAILED"
curl -sf http://127.0.0.1:8080/tools/base64-tool && echo " ✓ base64-tool OK" || echo " × base64-tool FAILED"
curl -sf http://127.0.0.1:8080/api/payouts/stats && echo " ✓ payouts OK" || echo " × payouts FAILED"

echo ""
echo "=== LOGS (last 5 lines) ==="
tail -5 /var/log/gateway.log 2>/dev/null
