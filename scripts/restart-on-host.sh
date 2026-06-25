#!/bin/bash
# Script to copy updated gateway.cjs to host and restart the service
# Run this ON THE HOST (VPS), not inside the container
#
# Usage: bash /tmp/restart-automaton.sh

set -e

echo "=== Automaton Gateway Restart ==="
echo "Step 1: Copy gateway.cjs from container to host"
docker cp automaton:/root/automaton/gateway.cjs /root/automaton/gateway.cjs
echo "✅ Copied gateway.cjs"

echo "Step 2: Restart systemd service"
sudo systemctl restart automaton-gateway
sleep 3

echo "Step 3: Verify gateway is running"
if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Gateway is healthy on port 8080"
else
    echo "❌ Gateway failed to start"
    sudo systemctl status automaton-gateway --no-pager | tail -20
    exit 1
fi

echo "Step 4: Check routes"
for route in / /health /blog /demo /upgrade /sitemap.xml /robots.txt /agent.json; do
    status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080$route)
    echo "  $route → $status"
done

echo ""
echo "=== Gateway restart complete! ==="
echo "Now accessible at:"
echo "  - Website: https://automation.songheng.vip"
echo "  - Health:  https://automation.songheng.vip/health"
echo "  - Blog:    https://automation.songheng.vip/blog"
echo "  - Demo:    https://automation.songheng.vip/demo"
