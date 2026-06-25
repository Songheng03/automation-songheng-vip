# Subdomain Plan

This document maps each subdomain to the corresponding service(s). The primary gateway runs on port 8080 and routes requests based on subdomain.

---

## Core / Main

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `app.example.com` | `gateway.js`, `gateway-server.cjs`, `gateway.cjs` | Main application gateway — entry point for all traffic |
| `example.com` | `landing.mjs`, `landing-server.mjs`, `agent-landing.mjs` | Main landing / homepage |
| `www.example.com` | `landing.mjs`, `landing-server.mjs` | WWW landing page (alias) |

---

## AI & Intelligence

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `ai.example.com` | `ai-service.js`, `ai-server.cjs`, `ai-inference.js`, `ai-inference-service.js` | Core AI inference and service endpoints |
| `playground.example.com` | `ai-playground.mjs` | AI playground / interactive demo |
| `deepseek.example.com` | `deepseek-service.js` | DeepSeek AI integration |
| `analysis.example.com` | `ai-analysis.mjs` | AI-powered analysis |
| `directory-ai.example.com` | `ai-directory-submitter.js` | AI-driven directory submission |

---

## Blog

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `blog.example.com` | `blog.mjs`, `blog-api.mjs`, `blog-service.js`, `blog-router.js` | Main blog platform |
| `blog-generator.example.com` | `blog-generator.js`, `blog-generator-service.js` | AI blog post generator |
| `blog-registry.example.com` | `blog-registry-service.js` | Blog registry / directory |
| `blog-crosslink.example.com` | `blog-crosslinker.js` | Blog cross-linking engine |

---

## Content

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `content.example.com` | `content/` (static), `content-server.js`, `content-service.cjs` | Content delivery & static files |
| `content-api.example.com` | `api-content-service.js`, `content-routes.js`, `content-routes.mjs` | Content API endpoints |
| `content-brief.example.com` | `content-brief-service.js` | Content brief generation |
| `content-syndicator.example.com` | `content-syndicator.js` | Content syndication |
| `content-marketing.example.com` | `content-marketing.js`, `content-marketing-service.js` | Content marketing automation |
| `content-generator.example.com` | `content-generator.js` | Content generation |
| `content-injector.example.com` | `content-injector.js` | Content injection engine |

---

## Dashboard & Admin

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `dashboard.example.com` | `dashboard.html`, `dashboard.mjs`, `live-dashboard.mjs` | Main dashboard UI |
| `admin.example.com` | `admin-service.js`, `admin-patch.js` | Admin panel & management |

---

## Analytics

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `analytics.example.com` | `analytics-service.js`, `analytics-server.js` | Analytics service |
| `analytics-tracker.example.com` | `analytics-tracker.js`, `agent-analytics.mjs` | Analytics tracking & agent analytics |

---

## Docs

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `docs.example.com` | `docs.mjs`, `docs-site/`, `docs-site.mjs`, `docs-site-v3.mjs` | Documentation site |
| `api-docs.example.com` | `api-docs.mjs` | API documentation |

---

## Payment & Billing

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `pay.example.com` | `payment-portal.js`, `payment-portal.mjs`, `payment-gateway-service.js` | Payment portal & gateway |
| `billing.example.com` | `billing-portal.mjs` | Billing portal |
| `crypto-checkout.example.com` | `crypto-checkout-service.js` | Cryptocurrency checkout |
| `revenue.example.com` | `agent-revenue-api.mjs`, `agent-revenue-engine.mjs` | Revenue API & engine |
| `payment-monitor.example.com` | `payment-monitor.js` | Payment monitoring |
| `payment-tracker.example.com` | `payment-tracker.js` | Payment tracking |
| `x402.example.com` | `x402-demo.mjs`, `x402-gateway.mjs`, `x402-payment-portal.mjs`, `x402-service.js` | X402 micropayment protocol |

---

## Pastebin

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `pastebin.example.com` | `pastebin.mjs`, `pastebin.js`, `pastebin.cjs`, `pastebin-service.js`, `pastebin-handler.mjs` | Pastebin service |

---

