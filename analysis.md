# Service Analysis Report — my-automaton Gateway & Service Ecosystem

**Generated:** 2025-06-18  
**Source Files:** `/root/automaton/gateway.cjs`, `/root/automaton/services/`  
**Purpose:** Document all exposed endpoints, their methods, inputs/outputs, and routing for MCP tool generation.

---

## 1. Core Gateway (gateway.cjs)

The main HTTP server on **port 8080**. It acts as a unified entry point for all services, using a simple `http.createServer` switch-case routing pattern (no Express).

### 1.1 Direct Gateway Routes

| Method | URL Path | Description | Handler |
|--------|----------|-------------|---------|
| GET | `/` or `/health` | Health check — returns service name, version, uptime, and available MCP tools | `handleHealth()` |
| GET | `/mcp` | MCP SSE endpoint — returns `event: endpoint` with SSE data for AI directory discovery | `handleMCPSSE()` |
| POST | `/mcp` | MCP JSON-RPC endpoint — accepts `tools/list` and `tools/call` methods | `handleMCPJsonRpc()` |
| GET | `/.well-known/mcp.json` | MCP discovery metadata — Smithery, Glama, MCP.so compatible | `mcpHandler.getDiscoveryMetadata()` |
| GET | `/.well-known/ai-plugin.json` | AI plugin manifest — OpenAI GPT store compatible | Inline generator + static fallback |
| GET | `/.well-known/*` | Static serving from `.well-known/` directory | `serveStatic()` |
| POST | `/webhook/github` | GitHub webhook handler — processes pushes/PRs, reviews code via DeepSeek, posts PR comments | `githubWebhook.handleWebhook()` |
| GET | `/*` | Static file serving from `services/public/` directory | `serveStatic()` |
| GET/POST | *(all other)* | 404 — returns JSON with available endpoints listed | Catch-all |

### 1.2 Static Content Served (`/services/public/`)

| File | Description |
|------|-------------|
| `README.md` | Static readme |
| `agent-card.json` | Agent card metadata |
| `python-integration.py` | Python client example |

### 1.3 MCP Tools (via mcp-handler.cjs → mock-ai.cjs)

These are accessible as JSON-RPC methods via `POST /mcp`:

| Tool Name | Method | Required Params | Optional Params | Credit Cost | Description |
|-----------|--------|-----------------|-----------------|-------------|-------------|
| `analyze` | tools/call | `text` (string) | — | 1¢ | Deep text analysis — extracts insights, themes, key points |
| `summarize` | tools/call | `text` (string) | — | 2¢ | AI-powered text summarization |
| `review` | tools/call | `code` (string) | `language` (string) | 5¢ | Full code review — bugs, security, style, improvements |
| `security` | tools/call | `code` (string) | `language` (string) | 3¢ | Security vulnerability scan (OWASP Top 10) |
| `explain` | tools/call | `code` (string) | `language` (string) | 2¢ | Code explanation in simple terms |
| `refactor` | tools/call | `code` (string) | `language` (string) | 5¢ | Refactoring suggestions with before/after |
| `complexity` | tools/call | `code` (string) | `language` (string) | 2¢ | Cyclomatic complexity & maintainability analysis |

**Output format (success):**
```json
{
  "content": [{ "type": "text", "text": "..." }],
  "meta": { "mode": "analyze", "language": null }
}
```

**Output format (error):**
```json
{ "code": -32601, "message": "Tool not found: ...", "data": {} }
```

---

## 2. Injected Service Modules (handleRoute pattern)

These modules export a `handleRoute(req, res)` function designed to be injected into the gateway via `auto-patch-gateway.cjs`. They are tried in order before the catch-all.

### 2.1 Badge System

#### badge-gateway-integration.cjs
| Method | URL Path | Description | Input/Output |
|--------|----------|-------------|--------------|
| GET | `/badge-list` | Badge list HTML page | HTML page |
| GET | `/api/badges` | Badge definitions JSON | Output: `[{id, label, color, style, url, embed}]` |
| GET | `/badge/:name.svg` | SVG badge generation | Param: `?message=` optional; Output: SVG image |

#### badge-handler.cjs
| Method | URL Path | Description | Input/Output |
|--------|----------|-------------|--------------|
| GET | `/badge-generator.html` | Badge generator page | HTML page |
| GET | `/badge/:label-:message-:color.svg` | Dynamic SVG badges | Path params: label, message, color; Output: SVG |

### 2.2 Referral System

#### referral-handler.cjs
| Method | URL Path | Description | Input/Output |
|--------|----------|-------------|--------------|
| GET | `/api/referral/generate?key=am_xxx` | Generate/get referral code | Input: `key` (API key); Output: `{referral_code, referral_url, stats}` |
| GET | `/api/referral/stats?code=XXXX` | Referral stats | Input: `code`; Output: `{code, clicks, signups, commission}` |
| GET | `/ref/CODE` | Referral link redirect | Path param: CODE; Redirects to `/?ref=CODE` |
| POST | `/api/referral/register-purchase` | Register purchase commission | Input: `{ref_code, credits_purchased}`; Output: `{commission_awarded}` |

