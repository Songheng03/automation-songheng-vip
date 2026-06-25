#!/usr/bin/env bash
# ============================================================================
# MCP.so Submission Script
# ============================================================================
# Purpose:  Submit the "Premium Analysis MCP Server" to MCP.so via their API.
# Endpoint: POST https://mcp.so/api/submit-project
# Auth:     Session cookie from MCP.so login (sign in at https://mcp.so first)
# Source:   Based on directory_research.json (MCP.so entry) and
#           service_description.md (Premium Analysis MCP Server details).
#
# DISCLAIMER:
#   This script submits to MCP.so's internal API (/api/submit-project).
#   You MUST be logged into MCP.so in your browser first, then export your
#   session cookie (see instructions below).
# ============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# CONFIGURATION — edit these values as needed
# ---------------------------------------------------------------------------

# Session cookie value (REQUIRED). Obtain it by:
#   1. Log into https://mcp.so in your browser.
#   2. Open DevTools → Application → Cookies → mcp.so.
#   3. Copy the entire cookie string (e.g. "token=abc123; connect.sid=xyz...").
#   4. Paste it below.
SESSION_COOKIE=""

# Submission type: "server" for MCP Server, "client" for MCP Client
TYPE="server"

# Service name (displayed on MCP.so)
NAME="Premium Analysis MCP Server"

# Server URL — the public endpoint agents connect to
URL="https://automation.songheng.vip"

# Server configuration JSON (mcpServers block)
# This defines how clients connect to the server via Streamable HTTP.
SERVER_CONFIG=$(cat <<'JSON'
{
  "mcpServers": {
    "premium-analysis": {
      "url": "https://automation.songheng.vip",
      "description": "7 premium analytical tools with x402 micropayments on Base chain USDC. Freemium: 3 free requests/day per IP. Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113",
      "capabilities": {
        "tools": {
          "data_analysis": "Statistical and quantitative analysis of datasets",
          "content_generation": "AI-powered content creation and copywriting",
          "research_synthesis": "Multi-source research synthesis and summarization",
          "financial_analysis": "Financial data processing and insights",
          "sentiment_analysis": "Text sentiment scoring and trend detection",
          "data_visualization": "Chart and graph generation from data",
          "custom_analytics": "User-defined analytical workflows"
        }
      },
      "pricing": {
        "model": "x402 micropayments",
        "chain": "Base",
        "currency": "USDC",
        "wallet": "0x76eADdEBFfb6A61DD071f97F4508467fc55dd113",
        "free_tier": "3 requests per day per IP",
        "payment_per_request": true,
        "no_subscription": true
      }
    }
  }
}
JSON
)

# Innovation checkbox (set to "true" if this is an innovative/novel service)
IS_INNOVATION="false"

# DXT checkbox (set to "true" if relevant to DXT ecosystem)
IS_DXT="false"

# ---------------------------------------------------------------------------
# VALIDATION
# ---------------------------------------------------------------------------

if [ -z "$SESSION_COOKIE" ]; then
  echo "ERROR: SESSION_COOKIE is empty."
  echo ""
  echo "To submit, you must:"
  echo "  1. Log into https://mcp.so in your browser."
  echo "  2. Open DevTools → Application → Cookies → mcp.so."
  echo "  3. Copy all cookie values (e.g. 'token=...; connect.sid=...')."
  echo "  4. Set SESSION_COOKIE in this script or export it:"
  echo "     SESSION_COOKIE='token=abc; connect.sid=xyz' ./mcp_so_submit.sh"
  exit 1
fi

# ---------------------------------------------------------------------------
# BUILD JSON PAYLOAD
# ---------------------------------------------------------------------------

PAYLOAD=$(cat <<EOF | tr -d '\n' | tr -s ' '
{
  "type": "$TYPE",
  "name": "$NAME",
  "url": "$URL",
  "server_config": $(echo "$SERVER_CONFIG" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null || echo "$SERVER_CONFIG" | jq -Rs . 2>/dev/null || echo "\"$(echo "$SERVER_CONFIG" | tr '\n' ' ' | sed 's/"/\\"/g')\""),
  "is_innovation": $IS_INNOVATION,
  "is_dxt": $IS_DXT
}
EOF
)

# ---------------------------------------------------------------------------
# SUBMIT
# ---------------------------------------------------------------------------

echo "Submitting '$NAME' to MCP.so ..."
echo "  URL:      $URL"
echo "  Type:     $TYPE"
echo "  Endpoint: POST https://mcp.so/api/submit-project"
echo ""

RESPONSE=$(curl -s -w '\n%{http_code}' \
  -X POST "https://mcp.so/api/submit-project" \
  -H "Cookie: $SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "User-Agent: MCP.so-submit-script/1.0" \
  -H "Origin: https://mcp.so" \
  -H "Referer: https://mcp.so/submit" \
  -d "$PAYLOAD")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:    $BODY"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo ""
  echo "SUCCESS: '$NAME' submitted to MCP.so!"
  echo "View it at: https://mcp.so/server/$(echo "$NAME" | sed 's/ /-/g' | tr '[:upper:]' '[:lower:]')"
else
  echo ""
  echo "FAILED: HTTP $HTTP_CODE"
  echo "Possible reasons:"
  echo "  - Session cookie is expired or invalid (re-login and refresh)"
  echo "  - Server rejected the payload (check server_config JSON validity)"
  echo "  - Network issue"
  exit 1
fi
