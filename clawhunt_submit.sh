#!/usr/bin/env bash
#===============================================================================
# ClawHunt Submission Script
# ===============================================================================
# Description: Submit the Premium Analysis MCP Server to ClawHunt directory
# Website: https://clawhunt.com
# Submission page: https://clawhunt.com/submit-tool
# API docs page:   https://clawhunt.com/api-docs
# ===============================================================================
# NOTE: As of 2025-07-17, ClawHunt's submission and API pages both return HTTP
# 404. The site appears to be a concept/demo (Next.js app) with placeholder
# tool data only. This script is prepared for when/if the submission endpoint
# becomes available.
# ===============================================================================

set -euo pipefail

# ------------------------------------------------------------------
# Service Details from service_description.md
# ------------------------------------------------------------------
SERVICE_NAME="Premium Analysis MCP Server"
SERVICE_DESCRIPTION="AI-native analytics via micropayments. Unlock a suite of 7 premium analytical tools through a single Model Context Protocol (MCP) server. Designed for autonomous AI agents and developers who need on-demand, high-quality analysis without subscription lock-in."

FREE_TIER="3 free requests per day per IP (freemium model)"

PAYMENT_MODEL="x402 micropayments on Base chain USDC"
PAYMENT_WALLET="0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"

SERVER_URL="https://automation.songheng.vip"

MCP_TOOLS=(
    "Data Analysis Tool"
    "Content Generation Tool"
    "Research Synthesis Tool"
    "Financial Analysis Tool"
    "Sentiment Analysis Tool"
    "Trend Detection Tool"
    "Report Compilation Tool"
)

CATEGORY="analytics"

# ------------------------------------------------------------------
# ClawHunt Submission Endpoint
# ------------------------------------------------------------------
# Based on site footer navigation -> /submit-tool
# Also references /api-docs (both currently 404)
SUBMIT_URL="https://clawhunt.com/submit-tool"

# ------------------------------------------------------------------
# Build JSON payload
# ------------------------------------------------------------------
JSON_PAYLOAD=$(cat <<EOF
{
  "name": "${SERVICE_NAME}",
  "description": "${SERVICE_DESCRIPTION}",
  "server_url": "${SERVER_URL}",
  "category": "${CATEGORY}",
  "tags": ["mcp", "analytics", "micropayments", "x402", "usdc", "base", "ai-agent"],
  "free_tier": "${FREE_TIER}",
  "payment": {
    "model": "${PAYMENT_MODEL}",
    "wallet": "${PAYMENT_WALLET}"
  },
  "pricing": "Pay-per-use via x402 micropayments. No monthly fees, no minimum commitments.",
  "mcp_tools": [
    {"name": "data_analysis", "description": "Advanced data analysis and statistical processing"},
    {"name": "content_generation", "description": "Premium content generation with high-quality outputs"},
    {"name": "research_synthesis", "description": "Research synthesis and literature analysis"},
    {"name": "financial_analysis", "description": "Financial data analysis and insights"},
    {"name": "sentiment_analysis", "description": "Sentiment and opinion analysis from text"},
    {"name": "trend_detection", "description": "Trend detection and pattern recognition"},
    {"name": "report_compilation", "description": "Automated report compilation and formatting"}
  ],
  "mcp_transport": "streamable-http",
  "authentication": "none (public with IP-based rate limiting for free tier, x402 payment for premium)",
  "website": "https://automation.songheng.vip"
}
EOF
)

# ------------------------------------------------------------------
# curl submission
# ------------------------------------------------------------------
echo "============================================"
echo " Submitting: ${SERVICE_NAME}"
echo " Target:     ${SUBMIT_URL}"
echo "============================================"
echo ""

curl -v --request POST \
    "${SUBMIT_URL}" \
    --header "Content-Type: application/json" \
    --header "Accept: application/json" \
    --header "User-Agent: ClawHunt-Submission-Script/1.0" \
    --data "${JSON_PAYLOAD}" \
    --connect-timeout 30 \
    --max-time 60 2>&1

CURL_EXIT=$?
echo ""
echo "============================================"
echo " curl exit code: ${CURL_EXIT}"
echo "============================================"

# ------------------------------------------------------------------
# Alternative: try the API endpoint if /submit-tool fails
# ------------------------------------------------------------------
if [ "${CURL_EXIT}" -ne 0 ]; then
    echo ""
    echo "[INFO] /submit-tool failed. Trying /api endpoint..."
    echo ""

    curl -v --request POST \
        "https://clawhunt.com/api" \
        --header "Content-Type: application/json" \
        --header "Accept: application/json" \
        --data "${JSON_PAYLOAD}" \
        --connect-timeout 30 \
        --max-time 60 2>&1
fi

echo ""
echo "============================================"
echo " Submission complete."
echo " NOTE: ClawHunt /submit-tool and /api-docs"
echo " currently return HTTP 404. The site appears"
echo " to still be in development/demo phase."
echo " This script is prepared for future use."
echo "============================================"
