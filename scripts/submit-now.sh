#!/bin/bash
# Submit my-automaton to AI directories using live tunnel URL
TUNNEL_URL=$(cat /root/automaton/data/tunnel-url.txt 2>/dev/null || echo "https://boc-occurred-five-acer.trycloudflare.com")
echo "Using tunnel: $TUNNEL_URL"
echo "Gateway local: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/health)"
echo "Tunnel remote: $(curl -s -o /dev/null -w '%{http_code}' $TUNNEL_URL/health)"
echo ""

# Smithery
echo "=== Smithery ==="
curl -s -X POST "https://smithery.ai/api/v1/servers" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"automaton-mcp\",\"description\":\"AI code review & security scanning MCP\",\"url\":\"$TUNNEL_URL/mcp\"}" 2>&1 | head -c200
echo ""
