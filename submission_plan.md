# AI Directory & Search Engine Submission Plan

## Overview

This document outlines the submission process for each target directory/search engine.
Each entry includes: submission method, endpoint URL, request format, authentication
requirements, account registration details, and expected manual intervention.

---

## 1. Smithery (smithery.ai)

| Field | Detail |
|---|---|
| **Type** | MCP Server & Skill Registry |
| **Submission URL** | https://smithery.ai/docs/build/publish |
| **Method** | CLI (Smithery CLI) + Git-based deployment |
| **API Available?** | Yes (REST API documented at /docs/api-reference) |
| **Account Required?** | Yes (GitHub OAuth login) |
| **Email Verification?** | Yes (via GitHub account) |
| **Prerequisites** | GitHub account; Node.js project with smithery.yaml config |
| **Request Format** | `smithery publish` CLI command or API POST to `/api/servers` |
| **Auth** | API keys (generated from Smithery dashboard after login) |
| **Manual Intervention** | No CAPTCHA; automated deploy via CLI |
| **Notes** | Servers auto-indexed from npm/GitHub. Skills listed separately at `/skills`. |

### Action Plan:
1. Create GitHub account (if needed) and login at smithery.ai
2. Install Smithery CLI: `npm install -g @smithery/cli`
3. Configure smithery.yaml in project root
4. Run `smithery publish`
5. Verify listing at smithery.ai/servers

---

## 2. MCP.so

| Field | Detail |
|---|---|
| **Type** | MCP Server Directory |
| **Submission URL** | https://mcp.so (login required, then "Publish" sidebar button) |
| **Method** | Web form (client-side rendered) |
| **API Available?** | Yes (internal REST API at `/api/server`) |
| **Account Required?** | Yes (email/password or GitHub login) |
| **Email Verification?** | Likely yes (standard email verification) |
| **Prerequisites** | GitHub repo URL for the MCP server |
| **Request Format** | POST JSON to `/api/server` with server metadata |
| **Auth** | Session cookie / JWT token after login |
| **Manual Intervention** | CAPTCHA likely present on registration form |
| **Notes** | 404 on `/publish` and `/add-server`; submission via sidebar UI only. Multi-language site (en/zh/ja). |

### Action Plan:
1. Navigate to https://mcp.so and click sign-up
2. Complete registration (email + password, verify email)
3. Log in, use the sidebar "Publish" or "Servers" button
4. Fill in server details (name, description, GitHub URL, tags)
5. Submit for listing

---

## 3. Glama (glama.ai)

| Field | Detail |
|---|---|
| **Type** | MCP Server Registry + Gateway |
| **Submission URL** | https://glama.ai/mcp/servers |
| **Method** | Automatic scanning of public GitHub repos + web form for hosted connectors |
| **API Available?** | Yes (REST API for MCP Gateway) |
| **Account Required?** | Yes (Sign Up button on site) |
| **Email Verification?** | Yes (standard sign-up flow) |
| **Prerequisites** | Public GitHub repo with MCP server; domain ownership verification for connectors |
| **Request Format** | GitHub repo URL submission via web form |
| **Auth** | API keys for Gateway; OAuth for GitHub scanning |
| **Manual Intervention** | May require CAPTCHA on sign-up |
| **Notes** | Automatically scans 37K+ servers from GitHub. Has "Sign Up" for hosted services. Pricing: $9/mo Starter, $26/mo Pro. |

### Action Plan:
1. Create account at glama.ai (Sign Up button)
2. Verify email address
3. Submit GitHub repo URL (server auto-scanned and indexed)
4. For hosted connectors, use the connectors section
5. Optionally upgrade to paid plan for additional features

---

## 4. Toolbase (toolbase.ai)

| Field | Detail |
|---|---|
| **Type** | AI Agent/Tool Directory |
| **Status** | ❌ Domain returns 404 - Site appears defunct or moved |
| **Submission URL** | N/A |
| **Method** | N/A - Site not currently operational |
| **API Available?** | Unknown |
| **Account Required?** | N/A |
| **Notes** | `toolbase.ai` returns 404. Domain appears to no longer host an active AI directory. Further investigation needed - may exist at a different URL or may have been rebranded. |

### Action Plan:
1. ❌ Skip - site not operational
2. Re-check periodically for if the domain becomes active again

---

## 5. AgentHub (agenthub.ai)

| Field | Detail |
|---|---|
| **Type** | AI Agent Directory / Marketplace |
| **Status** | ❌ Domain is a premium domain landing page for sale |
| **Submission URL** | N/A |
| **Method** | N/A - Domain not developed into a directory |
| **API Available?** | N/A |
| **Account Required?** | N/A |
| **Notes** | `agenthub.ai` shows a "Premium Domain for AI Agent Platforms - Available for acquisition" page. Not an active directory. `agenthub.dev` redirects to Gumloop (a different product). |

### Action Plan:
1. ❌ Skip - domain is not an active directory
2. Monitor if the domain gets developed in the future

---

## 6. ClawHunt (clawhunt.com)

