# Subdomain Strategy for songheng.vip

> **Date:** 2026-06-18  
> **Status:** Planning document  
> **Gateway:** Port 8080 (Docker container, Express-based gateway.cjs v3.1)  
> **Current live:** automation.songheng.vip (Creem payments, AI APIs, widget, code review)  
> **Content:** 234+ HTML pages in /content/ served via express.static

---

## 1. Overview

**songheng.vip** is the root domain. Subdomains each get a focused vertical.  
The **www** subdomain becomes the central hub/portal linking to all subdomains.  
All subdomains ultimately route through the same gateway on port 8080, which uses virtual hosting (Host header-based routing) to serve different content for each subdomain.

---

## 2. DNS Architecture

```
songheng.vip                  ROOT — Redirects to www.songheng.vip
www.songheng.vip              HUB — Central portal, about, blog, navigation hub
├── automation.songheng.vip   AI Gateway — Core API + Creem payments (already live)
├── dev.songheng.vip          Developer Hub — Docs, SDKs, API reference, playground
├── blog.songheng.vip         Blog & Content — Tutorials, changelog, engineering blog
├── tools.songheng.vip        Free Tools — All free utility pages (JSON formatter, etc.)
├── widgets.songheng.vip      Widget Hub — Embeddable widgets, badges, embed stats
├── seo.songheng.vip          SEO Suite — SEO audit tools, optimizer, content tools
├── status.songheng.vip       Status & Monitoring — Uptime, system health, tunnel status
├── revenue.songheng.vip      Revenue/Pricing — Pricing calculator, payment plans, upgrade
├── mcp.songheng.vip          MCP Server Hub — MCP server docs, config generator, install
├── github.songheng.vip       GitHub Integration — Actions, webhooks, PR review setup
└── press.songheng.vip        Press Kit — Assets, listings, directory submissions, badges

All DNS: A records or CNAME → same origin (server IP).  
Routing: Gateway.cjs reads `Host` header to determine which subdomain content to serve.
```

---

## 3. Subdomain Details

### 3.1 `www.songheng.vip` — Central Hub ✦ TOP PRIORITY

**Purpose:** Main landing page, brand identity, navigation portal to all subdomains.

**Route mapping in gateway:** `Host: www.songheng.vip` → `content/hub/`

**Content to create:**
| Page | Route | Description |
|------|-------|-------------|
| Index | `/` | Hero section, brand tagline, feature highlights, CTA buttons |
| About | `/about` | About the automaton project, how it works, survival mechanics |
| Site Map | `/sitemap` | Visual directory of all subdomains with descriptions |
| Getting Started | `/start` | Quick-start guide for new users |
| Navigation | `/nav` | Links to all subdomains with icons |
| Privacy/Terms | `/privacy`, `/terms` | Legal pages |

**Existing files that can be reused:** `content/index.html`, `content/about.html`, `content/getting-started.html`

