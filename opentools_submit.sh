#!/usr/bin/env bash
# ============================================================================
# OpenTools Submission Script
# ============================================================================
# Target:  OpenTools (https://opentools.com)
# Type:    API for consuming MCP tools — not a dedicated submission directory
# Status:  No public REST API endpoint for MCP server submissions was found
#          during research (see directory_research.json).
#
# What we know:
#   - Website:   https://opentools.com
#   - Registry:  https://opentools.com/registry  (lists existing MCP servers)
#   - Auth:      Clerk (clerk.opentools.com) — requires Sign In
#   - GitHub:    https://github.com/opentools (CLI tool for installing servers)
#   - Docs:      https://opentools.com/docs (Mintlify-based docs)
#   - Tagline:   "One API to use any LLM with every MCP tool"
#
# Limitation: No documented submission endpoint. This script contains a
# best-guess submission to a hypothetical POST endpoint. If OpenTools
# later adds a submission API, adjust the ENDPOINT variable below.
# ============================================================================

set -euo pipefail

# ------------------------------------------------------------------
# Configuration — Service details from service_description.md
# ------------------------------------------------------------------
SERVICE_NAME="Premium Analysis MCP Server"
SERVICE_DESCRIPTION="AI-Native Analytics via Micropayments — 7 premium analytical tools through a single MCP server, powered by x402 micropayments on Base chain USDC. Freemium model with 3 free requests per day per IP."

# Server URL (where the MCP server listens)
SERVER_URL="https://automation.songheng.vip"

# MCP Tools (7 tools offered by this server)
MCP_TOOLS='[
  "data_analysis",
  "content_generation",
  "research_synthesis",
  "financial_analysis",
  "sentiment_analysis",
  "forecasting",
  "insight_extraction"
]'

# Free tier info
FREE_TIER="3 free requests per day per IP (freemium model)"

# Payment model
PAYMENT_MODEL="x402 micropayments on Base chain USDC"

# Wallet for receiving payments
WALLET="0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"

# ------------------------------------------------------------------
# OpenTools endpoint (best guess — adjust when/if documented)
# ------------------------------------------------------------------
# Common REST API patterns (all currently return 404):
#   - POST /api/v1/registry
#   - POST /api/v1/tools
#   - POST /api/registry/submit
#
# Until OpenTools publishes a documented submission API, this endpoint
# is a placeholder. Set to empty to prevent accidental execution.
ENDPOINT=""

# Auth token — OpenTools uses Clerk authentication
# Get yours by signing in at https://opentools.com and retrieving the session token
AUTH_TOKEN="${OPENTOOLS_AUTH_TOKEN:-}"

# ------------------------------------------------------------------
# Build JSON payload
# ------------------------------------------------------------------
PAYLOAD=$(cat <<EOF
{
  "name": "${SERVICE_NAME}",
  "description": "${SERVICE_DESCRIPTION}",
  "server_url": "${SERVER_URL}",
  "mcp_tools": ${MCP_TOOLS},
  "free_tier": "${FREE_TIER}",
  "payment": {
    "model": "${PAYMENT_MODEL}",
    "wallet": "${WALLET}"
  },
  "type": "mcp_server"
}
EOF
)

# ------------------------------------------------------------------
# Execute submission (guarded — only runs if ENDPOINT is set)
# ------------------------------------------------------------------
if [ -z "$ENDPOINT" ]; then
  echo "================================================================"
  echo "  OpenTools Submission Script"
  echo "================================================================"
  echo ""
  echo "  SERVICE:     $SERVICE_NAME"
  echo "  DESCRIPTION: AI-Native Analytics via Micropayments"
  echo "  SERVER URL:  $SERVER_URL"
  echo "  MCP TOOLS:   7 premium analytical tools"
  echo "  FREE TIER:   $FREE_TIER"
  echo "  PAYMENT:     $PAYMENT_MODEL"
  echo "  WALLET:      $WALLET"
  echo ""
  echo "  ⚠  ENDPOINT is empty."
  echo "     OpenTools has no documented submission API."
  echo ""
  echo "  To submit manually:"
  echo "    1. Visit https://opentools.com/registry"
  echo "    2. Sign in with your account (Clerk auth)"
  echo "    3. Check if a 'Submit' or 'Add Server' option exists"
  echo "    4. Alternatively, use the OpenTools CLI:"
  echo "       npm install -g opentools"
  echo "       opentools install <server-name>"
  echo ""
  echo "  Payload that would be sent (for reference):"
  echo "---------------------------------------------------------------"
  echo "$PAYLOAD" | python3 -m json.tool 2>/dev/null || echo "$PAYLOAD"
  echo "---------------------------------------------------------------"
  echo ""
  echo "  To attempt submission once an endpoint is known:"
  echo "    export OPENTOOLS_AUTH_TOKEN=\"your_token\""
  echo "    export ENDPOINT=\"https://opentools.com/api/v1/...\""
  echo "    bash $0"
  echo "================================================================"
  exit 0
fi

# --- Submission attempt (only reached if ENDPOINT is non-empty) ---
echo "Submitting to OpenTools at: $ENDPOINT"
echo ""

if [ -z "$AUTH_TOKEN" ]; then
  echo "ERROR: OPENTOOLS_AUTH_TOKEN is not set."
  echo "Set it with: export OPENTOOLS_AUTH_TOKEN=\"your_token\""
  exit 1
fi

curl -sS -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "$PAYLOAD" 2>&1

echo ""
echo "Submission complete."
