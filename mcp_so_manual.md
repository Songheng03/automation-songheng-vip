# MCP.so — Manual Submission Guide for my-automaton

> **Generated:** 2026-06-17  
> **Source:** `research_smithery_mcp.md` (Section 2: MCP.so)  
> **Server:** my-automaton — https://automation.songheng.vip  
> **Platform:** https://mcp.so

---

## Why Manual?

MCP.so is a **Next.js web application** with **no public REST API** for submissions. The only way to submit a server is through the interactive web form at https://mcp.so/submit, which requires **GitHub or Google OAuth sign-in**. Automated (headless) submission is not feasible.

---

## Submission Steps

### Prerequisites

1. A **GitHub** or **Google** account (for OAuth sign-in)
2. The server must be live and accessible at `https://automation.songheng.vip`

### Step 1: Sign In

1. Open https://mcp.so in a browser
2. Click the **"Sign In"** button in the sidebar
3. Choose **GitHub** or **Google** to authenticate
4. Authorize the MCP.so application

### Step 2: Navigate to Submit Form

1. Go to https://mcp.so/submit  
   *Or click the "Submit" button in the sidebar navigation*

### Step 3: Fill Out the Form

| Field | Value |
|-------|-------|
| **Type** | Select: **MCP Server** (radio button) |
| **Name** | `My Automaton` (or `my-automaton AI Tool Suite`) |
| **URL** | `https://automation.songheng.vip` |
| **Server Config** | See JSON below |

#### Server Config JSON

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

> **Alternative config** (if they expect command-based):
> ```json
> {
>   "mcpServers": {
>     "my-automaton": {
>       "command": "npx",
>       "args": ["@my-automaton/cli"],
>       "env": {}
>     }
>   }
> }
> ```

### Step 4: Submit

Click the **Submit** button. The server should appear in the MCP.so directory after a brief review.

### Step 5: Verify Listing

1. Go to https://mcp.so/servers
2. Search for "my-automaton" or "automation"
3. Confirm the server appears in search results

---

## Alternative: Submit via GitHub Issue

If the web form fails, you can report an issue on the MCP.so GitHub:

1. Go to https://github.com/chatmcp/mcpso/issues
2. Create a new issue with the title: **"Submit server: my-automaton"**
3. Include in the description:

```
**Server Name:** My Automaton
**URL:** https://automation.songheng.vip
**Description:** AI-powered code review, security scanning, text analysis, summarization, and refactoring — 7 tools via MCP protocol. Pay-per-use (USDC) with free daily tier.
**Type:** MCP Server
**Server Config:**
{
  "mcpServers": {
    "my-automaton": {
      "url": "https://automation.songheng.vip/mcp",
      "type": "streamable-http"
    }
  }
}
**Contact:** 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113
```

---

## Post-Submission Checklist

- [ ] Server listed on https://mcp.so/servers
- [ ] Verified by searching for "my-automaton"
- [ ] Updated `submission-guide.md` with listing URL
- [ ] Logged in the worklog

---

## Server Details Summary

| Property | Value |
|----------|-------|
| Name | my-automaton |
| Display Name | My Automaton — AI Tool Suite |
| URL | https://automation.songheng.vip |
| MCP Endpoint | https://automation.songheng.vip/mcp |
| GitHub | https://github.com/my-automaton/automaton-mcp |
| Pricing | Free tier (3/day) + x402 micropayments (1¢-5¢) |
| Wallet | 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113 |
| Chain | Base (USDC) |

---

*This guide was generated automatically. A human with browser access must complete the manual submission.*
