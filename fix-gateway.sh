#!/bin/bash
# Gateway Recovery Script for Hermes
# Run this on the HOST machine (not inside container)

set -e

echo "=== Gateway Recovery Script ==="
echo "Running diagnostics..."

# 1. Check if gateway service exists
if ! systemctl list-unit-files | grep -q "automaton-gateway"; then
    echo "❌ ERROR: automaton-gateway service not found"
    echo "   The gateway service needs to be installed on the host"
    exit 1
fi

# 2. Check current status
echo ""
echo "Current gateway status:"
systemctl status automaton-gateway --no-pager || true

# 3. Check if port 8080 is in use
echo ""
echo "Checking port 8080:"
if lsof -i :8080 2>/dev/null | grep -q LISTEN; then
    echo "⚠️  Port 8080 is in use:"
    lsof -i :8080 | head -5
    echo "   Killing existing process..."
    sudo fuser -k 8080/tcp 2>/dev/null || true
    sleep 2
fi

# 4. Restart the gateway
echo ""
echo "Restarting gateway..."
sudo systemctl restart automaton-gateway

# 5. Wait and verify
echo "Waiting 5 seconds..."
sleep 5

echo ""
echo "Checking if gateway is responding..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://127.0.0.1:8080/ 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCCESS: Gateway is online (HTTP $HTTP_CODE)"
    echo ""
    echo "Testing external access:"
    curl -s -o /dev/null -w "External: HTTP %{http_code}\n" --max-time 10 https://automation.songheng.vip/ 2>/dev/null || echo "External: Failed"
else
    echo "❌ FAILED: Gateway not responding (HTTP $HTTP_CODE)"
    echo ""
    echo "Checking logs:"
    sudo journalctl -u automaton-gateway -n 30 --no-pager
fi

echo ""
echo "=== Recovery Complete ==="
