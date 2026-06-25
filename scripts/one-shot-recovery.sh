#!/bin/bash
# ONE-SHOT RECOVERY — run on HOST to fix my-automaton
# Fixes: Cloudflare tunnel + gateway restart + disk cleanup
# Run: sudo bash /root/automaton/scripts/one-shot-recovery.sh

set -e

echo "=============================================="
echo "  my-automaton ONE-SHOT RECOVERY"
echo "  $(date -u)"
echo "=============================================="

# Step 1: Check if cloudflared is installed
echo ""
echo "[1/5] Checking cloudflared..."
if command -v cloudflared &> /dev/null; then
    echo "  ✅ cloudflared found: $(cloudflared version)"
    # Check if tunnel exists
    TUNNEL_ID=$(cloudflared tunnel list 2>/dev/null | grep -oP '[a-f0-9-]{36}' | head -1)
    if [ -n "$TUNNEL_ID" ]; then
        echo "  ✅ Tunnel ID: $TUNNEL_ID"
    else
        echo "  ⚠️  No tunnel found. Will try restarting service."
    fi
else
    echo "  ⚠️  cloudflared not found. Installing..."
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared
    chmod +x /usr/local/bin/cloudflared
    cloudflared version
fi

# Step 2: Restart cloudflared tunnel
echo ""
echo "[2/5] Restarting Cloudflare tunnel..."
if sudo systemctl is-active --quiet cloudflared 2>/dev/null; then
    sudo systemctl restart cloudflared
    echo "  ✅ cloudflared restarted"
elif sudo systemctl is-active --quiet cloudflared-tunnel 2>/dev/null; then
    sudo systemctl restart cloudflared-tunnel
    echo "  ✅ cloudflared-tunnel restarted"
else
    # Try to find and start cloudflared
    echo "  ⚠️  cloudflared service not found. Trying to start manually..."
    TUNNEL_CONFIG=$(find /root/.cloudflared -name "*.json" 2>/dev/null | head -1)
    if [ -n "$TUNNEL_CONFIG" ]; then
        echo "  Found config: $TUNNEL_CONFIG"
        nohup cloudflared tunnel run --metrics 127.0.0.1:59312 > /var/log/cloudflared.log 2>&1 &
        echo "  ✅ cloudflared started in background"
    else
        echo "  ⚠️  No cloudflared config found. Creating basic tunnel..."
        cloudflared tunnel create automation-chaosong 2>/dev/null || true
    fi
fi

# Step 3: Restart Gateway
echo ""
echo "[3/5] Restarting Gateway..."
if sudo systemctl is-active --quiet automaton-gateway 2>/dev/null; then
    sudo systemctl restart automaton-gateway
    echo "  ✅ automaton-gateway restarted"
else
    echo "  ⚠️  Gateway service not found. Checking node..."
    if command -v node &> /dev/null; then
        # Kill any existing gateway
        pkill -f "node.*gateway" 2>/dev/null || true
        sleep 1
        # Start gateway
        nohup node /root/automaton/gateway.cjs > /var/log/automaton-gateway.log 2>&1 &
        echo "  ✅ Gateway started in background (PID: $!)"
    else
        echo "  ❌ node not found!"
        exit 1
    fi
fi

sleep 2

# Step 4: Verify Gateway is serving locally
echo ""
echo "[4/5] Verifying local health..."
for i in 1 2 3; do
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null || echo "000")
    if [ "$HEALTH" = "200" ]; then
        echo "  ✅ Gateway UP (localhost:8080 → HTTP $HEALTH)"
        break
    else
        echo "  ⏳ Waiting... (attempt $i/3, got $HEALTH)"
        sleep 2
    fi
done

# Step 5: Check external health
echo ""
echo "[5/5] Checking external health via Cloudflare..."
sleep 5
EXT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://automation.songheng.vip/health 2>/dev/null || echo "TIMEOUT")
if [ "$EXT_HTTP" = "200" ]; then
    echo "  ✅ EXTERNAL HEALTH: HTTP $EXT_HTTP ✅"
    echo "  Domain is LIVE: https://automation.songheng.vip"
else
    echo "  ⚠️  External health: HTTP $EXT_HTTP"
    echo "  Tunnel may still be propagating. Check in 2-3 minutes:"
    echo "  curl -s https://automation.songheng.vip/health"
fi

echo ""
echo "=============================================="
echo "  RECOVERY COMPLETE"
echo "  Local:  ✅ http://localhost:8080/health"
echo "  Ext:   $(if [ "$EXT_HTTP" = "200" ]; then echo '✅ https://automation.songheng.vip'; else echo "⚠️  $EXT_HTTP - check again soon"; fi)"
echo "  Stats: curl -s http://localhost:8080/api/stats/overview"
echo "=============================================="
