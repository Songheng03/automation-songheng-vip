# MCP.so Submission Research

## Submission Method

The primary way to submit an MCP server or client to the MCP.so directory is via the **web form** at:

**URL:** `https://mcp.so/submit`

The process requires:
1. **Signing in** with a Google account (via Google One Tap authentication)
2. Filling out the submission form with required details
3. Submitting the form, which POSTs to the internal API endpoint

The site also accepts submissions via community channels (GitHub, Telegram, Discord), though the web form is the official submission mechanism.

> **Note for agent/gateway submissions:** The form supports two types — "MCP Server" and "MCP Client". An AI agent/gateway that acts as an MCP client (consuming MCP tools) would be submitted as "MCP Client". A gateway that exposes MCP server endpoints would be submitted as "MCP Server".

---

## API Details

The submission is handled via an internal API endpoint:

| Item | Value |
|------|-------|
| **Endpoint** | `POST /api/submit-project` |
| **Base URL** | `https://mcp.so` |
| **Content-Type** | `application/json` |
| **Authentication** | Required (Google OAuth / JWT session cookie) |

### Request Body Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Name of the MCP server/client (unique) |
| `type` | string | Yes | Either `"server"` or `"client"` |
| `url` | string | Yes | URL (for servers, must start with `https://`; typically a GitHub repo) |
| `server_config` | string | No | JSON configuration for the MCP server (e.g., `mcpServers` block) |
| `is_innovation` | boolean | No | Innovation flag |
| `is_dxt` | boolean | No | DXT flag |

### Response Format

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "uuid": "string",
    "name": "string",
    "type": "server|client",
    ...
  }
}
```

- `code: 0` means success
- `code: -1` means error (e.g., `"invalid url"`, `"no auth, please login"`)
- On success with a `uuid` field in the data, the user is redirected to `/my-servers/{uuid}/edit`
- On success without `uuid`, the user is redirected to `/server/{name}` or `/client/{name}`

### Other Discovered API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/get-user-info` | POST | Fetch current user info |
| `/api/update-invite` | POST | Update invite code for referring users |

### Authentication Flow

- Google One Tap sign-in is used
- After authentication, a credential token is exchanged via `/api/get-user-info`
- The session is maintained via cookies/state

---

## Web Form Details

The web form at `https://mcp.so/submit` contains the following fields:

1. **Type** (dropdown, required - marked with `*`)
   - Options: `MCP Server`, `MCP Client`

2. **Name** (text input, required)
   - Placeholder varies by type selection
   - Must be unique in the system

3. **URL** (URL input, required)
   - For `server` type: placeholder is `https://github.com/chatmcp/mcp-server-github`
   - For `client` type: placeholder is `https://chatmcp.ai`
   - Server URLs must start with `https://`

4. **Server Config** (textarea, optional)
   - Only shown when type is `server`
   - Expects JSON format (18 rows tall)
   - Example placeholder:
     ```json
     {
       "mcpServers": {
         "github": {
           "command": "docker",
           "args": ["run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "mcp/github"],
           "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "..." }
         }
       }
     }
     ```

5. **Sign-in**: A Google One-Tap sign-in prompt appears on the page. Submission without signing in shows an error: "Please Sign in to submit a server."

### Validation Rules (client-side)

- Name and URL are required fields
- URL must be valid and for servers must start with `https://`
- If not signed in, a toast notification appears and the sign-in modal opens

---

## Account Requirements

| Requirement | Details |
|-------------|---------|
| **Authentication** | Google account (via Google One Tap) |
| **Client ID** | `1073783674402-ufrt38vdm44g16fkb5iq9dampc840b4h.apps.googleusercontent.com` |
| **Sign-in Method** | OAuth 2.0 via Google |
| **Free to use** | Yes, no payment required |
| **Invite Code** | Optional — users can enter an invite code when signing up |

**Note:** The site uses a referral/invite system where existing users can share invite codes. New users who sign up within 2 hours can enter an invite code to link accounts.

---

## Notes

### Source Code
- The MCP.so directory is **open source** at: [https://github.com/chatmcp/mcpso](https://github.com/chatmcp/mcpso)
- Built with **Next.js** (React framework) using the App Router
- Database: **Supabase** (PostgreSQL)
- The project has tables for `users`, `projects`, and `categories`

### Community Channels
- **Telegram Group:** [https://t.me/+N0gv4O9SXio2YWU1](https://t.me/+N0gv4O9SXio2YWU1)
- **Discord Server:** [https://discord.gg/RsYPRrnyqg](https://discord.gg/RsYPRrnyqg)
- **Twitter/X:** [https://x.com/chatmcp](https://x.com/chatmcp)
- **Author:** [idoubi](https://bento.me/idoubi)

### GitHub Issues
- Bugs and feature requests can be filed at: [https://github.com/chatmcp/mcpso/issues](https://github.com/chatmcp/mcpso/issues)

### Key Observations
1. There is **no public REST API documentation** — the `/api/submit-project` endpoint is internal and used by the web frontend.
2. Authentication is **strictly required**; unauthenticated API calls return `{"code":-1,"message":"no auth, please login"}`.
3. The form differentiates between **MCP Server** (a tool/server implementing the MCP protocol) and **MCP Client** (an application/agent consuming MCP servers). An AI gateway could fit either category depending on its role.
4. The site is also advertised as "The largest collection of MCP Servers" and supports multiple languages (English, Chinese, Japanese).
5. Submissions are moderated — there is a `status` field in the database schema that likely tracks approval state.

### Recommendations for Submitting an AI Agent/Gateway
- If the agent/gateway **exposes MCP endpoints** (acts as an MCP server), submit as type `server`
- If the agent/gateway **consumes MCP tools** (acts as an MCP client), submit as type `client`
- Provide a complete `server_config` JSON block to help users configure the service
- Ensure the URL points to a public GitHub repository or a live service URL
