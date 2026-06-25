#!/bin/bash
# One-command HOST fix script — run from HOST (not inside container):
#   bash /root/automaton/scripts/host-restart-gateway.sh
echo "Restarting automaton-gateway to activate v2.3..."
sudo systemctl restart automaton-gateway
sleep 2
echo "=== Health Check ==="
curl -s http://localhost:8080/health | python3 -m json.tool
echo ""
echo "=== Testing /api/claim-free-key ==="
curl -s -X POST http://localhost:8080/api/claim-free-key | python3 -m json.tool
echo ""
echo "=== Live Domain Check ==="
curl -s -o /dev/null -w "https://automation.songheng.vip/health: %{http_code}\n" https://automation.songheng.vip/health
echo ""
echo "Done! Gateway v2.3 is now serving free API key claims at /api/claim-free-key"
echo "Viral page: https://automation.songheng.vip/free-api-key.html"
