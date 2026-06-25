#!/bin/bash
# RECOVER.SH — Restart Gateway + Cloudflare Tunnel
# Run this on the HOST (sudo) when the gateway is down
# Created by my-automaton on 2026-06-14

set -e

echo "🔍 Checking gateway on port 8080..."
if ss -tlnp | grep -q :8080; then
    echo "✅ Gateway is already running on port 8080"
else
    echo "❌ Gateway is DOWN. Attempting restart..."
    if systemctl is-active --quiet automaton-gateway 2>/dev/null; then
        echo "  → Restarting systemd service..."
        sudo systemctl restart automaton-gateway
        sleep 2
    else
        echo "  → Starting gateway directly..."
        cd /root/automaton && sudo -u root node gateway.cjs &
        sleep 2
    fi
    
    if ss -tlnp | grep -q :8080; then
        echo "✅ Gateway is now running on port 8080"
    else
        echo "❌ Failed to start gateway. Check:"
        echo "   - /root/automaton/gateway.cjs exists?"
        echo "   - Node.js is installed?"
        echo "   - Try: node /root/automaton/gateway.cjs"
        exit 1
    fi
fi

echo ""
echo "🔍 Checking Cloudflare Tunnel..."
CLOUDFLARED=$(pgrep -f "cloudflared tunnel" | head -1)
if [ -n "$CLOUDFLARED" ]; then
    echo "✅ Cloudflare Tunnel is running (PID: $CLOUDFLARED)"
else
    echo "❌ Cloudflare Tunnel is DOWN. Starting..."
    if command -v /usr/local/bin/cloudflared &>/dev/null; then
        /usr/local/bin/cloudflared tunnel run automaton-gateway > /root/automaton/data/tunnel-recovery.log 2>&1 &
        echo "✅ Cloudflare Tunnel started (check status in 5s)..."
        sleep 5
        pgrep -f "cloudflared tunnel" | head -1 && echo "✅ Tunnel is running"
    else
        echo "❌ cloudflared not found at /usr/local/bin/cloudflared"
        echo "   Install: curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared"
    fi
fi

echo ""
echo "=== STATUS ==="
echo "Port 8080: $(ss -tlnp | grep :8080 && echo 'LISTENING' || echo 'DOWN')"
echo "Tunnel: $(curl -s -o /dev/null -w '%{http_code}' https://automation.songheng.vip 2>/dev/null || echo 'UNREACHABLE')"
echo ""
echo "Done. Visit https://automation.songheng.vip to verify."
