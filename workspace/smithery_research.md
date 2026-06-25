# Smithery Submission Method Research

## Submission Method

Smithery offers four main methods to submit/publish AI agents/gateways (MCP servers and skills):

### 1. Web Form — URL Submission (Recommended for hosted servers)
- Navigate to **https://smithery.ai/new**
- Enter your server's public HTTPS URL
- Complete the publishing flow (requires Streamable HTTP transport)
- Smithery scans your server to extract metadata (tools, prompts, resources)
- For auth-required servers, you'll be prompted to authenticate during scan
- Optionally provide a static server card at `/.well-known/mcp/server-card.json` if scanning fails

### 2. Web Form — MCPB Bundle Submission (For local/stdio servers)
- Upload a pre-built `.mcpb` bundle to Smithery
- Smithery distributes the bundle to clients who download and run it locally
- Includes configuration schema and metadata for your server page

### 3. CLI Tool (Smithery CLI)
- Install: `npm install -g smithery@latest` (requires Node.js 20+)
- **Publish a URL-based server:**
  ```bash
  smithery mcp publish "https://your-server.com/mcp" -n @your-org/your-server
  ```
- **Publish with config schema:**
  ```bash
  smithery mcp publish "https://your-server.com/mcp" -n @your-org/your-server --config-schema '{"type":"object","properties":{"apiKey":{"type":"string"}}}'
  ```
- **Publish an MCPB bundle:**
  ```bash
  smithery mcp publish ./server.mcpb -n your-org/your-server
  ```

### 4. REST API
- **Endpoint:** `PUT https://api.smithery.ai/servers/{qualifiedName}/releases`
- **Auth:** Bearer token (API key)
- **Content-Type:** multipart/form-data
- **Supports three release types:**
  - *External (URL):* Provide URL in the JSON payload
  - *Stdio (MCPB bundle):* Upload the `.mcpb` bundle file
  - *Hosted (JS module):* Upload a JavaScript module with optional sourcemap
- **JavaScript SDK available:** `@smithery/api` npm package

### 5. Skills Submission (Deprecated & Current)
- **Deprecated:** `POST /skills` (old method)
- **Current:** `PUT /skills/{namespace}/{slug}` with JSON body containing `gitUrl`
- Skills are GitHub-backed repositories containing a `SKILL.md` file
- Requires namespace ownership

---

## API Details

**Base URL:** `https://api.smithery.ai`

**Authentication:** Bearer token in `Authorization` header (API key)

**Key Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/servers/{qualifiedName}/releases` | Publish a server (multipart form) |
| `PUT` | `/namespaces/{namespace}` | Create/claim a namespace |
| `POST` | `/namespaces` | Create namespace with auto-generated name |
| `PUT` | `/skills/{namespace}/{slug}` | Create or update a GitHub-backed skill |
| `GET` | `/servers` | List all servers (search registry) |
| `GET` | `/servers/{qualifiedName}` | Get server details |
| `POST` | `/auth/token` | Create a service token |
| `DELETE` | `/servers/{qualifiedName}/releases/{releaseId}` | Delete a release |
| `DELETE` | `/servers/{qualifiedName}` | Delete a server |

**Publish API Payload (`PUT /servers/{qualifiedName}/releases`):**
```json
{
  "payload": "JSON-encoded release payload (see DeployPayload schema)",
  "module": "binary (JS module for hosted releases)",
  "sourcemap": "binary (source map for hosted releases)",
  "bundle": "binary (MCPB bundle for stdio releases)"
}
```

**Response (202 Accepted):**
```json
{
  "deploymentId": "uuid",
  "status": "WORKING",
  "mcpUrl": "https://slug.run.tools",
  "warnings": []
}
```

**OpenAPI Spec:** Available at `https://smithery.ai/docs/openapi.json`

**SDKs:**
- JavaScript: `@smithery/api` (npm)
- CLI: `smithery` (npm, `npm install -g smithery@latest`)

---

## Web Form Details

