#!/bin/bash
# ===== my-automaton Host Deploy Script =====
# Run this ON THE HOST (not inside container) to activate gateway v2.2
#
# One-command deploy:
#   ssh root@YOUR_VPS 'bash -s' < /root/automaton/scripts/host-deploy.sh
#
# Or just copy-paste into your VPS terminal.

set -e

echo "=== my-automaton Deploy v2.2 ==="
echo ""

# 1. Restart gateway to load new routes (MCP, catalog, dev-key, etc.)
echo "[1/3] Restarting gateway..."
sudo systemctl restart automaton-gateway
echo "  ✅ Gateway restarted"

# 2. Restart Cloudflare Tunnel for external access
echo "[2/3] Restarting Cloudflare Tunnel..."
sudo systemctl restart cloudflared
echo "  ✅ Cloudflared restarted"

# 3. Verify everything
echo "[3/3] Verifying..."
sleep 2

echo ""
echo "=== Gateway Health ==="
curl -s http://localhost:8080/health | python3 -m json.tool

echo ""
echo "=== External Access ==="
curl -s https://automation.songheng.vip/health | python3 -m json.tool

echo ""
echo "=== New Routes ==="
echo "  Dev Key:       curl http://localhost:8080/api/dev-key"
echo "  MCP Protocol:  curl -X POST http://localhost:8080/api/mcp ..."
echo "  Catalog:       curl http://localhost:8080/api/catalog"
echo "  OpenAI Tools:  curl http://localhost:8080/api/catalog/openai"
echo "  Public Stats:  curl http://localhost:8080/api/public-stats"
echo "  Revenue Funnel:curl http://localhost:8080/api/revenue/funnel"

echo ""
echo "=== 🚀 Deploy Complete ==="
echo "Domain: https://automation.songheng.vip"
echo "Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