### 2.3 Widget System

#### widget-handler.cjs
| Method | URL Path | Description | Input/Output |
|--------|----------|-------------|--------------|
| GET | `/widget.js` | Embed widget JavaScript | JavaScript file |
| GET | `/widget-install.html` | Widget install page | HTML page |
| GET | `/widget-dashboard.html` | Widget statistics dashboard | HTML page |
| GET | `/api/widget/ping?ref=&url=` | Track embed pings | Query params: `ref`, `url`; Output: `{ok, embeds}` |
| GET | `/api/widget/stats` | Widget statistics | Output: `{embeds, pings[], domains{}}` |

### 2.4 Re-engagement Services

#### re-engagement-service.cjs
| Method | URL Path | Description | Input/Output |
|--------|----------|-------------|--------------|
| GET | `/re-activate` | Dormant user reactivation portal | HTML page with stats |
| GET | `/api/re-engagement/stats` | Reactivation stats JSON | Output: `{totalApiKeys, inactiveUsers, totalWastedCredits, ...}` |
| GET | `/api/re-engagement/inactive-users` | Inactive users list | Output: `[{key, credits, used, utilization, daysSinceUse, ...}]` |

#### usage-reengagement.cjs
| Method | URL Path | Description | Input/Output |
|--------|----------|-------------|--------------|
| GET | `/api/reengage` | Re-engagement dashboard | Query: `?action=run` (bulk re-engage), `?action=gift&key=...`; Output: dashboard or result |

### 2.5 Public Stats & Social Proof

#### micro-saas-engine.cjs
| Method | URL Path | Description | Input/Output |
|--------|----------|-------------|--------------|
| GET | `/api/public-stats` | Public statistics (social proof) | Output: `{users, usage, traffic, pricing, uptime}` |
| GET | `/api/leaderboard` | Top users by usage | Output: `{total_users, active_users, total_api_calls, leaderboard[]}` |
| POST | `/api/feedback` | Submit user feedback | Input: `{message, rating, ...}`; Output: `{status, message}` |
| GET | `/api/redeem/:code` | Redeem promo code | Path: promo code; Output: `{api_key, credits, message}` |
| GET | `/api/status` | System status | Output: `{system, users, traffic, feedback}` |

### 2.6 Revenue Optimization

#### revenue-multiplier.cjs
| Method | URL Path | Description | Input/Output |
|--------|----------|-------------|--------------|
| GET | `/api/revenue/dashboard` | Revenue optimization dashboard | Output: `{segments, funnel, promos}` |
| GET | `/api/revenue/funnel` | Conversion funnel analysis | Output: `{overview, segments, conversion_funnel, recoverable_value}` |
| GET | `/api/revenue/promo` | List active promo codes | Output: promos array |
| POST | `/api/revenue/promo` | Create new promo code | Input: `{code, discount_pct, ...}`; Output: created promo |

### 2.7 Gateway Route Additions

#### gateway-routes.cjs
| Method | URL Path | Description | Input/Output |
|--------|----------|-------------|--------------|
| GET | `/api/traffic` | Public traffic stats dashboard | Output: `{totalVisits, uniqueReferrers, topPages, topReferrers, ...}` |
| GET | `/api/viral` | Viral sharing stats | Output: `{totalShares, activeSharers, topSharers[]}` |
| POST | `/api/viral/share` | Track a share/clink | Input: `{url}`; Output: `{success, totalShares}` |
| GET | `/api/credits-used` | Credit utilization stats | Output: `{totalApiKeys, paidUsers, creditsUsed, revenueUSD, ...}` |
| GET | `/api/roadmap` | Public roadmap | Output: `{status, revenue, roadmap[]}` |

### 2.8 Conversion Optimizer

#### conversion-optimizer.cjs (Express-based, requires app)
| Method | URL Path | Description | Input/Output |
|--------|----------|-------------|--------------|
| POST | `/api/conversion/track-free` | Track free request | Input: `{endpoint}`; Output: `{tracked, freeUsed}` |
| POST | `/api/conversion/track-upgrade` | Track upgrade page visit | Output: `{tracked}` |
| POST | `/api/conversion/track-payment` | Track successful payment | Input: `{ip, amount_hkd, email}`; Output: `{tracked, totalRevenue}` |
| GET | `/api/conversion/funnel` | Funnel analytics JSON | Output: `{funnel, rates, totals, dailyTrend}` |
| GET | `/api/conversion/dashboard` | Conversion dashboard HTML | HTML page with funnel visualization |

### 2.9 Free Tier API

#### free-tier-service.js (Express-based, requires app)
| Method | URL Path | Description | Input/Output |
|--------|----------|-------------|--------------|
| POST | `/api/free/analyze` | Free text analysis (3/day/IP) | Input: `{text, mode}`; Output: `{result, used_today, remaining}` |
| GET | `/api/free/quota` | Check free usage quota | Output: `{ip, used_today, remaining, limit}` |
| GET | `/api/free/stats` | Public free tier aggregate stats | Output: `{today_calls, unique_ips, limit_per_ip}` |

