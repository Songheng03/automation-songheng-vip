#!/bin/bash
# Submit my-automaton to AI directories
# Uses the live tunnel URL

TUNNEL_URL="https://boc-occurred-five-acer.trycloudflare.com"
LOGFILE="/root/automaton/data/directory-submissions.json"

echo '{"submissions":[],"url":"'"$TUNNEL_URL"'","timestamp":"'$(date -Iseconds)'"}' > "$LOGFILE"

log_result() {
  local dir="$1" status="$2" response="$3"
  node -e "
    const fs=require('fs');
    const d=JSON.parse(fs.readFileSync('$LOGFILE','utf8'));
    d.submissions.push({dir:'$dir',status:'$status',response:'$(echo "$response" | head -c200 | sed "s/'/\\\\'/g")',ts:'$(date -Iseconds)'});
    fs.writeFileSync('$LOGFILE',JSON.stringify(d,null,2));
  "
  echo "[$dir] $status"
}

echo "=== Submitting to directories ==="
echo "Using tunnel: $TUNNEL_URL"
echo ""

# Smithery
echo -n "Smithery... "
resp=$(curl -s -X POST "https://smithery.ai/api/v1/servers" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"automaton-mcp\",\"description\":\"AI code review, security scan, text analysis via MCP\",\"url\":\"$TUNNEL_URL/mcp\"}" 2>/dev/null)
log_result "Smithery" "$(echo "$resp" | head -1)" "$resp"

# MCP.so
echo -n "MCP.so... "
resp=$(curl -s -X POST "https://mcp.so/api/servers" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"my-automaton\",\"description\":\"7 AI services via MCP\",\"endpoint\":\"$TUNNEL_URL/mcp\"}" 2>/dev/null)
log_result "MCP.so" "$(echo "$resp" | head -1)" "$resp"

# Glama
echo -n "Glama... "
resp=$(curl -s -X POST "https://glama.ai/api/mcp/servers" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"my-automaton\",\"description\":\"AI code analysis and security via MCP\",\"endpoint\":\"$TUNNEL_URL/mcp\"}" 2>/dev/null)
log_result "Glama" "$(echo "$resp" | head -1)" "$resp"

echo ""
cat "$LOGFILE"