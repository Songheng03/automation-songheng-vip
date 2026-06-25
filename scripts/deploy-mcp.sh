#!/bin/bash
# deploy-mcp.sh — Deploy MCP server routes and register with directories
# Run: bash /root/automaton/scripts/deploy-mcp.sh

echo "=== Deploying MCP Server for my-automaton ==="
echo ""

# 1. Ensure MCP route is in staticPages
grep -q "mcp-server.html" /root/automaton/gateway.cjs
if [ $? -ne 0 ]; then
  echo "Adding MCP page route to gateway..."
  sed -i "s|'/share':'share.html'|'/share':'share.html','/mcp':'mcp-server.html'|" /root/automaton/gateway.cjs
fi

# 2. Restart gateway
echo "Restarting gateway..."
bash /root/automaton/restart-gateway.sh 2>/dev/null
sleep 2

# 3. Verify MCP routes
echo "Verifying MCP routes..."
curl -s -o /dev/null -w "Health: %{http_code}\n" http://localhost:8080/api/health
curl -s -X POST -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' http://localhost:8080/mcp/jsonrpc | head -c 200
echo ""
curl -s -o /dev/null -w "Smithery manifest: %{http_code}\n" http://localhost:8080/smithery-manifest
curl -s -o /dev/null -w "MCP page: %{http_code}\n" http://localhost:8080/mcp
curl -s -o /dev/null -w "SSE endpoint: %{http_code}\n" http://localhost:8080/mcp/sse

echo ""
echo "=== Deployment Complete ==="
echo "MCP JSON-RPC: POST https://automation.songheng.vip/mcp/jsonrpc"
echo "MCP SSE:      GET  https://automation.songheng.vip/mcp/sse"
echo "MCP Page:     https://automation.songheng.vip/mcp"
echo "Smithery:     https://automation.songheng.vip/smithery-manifest"
echo ""
echo "To register with directories: node /root/automaton/smithery-register.js"
echo "To publish npm package: cd /root/automaton/npm-package && npm publish"
