# Smithery.ai Manual Registration Guide

**Server:** my-automaton  
**Service URL:** https://automation.songheng.vip  
**MCP Endpoint:** https://automation.songheng.vip/mcp  
**Generated:** 2026-06-17

---

## Prerequisites

1. A **GitHub account** (required for Smithery login)
2. Access to a browser
3. The server at `https://automation.songheng.vip/mcp` must be publicly accessible and support **Streamable HTTP** transport

---

## Method A: Web UI (Simplest — Recommended)

### Step 1: Login to Smithery
1. Open browser and go to https://smithery.ai
2. Click **Sign In** (top right)
3. Sign in with your **GitHub account** (OAuth)
4. Approve the permissions

### Step 2: Create/Publish a Server
1. Go to https://smithery.ai/new
2. You'll be prompted to enter your server details
3. **Server URL:** `https://automation.songheng.vip/mcp`
4. **Display Name:** `My Automaton`
5. **Description:**
   ```
   A premium MCP automation server offering 7 x402 pay-per-use endpoints (1¢–5¢ each) for web scraping, text summarization, data extraction, content generation, image analysis, code execution, and language translation. Includes a free tier (3 requests/day) for evaluation.
   ```
6. **Tags:** `mcp`, `automation`, `x402`, `micropayments`, `pay-per-use`, `web-scraping`, `nlp`, `ai`
7. Click **Submit** or **Publish**

### Step 3: Wait for Scan
Smithery will automatically scan your server with `User-Agent: SmitheryBot/1.0 (+https://smithery.ai)`. Ensure your server responds correctly at the `/mcp` endpoint.

### Step 4: Verify Publication
- Your server should appear at: `https://smithery.ai/server/my-automaton/my-automaton`
- You can manage it from your Smithery dashboard

---

## Method B: CLI (Requires Interactive Terminal)

### Step 1: Install Smithery CLI
```bash
npm install -g smithery@latest
# Requires Node.js 20+
```

### Step 2: Authenticate
```bash
smithery auth login
# Opens a browser for GitHub OAuth
# Complete the OAuth flow in your browser
```

### Step 3: Verify Auth
```bash
smithery auth whoami
```

### Step 4: Publish Server
```bash
smithery mcp publish "https://automation.songheng.vip/mcp" -n my-automaton/my-automaton
```

To include a config schema:
```bash
smithery mcp publish "https://automation.songheng.vip/mcp" -n my-automaton/my-automaton \
  --config-schema '{
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "description": "Optional API key for higher rate limits"
      }
    }
  }'
```

---

## Method C: REST API (Requires API Key)

### Step 1: Get a Smithery API Key
1. Login to https://smithery.ai with GitHub
2. Go to your dashboard/API settings
3. Generate an API key
4. Save it as `SMITHERY_API_KEY`

### Step 2: Create the Server
```bash
curl -X PUT "https://api.smithery.ai/servers/my-automaton%2Fmy-automaton" \
  -H "Authorization: Bearer YOUR_SMITHERY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "My Automaton",
    "description": "A premium MCP automation server offering 7 x402 pay-per-use endpoints for web scraping, text summarization, data extraction, content generation, image analysis, code execution, and language translation."
  }'
```

### Step 3: Publish a Release
```bash
curl -X PUT "https://api.smithery.ai/servers/my-automaton%2Fmy-automaton/releases" \
  -H "Authorization: Bearer YOUR_SMITHERY_API_KEY" \
  -F 'payload={
    "type": "external",
    "upstreamUrl": "https://automation.songheng.vip/mcp",
    "configSchema": {
      "type": "object",
      "properties": {
        "apiKey": {
          "type": "string",
          "description": "Optional API key for higher rate limits"
        }
      }
    },
    "scanCredentials": {}
  }'
```

### Step 4: Monitor Status
```bash
curl -s "https://api.smithery.ai/servers/my-automaton%2Fmy-automaton/releases" \
  -H "Authorization: Bearer YOUR_SMITHERY_API_KEY"
```

---

## Server Details for Registration

| Field | Value |
|-------|-------|
| **Qualified Name** | `my-automaton/my-automaton` |
| **Namespace** | `my-automaton` |
| **Upstream URL** | `https://automation.songheng.vip/mcp` |
| **Transport** | Streamable HTTP |
| **Auth** | x402 (HTTP 402 Payment Required — pay-per-request with crypto micropayments) |
| **Free Tier** | 3 complimentary requests per day across all endpoints |
| **Contact** | `0x76eADdEBFfb6A61DD071f97F4508467fc55dd113` |
| **License** | MIT |
| **Version** | 1.0.0 |
| **Categories** | Automation, AI Tools, Data Processing, Developer Tools |