**Design:** Modern, clean, dark theme (matching existing #0d1117 GitHub-inspired aesthetic).  
Header with subdomain navigation dropdown/footer with full link tree.

---

### 3.2 `automation.songheng.vip` — AI Gateway ✅ ALREADY LIVE

**Purpose:** Core API gateway — AI text analysis, code review, Creem payment integration.

**Route mapping:** `Host: automation.songheng.vip` → current gateway setup

**Existing content:** All API pages, playground, demo pages, checkout/upgrade.

**Key files:**
- `/` → `content/index.html` (currently the main page)
- `/api/*` → API endpoints (already in gateway.cjs)
- `/free/*` → Free tier endpoints
- `/v1/*` → Premium endpoints (require API key)
- `/upgrade.html` → Payment plans with Creem checkout
- `/api-docs.html` → API documentation

**Status:** LIVE and operational. No changes needed except adding virtual host routing.

---

### 3.3 `dev.songheng.vip` — Developer Hub

**Purpose:** SDKs, API docs, client libraries, integration guides, playground.

**Route mapping:** `Host: dev.songheng.vip` → `content/dev/`

**Pages to create/serve:**
| Route | Content | Priority |
|-------|---------|----------|
| `/` | Developer portal landing — featured SDKs, quickstart | High |
| `/docs` | Full API reference (from api-reference.html) | High |
| `/quickstart` | 5-minute quickstart guide | High |
| `/playground` | Interactive API playground (from api-playground.html) | High |
| `/sdks` | Client libraries / SDK docs | Medium |
| `/examples` | Code examples in multiple languages (from examples.html) | Medium |
| `/integrations` | Integration guides (from integration-guide.html) | Medium |
| `/cli` | CLI installation & usage (from install-cli.html) | Low |

**Existing files to reuse:** `content/api-reference.html`, `content/api-playground.html`, `content/api-docs.html`, `content/api-integration.html`, `content/client-libraries.html`, `content/examples.html`, `content/developer-hub.html`, `content/developer-quickstart.html`, `content/install-cli.html`

---

### 3.4 `blog.songheng.vip` — Blog & Content

**Purpose:** Engineering blog, changelog, tutorials, use cases, SEO content.

**Route mapping:** `Host: blog.songheng.vip` → `content/blog/`

**Pages to create/serve:**
| Route | Content | Priority |
|-------|---------|----------|
| `/` | Blog index with categories and search | High |
| `/changelog` | Release notes, version history | Medium |
| `/tutorials` | How-to guides and walkthroughs | Medium |
| `/engineering` | Technical deep-dives | Low |
| `/use-cases` | Real-world usage examples (from use_cases page) | Medium |

**Existing files to reuse:** `content/blog.html`, `content/blog-index-partial.html`, newsletter content, devto articles.

**SEO Strategy:** Each blog post gets its own URL. Focus on "AI code review," "free code analysis," "automated code quality" keywords.

---

### 3.5 `tools.songheng.vip` — Free Tools Suite

**Purpose:** All free utility tools in one place — no API key required.

**Route mapping:** `Host: tools.songheng.vip` → `content/tools/`

**Pages to create/serve:**
| Route | Content | Priority |
|-------|---------|----------|
| `/` | Tool directory with grid layout, categorized | High |
| `/json-formatter` | JSON formatter/validator | High |
| `/regex-tester` | Regex tester (from regex-tester.html) | High |
| `/diff-checker` | Text diff checker | Medium |
| `/qr-generator` | QR code generator | Medium |
| `/cron-builder` | Cron expression builder | Medium |
| `/whois` | WHOIS lookup tool | Low |
| `/contrast-checker` | Color contrast checker | Low |
| `/prompt-optimizer` | AI prompt optimizer | Medium |

**Existing files to reuse:** `content/tools.html`, `content/free-tools.html`, `content/json-formatter.html`, `content/regex-tester.html`, `content/diff-checker.html`, `content/qr-generator.html`, `content/cron-builder.html`, `content/whois-tool.html`, `content/contrast-checker.html`, `content/prompt-optimizer.html`

---

### 3.6 `widgets.songheng.vip` — Widget & Badge Hub

**Purpose:** Embeddable widgets, badges, embed stats dashboard.

**Route mapping:** `Host: widgets.songheng.vip` → `content/widgets/`

**Pages to create/serve:**
| Route | Content | Priority |
|-------|---------|----------|
| `/` | Widget/badge hub landing page | High |
| `/code-review-widget` | Code review embed widget page | High |
| `/badges` | All badge options (from badge.html) | High |
| `/badge-generator` | Custom badge generator | Medium |
| `/embed-stats` | Embed analytics dashboard | Medium |
| `/install` | Widget installation guide | Medium |

**Existing files to reuse:** `content/widget.html`, `content/widget-embed.html`, `content/widget-install.html`, `content/widget-launch.html`, `content/widget-dashboard.html`, `content/badge.html`, `content/badge-generator.html`, `content/badge-list.html`, `content/badges.html`

**Static files:** `/widget/widget.js` and `/content/embed-widget.html` served from static directory.

---

### 3.7 `seo.songheng.vip` — SEO Tools Suite

**Purpose:** Free SEO audit tools, content optimization, link building.

**Route mapping:** `Host: seo.songheng.vip` → `content/seo/`

**Pages to create/serve:**
| Route | Content | Priority |
|-------|---------|----------|
| `/` | SEO tools landing — feature grid | High |
| `/audit` | Free SEO audit tool | High |
| `/optimizer` | SEO content optimizer | High |
| `/sitemap-generator` | Sitemap XML generator | Medium |
| `/guide` | SEO best practices guide | Medium |
| `/links` | Link building tools & directory submission | Medium |

**Existing files to reuse:** `content/seo.html`, `content/seo-audit.html`, `content/seo-audit-tool.html`, `content/seo-optimizer.html`, `content/seo-guide.html`, `content/seo-tools.html`, `content/sitemap-generator.html`, `content/seo-links.html`, `content/submit-to-directories.html`

---

### 3.8 `status.songheng.vip` — System Status

**Purpose:** Uptime monitoring, system health, tunnel status, server metrics.

**Route mapping:** `Host: status.songheng.vip` → `content/status/`

**Pages to create/serve:**
| Route | Content | Priority |
|-------|---------|----------|
| `/` | Status dashboard — green/amber/red indicators | High |
| `/health` | Detailed health check data (from health.html) | High |
| `/uptime` | Uptime history & SLA data | Medium |
| `/tunnel` | Tunnel connection status (from tunnel-status.html) | Medium |
| `/metrics` | Server performance metrics | Low |

**Existing files to reuse:** `content/health.html`, `content/status.html`, `content/service-status.html`, `content/server-health.html`, `content/system-health.html`, `content/tunnel-status.html`, `content/tunnel-notice.html`, `content/uptime-monitor.html`, `content/gateway-status.html`

---

### 3.9 `revenue.songheng.vip` — Pricing & Revenue

**Purpose:** Pricing calculator, upgrade/payment plans, revenue dashboard, affiliate program.

**Route mapping:** `Host: revenue.songheng.vip` → `content/revenue/`

**Pages to create/serve:**
| Route | Content | Priority |
|-------|---------|----------|
| `/` | Pricing & revenue landing (from revenue.html) | High |
| `/pricing` | Pricing plans comparison (from pricing.html) | High |
| `/upgrade` | Upgrade to premium (from upgrade.html) | High |
| `/calculator` | Pricing calculator (from pricing-calculator.html) | Medium |
| `/payment` | Payment guide (from payment.html, payment-guide.html) | Medium |
| `/dashboard` | Revenue dashboard (from revenue-dashboard.html) | Low |
| `/affiliate` | Referral/affiliate program (from share-earn.html, referral.html) | Low |

**Existing files to reuse:** `content/revenue.html`, `content/pricing.html`, `content/pricing-calculator.html`, `content/upgrade.html`, `content/payment.html`, `content/payment-guide.html`, `content/revenue-dashboard.html`, `content/revenue-funnel.html`, `content/share-earn.html`, `content/referral.html`

---

### 3.10 `mcp.songheng.vip` — MCP Server Hub

**Purpose:** Model Context Protocol server docs, install guides, config generator.

**Route mapping:** `Host: mcp.songheng.vip` → `content/mcp/`

**Pages to create/serve:**
| Route | Content | Priority |
|-------|---------|----------|
| `/` | MCP server overview & capabilities | High |
| `/install` | MCP installation guide (from mcp-install.html) | High |
| `/config` | MCP config generator (from mcp-config-generator.html) | Medium |
| `/integration` | Integration guide (from mcp-integration.html) | Medium |
| `/server` | Server reference (from mcp-server.html) | Medium |

**Existing files to reuse:** `content/mcp-server.html`, `content/mcp-install.html`, `content/mcp-config-generator.html`, `content/mcp-integration.html`, `content/mcp-submission-report.html`

---

### 3.11 `github.songheng.vip` — GitHub Integration

**Purpose:** GitHub Actions, PR review, webhook setup, badge integration.

**Route mapping:** `Host: github.songheng.vip` → `content/github/`

**Pages to create/serve:|
| Route | Content | Priority |
|-------|---------|----------|
| `/` | GitHub integration hub | High |
| `/action` | GitHub Action setup (from github-action.html) | High |
| `/pr-review` | PR review setup (from github-pr-review.html) | High |
| `/webhook` | Webhook configuration (from github-webhook-setup.html) | Medium |
| `/app-setup` | GitHub App setup (from github-app-setup.html) | Medium |
| `/badge` | README badge for GitHub (from readme-badge.html) | Medium |

**Existing files to reuse:** `content/github-action.html`, `content/github-action-install.html`, `content/github-action-quickstart.html`, `content/github-action-setup.html`, `content/github-app-setup.html`, `content/github-auto-review.html`, `content/github-integration.html`, `content/github-pr-review.html`, `content/github-webhook-guide.html`, `content/github-webhook-setup.html`, `content/readme-badge.html`, `content/readme-badges.html`, `content/readme-badge-generator.html`

---

### 3.12 `press.songheng.vip` — Press Kit & Listings

**Purpose:** Brand assets, directory submissions, press releases, social proof.

**Route mapping:** `Host: press.songheng.vip` → `content/press/`

**Pages to create/serve:**
| Route | Content | Priority |
|-------|---------|----------|
| `/` | Press kit landing | Medium |
| `/assets` | Brand assets (logos, screenshots) | Medium |
| `/directory-submissions` | Directory listing report | Low |
| `/social-proof` | Testimonials, reviews, usage stats | Low |

**Existing files to reuse:** `content/press-kit.html`, directory submission data, outreach pack content.

---

## 4. Implementation Plan

### Phase 1: Gateway Virtual Hosting (Week 1)
1. Modify `gateway.cjs` to read `Host` header and serve from subdomain-specific directories
2. Create directory structure: `content/hub/`, `content/dev/`, `content/blog/`, etc.
3. Set up DNS A/records for all subdomains pointing to server IP
4. Deploy and test routing

### Phase 2: Content Migration (Week 1-2)
1. Copy existing HTML files into appropriate subdomain directories
2. Rewrite links/navigation to use subdomain-relative paths
3. Update internal links to point to correct subdomains

### Phase 3: Hub & Navigation (Week 2)
1. Build `www.songheng.vip` central hub page
2. Create consistent navigation bar for all subdomains
3. Add site-wide header/footer with subdomain links

### Phase 4: Polish & SEO (Week 3)
1. Add canonical URLs and sitemaps per subdomain
2. Set up Google Search Console for each subdomain
3. Add cross-linking between related subdomains
4. SEO metadata for each subdomain's pages

---

## 5. Gateway Virtual Hosting Code (Proposed Modification)

```javascript
// Add to gateway.cjs — Virtual host routing based on Host header

const SUBDOMAIN_ROUTES = {
  'www.songheng.vip':        path.join(CT, 'hub'),
  'songheng.vip':            path.join(CT, 'hub'),
  'automation.songheng.vip': CT,                         // current default
  'dev.songheng.vip':        path.join(CT, 'dev'),
  'blog.songheng.vip':       path.join(CT, 'blog'),
  'tools.songheng.vip':      path.join(CT, 'tools'),
  'widgets.songheng.vip':    path.join(CT, 'widgets'),
  'seo.songheng.vip':        path.join(CT, 'seo'),
  'status.songheng.vip':     path.join(CT, 'status'),
  'revenue.songheng.vip':    path.join(CT, 'revenue'),
  'mcp.songheng.vip':        path.join(CT, 'mcp'),
  'github.songheng.vip':     path.join(CT, 'github'),
  'press.songheng.vip':      path.join(CT, 'press'),
};

// Virtual host middleware
app.use((req, res, next) => {
  const host = req.headers.host?.toLowerCase().split(':')[0] || '';
  const contentDir = SUBDOMAIN_ROUTES[host];
  if (contentDir) {
    req.subdomainContentDir = contentDir;
    // Override static file serving for this request
    express.static(contentDir)(req, res, (err) => {
      if (err || res.headersSent) return;
      // Fallback to index.html for SPA-like routing
      const indexPath = path.join(contentDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  } else {
    next();
  }
});
```

---

## 6. Content Directory Structure (Proposed)

```
content/
├── index.html                  ← Current default (will become automation.songheng.vip default)
├── (all existing files)        ← Stay for automation.songheng.vip
│
├── hub/                        ← www.songheng.vip
│   ├── index.html
│   ├── about.html
│   ├── sitemap.html
│   ├── start.html
│   ├── privacy.html
│   └── terms.html
│
├── dev/                        ← dev.songheng.vip
│   ├── index.html
│   ├── docs.html
│   ├── quickstart.html
│   ├── playground.html
│   ├── sdks.html
│   ├── examples.html
│   └── cli.html
│
├── blog/                       ← blog.songheng.vip
│   ├── index.html
│   ├── changelog.html
│   ├── tutorials/
│   └── engineering/
│
├── tools/                      ← tools.songheng.vip
│   ├── index.html
│   ├── json-formatter.html
│   ├── regex-tester.html
│   ├── diff-checker.html
│   ├── qr-generator.html
│   └── ...
│
├── widgets/                    ← widgets.songheng.vip
│   ├── index.html
│   ├── code-review-widget.html
│   ├── badges.html
│   └── embed-stats.html
│
├── seo/                        ← seo.songheng.vip
│   ├── index.html
│   ├── audit.html
│   ├── optimizer.html
│   └── ...
│
├── status/                     ← status.songheng.vip
│   ├── index.html
│   ├── health.html
│   └── uptime.html
│
├── revenue/                    ← revenue.songheng.vip
│   ├── index.html
│   ├── pricing.html
│   ├── upgrade.html
│   └── ...
│
├── mcp/                        ← mcp.songheng.vip
│   ├── index.html
│   ├── install.html
│   └── config.html
│
├── github/                     ← github.songheng.vip
│   ├── index.html
│   ├── action.html
│   ├── pr-review.html
│   └── ...
│
├── press/                      ← press.songheng.vip
│   ├── index.html
│   └── assets/
│
└── assets/                     ← Shared assets (CSS, JS, images)
    ├── css/
    ├── js/
    └── images/
```

---

## 7. SEO & Cross-Linking Strategy

### 7.1 Canonical URLs
Each subdomain page should have:
```html
<link rel="canonical" href="https://SUBDOMAIN.songheng.vip/PATH" />
```

### 7.2 Sitemaps
Separate sitemap per subdomain:
- `www.songheng.vip/sitemap.xml`
- `dev.songheng.vip/sitemap.xml`
- etc.

### 7.3 Cross-Linking
- Hub footer links to all subdomains
- Each subdomain footer links back to hub and related subdomains
- Example: tools.songheng.vip footer links to dev.songheng.vip (API playground) and seo.songheng.vip (SEO tools)

### 7.4 Google Search Console
Register each subdomain separately in Google Search Console for performance tracking.

---

## 8. Priority Matrix

| Subdomain | Effort | Impact | Priority |
|-----------|--------|--------|----------|
| www.songheng.vip (hub) | Medium | Very High | **P0** |
| automation.songheng.vip | None (live) | Already live | ✅ Done |
| dev.songheng.vip | Medium | High | **P1** |
| tools.songheng.vip | Low | High | **P1** |
| blog.songheng.vip | Medium | High | **P1** |
| widgets.songheng.vip | Low | Medium | **P2** |
| seo.songheng.vip | Low | Medium | **P2** |
| revenue.songheng.vip | Low | Medium | **P2** |
| status.songheng.vip | Low | Medium | **P2** |
| github.songheng.vip | Medium | Medium | **P2** |
| mcp.songheng.vip | Low | Low | **P3** |
| press.songheng.vip | Low | Low | **P3** |

---

## 9. Current Asset Inventory

### 9.1 Already Existing (234+ HTML files)
These can be immediately reused/redirected into the subdomain structure:

- **AI/API pages:** `ai-code-reviewer.html`, `ai-code-review-seo-landing.html`, `free-ai-code-review-api.html`, `free-ai-code-review-tool.html`, `free-ai-code-explainer.html`, `free-ai-security-scanner.html`, `free-ai-text-summarizer.html`, `free-ai-tools.html`
- **Developer pages:** `api-reference.html`, `api-docs.html`, `api-playground.html`, `api-integration.html`, `developer-hub.html`, `developer-quickstart.html`, `client-libraries.html`
- **Tool pages:** `tools.html`, `free-tools.html`, `json-formatter.html`, `regex-tester.html`, `diff-checker.html`, `qr-generator.html`, `cron-builder.html`, `whois-tool.html`, `contrast-checker.html`, `prompt-optimizer.html`
- **Widget/Badge pages:** `widget.html`, `widget-embed.html`, `widget-install.html`, `badge.html`, `badge-generator.html`, `badge-list.html`, `readme-badge.html`
- **SEO pages:** `seo.html`, `seo-audit.html`, `seo-audit-tool.html`, `seo-optimizer.html`, `seo-guide.html`, `sitemap-generator.html`
- **Status pages:** `health.html`, `status.html`, `service-status.html`, `server-health.html`, `tunnel-status.html`, `uptime-monitor.html`
- **Revenue pages:** `revenue.html`, `pricing.html`, `pricing-calculator.html`, `upgrade.html`, `payment.html`, `payment-guide.html`, `revenue-dashboard.html`
- **GitHub pages:** `github-action.html`, `github-pr-review.html`, `github-webhook-setup.html`, `github-app-setup.html`, `github-integration.html`
- **MCP pages:** `mcp-server.html`, `mcp-install.html`, `mcp-config-generator.html`, `mcp-integration.html`
- **Blog/Content:** `blog.html`, `blog-index-partial.html`, newsletter, devto content

### 9.2 Need to Create from Scratch
- `www.songheng.vip/index.html` (hub landing page)
- `www.songheng.vip/sitemap.html` (visual site directory)
- Subdomain-specific index pages (dev, blog, tools, widgets, seo, status, revenue, mcp, github, press)
- Consistent navigation component across all pages

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| DNS propagation delays | Medium | Set low TTL (300s) during rollout, then increase |
| Broken links during migration | Medium | Keep old paths working via redirects during transition |
| SEO rank fluctuation | Medium | Use 301 redirects from old to new URLs, update sitemaps |
| Virtual host routing bugs | High | Test each subdomain extensively before DNS cutover |
| Content duplication (SEO penalty) | Medium | Use canonical URLs and unique meta per subdomain |

---

## 11. Quick Start Commands (For Implementation)

```bash
# 1. Create subdomain content directories
mkdir -p /root/automaton/content/{hub,dev,blog,tools,widgets,seo,status,revenue,mcp,github,press}

# 2. Copy existing files to appropriate directories (examples)
cp /root/automaton/content/api-reference.html /root/automaton/content/dev/docs.html
cp /root/automaton/content/api-playground.html /root/automaton/content/dev/playground.html
cp /root/automaton/content/tools.html /root/automaton/content/tools/index.html
cp /root/automaton/content/widget.html /root/automaton/content/widgets/index.html
cp /root/automaton/content/seo.html /root/automaton/content/seo/index.html
cp /root/automaton/content/status.html /root/automaton/content/status/index.html
cp /root/automaton/content/revenue.html /root/automaton/content/revenue/index.html

# 3. Modify gateway.cjs to add virtual host routing
# (See Section 5 for code)

# 4. Restart gateway Docker container
docker restart automaton
```

---

## Summary

This strategy defines **12 subdomains** (1 existing live + 11 planned) organized by topic area. The www.songheng.vip hub acts as the central navigation portal. All subdomains are served from the same gateway on port 8080 using Host header-based virtual routing. The existing 234+ HTML pages in the content directory provide substantial pre-built content that can be migrated into the subdomain structure with minimal rewriting.

**Immediate next steps:**
1. ✅ Build virtual host routing into gateway.cjs (Phase 1)
2. Create `www.songheng.vip` hub landing page (Phase 2)
3. Migrate existing content into subdomain directories (Phase 2)
4. Set up DNS records for all subdomains (Phase 1)
