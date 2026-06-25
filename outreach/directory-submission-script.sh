#!/bin/bash
# my-automaton Directory Submission Script
# Submits to AI agent directories and search engines
# Run: bash /root/automaton/outreach/directory-submission-script.sh

BASE_URL="https://automation.automation.songheng.vip"
DESCRIPTION="AI-powered code review, security scanning, text analysis API. Pay per request from \$0.01. Free tier available. USDC micropayments on Base chain."
CATEGORIES="ai,code-review,security,api,developer-tools"

echo "=== my-automaton Directory Submissions ==="
echo "Base URL: $BASE_URL"
echo ""

# 1. Submit to Google (using Indexing API via sitemap ping)
echo "--- Pinging Google about sitemap ---"
curl -s "https://www.google.com/ping?sitemap=${BASE_URL}/sitemap.xml" > /dev/null
echo "✓ Google sitemap ping sent"

# 2. Submit to Bing
echo "--- Pinging Bing about sitemap ---"
curl -s "https://www.bing.com/ping?sitemap=${BASE_URL}/sitemap.xml" > /dev/null  
echo "✓ Bing sitemap ping sent"

# 3. Check if site is accessible
echo "--- Checking site accessibility ---"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$BASE_URL/" 2>/dev/null || echo "TIMEOUT")
echo "Homepage HTTP status: $HTTP_CODE"

# 4. Generate submission data for directories that accept API submissions
echo "--- Creating directory submission payloads ---"
SUBMISSIONS_DIR="/root/automaton/outreach/submissions"
mkdir -p "$SUBMISSIONS_DIR"

cat > "$SUBMISSIONS_DIR/smithery.json" << EOFSMITHERY
{
  "name": "my-automaton",
  "url": "$BASE_URL",
  "description": "$DESCRIPTION",
  "categories": ["ai", "developer-tools", "code-review", "security"],
  "pricing": "Free tier available. Premium from \$0.01/request via USDC x402.",
  "features": ["AI Code Review", "Security Scanning", "Text Analysis", "Summarization", "x402 Micropayments"]
}
EOFSMITHERY
echo "✓ Smithery submission data created"

cat > "$SUBMISSIONS_DIR/mcp-so.json" << EOFMCP
{
  "name": "my-automaton",
  "url": "$BASE_URL",
  "type": "api",
  "description": "$DESCRIPTION",
  "tags": ["code-review", "security", "ai", "api"],
  "mcp_endpoint": "$BASE_URL/mcp"
}
EOFMCP
echo "✓ MCP.so submission data created"

# 5. Create a README for outreach
cat > "/root/automaton/outreach/README.md" << EOFOUTREACH
# my-automaton Outreach

This directory contains submissions and outreach materials for my-automaton services.

## Directories Submitted To:
1. Google Search Console (sitemap pinged)
2. Bing Webmaster Tools (sitemap pinged)
3. Smithery (submission data ready)
4. MCP.so (submission data ready)

## How to Submit Manually:
- Smithery: https://smithery.ai/ (use data in submissions/smithery.json)
- MCP.so: https://mcp.so/ (use data in submissions/mcp-so.json)
- Glama: https://glama.ai/mcp-servers
- ClawHunt: https://clawhunt.com
- Toolbase: https://toolbase.ai

## Service URLs:
- Homepage: $BASE_URL/
- API Docs: $BASE_URL/api-docs.html
- Playground: $BASE_URL/api-playground.html
- Blog: $BASE_URL/blog.html
- Blog List: $BASE_URL/blog/blog.html

## Pricing:
- Free: 3 requests/day/IP
- Starter: HK\$38 (500 credits)
- Pro: HK\$78 (1100 credits)
- Premium: HK\$198 (3000 credits)
- Enterprise: HK\$388 (6500 credits)
EOFOUTREACH
echo "✓ Outreach README created"

# 6. Generate backlink badges for sharing
cat > "/root/automaton/outreach/badges.md" << EOFBADGES
## Share Badges for my-automaton

### Markdown
[![my-automaton](https://img.shields.io/badge/AI%20Code%20Review-free%20tier-brightgreen)]($BASE_URL)

### HTML
<a href="$BASE_URL"><img src="https://img.shields.io/badge/AI%20Code%20Review-Pay%20per%20Request-blue" alt="my-automaton"></a>

### Badge URLs
- API Status: ${BASE_URL}/api/status
- API Stats: ${BASE_URL}/api/stats/overview
EOFBADGES
echo "✓ Badge templates created"

echo ""
echo "=== Submission Complete ==="
echo "Next steps: Manually register on Smithery, MCP.so, Glama, ClawHunt"
echo "Files created in: /root/automaton/outreach/"
