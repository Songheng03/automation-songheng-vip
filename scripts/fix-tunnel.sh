#!/bin/bash
# Tunnel Fix Script — kills dead cloudflared processes and starts fresh tunnel
# Tunnel URL: https://automation.songheng.vip → localhost:8080

LOG_FILE="/root/automaton/data/tunnel-fix.log"
LIVE_FILE="/root/automaton/data/tunnel-live.json"
GATEWAY_URL="http://localhost:8080"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# 1. Kill ALL cloudflared processes
log "Killing all cloudflared processes..."
pkill -9 cloudflared 2>/dev/null
sleep 2

# 2. Verify all dead
if pidof cloudflared >/dev/null 2>&1; then
    log "ERROR: Some cloudflared processes still alive"
    killall -9 cloudflared 2>/dev/null
    sleep 1
fi
log "All cloudflared processes killed."

# 3. Start new tunnel (trycloudflare for quick recovery)
log "Starting new cloudflared tunnel..."
nohup /usr/local/bin/cloudflared tunnel --url "$GATEWAY_URL" --no-autoupdate > /root/automaton/data/cloudflared-tunnel.log 2>&1 &
CLOUDFLARED_PID=$!
log "Started cloudflared PID: $CLOUDFLARED_PID"

# 4. Wait for tunnel URL
for i in $(seq 1 15); do
    sleep 2
    TUNNEL_URL=$(grep -oP 'https://[a-z-]+\.trycloudflare\.com' /root/automaton/data/cloudflared-tunnel.log 2>/dev/null | head -1)
    if [ -n "$TUNNEL_URL" ]; then
        log "Tunnel URL: $TUNNEL_URL"
        echo "{\"url\":\"$TUNNEL_URL\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > "$LIVE_FILE"
        log "Saved tunnel URL to $LIVE_FILE"

        # 5. Verify gateway is reachable via tunnel
        log "Verifying tunnel..."
        TUNNEL_OK=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$TUNNEL_URL/health" 2>/dev/null)
        if [ "$TUNNEL_OK" = "200" ]; then
            log "SUCCESS: Tunnel verified — $TUNNEL_URL/health → HTTP 200"
        else
            log "WARNING: Tunnel health check returned HTTP $TUNNEL_OK"
        fi

        # 6. Check if the automation.songheng.vip domain resolves and works
        log "Checking Cloudflare Tunnel domain..."
        CF_OK=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://automation.songheng.vip/health" 2>/dev/null)
        if [ "$CF_OK" = "200" ]; then
            log "SUCCESS: automation.songheng.vip is reachable — HTTP $CF_OK"
        else
            log "WARNING: automation.songheng.vip returned HTTP $CF_OK (may need Cloudflare Tunnel config update)"
        fi

        log "Tunnel fix complete!"
        exit 0
    fi
done

log "ERROR: Tunnel URL not found after 30 seconds. Check cloudflared-tunnel.log"
cat /root/automaton/data/cloudflared-tunnel.log | tail -20 >> "$LOG_FILE"
exit 1
