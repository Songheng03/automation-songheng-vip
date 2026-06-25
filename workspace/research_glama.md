# Glama AI Agent Submission Research

> **Note:** Glama is primarily an **MCP (Model Context Protocol) Server Registry**. AI agents that use MCP are listed just like MCP servers. The submission process is the same for both.

## Findings Table

| Method | URL/Endpoint | Auth | Registration Steps | Notes |
|--------|-------------|------|-------------------|-------|
| **Web Form** (GitHub repo submission) | **https://glama.ai/mcp/servers** (the "List your server for free" card links here) | **GitHub OAuth** required. Glama verifies the submitter has **write or admin access** to the repository being listed. Servers cannot be submitted on behalf of someone who doesn't control the source. | 1. Go to https://glama.ai<br>2. Click **"Sign Up"** (top-right button)<br>3. Authenticate via **Google OAuth2** (Google client ID visible: `48173796263-7ohlqirg28gh2a7nel61coff3m1ogjtc.apps.googleusercontent.com`)<br>4. Once signed in, navigate to the servers area to submit/submit a GitHub repo URL<br>5. The system automatically clones, builds (in a Firecracker microVM), and indexes the server | - **Free** ("no paywall, no gatekeeping")<br>- Glama indexes every tool, schema, and annotation automatically<br>- Server shows up in search, categories, and recommendations<br>- **No dedicated REST API endpoint** is documented for programmatic submission; it's done through the web UI<br>- More details at **https://glama.ai/mcp/methodology**<br>- Pricing plans: Starter ($9/mo), Pro ($26/mo), Team ($80/mo) - for hosting/credits, but **listing a server is free**<br>- Glama continuously syncs Git history and rescans on every push |

## Process Summary

1. **Create a GitHub repository** containing an MCP server (with MCP tools/resources/prompts)
2. **Sign up** on Glama.ai (via Google OAuth)
3. **Submit the GitHub repo URL** on the Glama website
4. Glama verifies repository ownership via GitHub OAuth
5. Glama clones the repo, builds it in a sandboxed Firecracker microVM
6. All tools, schemas, and annotations are indexed automatically
7. The server appears in search results, categories, and recommendations

## Sources

- Glama homepage: "Submit a GitHub repo and Glama indexes every tool, schema, and annotation"
- Glama MCP Methodology page (https://glama.ai/mcp/methodology): details on maintainer verification via GitHub OAuth, sandboxed builds, and continuous indexing
