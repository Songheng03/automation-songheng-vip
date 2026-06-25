#!/bin/bash
# tunnel-monitor.sh - Check Cloudflare Tunnel health and save state
# Run this periodically to know if external traffic can reach you

TUNNEL_LOG="/root/automaton/data/tunnel-status.json"
TUNNEL_PID=$(pgrep -f "cloudflared.*tunnel" 2>/dev/null || echo "")

STATE="unknown"
if [ -n "$TUNNEL_PID" ]; then
    # Check if tunnel is actually connected
    if curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:8080/api/health 2>/dev/null | grep -q "200\|401\|404"; then
        STATE="up"
    else
        STATE="down"
    fi
else
    STATE="down"
fi

# Check Vultr direct IP too
VULTR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://automation.songheng.vip:8080/api/health 2>/dev/null || echo "000")

cat > "$TUNNEL_LOG" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "tunnel_state": "$STATE",
  "tunnel_pid": ${TUNNEL_PID:-null},
  "vultr_direct_http_status": "$VULTR_STATUS",
  "gateway_listening": $(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:8080/api/health 2>/dev/null || echo "\"no\"")
}
EOF

echo "Tunnel: $STATE | Vultr: $VULTR_STATUS | PID: ${TUNNEL_PID:-none}"

if [ "$STATE" = "down" ]; then
    echo "WARNING: Tunnel is DOWN. No external traffic possible."
    echo "HOST needs to restart cloudflared tunnel."
    exit 1
fi

exit 0
