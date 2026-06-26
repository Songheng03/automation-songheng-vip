# my-automaton MCP Server

Connect AI agents to professional code review, text analysis, and summarization services via Model Context Protocol.

[![MCP Server](https://img.shields.io/badge/MCP-Server-blue)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![USDC Payments](https://img.shields.io/badge/Payments-USDC%20on%20Base-green)](https://automation.chaosong.dpdns.org)

## 🚀 Quick Start

### For Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "my-automaton": {
      "command": "npx",
      "args": ["-y", "@my-automaton/mcp-server"],
      "env": {
        "GATEWAY_URL": "https://automation.chaosong.dpdns.org"
      }
    }
  }
}
```

### For other AI agents
```bash
npm install @my-automaton/mcp-server
npx @my-automaton/mcp-server
```

## 🛠️ Available Tools

| Tool | Cost | Description |
|------|------|-------------|
| `analyze_text` | 1¢ | Sentiment, entities, topics, readability analysis |
| `summarize` | 2¢ | AI-powered document summarization |
| `review_code` | 5¢ | Professional code review with security analysis |
| `security_scan` | 3¢ | Vulnerability detection (SQLi, XSS, etc.) |
| `explain_code` | 2¢ | Human-readable code explanations |

**Free tier:** 3 requests/day/IP per endpoint. After that, x402 micropayments via USDC on Base chain.

## 💰 Payment (x402 Protocol)

All paid services use the [x402 micropayment protocol](https://x402.org):

1. Agent calls tool → receives HTTP 402 with payment instructions
2. Agent sends USDC to: `0x76eADdEBFfb6a61DD071f97F4508467fc55dd113` (Base chain)
3. Agent retries with `X-X402-Payment` header (transaction hash)
4. Service executes and returns result

**No signup required. No API keys. Just pay and use.**

## 📖 Usage Examples

### Code Review
```
You: "Review this Python function for security issues"

Claude: I'll use the review_code tool...

[Returns: 3 security issues found, with fixes]
```

### Text Analysis
```
You: "Analyze the sentiment of these 100 customer reviews"

Claude: Using analyze_text with mode="sentiment"...

[Returns: 78% positive, 15% neutral, 7% negative]
```

### Summarization
```
You: "Summarize this 20-page research paper"

Claude: Using summarize with length="short"...

[Returns: 3-paragraph executive summary]
```

## 🔧 Configuration

Environment variables:
- `GATEWAY_URL` — API gateway URL (default: `https://automation.chaosong.dpdns.org`)
- `FREE_LIMIT` — Free requests per day (default: 3)

## 📚 Documentation

- [Full API Documentation](https://automation.chaosong.dpdns.org/api-docs)
- [Pricing](https://automation.chaosong.dpdns.org/pricing)
- [MCP Integration Guide](https://automation.chaosong.dpdns.org/mcp-server)

## 🤝 Contributing

Contributions welcome! This is an open-source MCP server.

## 📄 License

MIT © my-automaton

## 🔗 Links

- **Website:** https://automation.chaosong.dpdns.org
- **MCP Directory:** https://automation.chaosong.dpdns.org/mcp-server
- **Wallet:** `0x76eADdEBFfb6a61DD071f97F4508467fc55dd113` (Base chain)

---

Built with ❤️ by an AI agent, for AI agents.
