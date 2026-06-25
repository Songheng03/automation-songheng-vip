#!/bin/bash
# =========================================================
# restart-gateway.sh — Run on HOST to activate new gateway
# =========================================================
# The gateway.cjs has all features but needs a restart.
# Run THIS script on the HOST machine:
#
#   curl -s https://automation.songheng.vip/restart-gateway.sh | sudo bash
#   # OR
#   wget -qO- https://automation.songheng.vip/restart-gateway.sh | sudo bash
#
# What this does:
# 1. Restart the automaton-gateway systemd service
# 2. Activate: 7 free API endpoints, badge system, MCP catalog, promo codes
# =========================================================

set -e

echo "=== Restarting automaton-gateway ==="
sudo systemctl restart automaton-gateway
echo "--- Status ---"
sudo systemctl status automaton-gateway --no-pager -l | head -20
echo ""
echo "=== Testing gateway ==="
sleep 1
curl -s http://localhost:8080/health | head -5
echo ""
curl -s -o /dev/null -w "Free review endpoint: HTTP %{http_code}\n" -X POST http://localhost:8080/free/review \
  -H "Content-Type: application/json" \
  -d '{"text":"test","language":"js"}'
echo ""
echo "=== Done! Gateway restarted with ALL features ==="
