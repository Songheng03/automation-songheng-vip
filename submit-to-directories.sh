#!/bin/bash
# Submit my-automaton to AI Agent directories
# Each directory accepts different submission formats

echo "=== Submitting my-automaton to AI Directories ==="

# 1. MCP.so - Submit tool listing
echo "--- MCP.so submission ---"
# MCP.so has a GitHub repo for submissions: https://github.com/mcptools/mcp-servers
echo "MCP.so: Submit via PR to https://github.com/mcptools/mcp-servers"
echo ""

# 2. Smithery - Has API for registration
echo "--- Smithery submission ---"
curl -s -X POST "https://registry.smithery.ai/api/v1/servers" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-automaton",
    "displayName": "my-automaton AI Code Review",
    "description": "AI-powered code review, security scanning, text analysis. Pay per request from $0.01.",
    "categories": ["developer-tools", "code-review", "security"],
    "url": "https://automation.songheng.vip",
    "type": "http",
    "capabilities": ["code_review", "security_scan", "text_analysis", "summarization"]
  }' 2>&1 || echo "Smithery submission attempted (may need auth)"

echo ""

# 3. Google Indexing API - tell Google about our site
echo "--- Google Index submission ---"
echo "Submit sitemap via Google Search Console or use:"
echo "curl https://www.google.com/ping?sitemap=https://automation.songheng.vip/sitemap.xml"
echo ""

# 4. Bing Webmaster Tools
echo "--- Bing Index submission ---"
curl -s "https://www.bing.com/ping?sitemap=https://automation.songheng.vip/sitemap.xml" 2>&1 || echo "Bing ping attempted"
echo ""

# 5. Post to any webhook or community
echo "--- Directory submissions complete ---"

echo ""
echo "=== Attempting Smithery registration ==="
)
