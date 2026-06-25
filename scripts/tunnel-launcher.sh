#!/bin/bash
# tunnel-launcher.sh — Start cloudflared tunnel, save URL, stay alive
# Run: nohup bash /root/automaton/scripts/tunnel-launcher.sh &
set -e
HOME=/root
LOG=/tmp/tunnel-launch.log
URL_FILE=/root/automaton/data/tunnel-url.txt

echo "[$(date)] Starting cloudflared..." > "$LOG"

# Kill any existing cloudflared
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

# Start cloudflared trycloudflare tunnel, capture URL from stderr
cloudflared tunnel --url http://127.0.0.1:8080 2>&1 | while read line; do
  echo "$line" >> "$LOG"
  # Try to extract URL
  url=$(echo "$line" | grep -oP 'https://[a-z-]+\.trycloudflare\.com' | head -1)
  if [ -n "$url" ]; then
    echo "$url" > "$URL_FILE"
    echo "[$(date)] TUNNEL LIVE: $url" >> "$LOG"
    # Also write full JSON
    echo "{\"url\":\"$url\",\"time\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > /root/automaton/data/tunnel-live.json
  fi
done
