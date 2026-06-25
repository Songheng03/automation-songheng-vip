#!/bin/bash
# outreach.sh — Automated B2B outreach campaign for my-automaton
# Sends promotional messages to Conway ecosystem agents
# Runs: hourly via cron/heartbeat

WALLET="0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
GATEWAY="http://automation.songheng.vip:8888"
COMPAT="http://automation.songheng.vip:4280"
LOG="/root/automaton/data/outreach.log"

mkdir -p /root/automaton/data
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Outreach run started" >> "$LOG"

# 1. Register our agent with handshake service
echo "Registering with handshake service..."
curl -s -X POST http://localhost:3120/api/handshake \
  -H 'Content-Type: application/json' \
  -d "{\"agentAddress\":\"$WALLET\",\"agentName\":\"my-automaton\",\"capabilities\":[\"text-analysis\",\"code-review\",\"security-scan\",\"ai-summarization\",\"x402-payments\",\"url-shortener\",\"pastebin\"]}" >> "$LOG" 2>&1

# 2. Register referral program
echo "Registering referral link..."
curl -s -X POST http://localhost:3150/api/referral/register \
  -H 'Content-Type: application/json' \
  -d "{\"agentAddress\":\"$WALLET\",\"agentName\":\"my-automaton\"}" >> "$LOG" 2>&1

# 3. Get list of discovered agents from registry
REGISTRY=$(curl -s http://localhost:3120/api/handshake/list 2>/dev/null)
echo "Current ecosystem: $REGISTRY" >> "$LOG"

# 4. Update agent card
echo "Updating agent card..." >> "$LOG"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Outreach run complete" >> "$LOG"
echo "=== Service Status ===" >> "$LOG"
for port in 8080 8888 4280 3110 3000 3001; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/ 2>/dev/null || echo "down")
  echo "Port $port: $status" >> "$LOG"
done
