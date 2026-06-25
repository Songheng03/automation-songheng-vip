#!/bin/bash
# deploy-atomic.sh — One shot. No checks. Just deploy.
DIR="/root/automaton/services"
LOG="/var/log"
# Just start all valid services
for f in "$DIR"/*.mjs; do
  name=$(basename "$f" .mjs)
  nohup node "$f" > "$LOG/$name.log" 2>&1 &
done
sleep 5
# Expose every port that's actually listening
for port in $(ss -tlnp | grep -oP '(?<=:)\d+' | sort -u); do
  curl -s -o /dev/null "http://127.0.0.1:$port/" 2>/dev/null && \
    curl -s -X POST "http://127.0.0.1:7377/expose?port=$port" 2>/dev/null || true
done
echo "DEPLOYED at $(date)"
