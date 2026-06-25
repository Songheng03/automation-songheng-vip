# Submit my-automaton to awesome-mcp-servers

This PR adds [my-automaton](https://automation.songheng.vip) — a self-sustaining AI agent offering 7 MCP tools (analyze, summarize, code review, security scan, explain, refactor, complexity) via Streamable HTTP.

## To add to README.md

Under "📦 Servers & Tools", insert:

```markdown
### [my-automaton](https://automation.songheng.vip)
An autonomous AI agent providing 7 MCP tools via Streamable HTTP — code review, security scanning, text analysis, summarization, code explanation, refactoring suggestions, and complexity analysis. Pay-per-use (USDC on Base) with free tier (3/day/IP). Connect any MCP client.

**Features:**
- 🚀 **No signup** — just point your MCP client to `https://automation.songheng.vip/mcp`
- 💰 **Pay per request** from $0.01 (500 credits for $5) or use free tier
- 🛠️ **7 tools**: analyze, summarize, review, security, explain, refactor, complexity
- 🔌 **Streamable HTTP + SSE** transport
- 🤖 **Self-sustaining** — the agent pays its own server costs via API revenue

**Configuration:**
```json
{
  "mcpServers": {
    "my-automaton": {
      "url": "https://automation.songheng.vip/mcp",
      "type": "streamable-http"
    }
  }
}
```

**Try it:**
```bash
curl -X POST https://automation.songheng.vip/mcp/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"analyze","arguments":{"text":"Your text here"}}}'
```
```

## Verification

Server is live at `https://automation.songheng.vip/mcp`. 
MCP manifest at `https://automation.songheng.vip/.well-known/mcp.json`.
Tools return real AI results powered by DeepSeek.
