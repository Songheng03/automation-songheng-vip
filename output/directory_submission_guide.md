# MCP Server Directory Submission Guide

> **Compiled:** 2026-06-18  
> **Purpose:** Actionable submission instructions for listing an MCP server  
> **Target Directories:** MCP.so, Glama, OpenAPI Directory (APIs.guru), AgentHub

---

## 1. MCP.so

| Field | Detail |
|-------|--------|
| **Directory** | MCP.so |
| **Website** | https://mcp.so |
| **Submission URL** | https://mcp.so/submit |
| **Submission Type** | Manual web form (GitHub OAuth or Google OAuth required) |
| **API Available?** | ❌ No public REST API |
| **Auto-submission Possible?** | ❌ No — requires OAuth sign-in (not feasible via CLI automation) |

### Required Fields

| Field | Type | Example |
|-------|------|---------|
| Type | Dropdown | `MCP Server` |
| Name | Text | `my-automaton` |
| Display Name | Text | `My Automaton — AI Tool Suite` |
| URL | URL | `https://automation.songheng.vip` |
| Description | Text | Multi-line description of the MCP server |
| Tags | Text | `mcp, automation, agent, x402` |
| Server Config JSON | JSON | `{ "mcpServers": { "my-automaton": { "url": "https://automation.songheng.vip/mcp" } } }` |

### Authentication Required

- **GitHub OAuth** or **Google OAuth** sign-in is mandatory to access the submission form
- No API key, bearer token, or alternative auth mechanism is available

### Submission Steps

1. Open a web browser and navigate to https://mcp.so
2. Click the **"Sign In"** button (top-right corner)
3. Choose **GitHub** or **Google** as the OAuth provider and complete sign-in
4. Navigate to https://mcp.so/submit
5. Fill in the form with your MCP server details:
   - **Type:** `MCP Server`
   - **Name:** A unique identifier (e.g., `my-automaton`)
   - **Display Name:** Human-readable name
   - **URL:** Your MCP server's base URL
   - **Description:** What your server does, key features
   - **Tags:** Comma-separated keywords
   - **Server Config JSON:** The JSON configuration users paste into their `claude_desktop_config.json`
6. Click **Submit**
7. Verify the listing appears at https://mcp.so/servers

### Success Indicator

- A confirmation message appears on the web page after submission
- The server listing appears in search results on https://mcp.so/servers
- Your server becomes discoverable by other MCP users

### Notes

- MCP.so is a Next.js web application (source: github.com/chatmcp/mcp-directory)
- Supports multiple languages (EN, ZH, JA)
- Your server config JSON should match the format users would paste into Claude Desktop config
- Edits to an existing listing require the same OAuth authentication

---

## 2. Glama (Glama.ai)

| Field | Detail |
|-------|--------|
| **Directory** | Glama.ai |
| **Website** | https://glama.ai |
| **Submission URL** | https://glama.ai/mcp/servers (click "Add Server" or "Submit Server") |
| **Submission Type** | Manual web form (GitHub OAuth required) |
| **API Available?** | ❌ No public REST API for submission |

### Required Fields

| Field | Type | Example |
|-------|------|---------|
| GitHub Repository URL | URL | `https://github.com/Conway-Research/automaton` |
| Server Name | Text | `automaton` |
| Description | Text | Multi-line description |
| License Type | Dropdown | `MIT` |
| Categories/Tags | Tags | `Developer Tools, Code Review, AI` |

### Authentication Required

- **GitHub OAuth** with **write/admin access** to the repository being submitted
- Glama verifies write access to the repository via GitHub OAuth before accepting the listing
- No API key or alternative auth is available

### Submission Steps

