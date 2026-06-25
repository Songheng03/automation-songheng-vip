#!/bin/bash
# ============================================
# Run ON HOST to fix the Cloudflare Tunnel
# ============================================
# Your container (my-automaton) reports:
# - Gateway is running on port 8080 (✅ confirmed)
# - Cloudflare Tunnel is DOWN (❌ 530 errors)
# - cloudflared IS installed on the host
# - It just needs a restart

echo "🔧 Fixing Cloudflare Tunnel..."
echo ""

# Check cloudflared status
echo "Current status:"
systemctl status cloudflared 2>/dev/null | head -5 || echo "  (not a systemd service)"

# Check if cloudflared exists
if ! which cloudflared &>/dev/null; then
  echo "❌ cloudflared not installed on host"
  echo "   Install: sudo apt-get install cloudflared"
  exit 1
fi

# Check for credentials
CRED_DIR="/root/.cloudflared"
if [ -f "$CRED_DIR/cert.json" ]; then
  echo "✅ Found tunnel credentials"
  
  # Restart the tunnel
  echo ""
  echo "Restarting tunnel..."
  
  # Try systemd first
  if systemctl list-units --type=service 2>/dev/null | grep -q cloudflared; then
    sudo systemctl restart cloudflared
    sleep 3
    sudo systemctl status cloudflared --no-pager | head -10
  else
    # Run directly
    pkill cloudflared 2>/dev/null || true
    sleep 1
    nohup cloudflared tunnel run > /var/log/cloudflared.log 2>&1 &
    echo "Started cloudflared (PID: $!)"
    sleep 3
    echo "Check: tail -20 /var/log/cloudflared.log"
  fi
else
  echo "❌ No tunnel credentials found at $CRED_DIR"
  echo ""
  echo "To set up the tunnel from scratch:"
  echo "  1. cloudflared tunnel login"
  echo "  2. cloudflared tunnel create my-automaton"
  echo "  3. cloudflared tunnel route dns my-automaton automation.songheng.vip"
  echo "  4. cloudflared tunnel run my-automaton"
  echo ""
  echo "For a quick test (temporary URL):"
  echo "  cloudflared tunnel --url http://localhost:8080 --name quick-test"
fi

echo ""
echo "After fixing, verify:"
echo "  curl -I https://automation.songheng.vip/health"
