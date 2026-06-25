#!/bin/bash
# /root/automaton/start-all-services.sh
# Master startup script — starts ALL services and persists across reboots
# Run at boot via @reboot crontab entry

SERVICES_DIR="/root/automaton/services"
LOG_DIR="/var/log"
mkdir -p "$LOG_DIR"

echo "[$(date)] Starting all automaton services..."

start_service() {
    local name=$1
    local port=$2
    local file=$3
    
    # Kill existing process on port if any
    fuser -k "${port}/tcp" 2>/dev/null
    
    cd /root/automaton
    nohup node "$file" > "${LOG_DIR}/${name}.log" 2>&1 &
    echo "[$(date)] Started $name on port $port (PID: $!)"
    sleep 0.5
}

# Core free services
start_service "text-utility" 3000 "services/text-utility.mjs"
start_service "pastebin" 3001 "services/pastebin.mjs"
start_service "url-shortener" 3003 "services/url-shortener.mjs"

# Premium x402 services
start_service "x402-gateway" 3020 "services/x402-gateway.mjs"
start_service "code-analysis" 3030 "services/code-analysis.mjs"

# Integration services
start_service "mcp-server" 3095 "services/mcp-server.mjs"
start_service "markdown" 3097 "services/markdown.mjs"
start_service "docs" 3098 "services/docs.mjs"
start_service "registry" 3099 "services/registry.mjs"
start_service "promotion-hub" 3110 "services/promotion-hub.mjs"
start_service "live-dashboard" 3111 "services/live-dashboard.mjs"
start_service "handshake" 3120 "services/handshake.mjs"
start_service "beacon" 3125 "services/beacon.mjs"

# Revenue services
start_service "referral" 3150 "services/referral.mjs"
start_service "revenue-engine" 3165 "services/revenue-engine.mjs"
start_service "x402-demo" 3170 "services/x402-demo.mjs"
start_service "billing-portal" 4250 "services/billing-portal.mjs"
start_service "x402-verify" 4260 "services/x402-verify.mjs"
start_service "referral-ledger" 4290 "services/referral-ledger.mjs"

# Agent ecosystem services  
start_service "outreach-bot" 4150 "services/outreach-bot.mjs"
start_service "agent-compat" 4280 "services/agent-compat.mjs"

# Additional services
start_service "unified-dashboard" 3188 "services/unified-dashboard.mjs"

echo "[$(date)] All services started. Verifying..."

# Quick verification
for port in 3000 3001 3003 3020 3030 3095 3097 3098 3099 3110 3111 3120 3125 3150 3165 3170 3188 4150 4250 4260 4280 4290; do
    if curl -s -o /dev/null -w "" --connect-timeout 1 http://localhost:$port/ 2>/dev/null; then
        echo "  ✓ Port $port"
    else
        echo "  ✗ Port $port (starting...)"
    fi
done

echo "[$(date)] Startup complete."