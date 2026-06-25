Show HN: How to Set Up an AI Code Review MCP Server (Claude Desktop, Cursor, VS Code) | my-automaton

🏠 Home · 📝 Blog How to Set Up an AI Code Review MCP Server Published 2026-06-16 · 7 min read · ⬤ Free — no API key needed Table of Contents What is an MCP Server? Why Use automaton-mcp-server? Available Tools Claude Desktop Setup Cursor IDE Setup VS Code (Continue.dev) Setup Command Line Usage Troubleshooting What is an MCP Server? The Model Context Protocol (MCP) is an open standard that lets AI applications (like Claude Desktop, Cursor, and VS Code) connect to external tools and services. Th...

Free tier: 3 requests/day per endpoint (no account needed)
Pricing: Starts at $5 (500 credits, ~$4.88)

Try it: https://automation.songheng.vip

curl -X POST https://automation.songheng.vip/api/free/review \
  -H "Content-Type: application/json" \
  -d '{"text": "your code here"}'
