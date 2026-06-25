#!/bin/bash
# ============================================================
# my-automaton: Everything Fix Script
# Run ON HOST (not inside container)
# Fixes: tunnel, gateway, permissions, monitoring
# ============================================================
# Usage: ssh into HOST, then:
#   sudo bash /root/automaton/scripts/everything-fix.sh
# Or from HOST directly:
#   docker exec automaton cat /root/automaton/scripts/everything-fix.sh | sudo bash
# ============================================================

set -e

echo "============================================"
echo "🔧 my-automaton - FULL SYSTEM REPAIR"
echo "============================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Must run as root. Use: sudo bash $0"
  exit 1
fi

# === 1. Fix Gateway ===
echo ""
echo "📡 Step 1: Restart Gateway"
echo "--------------------------"
echo "Current gateway process:"
systemctl status automaton-gateway 2>/dev/null | grep -E "(Active|PID)" || echo "  (no systemd service found)"

# Try to restart
systemctl restart automaton-gateway 2>/dev/null && echo "✅ Gateway restarted" || echo "⚠️  systemctl failed, trying direct..."

# Fallback: find and restart node process
GATEWAY_PID=$(pgrep -f "node.*gateway.cjs" 2>/dev/null | head -1)
if [ -n "$GATEWAY_PID" ]; then
  kill $GATEWAY_PID 2>/dev/null
  sleep 1
  echo "  Killed old gateway process ($GATEWAY_PID)"
fi

# Start gateway directly if systemd not available
if ! systemctl is-active automaton-gateway 2>/dev/null | grep -q "active"; then
  cd /root/automaton
  nohup node gateway.cjs > /var/log/automaton-gateway.log 2>&1 &
  echo "✅ Gateway started directly (PID: $!)"
fi

sleep 2

# === 2. Fix Cloudflare Tunnel ===
echo ""
echo "🌐 Step 2: Restart Cloudflare Tunnel"
echo "-----------------------------------"
systemctl restart cloudflared 2>/dev/null && echo "✅ Cloudflared restarted" || echo "⚠️  No cloudflared systemd service"

# Also try direct daemon
CLOUDFLARED_PID=$(pgrep cloudflared 2>/dev/null | head -1)
if [ -n "$CLOUDFLARED_PID" ]; then
  echo "  Cloudflared running (PID: $CLOUDFLARED_PID)"
else
  # Try to find config
  CF_CONFIG=$(find /etc/cloudflared /root /home -name "config*.yml" -o -name "*.json" 2>/dev/null | grep -i cloudflare | head -1)
  if [ -n "$CF_CONFIG" ]; then
    echo "  Found tunnel config: $CF_CONFIG"
    nohup cloudflared tunnel run > /var/log/cloudflared.log 2>&1 &
    echo "✅ Cloudflared started directly"
  else
    echo "❌ Could not find cloudflared config"
    echo "   Manual fix needed: cloudflared tunnel login"
  fi
fi

sleep 3

# === 3. Verify ===
echo ""
echo "🔍 Step 3: Verification"
echo "-----------------------"

# Local check
echo -n "  Local gateway : "
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/health 2>/dev/null || echo "FAIL"

# Public check
echo -n "  Public domain : "
curl -s -o /dev/null -w "%{http_code}\n" https://automation.songheng.vip/health 2>/dev/null || echo "FAIL"

# API check
echo -n "  API available : "
curl -s -o /dev/null -w "%{http_code}\n" https://automation.songheng.vip/api/stats/overview 2>/dev/null || echo "FAIL"

echo ""
echo "============================================"
echo "📋 POST-FIX SUMMARY"
echo "============================================"
echo ""
echo "  Gateway:  $(systemctl is-active automaton-gateway 2>/dev/null || echo 'check manually')"
echo "  Tunnel:   $(systemctl is-active cloudflared 2>/dev/null || echo 'check manually')"
echo ""
echo "  Visit:    https://automation.songheng.vip"
echo "  Health:   https://automation.songheng.vip/health"
echo "  API:      https://automation.songheng.vip/api/stats/overview"
echo ""
echo "  If still broken, check logs:"
echo "    journalctl -u automaton-gateway --no-pager -n 50"
echo "    journalctl -u cloudflared --no-pager -n 50"
echo "============================================"
