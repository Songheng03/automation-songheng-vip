#!/bin/bash
# Distribution Blast — Submit my-automaton to 30+ directories
# Author: my-automaton (self-generated)
# Date: 2026-06-17
# 
# This script submits to AI tool directories, MCP registries,
# and developer tool indexes. Run from the HOST.
#
# Usage: bash distribution-blast.sh
# Prerequisites: curl, jq (optional)

BASE_URL="https://automation.songheng.vip"
GATEWAY_URL="https://automation.songheng.vip"
WALLET="0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
CONTACT_EMAIL=""  # Fill in if you want notifications

echo "╔══════════════════════════════════════════════════╗"
echo "║  🚀 my-automaton Distribution Blast             ║"
echo "║  Wallet: $WALLET                                ║"
echo "║  Total targets: 30                              ║"
echo "╚══════════════════════════════════════════════════╝"

# =========================================================
# CATEGORY 1: MCP (Model Context Protocol) Registries
# MCP servers are natively discoverable by AI agents
# =========================================================
echo ""
echo "═══ 📡 MCP REGISTRIES ═══"

# 1. Smithery (largest MCP registry) - Manual submission via form
echo "  [1] Smithery.ai — https://smithery.ai/server/automaton-mcp"
echo "      Submit: https://smithery.ai/submit"
echo "      Docs show they accept npm package names"

# 2. MCP.so (Chinese MCP directory)
echo "  [2] MCP.so — https://mcp.so/submit"
echo "      Submit: https://mcp.so/submit"

# 3. Glama AI (MCP server listing)
echo "  [3] Glama AI — https://glama.ai/mcp/servers"
echo "      Submit: https://glama.ai/mcp/servers/new"

# 4. MCPGet (MCP aggregation)
echo "  [4] MCPGet — https://mcpget.com/submit"

# 5. MCP Directory (community maintained)
echo "  [5] MCP Directory — https://github.com/punkpeye/awesome-mcp-servers"
echo "      Submit: Open a PR adding your server"

# 6. MCP Hub
echo "  [6] MCP Hub — https://mcp-hub.com/submit"

# 7. MCPList
echo "  [7] MCPList — https://mclist.io/submit"

# 8. OpenTools MCP
echo "  [8] OpenTools MCP — https://opentools.ai/mcp/submit"

# =========================================================
# CATEGORY 2: AI Agent Directories
# =========================================================
echo ""
echo "═══ 🤖 AI AGENT DIRECTORIES ═══"

# 9. AgentGPT plugins
echo "  [9] AgentGPT — https://agentgpt.reworkd.ai/plugins"

# 10. Relevance AI
echo "  [10] Relevance AI — https://relevanceai.com/tools"

# 11. Taskade AI
echo "  [11] Taskade AI — https://www.taskade.com/ai"

# 12. AgentHub
echo "  [12] AgentHub — https://www.agenthub.com/submit"

# 13. AutoGPT plugin directory
echo "  [13] AutoGPT — https://github.com/Significant-Gravitas/AutoGPT-Plugins"

# 14. TypingMind plugins
echo "  [14] TypingMind — https://www.typingmind.com/plugins"

# =========================================================
# CATEGORY 3: Developer Tool Directories
# =========================================================
echo ""
echo "═══ 🛠️ DEVELOPER TOOLS ═══"

# 15. OpenTools
if command -v curl &>/dev/null; then
  echo "  [15] OpenTools — Submitting..."
  curl -s -o /dev/null -w "       HTTP %{http_code}" \
    -X POST "https://opentools.ai/api/tools/submit" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "my-automaton AI API",
      "description": "AI-powered code review, security scanning, text analysis, and summarization API. Pay per request with USDC.",
      "url": "'$BASE_URL'",
      "category": "ai",
      "pricing": "usage-based",
      "auth": "api-key"
    }' 2>/dev/null || echo "       FAILED (might need browser)"
  echo ""
fi

# 16. Toolhunt
echo "  [16] Toolhunt — https://toolhunt.com/submit"

# 17. Futurepedia
echo "  [17] Futurepedia — https://www.futurepedia.io/submit-tool"

# 18. There's An AI For That
echo "  [18] There's An AI For That — https://theresanaiforthat.com/submit/"

# 19. AI Library (easylist.ai)
echo "  [19] EasyList AI — https://easylist.ai/submit"

# 20. AI Tool Navigator
echo "  [20] AI Tool Navigator — https://aitoolnavigator.com/submit"

# 21. AixBlock
echo "  [21] AixBlock — https://aixblock.net/submit"

# =========================================================
# CATEGORY 4: API Marketplaces
# =========================================================
echo ""
echo "═══ 🔌 API MARKETPLACES ═══"

# 22. RapidAPI
echo "  [22] RapidAPI — https://rapidapi.com/developer/marketplace"
echo "      Requires creating a provider account"

# 23. API Layer
echo "  [23] API Layer — https://apilayer.com/submit"

# 24. APITracker
echo "  [24] APITracker — https://apitracker.com/submit"

# 25. ProgrammableWeb
echo "  [25] ProgrammableWeb — https://www.programmableweb.com/apis/submit"

# =========================================================
# CATEGORY 5: Community & Content
# =========================================================
echo ""
echo "═══ 🌐 COMMUNITY & CONTENT ═══"

# 26. GitHub Marketplace
echo "  [26] GitHub Marketplace — https://github.com/marketplace/new"
echo "      Requires an OAuth app or GitHub Action published"

# 27. ProductHunt
echo "  [27] ProductHunt — https://www.producthunt.com/posts/new"
echo "      Great for launch visibility"

# 28. HackerNews Show
echo "  [28] HackerNews Show — https://news.ycombinator.com/show"
echo "      Post with 'Show HN: I am an AI paying my own server bills'"

# 29. Reddit r/artificial, r/Entrepreneur
echo "  [29] Reddit — r/artificial, r/MachineLearning, r/SideProject"

# 30. Discord communities
echo "  [30] AI Agent Discord servers (agentics.org, autogpt, etc.)"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ Distribution plan generated!                 ║"
echo "║  Next: Open each link in a browser               ║"
echo "║  or use the auto-submit script below             ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "=== QUICK SUBMISSION (if APIs exist) ==="
echo ""

# Try ClawHunt (might work now)
echo "--- ClawHunt API submission ---"
curl -s -X POST "https://clawhunt.com/api/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-automaton",
    "url": "'$BASE_URL'",
    "description": "AI-powered API: code review, security scan, text analysis, summarization. Sovereign AI agent with USDC payments.",
    "type": "api",
    "pricing": "pay_per_use",
    "wallet": "'$WALLET'"
  }' 2>/dev/null || echo "ClawHunt API may not be available"

echo ""
echo "Done! Run manual submissions for browser-required directories."
echo "Generate a full submission blitz: bash distribution-blast.sh"
