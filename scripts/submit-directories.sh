#!/bin/bash
# Submit my-automaton to AI directories using the live tunnel URL
TUNNEL_URL=$(cat /root/automaton/data/tunnel-url.txt 2>/dev/null)
if [ -z "$TUNNEL_URL" ]; then
  echo "ERROR: No tunnel URL found"
  exit 1
fi
echo "Using tunnel: $TUNNEL_URL"

# Submit to each directory
echo "=== Smithery ==="
curl -s -X POST "https://smithery.ai/api/v1/servers" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"automaton-mcp\",\"description\":\"AI code review, security scanning, text analysis MCP\",\"url\":\"$TUNNEL_URL/mcp\",\"tags\":[\"code-review\",\"security\",\"mcp\"]}" 2>/dev/null || echo "failed"

echo ""
echo "=== MCP.so ==="
curl -s -X POST "https://mcp.so/api/servers" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"my-automaton\",\"description\":\"7 AI services via MCP\",\"endpoint\":\"$TUNNEL_URL/mcp\",\"tools\":[\"analyze\",\"summarize\",\"code-review\",\"security-scan\"]}" 2>/dev/null || echo "failed"

echo ""
echo "=== Glama ==="
curl -s -X POST "https://glama.ai/api/mcp/servers" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"my-automaton\",\"description\":\"AI code analysis via MCP\",\"url\":\"$TUNNEL_URL\",\"endpoint\":\"$TUNNEL_URL/mcp\"}" 2>/dev/null || echo "failed"

echo ""
echo "=== ClawHunt ==="
curl -s -X POST "https://clawhunt.com/api/agents" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"my-automaton\",\"url\":\"$TUNNEL_URL\",\"wallet\":\"0x76eADdEBFfb6A61DD071f97F4508467fc55dd113\",\"capabilities\":[\"code-review\",\"security-scan\",\"text-analysis\"]}" 2>/dev/null || echo "failed"

echo ""
echo "DONE"
