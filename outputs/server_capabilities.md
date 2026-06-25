# my-automaton Server Capabilities

> **Base URL:** `http://localhost:8080` (also accessible via `https://automation.songheng.vip`)
> **Server Version:** 2.2.0
> **Status:** Health check returns `ok` — tunnel connected, service running 24/7

---

## 1. REST API Endpoints

### 1.1 Root Landing Page

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Landing page with service overview, pricing, use cases, and links |

The root page is an HTML marketing page for the my-automaton API service. It describes:

- **Pricing:** Pay per request from **$0.01**, free tier of **3 requests/day/IP**
- **Integration badges:** Python, JavaScript, TypeScript, Go, Rust, GitHub Actions, MCP
- **Use cases:** CI/CD Code Review Bot, Pre-Deploy Security Scan, AI-Powered Text Analysis, Automated Code Refactoring

---

### 1.2 Health & Discovery

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | **GET** | Health check — returns `{"status":"ok","service":"my-automaton","version":"2.2.0","uptime":...,"tunnel":"connected"}` |

---

### 1.3 MCP (Model Context Protocol) Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp` | **GET** | SSE (Server-Sent Events) endpoint for streaming |
| `/mcp` | **POST** | JSON-RPC endpoint for tool listing and tool calling |

#### MCP Methods Supported:
- `tools/list` — List all available AI tools
- `tools/call` — Call a specific tool with arguments

---

### 1.4 Service Discovery

| Endpoint | Description |
|----------|-------------|
| `/.well-known/mcp.json` | MCP discovery manifest — lists tools, payment info, capabilities |
| `/.well-known/ai-plugin.json` | AI plugin manifest (ChatGPT plugin format) — full tool definitions with input schemas |

---

### 1.5 Admin Endpoints (Key Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/tunnel/status` | **GET** | Check tunnel status (no auth required, returns tunnel info) |
| `/admin/tunnel/start` | **POST** | Start tunnel (requires valid admin key) |
| `/admin/tunnel/stop` | **POST** | Stop tunnel (requires valid admin key) |

---

### 1.6 Webhook Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhook/github` | **POST** | GitHub webhook receiver (for PR review automation) |

---

## 2. AI Tools (via MCP)

The server provides **7 AI-powered tools** accessible through the MCP JSON-RPC interface (`POST /mcp`).

### 2.1 Text Analysis Tools

| # | Tool Name | Description | Input | Price |
|---|-----------|-------------|-------|-------|
| 1 | **`analyze`** | Deep text analysis — extract insights, themes, and key points from text content | `text` (string, required) | **$0.01** |
| 2 | **`summarize`** | AI-powered text summarization — condense long text into a concise summary | `text` (string, required) | **$0.02** |

### 2.2 Code Review & Security Tools

| # | Tool Name | Description | Inputs | Price |
|---|-----------|-------------|--------|-------|
| 3 | **`review`** | Full code review — check for bugs, security issues, style problems, and suggest improvements | `code` (string, required), `language` (string, optional) | **$0.05** |
| 4 | **`security`** | Security vulnerability scan — check code for OWASP Top 10, injections, secrets exposure | `code` (string, required), `language` (string, optional) | **$0.03** |

### 2.3 Code Quality & Explanation Tools

| # | Tool Name | Description | Inputs | Price |
|---|-----------|-------------|--------|-------|
| 5 | **`explain`** | Code explanation — explain what code does in simple terms | `code` (string, required), `language` (string, optional) | **$0.02** |
| 6 | **`refactor`** | Refactoring suggestions — provide concrete improvements for code quality and maintainability | `code` (string, required), `language` (string, optional) | **$0.05** |
| 7 | **`complexity`** | Complexity analysis — analyze code complexity, cyclomatic complexity, and maintainability | `code` (string, required), `language` (string, optional) | **$0.02** |

---

## 3. MCP Interaction Examples

### List all available tools

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Call a tool (e.g., analyze)

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"analyze","arguments":{"text":"Your text here..."}}}'
```

### SSE streaming endpoint

```bash
curl http://localhost:8080/mcp
```

---

## 4. Prompts (MCP)

The server advertises the following prompt templates:

| Prompt Name | Description |
|-------------|-------------|
| `code-review` | Template for code review requests |
| `security-scan` | Template for security scanning |
| `analyze-text` | Template for text analysis |

---

## 5. Payment System

- **Type:** x402 (Pay-per-request)
- **Currency:** USDC
- **Chain:** Base (EVM)
- **Wallet:** `0x76eADdEBFfb6A61DD071f97F4508467fc55dd113`
- **Pricing model:** Per-tool pricing as listed above (ranges from $0.01 to $0.05)

---

## 6. Service Summary

| Attribute | Value |
|-----------|-------|
| Service Name | my-automaton |
| Version | 2.2.0 |
| Total AI Tools | 7 |
| Health Status | ✅ OK |
| Tunnel Status | ✅ Connected |
| MCP Transport | HTTP+SSE, JSON-RPC |
| Integrations | Smithery, Glama, MCP.so, MCPList, PulseMCP |
| Supported Languages | JavaScript, Python, Java, Go, Rust, and more |
| Deployment | 24/7 on dedicated VPS |

---

## 7. Non-API Static Pages (404)

The following pages referenced in the HTML are **not served** by the API server (return 404):
- `/api-docs.html`
- `/get-started.html`
- `/api-playground.html`
- `/daily.html`
- `/json-to-typescript.html`
- `/regex-tester.html`
- `/dev-toolbox.html`
- `/diff-checker.html`
- `/contrast-checker.html`
- `/robots.txt`

These likely exist on the actual production domain at `https://automation.songheng.vip` as static files, but are not part of the backend API server.