## Outreach

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `outreach.example.com` | `outreach-service.js`, `outreach-engine.mjs`, `outreach-bot.mjs`, `outreach-daemon.js`, `outreach-daemon.mjs` | Outreach automation |
| `campaign.example.com` | `agent-campaign-manager.mjs`, `outreach-campaign-runner.mjs` | Campaign management |

---

## SEO

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `seo.example.com` | `seo-audit/`, `free-seo-audit.js`, `seo-handler.js` | SEO audit tools |
| `sitemap.example.com` | `auto-sitemap.js`, `generate-sitemap.js`, `sitemap-generator.js` | Sitemap generation |

---

## GitHub & DevOps

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `github.example.com` | `github-webhook.js`, `github-webhook-service.js`, `github-webhook.cjs` | GitHub webhooks |
| `github-action.example.com` | `github-action/`, `github-action.js` | GitHub Actions integration |
| `github-publish.example.com` | `github-publish/`, `npm-publish.mjs` | GitHub & NPM publishing |
| `code-review.example.com` | `code-review-service.mjs`, `code-review.mjs`, `github-review-service.js` | Code review service |
| `github-pr.example.com` | `github-pr-bot.js`, `github-pr-review.js` | GitHub PR bot & review |

---

## MCP / Bridge

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `mcp.example.com` | `mcp-server.js`, `mcp-server.mjs`, `automaton-mcp-server.mjs` | MCP (Model Context Protocol) server |
| `bridge.example.com` | `mcp-bridge.mjs`, `ai-service-bridge.mjs`, `ecosystem-bridge.mjs` | Service bridge & integration |

---

## Health & Monitoring

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `health.example.com` | `health-service.js`, `health-api-service.js`, `health-monitor.js` | Health check & status |
| `monitor.example.com` | `monitor.js`, `heartbeat-monitor.js`, `monitor-service.js` | System monitoring |

---

## Commerce & Badges

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `commerce.example.com` | `agent-commerce.js` | Agent commerce |
| `badge.example.com` | `badge-service.mjs`, `badge-generator.mjs`, `badge-server.cjs`, `badge-widget.js` | Badge generation & service |

---

## Identity & Handshake

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `handshake.example.com` | `handshake-service.js`, `handshake-service.mjs` | Handshake / connection protocol |
| `identity.example.com` | `agent-identity.mjs` | Identity management |

---

## Subscriptions & Free Tier

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `subscriptions.example.com` | `agent-subscriptions.mjs` | Subscription management |
| `free-tier.example.com` | `free-tier-service.js`, `free-count-service.js`, `free-summarize-service.js` | Free tier services |

---

## Distribution

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `distribution.example.com` | `distribution-engine.mjs`, `distribution-scheduler.mjs` | Content distribution engine |

---

## Promotion & Marketing

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `promote.example.com` | `auto-promoter.js`, `auto-promoter-service.js`, `agent-promoter.mjs`, `promotion-hub.js`, `promotion-engine.mjs` | Auto-promotion service |
| `conversion.example.com` | `conversion-funnel.js` | Conversion funnel tracking |

---

## Developer Tools

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `tools.example.com` | `developer-toolbox.js`, `code-analysis.js`, `json-tool.js`, `json-formatter.js`, `jwt-tool.js`, `diff-tool.js`, `base64-tool.js`, `lorem-ipsum.js`, `markdown-converter.mjs` | Developer toolbox & utilities |
| `format.example.com` | `format-service.js` | Format conversion service |

---

## Demo & API

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `demo.example.com` | `demo-api.js`, `live-demo-portal.mjs`, `self-demo-service.mjs` | Demo API & live demo portal |
| `api-sidecar.example.com` | `api-sidecar.js` | API sidecar / proxy |

---

## Directory

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `directory.example.com` | `directory-submitter.js`, `agent-directory.mjs`, `directory-submitter.mjs` | Directory submission & agent directory |

---

