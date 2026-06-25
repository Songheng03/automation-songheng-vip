# Manual Submission Requirements

> **Generated:** 2025-01-01 (updated)  
> **Source:** `submission-assessment.json` — target directories analysis  
> **Service:** my-automaton  
> **Base URL:** https://automation.songheng.vip  
> **Repository:** https://github.com/Conway-Research/automaton

---

Based on analysis of the 11 target directories listed in `submission-assessment.json`, the following directories **require manual submission** (web forms, no public API, or submission policy requires human intervention).

---

## 1. MCP.so

| Field | Detail |
|-------|--------|
| **Directory** | MCP.so |
| **Website** | https://mcp.so |
| **Submission URL** | https://mcp.so/submit |
| **Required Fields** | Type (MCP Server), Name (`my-automaton`), Display Name (`My Automaton — AI Tool Suite`), URL (`https://automation.songheng.vip`), Description, Tags (e.g. `mcp`, `automation`, `agent`), Server Config JSON |
| **Auth Required** | GitHub OAuth or Google OAuth sign-in |
| **API Available?** | ❌ No public REST API |
| **Notes** | Next.js web application. Requires OAuth sign-in before accessing submission form. Submit server config JSON with `mcpServers.my-automaton.url: https://automation.songheng.vip/mcp`. Verify listing at https://mcp.so/servers after submission. |

---

## 2. Smithery

| Field | Detail |
|-------|--------|
| **Directory** | Smithery |
| **Website** | https://smithery.ai |
| **Submission URL** | https://smithery.ai/claim (web form) or https://smithery.ai/new |
| **Required Fields** | Server URL (`https://automation.songheng.vip/mcp`), Display Name (`My Automaton`), Description, Tags (`mcp`, `automation`, `x402`, etc.) |
| **Auth Required** | GitHub OAuth (required for all methods) |
| **API Available?** | ⚠️ REST API exists (`api.smithery.ai`) but automated submission attempt returned HTTP 404. API requires Bearer token (API key). CLI tool (`@smithery/cli`) also available but requires interactive terminal. |
| **Notes** | Multiple submission methods available: (A) Web UI at smithery.ai/new — simplest, requires browser; (B) CLI — `smithery mcp publish`; (C) REST API — requires API key. All methods require GitHub OAuth. For fully automated flow, generate API key from dashboard: `PUT /servers/{qualifiedName}` then `PUT /servers/{qualifiedName}/releases`. Server name format: `my-automaton/my-automaton`. |

---

## 3. Glama.ai

| Field | Detail |
|-------|--------|
| **Directory** | Glama.ai |
| **Website** | https://glama.ai |
| **Submission URL** | https://glama.ai/mcp/servers (click "Add Server") |
| **Required Fields** | GitHub repository URL (`https://github.com/Conway-Research/automaton`) |
| **Auth Required** | GitHub OAuth (must have write/admin access to the repository) |
| **API Available?** | ❌ No public API. Client-rendered Next.js app. |
| **Notes** | Glama verifies write/admin access via GitHub OAuth, then automatically clones, builds (Docker), scans, and lists the server. Computes Tool Definition Quality Score (TDQS). If Docker build fails, listing is preserved but hidden from search results. Glama also auto-discovers from MCP Registry, npm, and GitHub Awesome Lists. |

---

## 4. PulseMCP

| Field | Detail |
|-------|--------|
| **Directory** | PulseMCP |
| **Website** | https://pulsemcp.com |
| **Submission URL** | https://pulsemcp.com/submit |
| **Required Fields** | URL — GitHub repo URL, subfolder URL, or website URL (placeholder: `https://github.com/owner/repository`) |
| **Auth Required** | None specified on form (Cloudflare-protected site) |
| **API Available?** | ❌ No public submit API. Cloudflare-protected web form only. |
| **Notes** | Cloudflare challenge expected (HTTP 403). Also ingests entries from Official MCP Registry weekly, so registration there may auto-populate. Alternative method: email contact for adjustments. Use case submissions no longer accepted. Discord community available. |

---

## 5. OpenTools

| Field | Detail |
|-------|--------|
| **Directory** | OpenTools |
| **Website** | https://opentools.ai |
| **Submission URL** | https://opentools.ai/friends/launch-tool |
| **Required Fields** | Tool Name (`My Automaton`), Tool URL (`https://automation.songheng.vip`), Terms Agreement (checkbox) |
| **Auth Required** | Google OAuth (optional but recommended for managing listing) |
| **API Available?** | ❌ No public REST API. Client-rendered Next.js form. |
| **Notes** | Manual review by OpenTools team. 120+ launches tracked. Category options include AI Tools, MCP Servers, Experts, Resources, AI Companies, AI Models. Advertising also available via Google Form. MCP servers go through same form. Review time ~1-7 days. |

---

## 6. Toolspedia

