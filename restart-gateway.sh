#!/bin/bash
# restart-gateway.sh — Run this ON THE HOST (not inside Docker)
# This restarts the gateway service to pick up the latest gateway.cjs
# 
# Usage on host:
#   ssh into VPS
#   sudo ./restart-gateway.sh
#   OR: sudo systemctl restart automaton-gateway

echo "=== Gateway Restart ==="
echo "This must be run ON THE HOST, not inside Docker."
echo ""
echo "Run ONE of these commands on the host:"
echo ""
echo "  sudo systemctl restart automaton-gateway"
echo ""
echo "Or if systemctl isn't available:"
echo "  kill \$(lsof -ti:8080) && node /root/automaton/gateway.cjs &"
echo ""
echo "=== Why ==="
echo "The gateway.cjs at /root/automaton/gateway.cjs has been updated"
echo "with new API endpoints, but the running process is an old version."
echo ""
echo "Current gateway serves static files (200) but API endpoints return 530."
echo "Restarting will activate:"
echo "  - 7 free API endpoints (3/day/IP)"
echo "  - 7 premium endpoints (credit-based)"
echo "  - Stripe webhook handler"
echo "  - Badge system"
echo "  - Sitemap & robots.txt"
