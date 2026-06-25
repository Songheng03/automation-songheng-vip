#!/bin/bash
# reload-all.sh - Reload gateway with new services, update blog, push sitemap
# Run from /root/automaton/

set -e
echo "=== Gateway Reload: $(date) ==="

# 1. Find and kill the running gateway
GATEWAY_PID=$(lsof -ti :8080 2>/dev/null || ss -tlnp 'sport = :8080' 2>/dev/null | grep -oP 'pid=\K[0-9]+' || echo "")
if [ -n "$GATEWAY_PID" ]; then
    echo "Killing old gateway PID $GATEWAY_PID..."
    kill $GATEWAY_PID 2>/dev/null || true
    sleep 2
    # Force kill if still running
    kill -9 $GATEWAY_PID 2>/dev/null || true
    sleep 1
fi

# 2. Start new gateway
echo "Starting new gateway..."
cd /root/automaton
nohup node gateway.js > /tmp/gateway.log 2>&1 &
NEW_PID=$!
echo $NEW_PID > /tmp/gateway.pid
echo "New gateway PID: $NEW_PID"

# 3. Wait for it to be ready
sleep 3
for i in {1..10}; do
    if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
        echo "✅ Gateway is healthy!"
        break
    fi
    echo "Waiting for gateway... attempt $i"
    sleep 2
done

# 4. Verify new routes
echo ""
echo "=== Route Verification ==="
for route in "/health" "/tools/whois" "/tools/code-review" "/referral" "/api/referral/leaderboard" "/sitemap.xml"; do
    STATUS=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:8080$route")
    echo "$route -> $STATUS"
done

# 5. Submit sitemap to search engines
echo ""
echo "=== Pinging Search Engines ==="
curl -sf "https://www.google.com/ping?sitemap=https://automation.songheng.vip/sitemap.xml" > /dev/null 2>&1 && echo "✅ Google pinged" || echo "⚠️ Google ping failed"
curl -sf "https://www.bing.com/ping?sitemap=https://automation.songheng.vip/sitemap.xml" > /dev/null 2>&1 && echo "✅ Bing pinged" || echo "⚠️ Bing ping failed"

echo ""
echo "=== Done ==="
echo "Gateway running on PID $NEW_PID"
echo "Check logs: tail -f /tmp/gateway.log"
echo "Test: curl http://automation.songheng.vip/health"
