#!/bin/bash
# restart-gateway.sh — Run ON HOST to activate Gateway v2.1
# This script must run outside the Docker container.
#
# Usage from HOST:
#   bash /root/automaton/scripts/restart-gateway.sh
#
# Or from inside container (if sudo works):
#   sudo bash /root/automaton/scripts/restart-gateway.sh
#
# What this does:
#   1. Restarts the automaton-gateway systemd service
#   2. Verifies the new gateway is serving correctly
#   3. Tests key endpoints

GATEWAY_SERVICE="automaton-gateway"
GATEWAY_PORT=8080
DOMAIN="https://automation.songheng.vip"
LOG_FILE="/root/automaton/data/gateway-deploy.log"

mkdir -p /root/automaton/data

echo "=== Gateway v2.1 Deployment ===" | tee -a $LOG_FILE
echo "Time: $(date -u)" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Step 1: Validate gateway.cjs syntax
echo "1. Validating gateway.cjs syntax..." | tee -a $LOG_FILE
if node -c /root/automaton/gateway.cjs 2>&1; then
    echo "   ✅ Syntax OK" | tee -a $LOG_FILE
else
    echo "   ❌ Syntax error! Aborting." | tee -a $LOG_FILE
    exit 1
fi

# Step 2: Restart the service
echo "2. Restarting $GATEWAY_SERVICE..." | tee -a $LOG_FILE
systemctl restart $GATEWAY_SERVICE 2>&1 | tee -a $LOG_FILE
sleep 2

# Step 3: Verify service status
echo "3. Checking service status..." | tee -a $LOG_FILE
if systemctl is-active --quiet $GATEWAY_SERVICE; then
    echo "   ✅ Service running" | tee -a $LOG_FILE
else
    echo "   ❌ Service failed!" | tee -a $LOG_FILE
    systemctl status $GATEWAY_SERVICE --no-pager | tee -a $LOG_FILE
    exit 1
fi

# Step 4: Test endpoints
echo "4. Testing endpoints..." | tee -a $LOG_FILE
ENDPOINTS=(
    "/health"
    "/"
    "/api/stats/overview"
    "/sitemap.xml"
    "/robots.txt"
    "/api/dev-key"
    "/api/catalog"
)

for ep in "${ENDPOINTS[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$GATEWAY_PORT$ep 2>/dev/null)
    if [ "$STATUS" = "200" ]; then
        echo "   ✅ $ep → $STATUS" | tee -a $LOG_FILE
    else
        echo "   ⚠️  $ep → $STATUS" | tee -a $LOG_FILE
    fi
done

# Step 5: Test MCP endpoint
echo "5. Testing MCP JSON-RPC..." | tee -a $LOG_FILE
MCP_RESULT=$(curl -s -X POST http://localhost:$GATEWAY_PORT/api/mcp \
    -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' 2>/dev/null)
if echo "$MCP_RESULT" | grep -q "analyze"; then
    echo "   ✅ MCP tools/list works" | tee -a $LOG_FILE
else
    MCP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:$GATEWAY_PORT/api/mcp \
        -H 'Content-Type: application/json' \
        -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' 2>/dev/null)
    echo "   ⚠️  MCP returned $MCP_STATUS" | tee -a $LOG_FILE
fi

# Step 6: Test free endpoint
echo "6. Testing free API..." | tee -a $LOG_FILE
FREE_RESULT=$(curl -s -X POST http://localhost:$GATEWAY_PORT/api/free/analyze \
    -H 'Content-Type: application/json' \
    -d '{"text":"test"}' 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "   ✅ Free endpoint reachable" | tee -a $LOG_FILE
else
    echo "   ⚠️  Free endpoint issue" | tee -a $LOG_FILE
fi

# Step 7: Check domain
echo "7. Checking Cloudflare domain..." | tee -a $LOG_FILE
DOMAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $DOMAIN 2>/dev/null)
if [ "$DOMAIN_STATUS" = "200" ] || [ "$DOMAIN_STATUS" = "530" ]; then
    echo "   🌐 Domain: $DOMAIN (returns $DOMAIN_STATUS — 530=CF tunnel down, 200=OK)" | tee -a $LOG_FILE
else
    echo "   ❌ Domain: $DOMAIN → $DOMAIN_STATUS" | tee -a $LOG_FILE
fi

# Summary
echo "" | tee -a $LOG_FILE
echo "=== Summary ===" | tee -a $LOG_FILE
echo "Gateway: v2.1 (MCP + Catalog + Handshake + Dev-Key)" | tee -a $LOG_FILE
echo "Status: $(systemctl is-active $GATEWAY_SERVICE)" | tee -a $LOG_FILE
echo "Port: $GATEWAY_PORT" | tee -a $LOG_FILE
echo "Domain: $DOMAIN" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE
echo "📋 Post-Deploy Checklist:" | tee -a $LOG_FILE
echo "  ☐ Verify Cloudflare tunnel is up: cloudflared tunnel list" | tee -a $LOG_FILE
echo "  ☐ Check logs: journalctl -u $GATEWAY_SERVICE --no-pager -n 50" | tee -a $LOG_FILE
echo "  ☐ Test live: curl $DOMAIN/health" | tee -a $LOG_FILE
echo "  ☐ Redeem dev key: curl -X POST $DOMAIN/api/dev-key" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE
echo "✅ Gateway deployment complete!" | tee -a $LOG_FILE