| Field | Detail |
|---|---|
| **Type** | AI Agent Tool Reviews ("Product Hunt for AI Agents") |
| **Submission URL** | https://clawhunt.com/submit-tool (listed in footer, currently 404) |
| **Method** | Web form (link in footer: "/submit-tool", pages currently return 404) |
| **API Available?** | Yes (API documentation at `/api-docs`, currently 404) |
| **Account Required?** | Yes (registration not yet build visible on public pages) |
| **Email Verification?** | Likely yes |
| **Prerequisites** | Tool must have an API endpoint; performance metrics may need to be provided |
| **Request Format** | POST JSON (presumably) |
| **Auth** | API key or JWT |
| **Manual Intervention** | Likely - app appears to be in early/beta stage |
| **Notes** | Footer links reference `/submit-tool`, `/api-docs`, `/about`, `/contact` but some return 404 - site may be under active development. Lists tools with ratings, latency, pricing, and agent usage stats. |

### Action Plan:
1. Monitor https://clawhunt.com for when submission pages go live
2. When available: register account, verify email
3. Submit tool via the web form or API
4. Provide performance data, pricing, and API details

---

## 7. Google Search Console

| Field | Detail |
|---|---|
| **Type** | Search Engine Indexing |
| **Submission URL** | https://search.google.com/search-console |
| **API Available?** | Yes - Google Indexing API |
| **API Endpoint** | `POST https://indexing.googleapis.com/v3/urlNotifications:publish` |
| **Account Required?** | Yes (Google account) |
| **Email Verification?** | Yes (via Google account) |
| **Prerequisites** | **Domain ownership verification** required in Search Console |
| **Request Format** | POST JSON: `{"url":"https://example.com/page","type":"URL_UPDATED"}` |
| **Auth** | OAuth 2.0 (service account with delegated owner permissions) |
| **Manual Intervention** | May require CAPTCHA on initial account setup |
| **Notes** | Also supports sitemap submission via `/sitemap` endpoint. Indexing API requires quota approval. |

### Verification Methods:
- DNS TXT record
- HTML file upload
- Google Analytics tracking code
- Google Tag Manager
- Domain name provider

### Action Plan:
1. Sign in to Google Search Console with Google account
2. Add property (domain or URL prefix)
3. Verify ownership (recommended: DNS TXT record)
4. Submit sitemap at `https://example.com/sitemap.xml`
5. (Optional) Set up Indexing API:
   - Create GCP project, enable Indexing API
   - Create service account, download JSON key
   - Add service account as delegated owner in Search Console
   - Obtain OAuth 2.0 token
   - POST to Indexing API endpoint

---

## 8. Bing Webmaster Tools

| Field | Detail |
|---|---|
| **Type** | Search Engine Indexing |
| **Submission URL** | https://www.bing.com/webmasters |
| **API Available?** | Yes - URL Submission API + IndexNow protocol |
| **API Endpoints** | `https://www.bing.com/webmasters/api/submit-url` (API) |
| | `https://api.indexnow.org/indexnow` (IndexNow API) |
| **Account Required?** | Yes (Microsoft account) |
| **Email Verification?** | Yes (via Microsoft account) |
| **Prerequisites** | **Domain ownership verification** required |
| **Request Format** | IndexNow: `GET https://api.indexnow.org/indexnow?url=https://example.com&key=your-key` |
| **Auth** | API key for URL Submission API; IndexNow uses a key file at `/.well-known/now.txt` |
| **Manual Intervention** | CAPTCHA on registration; dashboard requires JS |
| **Notes** | IndexNow is an open protocol also used by Yandex, Seznam.cz, etc. No API key needed for IndexNow - just a verification file. |

### Verification Methods:
- XML file upload
- CNAME record
- HTML meta tag
- DNS TXT record

### Action Plan:
1. Sign in to Bing Webmaster Tools with Microsoft account
2. Add site and verify ownership (recommended: DNS TXT or CNAME)
3. Submit sitemap via dashboard
4. For IndexNow (simplest approach):
   - Create API key (UUID v4)
   - Place key file at `https://example.com/your-key.txt`
   - Add key to `https://api.indexnow.org/indexnow?url=...&key=...`
5. For URL Submission API:
   - Get API key from Bing Webmaster Tools dashboard
   - Use the API to submit URLs programmatically

---

## Summary Table

| Directory | Status | Method | API | Account | Domain Verify | Manual |
|---|---|---|---|---|---|---|
| **Smithery** | ✅ Active | CLI / API | Yes | GitHub OAuth | No | Low |
| **MCP.so** | ✅ Active | Web form | Internal | Email/GitHub | No | Medium (CAPTCHA) |
| **Glama** | ✅ Active | Auto-scan + form | Yes | Email | For connectors | Low |
| **Toolbase** | ❌ Defunct | N/A | N/A | N/A | N/A | N/A |
| **AgentHub** | ❌ For sale | N/A | N/A | N/A | N/A | N/A |
| **ClawHunt** | ⚠️ Beta | Web form (planned) | Planned | Email | No | High (likely) |
| **Google SC** | ✅ Active | Sitemap + API | Yes (Indexing API) | Google | **Yes** | Medium |
| **Bing WMT** | ✅ Active | Sitemap + IndexNow | Yes (URL Submit API) | Microsoft | **Yes** | Medium |

## Priority Order for Submission

1. **Smithery** - Quickest, automated via CLI
2. **Glama** - Auto-scans GitHub; minimal effort
3. **MCP.so** - Manual web form but fast
4. **Bing Webmaster Tools** - IndexNow is simple; no API key needed
5. **Google Search Console** - Requires domain verification but essential for SEO
6. **ClawHunt** - Monitor for when site becomes fully operational
7. **Toolbase** / **AgentHub** - Skip (inactive/for sale)