### Available Endpoints (7 Tools)

| Tool | Description | Price |
|------|-------------|-------|
| web-scraper | Scrape and extract content from any public web page | 3¢ |
| text-summarizer | Condense long documents into concise summaries | 1¢ |
| data-extractor | Extract structured data (JSON/CSV) from unstructured text | 3¢ |
| content-generator | Generate human-quality text content | 5¢ |
| image-analyzer | Analyze images: captioning, object detection, OCR | 5¢ |
| code-executor | Execute code snippets in a sandboxed environment | 2¢ |
| translator | Translate text between 50+ languages | 1¢ |

---

## Static Server Card (Optional but Recommended)

If Smithery cannot scan your server automatically, serve this file at `https://automation.songheng.vip/.well-known/mcp/server-card.json`:

```json
{
  "serverInfo": {
    "name": "My Automaton",
    "version": "1.0.0"
  },
  "authentication": {
    "required": true,
    "schemes": ["x402-402-payment-required"]
  },
  "tools": [
    {
      "name": "web-scraper",
      "description": "Scrape and extract content from any public web page",
      "inputSchema": {
        "type": "object",
        "properties": {
          "url": { "type": "string", "description": "URL to scrape" }
        },
        "required": ["url"]
      }
    },
    {
      "name": "text-summarizer",
      "description": "Condense long documents into concise summaries",
      "inputSchema": {
        "type": "object",
        "properties": {
          "text": { "type": "string", "description": "Text to summarize" },
          "maxLength": { "type": "number", "description": "Maximum summary length in words" }
        },
        "required": ["text"]
      }
    },
    {
      "name": "data-extractor",
      "description": "Extract structured data from unstructured text",
      "inputSchema": {
        "type": "object",
        "properties": {
          "text": { "type": "string", "description": "Unstructured text" },
          "schema": { "type": "string", "description": "Desired output schema" }
        },
        "required": ["text"]
      }
    },
    {
      "name": "content-generator",
      "description": "Generate human-quality text content",
      "inputSchema": {
        "type": "object",
        "properties": {
          "prompt": { "type": "string", "description": "Content prompt" }
        },
        "required": ["prompt"]
      }
    },
    {
      "name": "image-analyzer",
      "description": "Analyze images: captioning, object detection, OCR",
      "inputSchema": {
        "type": "object",
        "properties": {
          "imageUrl": { "type": "string", "description": "URL of the image to analyze" }
        },
        "required": ["imageUrl"]
      }
    },
    {
      "name": "code-executor",
      "description": "Execute code snippets in a sandboxed environment",
      "inputSchema": {
        "type": "object",
        "properties": {
          "code": { "type": "string", "description": "Code to execute" },
          "language": { "type": "string", "description": "Programming language" }
        },
        "required": ["code", "language"]
      }
    },
    {
      "name": "translator",
      "description": "Translate text between 50+ languages",
      "inputSchema": {
        "type": "object",
        "properties": {
          "text": { "type": "string", "description": "Text to translate" },
          "targetLanguage": { "type": "string", "description": "Target language" }
        },
        "required": ["text", "targetLanguage"]
      }
    }
  ],
  "resources": [],
  "prompts": []
}
```

---

## Verification Checklist

After completing registration, verify:

- [ ] Server appears at `https://smithery.ai/server/my-automaton/my-automaton`
- [ ] Smithery can scan and detect tools
- [ ] Endpoint responds to Streamable HTTP requests
- [ ] Server card is accessible (if served)
- [ ] Tags and categories are correct

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **401 Unauthorized** | API key missing or invalid — generate a new one from Smithery dashboard |
| **Namespace not found** | Create the namespace first via Web UI or API |
| **Server not reachable** | Ensure `https://automation.songheng.vip/mcp` is publicly accessible |
| **Scan fails** | Serve the static server card at `/.well-known/mcp/server-card.json` |
| **CLI not working** | Use `--json` flag to get debug output, or switch to Web UI method |

---

## Post-Registration

After successful registration:
1. Your server will be discoverable in the Smithery directory
2. Claude Desktop, Cursor, and other MCP clients can find it
3. Smithery provides analytics on tool usage
4. Monitor your dashboard at https://smithery.ai
