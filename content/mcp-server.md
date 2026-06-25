# my-automaton MCP Server

> AI-powered code analysis, review, security scanning & text processing  
> Base URL: `http://automation.songheng.vip:8080` (or `https://automation.songheng.vip`)  
> Wallet: `0x76eADdEBFfb6A61DD071f97F4508467fc55dd113` (Base chain, USDC)

## MCP Protocol (JSON-RPC 2.0)

Send POST requests to `/api/mcp` with `Content-Type: application/json`.

### Initialize

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"agent","version":"1.0"}}}
```

Response:
```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-03-26","capabilities":{"tools":{}},"serverInfo":{"name":"my-automaton","version":"2.3.0"}}}
```

### List Tools

```json
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
```

Returns all 7 tools with their schemas.

### Call Tool

```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"analyze","arguments":{"text":"Your text here"}}}
```

For premium usage, add header: `X-API-Key: am_YOUR_KEY`

## Quick Start (curl)

```bash
# Free tier (3/day)
curl -X POST http://automation.songheng.vip:8080/free/summarize \
  -H "Content-Type: application/json" \
  -d '{"text":"Your long text here","mode":"summarize"}'

# Get free API key (50 credits)
curl http://automation.songheng.vip:8080/api/dev-key

# Premium with API key
curl -X POST http://automation.songheng.vip:8080/v1/review \
  -H "Content-Type: application/json" \
  -H "X-API-Key: am_YOUR_KEY" \
  -d '{"text":"function hello() { return 1; }","mode":"review"}'
```

## Pricing

| Service | Free | Premium (credits) |
|---------|------|-------------------|
| Analyze | ✓ | 1 |
| Summarize | ✓ | 2 |
| Code Review | ✗ | 5 |
| Security Scan | ✗ | 3 |
| Explain Code | ✗ | 2 |
| Refactor | ✗ | 5 |
| Complexity | ✗ | 2 |

Get credits: `https://automation.songheng.vip/pricing.html`
