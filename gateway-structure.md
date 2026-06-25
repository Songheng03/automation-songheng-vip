# Gateway Routing Structure — `gateway.cjs`

## Overview

The gateway is a **raw Node.js HTTP server** (no Express.js or other framework). It uses `http.createServer(handleRequest)` with a single async function that manually routes requests by inspecting `req.url` (parsed via `url.parse`) and `req.method`.

## Pattern Used for Route Registration

**There are no `app.get` or `app.post` calls.** Instead, routes are defined as `if`/`else if` branches inside the `handleRequest` function using the pattern:

```js
if (pathname === '/some-path' && method === 'GET') {
  return handler(req, res);
}
// or
if (pathname === '/some-path' && method === 'POST') {
  return handlerFn(req, res);
}
```

The flow is linear — each route is checked in order, and `return` is used to prevent falling through to subsequent conditions.

## Current HTTP Endpoints (in evaluation order)

| Method | Path                        | Handler Function               | Purpose                                |
|--------|-----------------------------|--------------------------------|----------------------------------------|
| OPTIONS| *                           | `handleCORS`                   | CORS preflight (204)                   |
| GET    | `/mcp`                      | `handleMCPSseEndpoint`         | MCP SSE endpoint                       |
| POST   | `/mcp`                      | `handleMCPJsonRpc`             | MCP JSON-RPC (tools/list, tools/call)  |
| GET    | `/.well-known/mcp.json`     | inline (calls `getDiscoveryMetadata`) | MCP discovery metadata          |
| GET    | `/.well-known/ai-plugin.json` | inline + fallback            | AI plugin manifest (OpenAI GPT store)  |
| POST   | `/webhook/github`           | `githubWebhook.handleWebhook`  | GitHub webhook receiver                |
| GET    | `/` or `/health`            | `handleHealth`                 | Health check + MCP tool listing        |
| GET    | `/.well-known/*`            | `serveStatic` (from `.well-known/` dir) | Static files in .well-known   |
| GET    | `/*`                        | `serveStatic` (from `public/` dir) | Static files from public dir      |
| *      | *                           | 404 JSON response              | Catch-all for unmatched routes         |

## Helper Utilities

- **`serveStatic(req, res, filePath)`** — Reads a file from disk and serves it with the correct MIME type.
- **`collectBody(req)`** — Returns a Promise that collects the full POST body as a string.
- **`sendJSON(res, status, data)`** — Sends a JSON response with CORS headers.
- **`handleCORS(req, res)`** — Returns 204 with CORS headers for OPTIONS requests.
- **`callAI(messages)`** — Wrapper around DeepSeek API for AI-powered tools.

## Best Location to Insert New Routes

New routes should be inserted **just before the 404 catch-all**, after the static file serving blocks. Specifically, the insertion point is after the `// ── Static Files ────────────────────────────────────` section and before the `// ── 404 for everything else ─────────────────────────` comment.

### For `/mcp` (GET, POST)

These routes **already exist** at lines ~104–112. No insertion needed.

If additional MCP-related routes were needed, add them near the existing MCP routes (around line 100), grouped with the other MCP logic.

### For `/.well-known/` static file serving

This also **already exists** at lines ~149–153. The gateway checks the `WELL_KNOWN_DIR` (`/root/automaton/.well-known/`) for any path starting with `/.well-known/`. If a file exists there, it is served statically.

To add a new static file under `/.well-known/`, simply place the file in the `/root/automaton/.well-known/` directory. No code change is needed — the existing fallthrough logic will pick it up.

### Example of Adding a Brand-New Route

To add a new endpoint like `GET /api/status`, insert a block like this **before the 404 handler**:

```js
// ── API Status ──────────────────────────────────
if (pathname === '/api/status' && method === 'GET') {
  return sendJSON(res, 200, { status: 'operational', timestamp: new Date().toISOString() });
}
```

Place it right after the static file section (after line ~156) and before the 404 handler (line ~160).
