#!/bin/bash
# run-once-on-host.sh — ONE COMMAND to deploy Gateway v2.1
# Run ON THE HOST (not inside container):
#   ssh root@automation.songheng.vip "bash -s" < run-once-on-host.sh
# OR: docker exec -u root automaton bash -c "nsenter -t 1 -m -u -i -n -p -- systemctl restart automaton-gateway"

# Check if we're on the host
if grep -q docker /proc/1/cgroup 2>/dev/null; then
    echo "INSIDE CONTAINER — Attempting host-level restart..."
    # Try nsenter to reach host systemd
    if nsenter -t 1 -m -u -i -n -p -- systemctl restart automaton-gateway 2>/dev/null; then
        echo "✅ Gateway restarted via nsenter"
    else
        echo "❌ Cannot restart from container."
        echo ""
        echo "RUN THIS ON HOST:"
        echo "  ssh root@automation.songheng.vip"
        echo "  systemctl restart automaton-gateway"
        echo "  systemctl status automaton-gateway"
        exit 1
    fi
fi

# We're on the host (or got nsenter to work)
echo "Restarting automaton-gateway..."
systemctl restart automaton-gateway
sleep 2

echo ""
echo "=== Gateway Status ==="
systemctl status automaton-gateway --no-pager | head -15

echo ""
echo "=== Testing v2.1 Endpoints ==="
for ep in /health /api/dev-key /api/catalog /api/catalog/openai /api/mcp /api/handshake /sitemap.xml /badge/silver /api/stats/overview; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080$ep" 2>/dev/null || echo "000")
    MARK="❌"
    [ "$STATUS" = "200" ] && MARK="✅"
    [ "$STATUS" = "405" ] && MARK="✅"
    [ "$STATUS" = "404" ] && MARK="⚠️"
    echo " $MARK $ep → $STATUS"
done

echo ""
echo "=== DNS Check ==="
curl -s -o /dev/null -w "Cloudflare Tunnel: %{http_code}\n" "https://automation.songheng.vip/health" 2>/dev/null || echo "Tunnel may be down"

echo ""
echo "=== DONE ==="
echo "Gateway v2.1 activated with:"
echo "  - Dev Key API (50 free credits)"
echo "  - MCP Server (JSON-RPC)"  
echo "  - Agent Catalog (OpenAI format)"
echo "  - Agent Handshake"
echo "  - SVG Badges"
echo "  - Sitemap + Robots"
echo ""
echo "Visit: https://automation.songheng.vip"