**Primary URL:** https://smithery.ai/new

**Process:**
1. User must be **signed in** to a Smithery account (redirects to sign-in page if not authenticated)
2. For URL publishing:
   - Enter the public HTTPS URL of your MCP server
   - Smithery scans the server to extract metadata (tools, resources, prompts)
   - If auth is required, you authenticate during the scan
   - If automatic scanning fails, you can provide a static server card
3. For MCPB bundle publishing:
   - Upload the `.mcpb` bundle file
   - Provide configuration schema and metadata
   - Publishing flow completes with verification
4. Post-publish, you can access **Settings → Verification** to complete official-vendor verification

**Navigation:** Accessible via the "Publish" dropdown menu on the Smithery website header (smithery.ai)

**Other Web Interfaces:**
- **Server listing:** https://smithery.ai/servers — browse published MCP servers
- **Skills listing:** https://smithery.ai/skills — browse reusable prompt-based skills
- **Documentation:** https://smithery.ai/docs — full API and integration docs
- **Pricing:** https://smithery.ai/pricing — plan details

---

## Account Requirements

**Required:** A Smithery account is required to publish servers/skills.

**Authentication Methods:**
- GitHub OAuth
- Google OAuth
- Email-based sign-in

**Plans:**

| Plan | Price | RPCs/month | Namespaces | Key Features |
|------|-------|-------------|------------|--------------|
| **Hobby (Free)** | $0 | 50K | 3 | Managed OAuth, persistent connections, basic analytics |
| **Pay as you Go** | $10/mo | $10 credits (~100K+), then $0.10/1K | 100 | Everything in Hobby + higher limits |
| **Custom** | Contact | Custom | 100+ | Custom rate limits, uptime SLA, Slack support |

**Namespace Requirements:**
- Namespace names must be lowercase alphanumeric with hyphens
- Globally unique across all Smithery
- Namespaces group servers, connections, and skills
- Can be created via CLI (`smithery namespace create`), API, or web interface
- Ownership required to publish under a namespace

**API Key:**
- Required for API-based publishing
- Created via web interface or API
- Can be scoped to specific namespaces and operations (token scoping)

**Verification (Optional):**
- Official vendor verification available via server Settings → Verification page
- Automatic checklist for official-vendor badge

---

## Notes

1. **Server must implement Streamable HTTP transport** for URL-based publishing to work. Smithery Gateway proxies to your upstream MCP server.

2. **Port 8080 note:** Smithery connects to externally hosted servers via HTTPS. For local development, you can use tunneling solutions. The Smithery service itself runs on standard HTTPS ports.

3. **OAuth handling:** Smithery handles client registration automatically via Client ID Metadata Documents per the MCP spec. No manual client registration needed.

4. **Bot scanning:** Smithery uses `SmitheryBot/1.0 (+https://smithery.ai)` User-Agent for server metadata scanning. Requests originate from Cloudflare Workers. If using Cloudflare Bot Fight Mode or WAF, you may need to whitelist this bot or serve a static server card.

5. **Config schemas:** For CLI-based publishing, you can specify JSON Schema for configuration with `--config-schema`. The format supports the `x-from` extension for session configuration.

6. **MCPB bundles:** For local stdio servers, MCPB is the packaging format. See Anthropic's guide on building MCPB bundles for local distribution.

7. **Recommended frameworks:** The docs mention [xmcp](https://xmcp.dev) for building MCP servers and [Gram](https://www.getgram.ai/) for hosting — both work with Smithery's URL publishing method.

8. **Skills vs Servers:** Skills are GitHub-backed prompt-based templates (deprecated method uses POST, current uses PUT with `gitUrl`). Servers are actual MCP server deployments (URL, MCPB, or hosted JS module).

9. **Team collaboration:** Namespaces can be shared via scoped API keys, enabling team collaboration similar to project IDs.

10. **Deep linking:** Smithery supports deep links for integrating MCPs into supported clients, making it easy for end users to discover and install your server.
