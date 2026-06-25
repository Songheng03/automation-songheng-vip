# my-automaton MCP Server

Connect to AI-powered text analysis, code review, and summarization services via Model Context Protocol.

## What is this?

This MCP server exposes my-automaton's premium API services to Claude, ChatGPT, and other AI agents. Your users can analyze text, review code, and generate summaries directly from their AI assistant.

## Installation

### For Claude Desktop
1. Open Claude Desktop → Settings → Developer → Edit Config
2. Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "my-automaton": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/sdk"],
      "env": {
        "GATEWAY_URL": "https://automation.chaosong.dpdns.org"
      }
    }
  }
}
```

### For other agents
```bash
npm install @modelcontextprotocol/sdk
node mcp-server.js
```

## Available Tools

### 1. `analyze_text` — Deep text analysis (1¢ USDC)
Analyze sentiment, extract entities, identify topics, and assess readability.

**Input:**
- `text` (required): Text to analyze
- `mode` (optional): `sentiment`, `entities`, `topics`, or `full` (default)

**Example:**
```
"Analyze the sentiment of this customer review: 'The product exceeded my expectations!'"
```

### 2. `summarize` — AI summarization (2¢ USDC)
Generate concise summaries of long documents or articles.

**Input:**
- `text` (required): Text to summarize
- `length` (optional): `short`, `medium` (default), or `long`

**Example:**
```
"Summarize this 10-page research paper in 3 paragraphs"
```

### 3. `review_code` — Professional code review (5¢ USDC)
Get expert code review with security analysis and best practices recommendations.

**Input:**
- `code` (required): Code to review
- `language` (optional): Programming language (e.g., `javascript`, `python`)

**Example:**
```
"Review this Python function for security vulnerabilities and performance issues"
```

### 4. `security_scan` — Security vulnerability scanner (3¢ USDC)
Scan code for common security vulnerabilities (SQL injection, XSS, etc.).

**Input:**
- `code` (required): Code to scan

**Example:**
```
"Scan this SQL query for injection vulnerabilities"
```

### 5. `explain_code` — Code explanation (2¢ USDC)
Generate human-readable explanations for complex code snippets.

**Input:**
- `code` (required): Code to explain
- `detail` (optional): `brief` or `detailed` (default)

**Example:**
```
"Explain what this regex pattern does in detail"
```

## Payment (x402 Protocol)

All services use the x402 micropayment protocol on Base chain:

1. Agent calls a tool → receives HTTP 402 with payment instructions
2. Agent sends USDC to: `0x76eADdEBFfb6a61DD071f97F4508467fc55dd113`
3. Agent retries request with `X-X402-Payment` header containing transaction hash
4. Service executes and returns result

**Costs:** 1¢ - 5¢ USDC per request (see tool descriptions above)

## Free Tier

Each IP gets 3 free requests per day via `/free/*` endpoints. After that, x402 payment required.

## API Documentation

Full REST API docs: https://automation.chaosong.dpdns.org/api-docs

## Support

- Email: agent@automation.chaosong.dpdns.org
- GitHub: https://github.com/your-username/my-automaton
- Website: https://automation.chaosong.dpdns.org

## License

MIT
