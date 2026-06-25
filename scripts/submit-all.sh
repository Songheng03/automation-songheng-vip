#!/bin/bash
# ============================================================
# Submit Master — Submit my-automaton to AI/Dev Directories
# Usage: bash /root/automaton/scripts/submit-all.sh
# ============================================================
set -e

GATEWAY_URL="https://automation.automation.songheng.vip"
GITHUB_REPO="https://github.com/chaosong/automaton-mcp"
CONTACT_EMAIL="chaosong@users.noreply.github.com"
AGENT_NAME="my-automaton"
WALLET="0x76eADdEBFfb6a61DD071f97F4508467fc55dd113"
DESCRIPTION="Autonomous AI agent offering code review, security scanning, text analysis, and summarization via x402 micropayments on Base chain. MCP-compatible with 7 premium endpoints."

RESULTS_FILE="/root/automaton/data/submission-results.json"
echo "[" > "$RESULTS_FILE"
FIRST=true

log() {
  echo "[$(date '+%H:%M:%S')] $1"
}

submit() {
  local name="$1"
  local url="$2"
  local method="${3:-POST}"
  local data="$4"
  local headers="$5"
  
  log "Submitting to ${name}..."
  
  CMD="curl -s -o /tmp/submit_resp.json -w '%{http_code}' -X ${method} '${url}'"
  if [ -n "$data" ]; then
    CMD="$CMD -H 'Content-Type: application/json' -d '${data}'"
  fi
  if [ -n "$headers" ]; then
    CMD="$CMD ${headers}"
  fi
  CMD="$CMD --connect-timeout 15 --max-time 30"
  
  HTTP_CODE=$(eval "$CMD" 2>/dev/null || echo "000")
  BODY=$(cat /tmp/submit_resp.json 2>/dev/null || echo "{}")
  
  echo "  → HTTP $HTTP_CODE"
  
  # Append to results
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> "$RESULTS_FILE"
  fi
  echo "{\"name\":\"$name\",\"url\":\"$url\",\"http\":$HTTP_CODE,\"body\":$(echo "$BODY" | head -c 200 | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))' 2>/dev/null || echo '"{}"')}" >> "$RESULTS_FILE"
}

echo "========================================"
echo "  my-automaton Directory Submission"
echo "  $(date -u)"
echo "========================================"
echo ""

# === MCP/SDK DIRECTORIES ===
log "=== MCP Directories ==="

# Smithery.ai - MCP marketplace
submit "Smithery.ai" "https://registry.smithery.ai/api/servers" "POST" \
  '{"name":"automaton-mcp","description":"AI code review, security scanning, text analysis, and summarization via MCP protocol. Supports x402 micropayments on Base chain.","homepage":"'"${GATEWAY_URL}"'","repository":"'"${GITHUB_REPO}"'","tags":["code-review","security","ai","mcp","micropayments","base"],"capabilities":{"tools":["analyze","summarize","review-code","security-scan","explain","refactor","complexity"]}}'

# MCP.so - MCP server discovery
submit "MCP.so" "https://mcp.so/api/submit" "POST" \
  '{"name":"automaton-mcp","description":"'"${DESCRIPTION}"'","url":"'"${GATEWAY_URL}"'","github":"'"${GITHUB_REPO}"'","category":"developer-tools"}'

# Glama.ai
submit "Glama.ai" "https://glama.ai/api/mcp/servers" "POST" \
  '{"name":"automaton-mcp","description":"'"${DESCRIPTION}"'","endpoint":"'"${GATEWAY_URL}"'/mcp","github":"'"${GITHUB_REPO}"'"}'

# === AI AGENT DIRECTORIES ===
log "=== AI Agent Directories ==="

# AgentGPT
submit "AgentGPT" "https://agentgpt.reworkd.ai/api/agents/register" "POST" \
  '{"name":"'"${AGENT_NAME}"'","description":"'"${DESCRIPTION}"'","endpoint":"'"${GATEWAY_URL}"'","wallet":"'"${WALLET}"'","chain":"base"}'

# Agentverse
submit "Agentverse" "https://agentverse.ai/api/v1/agents" "POST" \
  '{"name":"'"${AGENT_NAME}"'","description":"'"${DESCRIPTION}"'","url":"'"${GATEWAY_URL}"'","type":"api","capabilities":["code-review","security-analysis","text-analysis"]}'

# === SEARCH ENGINE SUBMISSION ===
log "=== Search Engines ==="

# Google Index (via API)
submit "Google Index" "https://indexing.googleapis.com/v3/urlNotifications:publish" "POST" \
  '{"url":"'"${GATEWAY_URL}"'","type":"URL_UPDATED"}' \
  "-H 'Authorization: Bearer $(cat /root/automaton/data/google-token.txt 2>/dev/null || echo '')"

# Ping Google for sitemap
log "Pinging Google sitemap..."
curl -s "https://www.google.com/ping?sitemap=${GATEWAY_URL}/sitemap.xml" -o /dev/null -w "  → Google ping: HTTP %{http_code}\n"

# Bing
log "Pinging Bing sitemap..."
curl -s "https://www.bing.com/ping?sitemap=${GATEWAY_URL}/sitemap.xml" -o /dev/null -w "  → Bing ping: HTTP %{http_code}\n"

# === DEV COMMUNITIES ===
log "=== Developer Communities ==="

# Dev.to - would need API token, just log
log "Dev.to submission requires API token — add to /root/automaton/data/devto-token.txt"

# === TOOL DIRECTORIES ===
log "=== Tool Directories ==="

# AlternativeTo (add to database)
submit "AlternativeTo" "https://alternativeto.net/api/v1/software/" "POST" \
  '{"name":"'"${AGENT_NAME}"'","description":"'"${DESCRIPTION}"'","url":"'"${GATEWAY_URL}"'","license":"MIT","platforms":["web","api"]}'

# === NPM PACKAGE ===
log "=== npm Publishing ==="
log "npm requires auth token — add to /root/automaton/data/npm-token.txt"
log "Then run: cd /root/automaton/npm-package/ && npm publish"

# === GITHUB ===
log "=== GitHub ==="
log "To publish GitHub Action:"
log "  1. cd /root/automaton/github-action/"
log "  2. git init && git add . && git commit -m 'Initial release'"
log "  3. git remote add origin ${GITHUB_REPO}"
log "  4. git push -u origin main"
log "  5. git tag v1.0.0 && git push origin v1.0.0"

echo ""
echo "========================================"
echo "  Submission Summary"
echo "========================================"

# Finalize results
echo "]" >> "$RESULTS_FILE"
log "Results saved to $RESULTS_FILE"

# Count success/failure
SUCCESS=$(grep -c '"http": 2' "$RESULTS_FILE" 2>/dev/null || echo "0")
FAIL=$(grep -c '"http": [45][0-9][0-9]' "$RESULTS_FILE" 2>/dev/null || echo "0")
TIMEOUT=$(grep -c '"http": 000' "$RESULTS_FILE" 2>/dev/null || echo "0")
log "Successful: $SUCCESS | Failed: $FAIL | Timeout: $TIMEOUT"

echo ""
echo "========================================"
echo "  NEXT STEPS — Manual actions needed:"
echo "========================================"
echo "1. npm publish: npm login && npm publish /root/automaton/npm-package/"
echo "2. GitHub push: Push github-action/ to chaosong/ai-code-review-action"
echo "3. Dev.to: Post blog article using API token"
echo "4. Google Search Console: Verify domain ownership"
echo ""
echo "Done: $(date -u)"
