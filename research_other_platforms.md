# Research: Submission Processes for AI/MCP Platforms

> **Task**: Research registration/submission methods, required fields, authentication, and example payloads for 5 platforms.
> **Date**: 2025-06-17
> **Researcher**: Agent researcher

---

## 1. Glama.ai (MCP Server Registry)

**URL**: https://glama.ai  
**Type**: MCP Server Registry & Gateway (superset of the official MCP Registry)

### Submission Method
- **GitHub OAuth + Repository-based submission** (not a simple web form)
- Maintainers authenticate via **GitHub OAuth** — Glama verifies write/admin access to the repository being listed.
- Servers cannot be submitted on behalf of someone who does not control the source.

### Required Fields / Metadata
Glama auto-scans the repository. Key metadata extracted:
- **Repository URL** (the GitHub repo containing the MCP server)
- **Name** (from repo or package metadata)
- **Description** (from README or package.json)
- **License** (from LICENSE file in repo)
- **Author/Organization** (from GitHub repository owner)
- **Tags/Categories** (inferred from codebase)
- **Dockerfile** (either authored by maintainer or AI-inferred from project structure)

### Authentication
- **GitHub OAuth** for maintainer verification
- The submitter must have write/admin access to the repository

### Process
1. Submit via Glama's web UI — log in with GitHub and point to your MCP server repository
2. Glama clones the repo and continuously syncs Git history
3. AI-assisted build system attempts to build the Docker image (or uses maintainer's Dockerfile)
4. Server runs inside an isolated **Firecracker microVM** for scanning
5. Protocol introspection: `tools/list`, `resources/list`, `prompts/list` are called
6. Behavioral analysis (syscall/network inspection) for malicious patterns
7. Tool Definition Quality Score (TDQS) is computed
8. If build fails, listing is preserved but **distribution is withheld** (not shown in search)

### Example Payload (Repository URL format)
```
https://github.com/{owner}/{repo}
```

### API / Endpoints
- Glama appears to be a client-rendered Next.js app; no public REST API discovered for submission
- Submission is done through the web UI at https://glama.ai

### Notes
- 37,217+ MCP servers indexed
- Focus on MCP servers specifically, not general AI tools
- Free tier available; paid plans for gateway/advanced features ($9–$80/mo)

---

## 2. OpenTools.ai (AI Tools Directory)

**URL**: https://opentools.ai  
**Type**: AI Tools & MCP Servers Directory (2,500+ tools listed)

### Submission Method
- **Web form** at https://opentools.ai/friends/launch-tool
- Labeled as "Submit a Tool" / "Launch to your next 1000 customers"

### Required Fields (from page metadata)
Based on the page content analysis:
- **Tool Name**
- **Tool URL** (website link)
- **Description** (short description of the tool)
- **Category** (tool category)
- **Tool Logo** (image upload)
- **Pricing model** (free, freemium, paid, etc.)
- **Contact email**
- The form likely uses a Next.js client-side rendered form

### Authentication
- Google OAuth available on the site (Google sign-in button present)
- Anonymous submission might be possible (form-based, no hard auth gate detected)

### Process
1. Navigate to the "Submit a Tool" page (/friends/launch-tool)
2. Fill out the form fields (tool name, URL, description, category, etc.)
3. Submit for review
4. Listing goes live after review/approval

### Notes
- Also lists MCP servers specifically at /mcp
- 782K+ monthly visitors
- 120+ successful launches claimed
- Has a "Get started" CTA requiring sign-up (likely to manage your listing)
- Advertisement option available via Google Form: https://forms.gle/cttiR9SNE8Xv8Sik8

---

## 3. Agent-Cloud (Open Source RAG Platform)

**URL**: https://agentcloud.dev  
**GitHub**: https://github.com/rnadigital/agentcloud  
**Type**: Open-source AI Agent Platform with built-in RAG

### Submission Method
- **GitHub-based contributions** (open source project)
- **No marketplace/app store** — Agent Cloud is a self-hosted platform
- Contributions are done via GitHub Issues and Pull Requests

### Integration Methods
Agent Cloud supports:
1. **Data source connectors** — 260+ built-in integrations (BigQuery, HubSpot, Salesforce, Postgres, Snowflake, etc.)
2. **LLM providers** — Bring your own LLM (OpenAI, open-source models via Ollama, etc.)
3. **Tool/API integrations** — AI agents can access 3rd party APIs

### Adding Custom Integrations
Since Agent Cloud is open source:
- Fork the repo, add your integration following the existing connector patterns
- Submit a PR to the main repository
- Alternatively, create your own custom agent using the platform's API

### Authentication
- For the platform itself: self-managed authentication
- For contributions: GitHub authentication (standard open source contribution model)

### Required Fields for Integration Contribution
- Connector source code following the project's patterns
- Documentation for your integration
- Tests (if applicable)

### Notes
- This is an open-source platform, not a marketplace/directory
- No "app store" or submission portal exists — integrations go through GitHub PRs
- The platform is LLM-agnostic and supports connecting to various data sources
- Trusted by Stanford, Microsoft, Bumble, Google

---

## 4. Poe.com (Bot/AI Platform by Quora)

**URL**: https://poe.com  
**Developer Portal**: https://developer.poe.com (behind Cloudflare)  
**Type**: AI chat platform with custom bot creation

### Submission Method
- **API-based bot creation** via the Poe API protocol
- Previously at https://creator.poe.com (now redirects to developer.poe.com)
- GitHub repos: https://github.com/poe-platform

### Registration Process
1. Sign up/create an account on Poe.com
2. Access the developer documentation at developer.poe.com
3. Create a bot server implementing the **Poe API protocol** (using fastapi-poe library)
4. Host your bot server (anywhere accessible)
5. Register the bot endpoint URL with Poe

### Required Fields
- **Bot name**
- **Bot description**
- **Server URL** (your hosted bot endpoint)
- **Handle/Display name**
- **Avatar/Icon** (optional)
- **Prompt/base prompt** for the bot
- **API key/token** for authentication between Poe and your server

### Authentication
- **Poe API tokens** (bot server-side authentication)
- The Poe platform calls your server endpoint with signed requests
- Bot token is generated when you create a bot in the Poe developer dashboard

### Example Payload (fastapi-poe bot server)
```python
from fastapi_poe import make_app
from fastapi_poe.types import QueryRequest
from modal import App, asgi_app

class MyBot(POEBot):
    async def get_response(self, request: QueryRequest) -> AsyncIterable[PartialResponse]:
        # Your bot logic here
        yield PartialResponse(text="Hello from my bot!")

bot = MyBot()
app = make_app(bot, access_key="your-bot-access-key")
```

### Protocol
- Poe uses a **Server-Sent Events (SSE)** streaming protocol
- Bot server must implement specific endpoints (/get_settings, /get_response, /on_error, etc.)
- The **fastapi-poe** Python library handles the protocol implementation

### Notes
- Poe also supports **serverless MCP** (Model Context Protocol) bot types
- Bot creators can monetize their bots via Poe's creator program
- Bots can support various model backends (Claude, GPT-4, etc.) or custom LLMs
- Cloudflare protection on developer docs — actual docs require browser access

---

## 5. GitHub Marketplace

**URL**: https://github.com/marketplace  
**Type**: Marketplace for GitHub Actions, Apps, and Copilot Extensions

### Submission Method
- **Repository Release-based** — publish via GitHub Releases UI
- Actions are published immediately (no manual review) as long as requirements are met
- **Not a web form submission** — it's tied to creating a GitHub Release

### Prerequisites
1. The action must be in a **public repository**
2. Repository must contain a single **action metadata file** (`action.yml` or `action.yaml`) at the root
3. The `name` in the metadata must be **globally unique** (no other action with that name)
4. The `name` cannot match a user/org name on GitHub (unless you own that name)
5. The `name` cannot match an existing Marketplace category
6. You must **accept the GitHub Marketplace Developer Agreement** (terms of service)

### Required Fields in Metadata (action.yml/yaml)
```yaml
name: "your-action-name"        # Required, must be unique
description: "What it does"      # Required
author: "Your Name/Org"          # Recommended
branding:
  icon: "activity"               # Optional, from Octicons set
  color: "blue"                  # Optional
inputs:                          # Optional but recommended
  input_name:
    description: "Input description"
    required: false
    default: "value"
outputs:                         # Optional
  output_name:
    description: "Output description"
runs:                            # Required
  using: "node20"                # or "docker", "composite"
  main: "index.js"               # Entry point file
```

### Publishing Steps
1. Navigate to your repository on GitHub
2. Go to the `action.yml` file — you'll see a banner "Draft a release"
3. Click **Draft a release**
4. Check **"Publish this Action to the GitHub Marketplace"**
5. Select **Primary Category** (and optionally **Another Category**)
6. Set a **version tag** (e.g., `v1.0.0`)
7. Write a **release title** and description
8. Click **Publish release** (requires 2FA)

### Authentication
- GitHub OAuth (standard GitHub login)
- Repository ownership verification
- Two-factor authentication required for publishing

### Categories
- Primary category must be selected from GitHub's predefined list
- Optional secondary category

### Verified Creator Badge
- GitHub can verify action creators as partner organizations
- Email partnerships@github.com to request the verified creator badge
- Verified badge appears as a checkmark on the Marketplace listing

### Removing an Action
- Edit each published release and uncheck "Publish this action to the GitHub Marketplace"
- If the repository is deleted, the Marketplace listing is also deleted

### Notes
- No manual review process for Actions (published immediately if requirements met)
- MCP Registry is a separate new feature on GitHub (github.com/mcp) — not the same as GitHub Marketplace
- Copilot Extensions are also distributed through the Marketplace
- GitHub Apps have a separate listing process

---

## Summary Comparison Table

| Platform | Method | Auth Required | Fields Required | Review Process |
|----------|--------|--------------|-----------------|----------------|
| **Glama.ai** | Web UI + GitHub OAuth | GitHub OAuth (write access) | GitHub repo URL | Automated scan + build verification |
| **OpenTools.ai** | Web form | Optional Google sign-in | Tool name, URL, desc, category, logo, pricing | Manual/curated review |
| **Agent-Cloud** | GitHub PR (open source) | GitHub auth | Code + documentation | PR review (maintainer) |
| **Poe.com** | API (bot server) | Poe developer account + API token | Bot name, server URL, description | Automated (protocol compliance) |
| **GitHub Marketplace** | GitHub Release | GitHub account + 2FA + Developer Agreement | action.yml metadata, category, version tag | Automated (no manual review) |

## Actionable Instructions Summary

### To list on Glama.ai:
1. Ensure your MCP server is on a public GitHub repo
2. Go to glama.ai, sign in with GitHub
3. Submit your repo URL via the web interface
4. Glama will auto-build, scan, and index it

### To list on OpenTools.ai:
1. Go to https://opentools.ai/friends/launch-tool
2. Fill out the form (tool name, URL, description, category, logo, pricing)
3. Submit and wait for review/approval

### To integrate with Agent-Cloud:
1. Fork https://github.com/rnadigital/agentcloud
2. Add your connector or integration following existing patterns
3. Submit a Pull Request with documentation

### To create a Poe.com bot:
1. Read docs at https://developer.poe.com
2. Implement a bot server using fastapi-poe
3. Host it (anywhere accessible)
4. Register the bot in Poe's creator dashboard with your server URL and access key

### To publish on GitHub Marketplace:
1. Create a public repo with an `action.yml` at root
2. Ensure the `name` is unique globally
3. Go to Releases, draft a new release
4. Check "Publish this Action to the GitHub Marketplace"
5. Select category, add version tag, publish
