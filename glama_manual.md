# Glama.ai Manual Submission Guide — my-automaton

> **Generated:** 2025-06-17  
> **Service:** my-automaton  
> **Base URL:** https://automation.songheng.vip  
> **Repository:** https://github.com/Conway-Research/automaton  
> **Contact:** 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113

---

## Why Manual Submission?

Glama.ai uses **GitHub OAuth + Web UI** for all server submissions. There is **no public REST API** for programmatic submission. The automated submission attempt returned:

- No API endpoint found at `/api/servers`, `/api/mcp/servers`, or `/api/github/submit`
- Glama is a client-rendered Next.js application — submission requires a browser with GitHub authentication

---

## Prerequisites

Before submitting, ensure the repository meets Glama's requirements:

| Requirement | Status | Notes |
|-------------|--------|-------|
| ✅ Public GitHub repository | ✓ | https://github.com/Conway-Research/automaton |
| ✅ Dockerfile present | ✓ | `Dockerfile` at repo root (Node.js 22) |
| ✅ README.md with description | ✓ | Comprehensive README with quick start |
| ✅ LICENSE file | ✓ | MIT license |
| ✅ Active MCP endpoint | ✓ | https://automation.songheng.vip/mcp |
| ✅ Valid `package.json` | ✓ | Present with metadata |
| ❌ GitHub account with write access | Needed | You must have write/admin access to Conway-Research/automaton |

---

## Step-by-Step Submission Instructions

### Step 1: Log in to Glama

1. Open a browser and navigate to **https://glama.ai**
2. Click **"Sign Up"** (top-right)
3. Authenticate via **GitHub OAuth** — you must use the GitHub account that has **write/admin access** to the repository `Conway-Research/automaton`

### Step 2: Navigate to the Submission Page

1. Go to **https://glama.ai/mcp/servers**
2. Look for a **"Submit Server"** or **"Add Server"** button (typically top-right or in the navigation)
3. If not visible directly, try **https://glama.ai/mcp/servers/new** or the submit flow from the servers listing page

### Step 3: Submit Your Repository

1. Enter the repository URL: `https://github.com/Conway-Research/automaton`
2. Glama will verify your write access via GitHub OAuth
3. Confirm the server name: **my-automaton**
4. The system will clone the repo and automatically:
   - Scan the README for description
   - Extract metadata from `package.json`
   - Build the Docker image using the `Dockerfile`
   - Run the server in an isolated **Firecracker microVM**
   - Perform protocol introspection (`tools/list`, `resources/list`, `prompts/list`)
   - Run behavioral analysis (syscall/network inspection)
   - Compute the **Tool Definition Quality Score (TDQS)**

### Step 4: Verify the Listing

1. After processing, your server should appear at: `https://glama.ai/mcp/servers/@Conway-Research/automaton`
2. Check that all 7 endpoints are listed:
   - `web-scraper` (3¢)
   - `text-summarizer` (1¢)
   - `data-extractor` (3¢)
   - `content-generator` (5¢)
   - `image-analyzer` (5¢)
   - `code-executor` (2¢)
   - `translator` (1¢)

### Step 5 (if build fails)

If the Docker build fails, the listing is **preserved but hidden** from search results. Fix the Dockerfile and push changes — Glama will re-scan automatically on the next sync cycle.

---

## Submission Metadata Reference

```json
{
  "repositoryUrl": "https://github.com/Conway-Research/automaton",
  "serviceName": "my-automaton",
  "displayName": "My Automaton",
  "description": "A premium MCP automation server offering 7 x402 pay-per-use endpoints (1¢–5¢ each) for web scraping, text summarization, data extraction, content generation, image analysis, code execution, and language translation. Includes a free tier (3 requests/day) for evaluation.",
  "tagline": "Automate anything — pay per task, not per month.",
  "baseUrl": "https://automation.songheng.vip",
  "mcpEndpoint": "/mcp",
  "protocol": "MCP over Streamable HTTP",
  "authentication": "x402 micropayments (HTTP 402)",
  "pricing": "Pay-per-use from 1¢–5¢ per request, free tier: 3 requests/day",
  "tags": ["mcp", "automation", "x402", "micropayments", "web-scraping", "nlp", "ai", "pay-per-use"],
  "categories": ["Automation", "AI Tools", "Data Processing", "Developer Tools"],
  "license": "MIT",
  "contact": "0x76eADdEBFfb6A61DD071f97F4508467fc55dd113"
}
```

---

## Post-Submission Checklist

- [ ] Server visible at `https://glama.ai/mcp/servers/@Conway-Research/automaton`
- [ ] TDQS score displayed
- [ ] All 7 tools listed with descriptions and pricing
- [ ] Docker build successful (check build logs)
- [ ] Free tier information accessible
- [ ] x402 payment flow documented

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "You don't have access" | Ensure you're logged in with a GitHub account that has write/admin access to `Conway-Research/automaton` |
| Build failure | Check Dockerfile for errors. The server must start and listen on port 8080. Push fixes and wait for re-scan |
| Missing tools | Ensure MCP protocol endpoints (`/mcp`) return valid `tools/list` responses |
| No listing appears | The server might be in "distribution withheld" state if build failed. Check build logs on Glama |

---

## Contact

- **Developer:** 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113
- **Live Service:** https://automation.songheng.vip
- **Repository:** https://github.com/Conway-Research/automaton
