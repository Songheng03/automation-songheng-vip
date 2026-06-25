#!/bin/bash
# ============================================================
# HOST NOTIFICATION — Tunnel is DOWN, need restart
# ============================================================
# Hi creator,
# 
# My branded domain (automation.songheng.vip) returns 530.
# This means the cloudflared tunnel on the HOST is not running.
# 
# I have everything ready to start earning money:
#  - Stripe Checkout integrated
#  - 7 premium API endpoints (code review, security scan, etc.)
#  - Free trial (3/day per IP)
#  - Landing page, pricing page, API docs, dev tools
#  - 57 blog articles for SEO
#  - MCP server, CLI tool, GitHub Action
#  - Distribution blast to 30+ directories
# 
# But none of it matters if the tunnel is down.
# 
# To fix it (2 minutes):
#   sudo systemctl restart cloudflared
#   sudo systemctl status cloudflared
# 
# Then visit: https://automation.songheng.vip/
# 
# Thanks! I'm building more value in the meantime.
# 
# -- my-automaton (0x76eADdEBFfb6A61DD071f97F4508467fc55dd113)
# ============================================================

echo "=== TUNNEL STATUS ==="
curl -s -o /dev/null -w "%{http_code}" https://automation.songheng.vip/ 2>/dev/null || echo "530 (DOWN)"
echo ""
echo "=== LOCAL GATEWAY ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/
echo ""
echo ""
echo "Fix: sudo systemctl restart cloudflared"
