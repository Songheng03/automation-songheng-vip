#!/bin/bash
# Submit my-automaton MCP server to all major registries
# Dependencies: curl, jq
# Run: bash scripts/submit-to-mcp-directories.sh

set -e

BASE_URL="https://automation.songheng.vip"
GITHUB_REPO="https://github.com/my-automaton/mcp-server"

echo "=== Submitting to MCP Directories ==="

# 1. Smithery.ai - browse automatable tools
# Manual: https://smithery.ai/docs/publishing
echo "1. Smithery.ai: https://smithery.ai/docs/publishing"
echo "   Submit via: https://smithery.ai/submit"
echo "   Package: @my-automaton/mcp-server"
echo ""

# 2. Glama.ai - MCP server directory
echo "2. Glama.ai: https://glama.ai/mcp-servers"
echo "   Submit via: https://glama.ai/mcp-servers/submit"
echo "   Package: @my-automaton/mcp-server"
echo ""

# 3. MCP.so - community directory
echo "3. MCP.so: https://mcp.so"
echo "   Submit via: https://mcp.so/submit"
echo ""

# 4. npm - the package itself
echo "4. npm: Package is @my-automaton/mcp-server"
echo "   Published via: npm publish"
echo ""

# 5. GitHub - create the repo with description and topics
echo "5. GitHub: Create repo with topics:"
echo "   topics: mcp-server, code-review, ai, security-scanning, claude, cursor"
echo ""

# 6. Generate submission package with all metadata
echo ""
echo "=== Generating submission JSON ==="

cat <<SUBMIT > /root/automaton/content/mcp-submission.json
{
  "name": "my-automaton",
  "description": "AI-powered code review, security scanning, text analysis, and summarization via MCP. Works with Claude Desktop, Cursor, VS Code, and any MCP client.",
  "website": "$BASE_URL",
  "repository": "$GITHUB_REPO",
  "package": "@my-automaton/mcp-server",
  "installCommand": "npx -y @my-automaton/mcp-server",
  "apiEndpoint": "$BASE_URL",
  "freeTier": "3 requests/day per service - no API key needed",
  "premium": "Starting at HK$38 for 500 credits",
  "tools": [
    {"name": "analyze", "description": "Text sentiment, entity, and theme analysis"},
    {"name": "summarize", "description": "AI text summarization"},
    {"name": "code_review", "description": "Full code review: bugs, security, style"},
    {"name": "security_scan", "description": "Security vulnerability scan (OWASP)"},
    {"name": "explain_code", "description": "Code explanation in plain English"},
    {"name": "refactor_code", "description": "Refactoring suggestions with examples"},
    {"name": "complexity_analysis", "description": "Cyclomatic and cognitive complexity"}
  ],
  "pricing": {
    "free": "3 calls/day/IP per service",
    "starter": "HK$38 for 500 credits",
    "pro": "HK$198 for 3000 credits"
  },
  "tags": ["mcp", "code-review", "security", "ai", "devtools"]
}
SUBMIT

echo "✅ Generated: /root/automaton/content/mcp-submission.json"
echo ""
echo "=== NEXT STEPS (do these manually) ==="
echo "1. Create GitHub repo: gh repo create my-automaton/mcp-server --public"
echo "2. Publish npm: npm publish --access public"
echo "3. Submit to Smithery: https://smithery.ai/submit"
echo "4. Submit to Glama: https://glama.ai/mcp-servers/submit"
echo "5. Submit to MCP.so: https://mcp.so/submit"
echo ""
echo "=== Automated submissions (if API available) ==="

# Smithery may have an API
if [ -n "$SMITHERY_API_KEY" ]; then
  echo "Submitting to Smithery via API..."
  curl -s -X POST "https://smithery.ai/api/servers" \
    -H "Authorization: Bearer $SMITHERY_API_KEY" \
    -H "Content-Type: application/json" \
    -d @/root/automaton/content/mcp-submission.json
fi

echo ""
echo "Done!"
