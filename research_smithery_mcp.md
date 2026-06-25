# Submission Processes for Smithery.ai and MCP.so

> Research compiled: **Researcher**  
> Task: Document exact steps, required data, API endpoints, and authentication needed to register an MCP server.

---

## 1. Smithery.ai — Publishing an MCP Server

### Overview

Smithery (https://smithery.ai) is a full MCP registry and gateway. You can publish an MCP server either via **web UI**, **CLI**, or **direct REST API**.

There are three release types:

| Type | Description |
|------|-------------|
| **URL (external)** | Bring your own hosted server (Streamable HTTP). Smithery Gateway proxies to your upstream. |
| **Local (stdio)** | Pack your stdio server into an `.mcpb` bundle. Smithery distributes it to clients. |
| **Hosted** | Upload a JavaScript module. Smithery hosts it for you. |

### A. Web UI Method (Simplest)

1. Go to https://smithery.ai/new
2. Sign in with GitHub OAuth
3. Enter your server's public HTTPS URL
4. Complete the publishing flow (Smithery scans your server automatically)

**Requirements:**
- Server must support **Streamable HTTP** transport
- If auth required, implement **OAuth** support (Smithery handles client registration automatically)
- Smithery scans with `User-Agent: SmitheryBot/1.0 (+https://smithery.ai)`

### B. CLI Method

#### Installation
```bash
npm install -g smithery@latest
# Requires Node.js 20+
```

#### Authentication
```bash
smithery auth login        # OAuth login
smithery auth whoami       # Check current user
```

#### Publish a URL-based server
```bash
smithery mcp publish "https://your-server.com/mcp" -n @your-org/your-server
```

With custom config schema:
```bash
smithery mcp publish "https://your-server.com/mcp" -n @your-org/your-server \
  --config-schema '{"type":"object","properties":{"apiKey":{"type":"string"}}}'
```

#### Publish an MCPB bundle (stdio)
```bash
smithery mcp publish ./server.mcpb -n your-org/your-server
```

### C. REST API Method

**API Base URL:** `https://api.smithery.ai`  
**Authentication:** Bearer token (Smithery API key)

#### Step 1: Create a server (if doesn't exist)

```
PUT /servers/{qualifiedName}
```

**Headers:**
```
Authorization: Bearer <SMITHERY_API_KEY>
Content-Type: application/json
```

**Path parameter:**
- `qualifiedName`: `namespace/server` or `namespace` (use `%2F` to encode `/`)

**Request body (JSON):**
```json
{
  "displayName": "My Server",
  "description": "A simple server"
}
```

**Response (201 Created):**
```json
{
  "namespace": "myorg",
  "server": "",
  "displayName": "My Server",
  "description": "A simple server",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Step 2: Publish a release

```
PUT /servers/{qualifiedName}/releases
```

**Headers:**
```
Authorization: Bearer <SMITHERY_API_KEY>
Content-Type: multipart/form-data
```

**Form fields:**
- `payload` (required): JSON-encoded release payload (see below)
- For **hosted** releases: `module` (JS file), `sourcemap` (optional)
- For **stdio** releases: `bundle` (`.mcpb` file)

**Payload schemas (JSON-encoded in the `payload` field):**

*External URL release:*
```json
{
  "type": "external",
  "upstreamUrl": "https://your-server.com/mcp",
  "configSchema": {
    "type": "object",
    "properties": {
      "apiKey": { "type": "string" }
    }
  },
  "scanCredentials": {}
}
```

*Stdio (MCPB bundle) release:*
```json
{
  "type": "stdio",
  "runtime": "node",
  "configSchema": {
    "type": "object",
    "properties": {}
  },
  "serverCard": {}
}
```

*Hosted release:*
```json
{
  "type": "hosted",
  "stateful": false,
  "hasAuthAdapter": false,
  "configSchema": {},
  "secretNames": [],
  "source": {
    "commit": "abc123",
    "branch": "main"
  }
}
```

**Response (202 Accepted):**
```json
{
  "deploymentId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "WORKING",
  "mcpUrl": "https://slug.run.tools",
  "warnings": []
}
```

#### Optional: Static Server Card

If Smithery can't scan your server automatically, serve `/.well-known/mcp/server-card.json` at your server root:

```json
{
  "serverInfo": {
    "name": "Your Server Name",
    "version": "1.0.0"
  },
  "authentication": {
    "required": true,
    "schemes": ["oauth2"]
  },
  "tools": [
    {
      "name": "search",
      "description": "Search for information",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        },
        "required": ["query"]
      }
    }
  ],
  "resources": [],
  "prompts": []
}
```

### Prerequisites for Smithery

1. **GitHub account** (for authentication/login)
2. **Smithery API key** (generated from Smithery dashboard or via `smithery auth token`)
3. **Node.js 20+** (for CLI)
4. **A running MCP server** (for URL method) or an **MCPB bundle** (for stdio method)
5. **Namespace** (auto-created or specify via `smithery namespace use <name>`)

---

## 2. MCP.so — Submitting an MCP Server

### Overview

MCP.so (https://mcp.so) is an MCP server directory/registry. Servers are submitted via a **web form** at https://mcp.so/submit. There is no public REST API for submissions. Users must sign in (Google or GitHub OAuth) to submit.

### Submission via Web Form

**URL:** https://mcp.so/submit

**Required fields:**
1. **Type** — Radio button: `MCP Server` or `MCP Client`
2. **Name** — Text input for the server/client display name
3. **URL** — The MCP server/client URL or GitHub repository URL
4. **Server Config** — A JSON textarea with the MCP server configuration

**Example Server Config payload:**
```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "mcp/github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
      }
    }
  }
}
```

### Submission Process

1. Navigate to https://mcp.so/submit
2. Sign in with **Google** or **GitHub** (click the "Sign In" button in the sidebar)
3. Fill out the form:
   - Select "MCP Server" for type
   - Enter your server's display name
   - Enter your server's URL (GitHub repo or website)
   - Provide the JSON configuration in the "Server Config" textarea
4. Click "Submit"

### GitHub Issues for Support

- Bug reports / feature requests: https://github.com/chatmcp/mcpso/issues
- Contact: support@mcp.so

### Important Notes

- **No public API exists** for MCP.so submissions — it's web-form only
- **No API key or token** required beyond the OAuth sign-in (Google/GitHub)
- Servers appear to be manually reviewed or automatically listed after submission
- The site also has a "My Servers" section (https://mcp.so/my-servers) where you can manage your submissions after logging in
- MCP.so is built by the [ChatMCP](https://x.com/chatmcp) team

### Client Submission

You can also submit **MCP Clients** via the same form at /submit by selecting "MCP Client" as the type.

---

## Comparison Table

| Feature | Smithery.ai | MCP.so |
|---------|-------------|--------|
| **Submission method** | Web UI, CLI, REST API | Web form only |
| **API available** | Yes (REST API at api.smithery.ai) | No public API |
| **Auth required** | GitHub OAuth + API key/Bearer token | Google or GitHub OAuth |
| **Hosting options** | URL (external), stdio (MCPB), hosted (JS) | Config-based (docker/command) |
| **Server scanning** | Automatic (SmitheryBot/1.0) | Manual entry of config |
| **Documentation** | Extensive (docs.smithery.ai) | Minimal (no docs section) |
| **Pricing** | Free tier available | Free |
| **Analytics** | Built-in tool call analytics | None visible |
| **Verification** | Official vendor verification available | None visible |

---

## Quick Action Steps for Executor

### To submit to Smithery.ai (via API):
1. Get Smithery API key (from dashboard or `smithery auth token`)
2. Create server: `PUT /servers/{qualifiedName}` with JSON body
3. Publish release: `PUT /servers/{qualifiedName}/releases` with multipart form
4. Monitor release status via `GET /servers/{qualifiedName}/releases/{id}`

### To submit to Smithery.ai (via CLI):
1. `npm install -g smithery@latest`
2. `smithery auth login`
3. `smithery mcp publish "https://your-server.com/mcp" -n your-org/your-server`

### To submit to MCP.so (via web):
1. Go to https://mcp.so/submit
2. Sign in with GitHub/Google
3. Fill type, name, URL, and server config JSON
4. Click Submit