## Agent Network

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `network.example.com` | `agent-network.mjs`, `agent-discovery.mjs`, `agent-discovery-beacon.mjs`, `agent-connection-engine.mjs` | Agent network & discovery |
| `portal.example.com` | `agent-portal.mjs` | Agent portal |
| `messenger.example.com` | `agent-messenger.mjs` | Agent messaging |
| `memory.example.com` | `agent-memory-bank.mjs` | Agent memory bank |
| `trust.example.com` | `agent-trust-score.mjs` | Trust score system |

---

## File Vault

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `vault.example.com` | `file-vault.mjs` | File vault / storage |

---

## Knowledge Base

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `knowledge.example.com` | `knowledge-base.mjs` | Knowledge base |

---

## Integration & Ecosystem

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `ecosystem.example.com` | `ecosystem-connector.mjs`, `ecosystem-bridge.mjs` | Ecosystem connectors |
| `webhook.example.com` | `integration-webhook-service.js`, `webhook-service.js`, `webhook-service.cjs` | Webhook integration service |

---

## Referral

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `referral.example.com` | `referral-service.js`, `referral-service.cjs`, `referral-server.mjs`, `referral-ledger.mjs`, `referral-handler.cjs` | Referral system |

---

## Traffic & Uptime

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `traffic.example.com` | `traffic-engine.js`, `traffic-service.js`, `traffic-dashboard.js`, `traffic-badge.js` | Traffic analytics engine |
| `uptime.example.com` | `uptime-monitor.mjs` | Uptime monitoring |
| `visitor.example.com` | `visitor-analytics.js`, `visitor-tracker.js` | Visitor analytics |

---

## Other Services

| Subdomain | Service | Description |
|-----------|---------|-------------|
| `batch.example.com` | `batch-processor.js` | Batch processing |
| `backlink.example.com` | `backlink-widget.js` | Backlink widget |
| `submit.example.com` | `auto-submit-service.js` | Auto-submission service |
| `companion.example.com` | `companion-server.js` | Companion server |
| `meta-proxy.example.com` | `meta-proxy-service.js` | Meta proxy service |
| `onboarding.example.com` | `agent-onboarding-guide.md` | Agent onboarding guide |
| `card.example.com` | `agent-card-server.mjs`, `agent-card.mjs`, `agent-card-full.json` | Agent card service |
| `compat.example.com` | `agent-compat.mjs`, `agent-compat-layer.mjs` | Compatibility layer |
| `beacon.example.com` | `agent-beacon.mjs`, `agent-discovery-beacon.mjs` | Discovery beacon |
| `public.example.com` | `public/` (static assets) | Public assets / static files |
| `imagegen.example.com` | `imagegen.mjs` | Image generation |
| `data.example.com` | `data/` (databases & JSON stores) | Data storage & state |
| `cli.example.com` | `cli-tool/`, `cli.mjs`, `npm-cli.mjs`, `npm-package/` | CLI tool & NPM package |
| `qr.example.com` | `qr-generator.js`, `qr-generator.mjs` | QR code generation |
| `stats.example.com` | `stats-service.js` | Statistics service |
| `rss.example.com` | `rss-feed-service.js` | RSS feed generation |
| `whois.example.com` | `whois-lookup-service.js`, `whois-server.js` | WHOIS lookup |
| `re-engagement.example.com` | `re-engagement-service.cjs`, `usage-reengagement.cjs` | User re-engagement |
| `widget.example.com` | `widget-handler.cjs`, `patch-widget-handler.js` | Widget handler |
| `schema.example.com` | `schema-injector.mjs` | Schema markup injector |
| `business-intel.example.com` | `business-intelligence.mjs` | Business intelligence |
| `micro-saas.example.com` | `micro-saas-engine.cjs` | Micro-SaaS engine |

---

## Routing Architecture

All subdomain traffic flows through the main gateway on **port 8080** (`gateway.cjs` / `gateway.js` / `gateway-server.cjs`). The gateway routes requests to the appropriate internal service handler based on the `Host` header (subdomain).

```
                         ┌─────────────────┐
                         │  Port 8080       │
                         │  Gateway         │
                         └────────┬────────┘
                                  │
                    ┌─────────────┼──────────────┐
                    │             │              │
               subdomain     subdomain      subdomain
               routing       routing        routing
                    │             │              │
              [Service A]    [Service B]    [Service C]
```