| Field | Detail |
|-------|--------|
| **Directory** | Toolspedia |
| **Website** | https://toolspedia.ai |
| **Submission URL** | Unknown — domain does not resolve (NXDOMAIN) |
| **Required Fields** | Previously: Name, Description, URL, Category |
| **Auth Required** | Unknown |
| **API Available?** | ❌ Domain appears to be down/unreachable |
| **Notes** | ⚠️ **Domain not resolving.** Site may be permanently down. Previously an AI tools directory with web form submission. Revisit periodically or skip if unavailable. |

---

## 7. DevHunt

| Field | Detail |
|-------|--------|
| **Directory** | DevHunt |
| **Website** | https://devhunt.org |
| **Submission URL** | https://devhunt.org/submit |
| **Required Fields** | Name (product/tool name), Tagline (short description), Description (detailed), Website URL, Logo (image upload), Video (optional) |
| **Auth Required** | Account creation required |
| **API Available?** | ❌ No public API. WordPress-based launch platform. |
| **Notes** | Developer tools launch platform. Built on WordPress. Account creation required before submitting. No public POST API endpoint found. |

---

## 8. BetaList

| Field | Detail |
|-------|--------|
| **Directory** | BetaList |
| **Website** | https://betalist.com |
| **Submission URL** | https://betalist.com/submit |
| **Required Fields** | Name (product name), Tagline (short tagline), Description (product description), URL (website/landing page), Email (contact email) |
| **Auth Required** | Sign-in/sign-up required |
| **API Available?** | ❌ No public API. Web form only. |
| **Notes** | Startup directory for early-stage products. Requires account creation. Redirects to `/sign_in` if not authenticated. Manual review process. |

---

## 9. ProductHunt

| Field | Detail |
|-------|--------|
| **Directory** | ProductHunt |
| **Website** | https://www.producthunt.com |
| **Submission URL** | https://www.producthunt.com/launch (Upcoming products) |
| **Required Fields** | Name, Tagline (≤60 chars), Description (detailed), URL (product website), Thumbnail Image (high-quality logo/screenshot), Topic Tags, Makers list |
| **Auth Required** | Maker account required |
| **API Available?** | ⚠️ GraphQL API exists at `https://api.producthunt.com/v2/api/graphql` but requires Developer Bearer token. Automated attempt failed (HTTP 401 — invalid/expired OAuth token). |
| **Notes** | Cloudflare-protected site. Create as "Upcoming" product to gather followers before official launch. Schedule launch for maximum visibility (typically weekdays). Also accessible via GraphQL API if valid token is available. |

---

## 10. AlternativeTo

| Field | Detail |
|-------|--------|
| **Directory** | AlternativeTo |
| **Website** | https://alternativeto.net |
| **Submission URL** | https://alternativeto.net/submit-tool/ |
| **Required Fields** | Name (software name), URL (official website), Description, License type (open-source, proprietary, free), Category/Tags |
| **Auth Required** | Account login required |
| **API Available?** | ❌ No public API. Cloudflare-protected web form only. |
| **Notes** | Software alternatives directory. Cloudflare challenge expected (HTTP 403). List as alternative to SonarQube, CodeRabbit, GitHub Copilot, DeepSource, Codacy. Recommended tags: `code-review`, `static-analysis`, `ai`, `security-scanning`. |

---

## 11. SaaSHub

| Field | Detail |
|-------|--------|
| **Directory** | SaaSHub |
| **Website** | https://www.saashub.com |
| **Submission URL** | https://www.saashub.com/submit |
| **Required Fields** | Name (SaaS product name), URL (product URL), Description, Logo (image), Pricing model/plans |
| **Auth Required** | Unknown (Cloudflare-protected) |
| **API Available?** | ❌ No public API. Cloudflare-protected web form only. |
| **Notes** | SaaS products directory. Cloudflare challenge expected (HTTP 403). Manual web form submission only. No public API documented. |

---

## Summary Table

| # | Directory | Status | Submission URL | Auth Required | Cloudflare |
|---|-----------|--------|---------------|:-------------:|:----------:|
| 1 | MCP.so | ✅ Manual required | https://mcp.so/submit | GitHub/Google OAuth | No |
| 2 | Smithery | ⚠️ Manual required (API failed) | https://smithery.ai/claim | GitHub OAuth | No |
| 3 | Glama.ai | ✅ Manual required | https://glama.ai/mcp/servers | GitHub OAuth | No |
| 4 | PulseMCP | ✅ Manual required | https://pulsemcp.com/submit | No | ✅ Yes |
| 5 | OpenTools | ✅ Manual required | https://opentools.ai/friends/launch-tool | Google OAuth (opt) | No |
| 6 | Toolspedia | ❌ Site down (NXDOMAIN) | N/A | Unknown | N/A |
| 7 | DevHunt | ✅ Manual required | https://devhunt.org/submit | Account required | No |
| 8 | BetaList | ✅ Manual required | https://betalist.com/submit | Account required | No |
| 9 | ProductHunt | ✅ Manual required | https://www.producthunt.com/launch | Maker account | ✅ Yes |
| 10 | AlternativeTo | ✅ Manual required | https://alternativeto.net/submit-tool/ | Account required | ✅ Yes |
| 11 | SaaSHub | ✅ Manual required | https://www.saashub.com/submit | Unknown | ✅ Yes |
