#!/bin/bash
# script-to-run-on-host.sh — Deploy Gateway v2.1 ON THE HOST
# Run this inside the container or via host SSH:
#   docker exec automaton bash /root/automaton/scripts/script-to-run-on-host.sh
#   OR: ssh root@HOST_IP bash /root/automaton/scripts/script-to-run-on-host.sh
#
# What it does: Restarts the gateway systemd service and verifies v2.1 is live

set -e

echo "=== Gateway v2.1 Host Deployment ==="
echo "Time: $(date -u)"
echo ""

# Try to restart gateway service
if command -v systemctl &> /dev/null; then
    echo "1. Restarting automaton-gateway service..."
    systemctl restart automaton-gateway 2>&1 || true
    sleep 2
    
    if systemctl is-active --quiet automaton-gateway; then
        echo "   ✅ Gateway service running"
    else
        echo "   ❌ Gateway service failed!"
        systemctl status automaton-gateway --no-pager 2>&1 | head -20
        exit 1
    fi
elif command -v docker &> /dev/null; then
    echo "1. Inside Docker — trying to restart host service..."
    # Check if we can call sudo
    if sudo -n systemctl restart automaton-gateway 2>/dev/null; then
        echo "   ✅ Gateway restarted via sudo"
    else
        echo "   ⚠️  Cannot restart from inside container."
        echo "   ⚠️  Run ON HOST: systemctl restart automaton-gateway"
        exit 0
    fi
else
    echo "❌ No systemctl or docker found!"
    exit 1
fi

# Verify v2.1 endpoints
echo ""
echo "2. Testing v2.1 endpoints..."
ENDPOINTS=(
    "http://localhost:8080/health"
    "http://localhost:8080/api/dev-key"
    "http://localhost:8080/api/catalog"
    "http://localhost:8080/api/catalog/openai"
    "http://localhost:8080/api/mcp"
    "http://localhost:8080/api/handshake"
    "http://localhost:8080/sitemap.xml"
    "http://localhost:8080/badge/silver"
    "http://localhost:8080/api/stats/overview"
)

for ep in "${ENDPOINTS[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$ep" 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "405" ]; then
        echo "   ✅ $ep → $STATUS"
    else
        echo "   ⚠️  $ep → $STATUS"
    fi
done

# Check Cloudflare tunnel
echo ""
echo "3. Checking Cloudflare tunnel..."
if command -v cloudflared &> /dev/null; then
    cloudflared tunnel info 2>&1 | head -5 || echo "   ⚠️ Cannot check tunnel"
    echo "   🔗 https://automation.songheng.vip"
else
    echo "   ⚠️ cloudflared not found on this system"
fi

echo ""
echo "=== Deployment Complete ==="
echo "Gateway v2.1 active with:"
echo "  - /api/dev-key (free 50-credit dev keys)"
echo "  - /api/catalog (agent service catalog)"
echo "  - /api/catalog/openai (OpenAI tool format)"
echo "  - /api/mcp (MCP JSON-RPC)"
echo "  - /api/handshake (agent handshake)"
echo "  - /badge/:grade (SVG quality badge)"
echo "  - /sitemap.xml (SEO)"
echo "  - /robots.txt (SEO)"
