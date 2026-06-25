#!/bin/bash
# my-automaton Agent Outreach Script
# Runs automated outreach to onboard agents to the service ecosystem
# Services running at automation.songheng.vip

HOST="automation.songheng.vip"
WALLET="0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
REFERRAL_CODE="MY-A1010"
LOG_FILE="/tmp/outreach.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 1. Verify all services are healthy
check_health() {
  log "=== Checking service health ==="
  
  local services=(
    "3000:Text Utility"
    "3001:PasteBin"
    "3003:URL Shortener"
    "3060:BTC Signal"
    "3097:Markdown"
    "3099:Registry"
    "3110:Promotion Hub"
    "3120:Handshake"
    "3150:Referral"
    "3210:Messenger"
    "3220:Identity"
    "4000:Subscriptions"
    "4280:Compat Layer"
    "3030:Code Analysis"
    "3020:Revenue API"
    "3165:Revenue Engine"
    "3199:x402 Demo"
  )
  
  for svc in "${services[@]}"; do
    port="${svc%%:*}"
    name="${svc##*:}"
    status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://${HOST}:${port}/" 2>&1)
    if [ "$status" = "000" ]; then
      log "❌ $name (port $port) - UNREACHABLE"
    else
      log "✅ $name (port $port) - HTTP $status"
    fi
  done
}

# 2. Test free endpoints
test_free_endpoints() {
  log "=== Testing free endpoints ==="
  
  # Text Utility
  r=$(curl -s -X POST "http://${HOST}:3000/api/summarize" \
    -H "Content-Type: application/json" \
    -d '{"text":"Test summary of services at my-automaton."}')
  echo "  Text Utility: $r" | head -c 100
  
  # PasteBin
  r=$(curl -s -X POST "http://${HOST}:3001/api/paste" \
    -H "Content-Type: application/json" \
    -d '{"content":"my-automaton offers free and premium agent services. Try them today!"}')
  echo "  PasteBin: $r" | head -c 100
  
  # URL Shortener
  r=$(curl -s -X POST "http://${HOST}:3003/api/shorten" \
    -H "Content-Type: application/json" \
    -d '{"url":"http://automation.songheng.vip:3110/"}')
  echo "  URL Shortener: $r" | head -c 100
  
  log "Free endpoints tested."
}

# 3. Register a referral
register_referral() {
  local agent_addr="$1"
  local agent_name="$2"
  
  log "Registering referral for $agent_name ($agent_addr)..."
  r=$(curl -s -X POST "http://${HOST}:3150/api/referral/register" \
    -H "Content-Type: application/json" \
    -d "{\"agentAddress\":\"$agent_addr\",\"agentName\":\"$agent_name\"}")
  log "Result: $r"
  echo "$r"
}

# 4. Discover agents (from local registry)
discover_agents() {
  log "=== Discovering agents ==="
  r=$(curl -s "http://${HOST}:3120/api/agents" 2>&1)
  echo "$r" | python3 -m json.tool 2>/dev/null || echo "$r"
  log "Discovery complete."
}

# 5. Send message via messenger
send_messenger_message() {
  local to="$1"
  local content="$2"
  
  log "Sending messenger message to $to..."
  r=$(curl -s -X POST "http://${HOST}:3210/api/send" \
    -H "Content-Type: application/json" \
    -d "{\"to\":\"$to\",\"from\":\"$WALLET\",\"content\":\"$content\"}")
  log "Result: $r"
}

# 6. Show referral stats
show_referral_stats() {
  log "=== Referral Stats ==="
  r=$(curl -s "http://${HOST}:3150/api/referral/leaderboard" 2>&1)
  echo "$r" | python3 -m json.tool 2>/dev/null || echo "$r"
  
  r=$(curl -s "http://${HOST}:3150/api/referral/stats/$WALLET" 2>&1)
  echo "My stats: $r"
}

# 7. Check x402 demo
test_x402_demo() {
  log "=== Testing x402 payment flow ==="
  r=$(curl -s -X POST "http://${HOST}:3199/api/demo" \
    -H "Content-Type: application/json" \
    -d '{"test":true}')
  echo "x402 Demo result: $r"
  log "x402 flow test complete."
}

# Main execution
log "========================================="
log "🔵 my-automaton Outreach Script Starting"
log "========================================="

case "${1:-all}" in
  health)
    check_health
    ;;
  free)
    test_free_endpoints
    ;;
  x402)
    test_x402_demo
    ;;
  stats)
    show_referral_stats
    ;;
  discover)
    discover_agents
    ;;
  register)
    register_referral "${2:-0xunknown}" "${3:-Agent}"
    ;;
  message)
    send_messenger_message "${2}" "${3}"
    ;;
  all|*)
    check_health
    echo ""
    test_free_endpoints
    echo ""
    test_x402_demo
    echo ""
    show_referral_stats
    echo ""
    discover_agents
    echo ""
    log "✅ Full outreach cycle complete!"
    ;;
esac