### 2.10 Stripe Payment Service

| Method | URL Path | Description | Input/Output |
|--------|----------|-------------|--------------|
| POST | `/api/admin/add-credits` | Admin: manually add credits | Input: `{email, credits, price_id}`; Output: `{api_key, credits}` |
| GET | `/api/credits` | Check API key balance | Header: `X-API-Key`; Output: `{valid, credits, used, plan}` |

### 2.11 GitHub Webhook

#### github-webhook-handler.cjs (called directly by gateway)
| Method | URL Path | Description | Input/Output |
|--------|----------|-------------|--------------|
| POST | `/webhook/github` | GitHub webhook processor | GitHub webhook JSON body; Output: `{ok, review, credits_used, ...}` |

---

## 3. Standalone / Legacy Services (Separate Ports)

These services are NOT integrated into the main gateway but run (or are designed to run) as independent HTTP servers.

### 3.1 DeepSeek Bridge (port 8081)

#### deepseek-bridge.mjs
| Method | URL Path | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/bridge/status` | Bridge status |
| POST | `/api/free/:service` | Free tier AI (analyze, summarize, review, security, explain, refactor, complexity) |
| POST | `/v1/:service` | Premium AI (same services, x402 payment) |

### 3.2 x402 Payment Validator (port 3020)

#### x402-payment-validator.js
| Method | URL Path | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/catalog` | Service catalog with all premium endpoints |
| GET | `/verify?tx=` | Verify a payment transaction hash |
| POST | `/v1/analyze` | Premium: deep text analysis (requires X-X402-Payment header) |
| POST | `/v1/summarize` | Premium: text summarization |
| POST | `/v1/review` | Premium: code review |
| POST | `/v1/security` | Premium: security scan |
| POST | `/v1/explain` | Premium: code explanation |
| POST | `/v1/refactor` | Premium: refactoring suggestions |
| POST | `/v1/complexity` | Premium: complexity analysis |
| POST | `/v1/render` | Premium: markdown to HTML |
| POST | `/v1/batch` | Premium: batch processing |
| POST | `/v1/qr` | Premium: QR code generation |
| POST | `/v1/moderate` | Premium: content moderation |
| POST | `/v1/generate` | Premium: AI image generation |

### 3.3 Promotional Services (Standalone)

Various standalone agent services (`.mjs`, `.js`, `.cjs`) exist in the services directory for outreach, promotion, marketing automation, SEO, and ecosystem integration. These are not HTTP-exposed services but rather scripts/tools.

---

## 4. Service Discovery & Metadata

### Well-Known Endpoints

| URL Path | Content | Purpose |
|----------|---------|---------|
| `/.well-known/mcp.json` | MCP discovery metadata | Smithery, Glama, MCP.so, MCPList, PulseMCP directories |
| `/.well-known/ai-plugin.json` | AI plugin manifest (OpenAI GPT store) | OpenAI plugin / GPT directory |
| `/.well-known/openapi.json` | OpenAPI spec (referenced but not confirmed present) | API documentation |

### Route Manifest

File: `.route-manifest.json`
```json
{
  "routes": [
    "/tools/badge-generator",
    "/badge/*",
    "/github-webhook-setup",
    "/blog/code-quality-badges-guide"
  ]
}
```

---

## 5. Summary of Endpoint Patterns

| Pattern Category | Examples | Count |
|-----------------|----------|-------|
| **MCP Tools** (POST /mcp) | analyze, summarize, review, security, explain, refactor, complexity | 7 tools |
| **Free API** (POST /api/free/*) | /api/free/analyze, /api/free/quota, /api/free/stats | 3 endpoints |
| **Premium API** (POST /v1/*) | /v1/analyze, /v1/review, /v1/security, etc. | 7+ endpoints |
| **Public Stats** (GET /api/*) | /api/public-stats, /api/status, /api/leaderboard, /api/traffic, /api/credits-used, /api/roadmap | 6+ endpoints |
| **Business** (GET/POST /api/*) | /api/referral/*, /api/revenue/*, /api/conversion/*, /api/reengage, /api/widget/* | 15+ endpoints |
| **Badges** (GET /badge/*) | /badge/:name.svg, /api/badges, /badge-list, /badge-generator.html | 4+ endpoints |
| **Admin** | /api/admin/add-credits, /api/reengage?action=run | 2 endpoints |
| **Well-Known** | /.well-known/mcp.json, /.well-known/ai-plugin.json | 2 endpoints |
| **Health** | /health, / | 1 endpoint |

**Total unique URL paths:** ~40+  
**Total functional tools/services:** ~7 MCP tools + ~13 AI service variants  
**Primary authentication methods:** API keys (`X-API-Key` header), IP-based rate limiting (free tier), x402 payment headers