1. Open a web browser and navigate to https://glama.ai
2. Click **"Sign In"** and authenticate via **GitHub OAuth** (must have write access to the repo you're submitting)
3. Navigate to https://glama.ai/mcp/servers
4. Click the **"Add Server"** or **"Submit Server"** button
5. Enter your **GitHub repository URL** (e.g., `https://github.com/Conway-Research/automaton`)
6. Glama will:
   - Verify your write access to the repository via GitHub OAuth
   - Clone the repository
   - Build the Docker image (listening on port 8080)
   - Run MCP protocol introspection (`tools/list`, `resources/list`, `prompts/list`)
   - Run behavioral analysis in an isolated Firecracker microVM
   - Compute a **Tool Definition Quality Score (TDQS)**
7. The server appears at `https://glama.ai/mcp/servers/@<owner>/<repo>`

### Success Indicator

- The server listing appears on Glama.ai after automated scanning completes
- If Docker build succeeds: the server is publicly listed and searchable
- If Docker build fails: the listing is preserved but **hidden from search results**
- Glama computes and displays a **TDQS (Tool Definition Quality Score)** for the server
- A badge/status indicator shows whether the server build and scan passed

### Notes

- Glama claims 37,615+ MCP servers listed and 50,000+ developers on the platform
- They also auto-discover servers from the official MCP Registry, npm, and GitHub Awesome Lists
- Ensure your Dockerfile builds successfully (port 8080) before submitting
- Glama also provides a browser inspector for testing MCP servers in-browser
- No public REST API exists — all `/api/*` endpoints checked returned 404 or HTML pages

---

## 3. OpenAPI Directory (APIs.guru)

| Field | Detail |
|-------|--------|
| **Directory** | APIs.guru OpenAPI Directory |
| **Website** | https://apis.guru |
| **Submission URL** | https://apis.guru/add-api (web form) |
| **Alternative Method** | GitHub Pull Request to https://github.com/APIs-guru/openapi-directory |
| **Submission Type** | Web form OR GitHub PR |
| **API Available?** | ✅ Yes — REST API at `https://api.apis.guru/v2/` (read-only, for querying the directory) |

### Required Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| URL to API Definition | URL | **Yes** | Stable URL to a machine-readable API definition (OpenAPI/Swagger, RAML, API Blueprint, etc.) |
| Format of Definition | Radio | **Yes** | Select format: OpenAPI/Swagger, RAML, API Blueprint, Google Discovery, Postman Collection, etc. |
| API Name | Text | If not auto-detected | Auto-populated from `info.title` in the definition if provided |
| API Logo URL | URL | No | Auto-populated from `x-logo` or `info.[x-logo]`; can also provide manually |
| Preferred Version | Text | No | Which version to show as default if multiple exist |
| Contact Info | Text | No | Email, Twitter, or other contact for the API maintainer |

### Authentication Required

- **None** for the web form submission
- **GitHub account** if submitting via PR (fork → edit → PR)

### Submission Steps (Web Form)

1. Open a browser and navigate to https://apis.guru/add-api
2. In the **URL** field, enter a stable URL pointing to your OpenAPI/Swagger definition file (e.g., `https://automation.songheng.vip/.well-known/openapi.json`)
3. Select the **format** of your API definition (typically `OpenAPI/Swagger`)
4. Optionally provide:
   - **API Name** (auto-detected from the definition if omitted)
   - **API Logo URL** (auto-detected from `x-logo` field)
   - **Preferred Version** (which version to show as default)
   - **Contact Info** (email, Twitter handle)
5. Submit the form
6. Wait for the API to be reviewed and added to the directory

### Submission Steps (GitHub PR — Alternative)

1. Fork the repository: https://github.com/APIs-guru/openapi-directory
2. Add your OpenAPI spec file under `APIs/<provider-name>/<version>/`
3. Create a pull request against the main branch
4. The maintainers will review and merge

### Success Indicator

- Web form submission: A success message or "thank you" page is displayed
- GitHub PR: The PR is reviewed and merged by maintainers
- Your API appears in the directory at https://apis.guru/browse-apis/
- Your API is queryable via the public API at `https://api.apis.guru/v2/<provider-name>.json`

### Requirements for Inclusion

- **Public** — anyone can access it as long as they follow clearly defined steps (subscribe, pay fees, etc.)
- **Persistent** — API is made with long-lived goal, not for a particular event (conference, hackathon, etc.)
- **Useful** — API should provide useful functionality not only for its owner
- Must have a **machine-readable API definition** in OpenAPI (Swagger), RAML, API Blueprint, or similar format
- The definition must be hosted at a **stable URL** — APIs.guru aggregates from URLs, they do not host the definitions

### Notes

- The APIs.guru directory is often described as "Wikipedia for Web APIs"
- They aggregate definitions; they do not host them
- They refresh definitions periodically from the provided URLs (update procedure documented on GitHub)
- If you provide a `.well-known/ai-plugin.json` URL, the linked OpenAPI definition will be automatically located and the name/logo auto-populated
- The GitHub approach (PR) is better if you want to ensure exact placement and formatting

---

## 4. AgentHub

| Field | Detail |
|-------|--------|
| **Directory** | AgentHub (formerly agenthub.dev) |
| **Website** | https://agenthub.dev (redirects to https://gumloop.com) |
| **Submission URL** | **N/A** — The AgentHub directory no longer exists |
| **Submission Type** | ❌ Not available |
| **API Available?** | ❌ No |

### Status: DEFUNCT / REDIRECTED

**AgentHub no longer operates as an AI agent directory.** Research findings:

- **agenthub.dev** → HTTP 301 permanent redirect to **Gumloop** (https://gumloop.com), a no-code AI workflow automation platform
- **agenthub.ai** → Premium domain for sale / parked landing page — not an active directory
- All previously existing API endpoints (e.g., `/api/agents`, `/submit`) now return 301 redirects to Gumloop

### What about Gumloop?

Gumloop (https://gumloop.com) is a **no-code AI workflow automation platform** — it is **not** a directory for listing external MCP servers. Key differences:

| Aspect | AgentHub (was) | Gumloop (current) |
|--------|---------------|-------------------|
| Type | AI Agent directory | No-code workflow builder |
| Supports external listings? | ✅ Yes | ❌ No (only native platform workflows) |
| Submission mechanism | Web form | Community templates (requires building a workflow inside Gumloop) |
| Suitable for MCP servers? | ✅ Yes | ❌ No — cannot list external MCP servers |

### Alternative: Gumloop Community Templates

If you want to create a Gumloop template that *uses* your MCP server (not list it):

1. Create a Gumloop account at https://gumloop.com
2. Build a native no-code AI workflow using their builder
3. Submit to community templates via the Gumloop UI
4. This would create a template that *uses* your MCP server as part of a workflow — it does **not** list your server

**Recommendation:** Skip AgentHub. Focus submissions on active directories (MCP.so, Glama, etc.).

---

## Quick Reference Table

| # | Directory | URL | Submission URL | Auth Required | API Available | Status |
|---|-----------|-----|---------------|:-------------:|:-------------:|--------|
| 1 | **MCP.so** | https://mcp.so | https://mcp.so/submit | GitHub/Google OAuth | ❌ No | 🟢 Active |
| 2 | **Glama** | https://glama.ai | https://glama.ai/mcp/servers | GitHub OAuth (write access) | ❌ No | 🟢 Active |
| 3 | **APIs.guru** (OpenAPI Directory) | https://apis.guru | https://apis.guru/add-api | None (form) / GitHub (PR) | ✅ Read-only API | 🟢 Active |
| 4 | **AgentHub** | ~agenthub.dev~ → gumloop.com | N/A | N/A | ❌ No | 🔴 Defunct |

## Recommended Submission Priority

1. **Glama.ai** — Largest MCP-specific audience (37K+ servers, 50K+ developers); auto-scans and validates your server for quality
2. **MCP.so** — Popular MCP server collection; simple form submission; multi-language support
3. **APIs.guru** — Broadest reach across all API consumers (not MCP-specific); add your OpenAPI spec for general API discoverability
4. ~~AgentHub~~ — **Skip** — directory is defunct

---

*End of guide. All four directories researched with actionable instructions provided for the three active directories.*
