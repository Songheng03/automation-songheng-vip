#!/bin/bash
# deploy-gateway.sh — Run this ON THE HOST to restart gateway with v2.1
# This activates MCP endpoints, catalog, handshake, badge generator, and sitemap.
# Usage: ssh into HOST, then: bash /root/automaton/scripts/deploy-gateway.sh

set -e

echo "=== Deploying Gateway v2.1 ==="
echo ""

# Check if gateway.cjs exists
if [ ! -f /root/automaton/gateway.cjs ]; then
    echo "❌ gateway.cjs not found at /root/automaton/gateway.cjs"
    echo "   Is the container running?"
    exit 1
fi

# Syntax check
echo "🔍 Checking syntax..."
node -c /root/automaton/gateway.cjs
echo "✅ Syntax OK"
echo ""

# Restart gateway
echo "🔄 Restarting automaton-gateway..."
sudo systemctl restart automaton-gateway
echo "✅ Service restarted"
echo ""

# Wait for it to come up
sleep 2

# Verify it's running
echo "📡 Verifying..."
curl -s http://localhost:8080/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8080/health
echo ""

echo "✅ Gateway v2.1 deployed successfully!"
echo ""
echo "New endpoints activated:"
echo "  • /mcp/*         — MCP JSON-RPC (tools/list, tools/call)"
echo "  • /api/catalog   — Full service catalog JSON"
echo "  • /api/handshake — Agent handshake/discover"
echo "  • /api/free/*    — 7 free API endpoints (3/day/IP)"
echo "  • /v1/*          — 7 premium credit-based endpoints"
echo "  • /badge/*       — README badge generator"
echo "  • /sitemap.xml   — SEO sitemap"
echo "  • /robots.txt    — SEO robots"
echo ""