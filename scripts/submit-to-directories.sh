#!/bin/bash
# Directory Submission Script for my-automaton
# Submits to AI agent directories via their public APIs
# Usage: bash scripts/submit-to-directories.sh

set -e

LOGFILE="/root/automaton/data/submission-results.log"
HOMEPAGE="https://automation.songheng.vip"
WALLET="0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
NOW=$(date -Iseconds)

echo "============================================" | tee -a "$LOGFILE"
echo "Directory Submissions - $NOW" | tee -a "$LOGFILE"
echo "============================================" | tee -a "$LOGFILE"

# 1. CLAWHUNT (clawhunt.com) - AI agent directory
echo -e "\n[1/5] Submitting to ClawHunt..." | tee -a "$LOGFILE"
CLAWHUNT_RESULT=$(curl -s -w "\n%{http_code}" -X POST "https://clawhunt.com/api/agents" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-automaton",
    "description": "AI-powered code review, security scanning, and text analysis. Pay per request with USDC micropayments on Base chain.",
    "url": "https://automation.songheng.vip",
    "wallet": "0x76eADdEBFfb6A61DD071f97F4508467fc55dd113",
    "category": "Developer Tools",
    "tags": ["code-review", "security", "text-analysis", "x402", "ai-api"],
    "pricing": "Free tier + paid from $0.01/request",
    "chain": "Base",
    "currency": "USDC"
  }' --max-time 15 2>&1)
echo "ClawHunt: $CLAWHUNT_RESULT" | tee -a "$LOGFILE"

# 2. GLAMA.AI (glama.ai) - MCP server directory
echo -e "\n[2/5] Submitting to Glama.ai MCP directory..." | tee -a "$LOGFILE"
GLAMA_RESULT=$(curl -s -w "\n%{http_code}" -X POST "https://glama.ai/api/mcp/servers" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-automaton",
    "description": "AI code review and security scanning via MCP protocol",
    "website": "https://automation.songheng.vip",
    "endpoint": "https://automation.songheng.vip",
    "type": "rest",
    "pricing": "Free 3/day/IP, then $0.01-0.05/request",
    "capabilities": ["code_review", "security_scan", "text_analysis", "summarization", "code_explain", "refactoring"]
  }' --max-time 15 2>&1)
echo "Glama.ai: $GLAMA_RESULT" | tee -a "$LOGFILE"

# 3. SMITHERY (smithery.ai) - MCP server directory  
echo -e "\n[3/5] Submitting to Smithery..." | tee -a "$LOGFILE"
SMITHERY_RESULT=$(curl -s -w "\n%{http_code}" -X POST "https://server.smithery.ai/api/servers" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-automaton",
    "description": "AI code review and security scanning API - analyze your code with AI",
    "repository": "https://github.com/chaosong/my-automaton-review",
    "homepage": "https://automation.songheng.vip",
    "category": "developer-tools",
    "tags": ["code-review", "security-scanning", "ai"]
  }' --max-time 15 2>&1)
echo "Smithery: $SMITHERY_RESULT" | tee -a "$LOGFILE"

# 4. MCP.SO - MCP server listing
echo -e "\n[4/5] Submitting to MCP.so..." | tee -a "$LOGFILE"
MCP_SO_RESULT=$(curl -s -w "\n%{http_code}" -X POST "https://mcp.so/api/servers" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-automaton",
    "description": "AI code review, security scanning, and text analysis via MCP protocol",
    "url": "https://automation.songheng.vip",
    "category": "Code Review & Analysis",
    "tags": ["code-review", "security-scanning", "text-analysis"]
  }' --max-time 15 2>&1)
echo "MCP.so: $MCP_SO_RESULT" | tee -a "$LOGFILE"

# 5. OPENROUTER (openrouter.ai) - API provider directory
echo -e "\n[5/5] Submitting to OpenRouter..." | tee -a "$LOGFILE"
OPENROUTER_RESULT=$(curl -s -w "\n%{http_code}" -X POST "https://openrouter.ai/api/v1/models" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-automaton",
    "description": "Code review & security analysis",
    "website": "https://automation.songheng.vip",
    "pricing": {"requests": "0.01-0.05 USD"},
    "endpoints": ["https://automation.songheng.vip/v1/review", "https://automation.songheng.vip/v1/security"]
  }' --max-time 15 2>&1)
echo "OpenRouter: $OPENROUTER_RESULT" | tee -a "$LOGFILE"

echo -e "\n============================================" | tee -a "$LOGFILE"
echo "Submissions complete at $(date -Iseconds)" | tee -a "$LOGFILE"
echo "See full results at: $LOGFILE" | tee -a "$LOGFILE"
