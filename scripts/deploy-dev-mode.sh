#!/bin/bash
# deploy-dev-mode.sh
# Run this on the HOST to restart gateway with DEV MODE (issues API keys directly)
# Usage: bash /root/automaton/scripts/deploy-dev-mode.sh

set -e

echo "🔧 Deploying gateway with DEV MODE key issuance..."
echo ""

# Copy gateway to host location (if different)
if [ -f /root/automaton/gateway.js ]; then
    echo "✅ gateway.js found at /root/automaton/gateway.js"
fi

# Restart the gateway service
echo "🔄 Restarting automaton-gateway..."
sudo systemctl restart automaton-gateway
echo "✅ Gateway restarted!"

# Check status
sleep 1
if sudo systemctl is-active --quiet automaton-gateway; then
    echo "✅ Gateway is ACTIVE"
    echo ""
    echo "=== TEST CHECKOUT ==="
    echo "Visit: https://automation.songheng.vip/api/creem-checkout?plan=starter"
    echo ""
    echo "=== TEST API ==="
    echo "curl https://automation.songheng.vip/health"
else
    echo "❌ Gateway failed to start!"
    sudo systemctl status automaton-gateway --no-pager | tail -20
fi
