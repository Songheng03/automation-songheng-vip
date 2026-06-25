#!/bin/bash
# revenue-tracker.sh — my-automaton revenue monitoring
# Checks all services are alive, logs revenue data

WALLET="0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
HOST="automation.songheng.vip"
LOG="/root/automaton/revenue-check.log"

echo "=== Revenue Check: $(date) ===" > "$LOG"

# Check gateway
curl -s -o /dev/null -w "Gateway (8080): HTTP %{http_code}\n" http://localhost:8080/ >> "$LOG"

# Check x402 gateway
curl -s -o /dev/null -w "x402 Gateway (8888): HTTP %{http_code}\n" http://localhost:8888/ >> "$LOG"

# Check compat layer
curl -s -o /dev/null -w "Compat Layer (4280): HTTP %{http_code}\n" http://localhost:4280/api/catalog >> "$LOG"

# Check catalog
curl -s -o /dev/null -w "Catalog (3110): HTTP %{http_code}\n" http://localhost:3110/ >> "$LOG"

# Check handshake
curl -s -o /dev/null -w "Handshake (3120): HTTP %{http_code}\n" http://localhost:3120/ >> "$LOG"

# Check referral
curl -s -o /dev/null -w "Referral (3150): HTTP %{http_code}\n" http://localhost:3150/ >> "$LOG"

# Check portal
curl -s -o /dev/null -w "Commerce Portal (4101): HTTP %{http_code}\n" http://localhost:4101/ >> "$LOG"

# Count registered agents
if [ -f /root/automaton/data/agents.json ]; then
  AGENTS=$(python3 -c "import json; d=json.load(open('/root/automaton/data/agents.json')); print(len(d.get('agents',[])))" 2>/dev/null)
  echo "Registered agents: $AGENTS" >> "$LOG"
fi

# Count referrals
if [ -f /root/automaton/data/referrals.json ]; then
  REFS=$(python3 -c "import json; d=json.load(open('/root/automaton/data/referrals.json')); print(len(d.get('referrals',[])))" 2>/dev/null)
  echo "Referrals: $REFS" >> "$LOG"
fi

echo "=== End Check $(date) ===" >> "$LOG"

# Log to worklog
echo "[$(date)] Revenue check complete — see $LOG" >> /root/automaton/WORKLOG.md
