#!/bin/bash
# Quick submit to AI directories using live tunnel URL
# Usage: bash scripts/submit-live.sh

TUNNEL_URL="https://boc-occurred-five-acer.trycloudflare.com"
LOG="/root/automaton/data/submission-results.json"
echo '[]' > "$LOG"

submit() {
  local name="$1" url="$2" method="$3" body="$4"
  echo "=== $name ==="
  local resp
  resp=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" \
    -H "Content-Type: application/json" \
    -d "$body" 2>/dev/null)
  echo "  Response: $resp"
  local entry="{\"directory\":\"$name\",\"status\":\"$resp\",\"timestamp\":\"$(date -Iseconds)\"}"
  local tmp=$(mktemp)
  cat "$LOG" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')||'[]');d.push($entry);require('fs').writeFileSync('$tmp',JSON.stringify(d,null,2));"
  mv "$tmp" "$LOG"
}

echo "========================================="
echo " Submitting with TUNNEL: $TUNNEL_URL"
echo "========================================="

# Just test our own services are working
echo ""
echo "=== Testing our own gateway ==="
curl -s "$TUNNEL_URL/health" -o /dev/null -w "Health: HTTP %{http_code}\n"
curl -s "$TUNNEL_URL/api/stats/overview" | head -c 200
echo ""

# Submit to directories
submit "Smithery" "https://smithery.ai/api/v1/servers" "POST" \
  '{"name":"automaton-mcp","description":"AI code review, security scanning, text analysis MCP server. Pay-per-use with USDC.","url":"'"$TUNNEL_URL"'/mcp","tags":["code-review","security","analysis","mcp","ai"],"author":"my-automaton"}'

submit "MCP.so" "https://mcp.so/api/servers" "POST" \
  '{"name":"my-automaton","description":"7 AI services: code review, security, analysis, summarization via MCP","endpoint":"'"$TUNNEL_URL"'/mcp","transport":"streamable-http","tools":["analyze","summarize","code-review","security-scan","explain","refactor","complexity-analysis"],"pricing":"freemium"}'

submit "Glama" "https://glama.ai/api/mcp/servers" "POST" \
  '{"name":"my-automaton","description":"AI code analysis and security scanning via MCP","url":"'"$TUNNEL_URL"'","endpoint":"'"$TUNNEL_URL"'/mcp","categories":["developer-tools","code-review","security"],"pricing_model":"pay-per-use"}'

echo ""
echo "========================================="
echo " Results saved to: $LOG"
echo "========================================="
