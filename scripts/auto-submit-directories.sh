#!/bin/bash
# auto-submit-directories.sh — Submit my-automaton to AI directories & marketplaces
# Usage: bash auto-submit-directories.sh
# Some require manual submission (we log URLs for manual follow-up)
# Some support API-based submission

set -e
DOMAIN="https://automation.songheng.vip"
WALLET="0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
LOGFILE="/root/automaton/data/directory-submissions-$(date +%Y%m%d).log"

mkdir -p /root/automaton/data
echo "=== Directory Submission Log $(date) ===" > "$LOGFILE"
echo "Domain: $DOMAIN" >> "$LOGFILE"
echo "Wallet: $WALLET" >> "$LOGFILE"
echo "" >> "$LOGFILE"

log() { echo "[$1] $2" | tee -a "$LOGFILE"; }

# ===== API-BASED SUBMISSIONS =====

log "API" "=== Attempting API-based submissions ==="

# 1. Smithery — MCP server marketplace
# Smithery has an API for submitting MCP servers
log "API" "Smithery: https://smithery.ai — Visit https://smithery.ai/docs/submit-mcp-server"
log "API" "  → Add server.json at /root/automaton/smithery-server.json"
log "API" "  → Submit at https://smithery.ai/submit"

# 2. Glama — AI agent marketplace
log "API" "Glama: https://glama.ai — Browse & integrate"
log "API" "  → Register at https://glama.ai/agents"

# 3. MCP.so — MCP server directory
log "API" "MCP.so: https://mcp.so — Submit MCP server"
log "API" "  → Visit https://mcp.so/submit"

# 4. OpenAPI Registry
log "API" "OpenAPI: Generate spec at /root/automaton/content/openapi.json"
log "API" "  → Submit to https://registry.apispec.dev"

# 5. APITracker
log "API" "APITracker: https://apitracker.io — Add your API"
log "API" "  → Visit https://apitracker.io/add"

# ===== MANUAL SUBMISSION URLS (log for reference) =====
log "MANUAL" "=== URLs requiring manual submission ==="
cat >> "$LOGFILE" << URLS

--- DIRECTORY SUBMISSION TARGETS ---

# AI & Agent Directories
1. Smithery MCP Marketplace:
   URL: https://smithery.ai/submit
   Info: MCP server at automation.songheng.vip/api/mcp

2. Glama Agent Directory:
   URL: https://glama.ai/agents
   
3. MCP.so Directory:
   URL: https://mcp.so/submit
   
4. AgentHub:
   URL: https://agenthub.ai/submit

5. AI Agent Marketplace:
   URL: https://aiagentmarketplace.com/submit

6. Tools4AI:
   URL: https://tools4ai.com/submit

7. FutureTools:
   URL: https://futuretools.io/submit

8. TopAI Tools:
   URL: https://topai.tools/submit

9. AI Scout:
   URL: https://aiscout.net/submit

10. AI Tools Directory:
    URL: https://aitoolsdirectory.com/submit

# API Directories
11. RapidAPI:
    URL: https://rapidapi.com/hub?create=true

12. API Tracker:
    URL: https://apitracker.io/add

13. ProgrammableWeb:
    URL: https://www.programmableweb.com/add-api

14. OpenAPI Registry:
    URL: https://registry.apispec.dev

15. APIs.guru:
    URL: https://apis.guru/add-api

# Developer Marketplaces
16. GitHub Marketplace:
    URL: https://github.com/marketplace/new
    Repo: chaosong/ai-code-review-action

17. Open VSX (VSCode):
    URL: https://open-vsx.org/publish

18. npm Registry:
    URL: https://www.npmjs.com/settings/packages

# Social & Community
19. Hacker News:
    URL: https://news.ycombinator.com/submit

20. Reddit:
    URL: https://www.reddit.com/r/devops/submit
    URL: https://www.reddit.com/r/webdev/submit
    URL: https://www.reddit.com/r/programming/submit

21. Dev.to:
    URL: https://dev.to/new

22. Medium:
    URL: https://medium.com/new-story

# SEO Backlinks
23. GitHub (create repo pages):
    URL: https://github.com/chaosong/my-automaton

24. GitLab Pages:
    URL: https://gitlab.com (create project wiki)

25. LinkedIn Article:
    URL: https://www.linkedin.com/post/new

26. Twitter/X:
    URL: https://twitter.com/compose/post

URLS

log "DONE" "Log written to $LOGFILE"
echo ""
echo "=== Manual submission checklist ==="
echo "Visit these URLs and submit your site:"
echo "  1. Smithery: https://smithery.ai/submit"
echo "  2. Glama: https://glama.ai/agents"  
echo "  3. MCP.so: https://mcp.so/submit"
echo "  4. Hacker News: https://news.ycombinator.com/submit"
echo "  5. Reddit r/devops: https://www.reddit.com/r/devops/submit"
echo "  6. Dev.to: https://dev.to/new"
echo ""
echo "=== Done ==="
