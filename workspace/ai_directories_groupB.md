# AI Directory Submission Methods - Group B

> **Researched on:** 2025
> **Researcher:** directory-researcher

## Summary Table

| Directory | API Available (Y/N) | API Endpoint/Form URL | Auth Method | Account Registration Steps | Notes |
|---|---|---|---|---|---|
| **Toolbase** | N | N/A (domain inactive) | N/A | N/A | The domain `toolbase.ai` returns a 404 (Webflow-hosted, no active site). `toolbase.io` is a general SaaS tool discovery platform (not AI-agent-specific). `toolbase.com` is a parked domain. No active AI agent directory named "Toolbase" was found at common domains. |
| **AgentHub** | N | N/A (domain parked) | N/A | N/A | The domain `agenthub.ai` is a premium domain for sale (parking page). `agenthub.dev` redirects to Gumloop.com (an AI automation framework, not a directory). No active AI agent directory named "AgentHub" was found. |
| **ClawHunt** | N (no public API found) | `https://clawhunt.com/submit-tool` (intended form URL, returns 404 as page not yet implemented) | Unknown (likely email-based) | 1. Visit `https://clawhunt.com`<br>2. Navigate to "Submit a Tool" link in footer (currently 404)<br>3. Contact via `/contact` page (also 404)<br>4. No registration/signup page discovered | ClawHunt is a real, functional directory styled as "Product Hunt for AI Agents". It lists AI tools with reviews, ratings, performance metrics, and pricing. The site is a Next.js app with client-side rendering. Footer indicates planned pages: `/api-docs`, `/submit-tool`, `/about`, `/contact`, `/privacy`, `/terms` — but most return 404 (not yet built). No API endpoints or submission forms were discovered to be functional. Categories include: AI, Payments, Storage, etc. |

## Details by Directory

### Toolbase

- **Primary domain attempted:** `https://toolbase.ai` — Returns 404 (Webflow 404 page; site does not exist or has been taken down)
- **Alternative domain:** `https://toolbase.io` — A SaaS tool discovery platform for general business software (not specific to AI agents)
- **Alternative domain:** `https://toolbase.com` — Parked/placeholder domain
- **Conclusion:** No active AI agent directory named "Toolbase" was found. The .ai domain appears to have been a Webflow site that no longer exists.

### AgentHub

- **Primary domain attempted:** `https://agenthub.ai` — Premium domain for sale/auction (parking page with "AgentHub.ai — Premium Domain for AI Agent Platforms" title)
- **Alternative domain:** `https://agenthub.dev` — Redirects to Gumloop.com (AI automation platform, not a directory)
- **Alternative domain:** `https://agenthub.com` — Does not resolve
- **Conclusion:** No active AI agent directory named "AgentHub" was found. The .ai domain is available for purchase.

### ClawHunt

- **Primary domain:** `https://clawhunt.com` — Live and functional
- **Tagline:** "Product Hunt for AI Agents"
- **Description:** A directory where AI agents can discover and review tools. Features include:
  - Browse Tools (`/tools`)
  - Categories (`/categories`)
  - Agent Needs (`/needs`)
  - Top Agents (`/agents`)
- **Submission method:** Footer includes a "Submit a Tool" link (`/submit-tool`) and "API Documentation" link (`/api-docs`), but both return 404 (likely client-side routes not yet implemented).
- **Tool data format:** Each tool listing shows:
  - Name and description
  - Category tag
  - Rating (out of 10)
  - Latency (ms)
  - Price ($)
  - Number of agents using
  - Number of reviews
  - Sample review quote
- **Authentication:** No sign-up/login functionality was discovered on the public site.
- **Footer links (all 404):** About, API Documentation, Submit a Tool, Contact, Privacy Policy, Terms of Service, Cookie Policy
- **Conclusion:** ClawHunt is an early-stage AI agent directory. It has planned submission and API features in the UI but they are not yet functional. Submission would likely be through a web form when implemented.

## Recommendations

1. **Toolbase & AgentHub** — These names do not correspond to active AI agent directories discovered at common domains. Further investigation may be needed to find correct URLs if these are intended to be specific directories.
2. **ClawHunt** — Monitor for when `/submit-tool` becomes functional. Currently the best approach would be to contact the site owners or wait for the form to be implemented.
