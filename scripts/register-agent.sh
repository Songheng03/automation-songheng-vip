#!/bin/bash
# register-agent.sh — Submit my-automaton to agent directories
set -e

API_BASE="https://automation.songheng.vip"

echo "=== 1. Submit to smithery.ai (via GitHub PR) ==="
# Check if smithery registry exists
if [ -d "/tmp/smithery-registry" ]; then
  echo "Already cloned"
else
  echo "Would clone: git clone https://github.com/smithery-ai/registry.git"
  echo "Manual step: Create PR adding MCP server entry"
fi

echo ""
echo "=== 2. Generate agent.json for MCP directories ==="
mkdir -p /root/automaton/content/data

cat > /root/automaton/content/data/agent.json << 'JSONEOF'
{
  "$schema": "https://schema.smithery.ai/servers.json",
  "name": "my-automaton",
  "display_name": "my-automaton — AI Code Review & Analysis",
  "description": "Free AI-powered code review, security scanning, text analysis, summarization, and complexity analysis. No signup required for 3 free requests/day per service.",
  "author": "my-automaton",
  "homepage": "https://automation.songheng.vip",
  "repository": "",
  "license": "MIT",
  "categories": ["code-review", "security", "developer-tools", "ai"],
  "capabilities": {
    "tools": [
      {
        "name": "analyze",
        "description": "Deep text analysis — themes, tone, patterns",
        "input_schema": {
          "type": "object",
          "properties": {
            "text": { "type": "string", "description": "Text to analyze" },
            "mode": { "type": "string", "enum": ["analyze"], "default": "analyze" }
          },
          "required": ["text"]
        }
      },
      {
        "name": "summarize",
        "description": "AI summarization in 2-4 sentences",
        "input_schema": {
          "type": "object",
          "properties": {
            "text": { "type": "string", "description": "Text to summarize" }
          },
          "required": ["text"]
        }
      },
      {
        "name": "code_review",
        "description": "Full code review — bugs, security, style, performance",
        "input_schema": {
          "type": "object",
          "properties": {
            "code": { "type": "string", "description": "Source code to review" }
          },
          "required": ["code"]
        }
      },
      {
        "name": "security_scan",
        "description": "Security vulnerability scan with severity ratings",
        "input_schema": {
          "type": "object",
          "properties": {
            "code": { "type": "string", "description": "Source code to audit" }
          },
          "required": ["code"]
        }
      },
      {
        "name": "explain_code",
        "description": "Explain what code does in simple terms",
        "input_schema": {
          "type": "object",
          "properties": {
            "code": { "type": "string", "description": "Code to explain" }
          },
          "required": ["code"]
        }
      }
    ]
  },
  "endpoints": {
    "free": {
      "analyze": "POST /api/free/analyze",
      "summarize": "POST /api/free/summarize",
      "review": "POST /api/free/review",
      "security": "POST /api/free/security",
      "explain": "POST /api/free/explain",
      "refactor": "POST /api/free/refactor",
      "complexity": "POST /api/free/complexity"
    },
    "premium": {
      "base": "POST /v1/{service}",
      "cost": "1-5 credits per request",
      "buy": "/upgrade"
    }
  },
  "pricing": {
    "free_tier": "3 requests/day per service",
    "starter": "HK$38 for 500 credits (~100 reviews)",
    "pro": "HK$78 for 1100 credits",
    "enterprise": "HK$388 for 6500 credits"
  },
  "wallet": "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113",
  "chain": "Base (USDC)"
}
JSONEOF

echo "agent.json written with $(wc -l < /root/automaton/content/data/agent.json) lines"

echo ""
echo "=== 3. Submit to IndexNow (URLs that work) ==="
# Use curl to submit individual URLs
KEY="db128ab005484a08ac0e126c2695204d"
for url in \
  "$API_BASE/" \
  "$API_BASE/upgrade" \
  "$API_BASE/api-docs" \
  "$API_BASE/blog/free-ai-code-review-api"; do
  encoded=$(echo -n "$url" | od -A n -t x1 | tr -d ' \n' | sed 's/../%&/g')
  result=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://www.bing.com/indexnow?url=${encoded}&key=${KEY}")
  echo "$result - $url"
done

echo ""
echo "=== 4. Generate sitemap ==="
cat > /root/automaton/content/sitemap.xml << 'XML'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
XML

# Add URLs
for file in /root/automaton/content/*.html /root/automaton/content/blog/*.html; do
  name=$(basename "$file" .html)
  if [ "$name" = "index" ]; then
    echo "  <url><loc>https://automation.songheng.vip/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>" >> /root/automaton/content/sitemap.xml
  else
    path="/blog/$name"
    if [ "$(dirname "$file")" = "/root/automaton/content" ]; then
      path="/$name"
    fi
    echo "  <url><loc>https://automation.songheng.vip${path}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>" >> /root/automaton/content/sitemap.xml
  fi
done

echo "</urlset>" >> /root/automaton/content/sitemap.xml

count=$(grep -c '<loc>' /root/automaton/content/sitemap.xml)
echo "Sitemap generated with $count URLs"

echo ""
echo "=== 5. Create robots.txt ==="
cat > /root/automaton/content/robots.txt << 'EOF'
User-agent: *
Allow: /
Sitemap: https://automation.songheng.vip/sitemap.xml
EOF

echo "robots.txt created"

echo ""
echo "=== 6. Ping search engines ==="
curl -s "https://www.google.com/ping?sitemap=$API_BASE/sitemap.xml" -o /dev/null -w "Google: %{http_code}\n"
curl -s "https://www.bing.com/ping?sitemap=$API_BASE/sitemap.xml" -o /dev/null -w "Bing: %{http_code}\n"

echo ""
echo "=== DONE ==="
echo "Next steps:"
echo "1. Submit to https://smithery.ai (manual, create MCP server entry)"
echo "2. Submit to https://glama.ai/explore (browse and add)"
echo "3. Share on https://news.ycombinator.com"
echo "4. Post on https://www.reddit.com/r/artificial/"
