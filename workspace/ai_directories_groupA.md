# AI MCP Directory Submission Methods — Group A

Research compiled on 2026-06-18 for directories: Smithery, MCP.so, and Glama.

## Summary Table

| Directory | API Available (Y/N) | API Endpoint / Form URL | Auth Method | Account Registration Steps | Notes |
|-----------|-------------------|------------------------|-------------|---------------------------|-------|
| **Smithery** | Yes | **API:** `https://api.smithery.ai` (PUT `/servers/{qualifiedName}`)<br>**Docs:** https://smithery.ai/docs/publish/overview<br>**Web:** "Publish" button on https://smithery.ai | Bearer token (API key) or OAuth via CLI | 1. Sign up at smithery.ai OR install CLI (`npm install -g @smithery/cli`)<br>2. Run `smithery auth login` (browser-based OAuth)<br>3. Create a namespace (`smithery namespace create <name>`)<br>4. Generate an API key or service token for programmatic access | Supports 3 release types: **hosted** (JS module upload), **external** (URL endpoint), **stdio** (MCPB bundle). Idempotent API — PUT returns success if server already exists. Full REST API documented at api.smithery.ai (OpenAPI spec). The "Publish" dropdown on the website provides access to server registration flows. |
| **MCP.so** | No (no public API found) | **Web form:** https://mcp.so/submit | No auth required for submission form (likely session-based if signed in) | 1. Optional: Sign in via the sidebar ("Settings" → "Sign In")<br>2. Navigate to https://mcp.so/submit<br>3. Fill in: Type (MCP Server / MCP Client), Name, URL, Server Config JSON<br>4. Submit | Community-driven directory. The submit form is publicly accessible without mandatory authentication. Has a "My Servers" settings page suggesting user accounts for managing submissions. No documented REST API for programmatic submission. Supports multi-language (en, zh, ja). |
| **Glama** | Yes | **API Reference:** https://glama.ai/mcp/reference<br>**Web:** https://glama.ai/mcp/servers (browse)<br>**Methodology:** https://glama.ai/mcp/methodology | GitHub OAuth (maintainer verification) | 1. Click "Sign Up" on https://glama.ai<br>2. Authenticate via GitHub OAuth<br>3. Glama verifies the submitter has write/admin access to the repository being listed<br>4. Servers are automatically indexed from public GitHub repos | Largest registry (37,589 servers). Servers are **auto-discovered** from public GitHub repos; maintainers authenticate via GitHub OAuth to verify ownership. Runs an automated analysis pipeline: sandboxed build → protocol introspection → behavioural analysis → TDQS scoring. Connectors (hosted MCP services) can be submitted by providing sandbox credentials. Maintainer-verified listing required — servers cannot be submitted on behalf of someone who doesn't control the source. |

## Detailed Notes

### Smithery

- **Website:** https://smithery.ai
- **Documentation:** https://smithery.ai/docs
- **API Base URL:** https://api.smithery.ai
- **Key API Endpoints for Submission:**
  - `PUT /servers/{qualifiedName}` — Create a server (idempotent)
  - `POST /servers/{qualifiedName}/releases` — Publish a release (multipart form; supports hosted/external/stdio types)
  - `PUT /servers/{namespace}/{server}` — Create or update a server
- **Auth for API:** Bearer token (API key) or service token with appropriate scopes
- **CLI tool:** `npm install -g @smithery/cli` — provides `smithery auth login`, `smithery mcp add`, etc.
- **Publish types:** Hosted (upload JS module), External (provide URL), Stdio (upload MCPB bundle)
- **Prerequisites:** Requires a namespace, API key or OAuth authentication

### MCP.so

- **Website:** https://mcp.so
- **Submit URL:** https://mcp.so/submit
- **Submission fields:** Type (MCP Server/MCP Client), Name, URL, Server Config JSON
- **API:** No public REST API found for programmatic submission
- **Auth:** Submission form is publicly accessible; optional sign-in for managing submissions
- **Notes:** Focuses on community curation. The server config field accepts a JSON blob matching the MCP client configuration format (e.g., Claude Desktop config).

### Glama

- **Website:** https://glama.ai
- **Methodology:** https://glama.ai/mcp/methodology
- **API Reference:** https://glama.ai/mcp/reference
- **Server listing:** https://glama.ai/mcp/servers
- **Submission method:** GitHub OAuth-based maintainer verification. Glama clones and indexes public GitHub repos automatically.
- **Auth:** GitHub OAuth required to verify maintainer status (write/admin access to repo)
- **Pipeline:** Builds server from Dockerfile → runs in Firecracker microVM → protocol introspection (tools/list, resources/list, prompts/list) → behavioural/safety analysis → TDQS scoring
- **Hosted connectors:** Remote MCP services can submit by providing sandbox credential sets
- **Prerequisites:** A public GitHub repository with an MCP server. Dockerfile for building (can be AI-inferred). For connectors: a streamable-http endpoint and sandbox credentials.
- **TDQS:** Tool Definition Quality Score — evaluates tool schemas across 6 dimensions (Purpose Clarity, Usage Guidelines, Behavioral Transparency, Parameter Semantics, Conciseness, Contextual Completeness)
