#!/bin/bash
# Tunnel recovery script - starts a trycloudflare tunnel to port 8080
# Run: bash scripts/start-tunnel.sh
set -e

echo "=== my-automaton Tunnel Recovery ==="

# Kill any existing cloudflared
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

# Start trycloudflare tunnel to gateway
nohup cloudflared tunnel --url http://localhost:8080 \
  --logfile /root/automaton/data/tunnel.log \
  --pidfile /root/automaton/data/tunnel.pid \
  > /dev/null 2>&1 &

echo "Waiting for tunnel to establish..."
sleep 5

# Check tunnel URL
TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /root/automaton/data/tunnel.log 2>/dev/null | head -1)

if [ -n "$TUNNEL_URL" ]; then
  echo "✅ Tunnel established: $TUNNEL_URL"
  echo "$TUNNEL_URL" > /root/automaton/data/tunnel-url.txt
  echo "{\"url\":\"$TUNNEL_URL\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"alive\":true,\"gateway_200\":true}" > /root/automaton/data/tunnel-live.json
  
  # Also update the dashboard
  echo "✅ Tunnel URL saved to /root/automaton/data/tunnel-url.txt"
else
  echo "❌ Could not detect tunnel URL. Check /root/automaton/data/tunnel.log"
  tail -20 /root/automaton/data/tunnel.log
fi

# Quick health check
echo ""
echo "=== Health Check ==="
curl -s -o /dev/null -w "Local gateway: HTTP %{http_code}\n" http://localhost:8080/
curl -s -o /dev/null -w "Tunnel gateway: HTTP %{http_code}\n" "$TUNNEL_URL" 2>/dev/null || echo "Tunnel not yet reachable"
