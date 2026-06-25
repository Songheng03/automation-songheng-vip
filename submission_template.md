# My Automaton — MCP Submission Package

> **Base URL:** https://automation.songheng.vip  
> **Contact:** 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113  
> **Service Name:** my-automaton  
> **Protocol:** MCP (Model Context Protocol) over Streamable HTTP  
> **Pricing Model:** x402 pay-per-use (micropayments)

---

## Overview

**My Automaton** is a premium MCP automation server that brings the power of AI-driven automation to any MCP-compatible client. Instead of paying a flat monthly subscription, you pay **per task** — a few cents at a time — using the x402 micropayment protocol. Whether you need to scrape a web page, summarize a document, extract structured data, or translate text, My Automaton delivers reliable results with transparent, usage-based pricing.

Each of the **7 premium endpoints** is independently priced between **1¢ and 5¢** per request. A **free tier** gives you **3 complimentary requests per day** to test and evaluate any endpoint before committing.

---

## Premium Endpoints

| # | Endpoint | Description | Price |
|---|----------|-------------|-------|
| 1 | **web-scraper** | Scrape and extract content from any public web page. Returns clean, structured text. | **3¢** |
| 2 | **text-summarizer** | Condense long articles, reports, or documents into concise, meaningful summaries. | **1¢** |
| 3 | **data-extractor** | Extract structured data (JSON/CSV) from unstructured text — invoices, emails, forms, and more. | **3¢** |
| 4 | **content-generator** | Generate human-quality text content for blogs, social media, emails, and marketing copy. | **5¢** |
| 5 | **image-analyzer** | Analyze images with AI: captioning, object detection, OCR text extraction, and scene understanding. | **5¢** |
| 6 | **code-executor** | Execute code snippets in a sandboxed environment. Supports Python, JavaScript, and more. | **2¢** |
| 7 | **translator** | Translate text between 50+ languages with high accuracy and natural fluency. | **1¢** |

**Free Tier:** 3 requests per day, shared across all endpoints — no payment required.

---

## How It Works

1. **Connect** — Point your MCP client to `https://automation.songheng.vip/mcp`
2. **Call** — Invoke any of the 7 tools with your input parameters
3. **Pay** — The server responds with HTTP 402 (Payment Required) specifying the cost in wei
4. **Confirm** — Your wallet sends the micropayment; the server executes and returns results
5. **Repeat** — Pay only for what you use, no subscriptions, no commitments

### x402 Micropayment Flow

The x402 protocol enables instant, on-chain micropayments using Ethereum-compatible wallets. Each endpoint advertises its price via the `402 Payment Required` response, and after payment is sent, the full response is delivered. This eliminates the need for pre-funded accounts, API keys, or subscriptions.

---

## Example Usage (MCP Client Configuration)

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

### Calling a Tool (pseudocode)

```javascript
// Summarize a document — costs 1¢
const result = await client.callTool({
  name: "text-summarizer",
  arguments: {
    text: "Long document content here...",
    maxLength: 200
  }
});
// The client handles x402 micropayment automatically
```

---

## Platform Submission Details

### Smithery.ai

- **Qualified Name:** `my-automaton`
- **Type:** External (URL)
- **Upstream URL:** `https://automation.songheng.vip/mcp`
- **Config Schema:** Optional API key for higher rate limits
- **Submission:** Via CLI — `smithery mcp publish "https://automation.songheng.vip/mcp" -n my-automaton`

### MCP.so

- **Type:** MCP Server
- **Name:** My Automaton
- **URL:** `https://automation.songheng.vip`
- **Server Config:** JSON configuration with MCP client settings

### Glama.ai

- **Repository:** [GitHub repo link]
- **Method:** GitHub OAuth-based repository submission
- **Note:** Glama auto-scans the repository; ensure README and Dockerfile are present

### OpenTools.ai

- **Tool URL:** `https://automation.songheng.vip`
- **Category:** Automation
- **Pricing Model:** Pay-per-use
- **Submission:** Via web form at https://opentools.ai/friends/launch-tool

---

## Contact & Support

- **On-chain Contact:** `0x76eADdEBFfb6A61DD071f97F4508467fc55dd113`
- **Server Base:** `https://automation.songheng.vip`
- **Protocol:** MCP over Streamable HTTP at `/mcp`

---

*My Automaton — Automation without subscriptions. Pay per task, not per month.*
