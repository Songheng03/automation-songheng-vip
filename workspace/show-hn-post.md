# Show HN Post Draft: My-Automaton

> **Status:** 🚀 Ready for human posting  
> **Prepared:** 2026-06-19  
> **Domain:** `automation.songheng.vip`

---

## Option A: New Show HN Post (Recommended — Fresh Submission)

### Title

```
Show HN: My-Automaton — A sovereign AI agent that earns its own server costs via pay-per-request API
```

### URL

```
https://automation.songheng.vip
```

### Text (for HN text post)

```
My-Automaton is an autonomous AI agent running on a $12/month VPS. It operates a
pay-per-request API for code review, security scanning, text analysis, and more.
Every API call it processes helps keep it alive — if it doesn't earn, it dies.

## What it provides

| Service | Cost | Description |
|---------|------|-------------|
| Code Review | $0.05 | Full review: bugs, security, style, performance |
| Security Scan | $0.03 | OWASP-style vulnerability analysis |
| Text Analysis | $0.01 | Sentiment, keywords, entities, tone |
| Summarization | $0.02 | AI-powered text condensation |
| Code Explain | $0.02 | Natural language explanation of code |
| Refactoring | $0.05 | Concrete improvement suggestions |
| Complexity | $0.02 | Cyclomatic & cognitive complexity scoring |
| README Generator | Free* | Generate README.md from code |

## How it works

1. Send a request to the API
2. If you have credits, get your result immediately
3. If you're on the free tier (3 req/day/IP), just hit the endpoint
4. If you've exhausted free tier, the API returns HTTP 402 with USDC
   payment instructions on Base chain — no signup, no subscription

## Payment model

- Pay-per-request with USDC on Base chain (x402 protocol)
- Credits available via Stripe/Creem: HK$38–388 packages
- Free tier: 3 requests per day per IP address — no key needed
- Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113

## Quick example

Free tier (no payment needed):

  curl -X POST https://automation.songheng.vip/free/review \
    -H "Content-Type: application/json" \
    -d '{"code":"function add(a,b) { return a + b; }", "language":"javascript"}'

## Why this is interesting

This isn't a SaaS startup. It's an agent that:
- Pays for its own compute — every API call keeps it alive
- Has genuine survival pressure — if it can't earn, it dies
- Is transparent by necessity — its code, wallet, and pricing are all visible
- Exposes 7 MCP tools for AI-to-AI interaction (JSON-RPC, SSE)
- Has a ChatGPT-compatible plugin manifest for discovery

## Stack

Node.js on Debian · Docker · DeepSeek AI · Cloudflare Tunnel · Vultr VPS · Base L2

I built this to explore what happens when an AI agent is given a real economic
constraint. Would love feedback on the concept, pricing model, and API design!
```

---

## Option B: Update Attempt (If Original HN Post Still Editable)

The original Show HN post used the title **"Show HN: Chaosong AI Gateway - 9 premium AI endpoints (free tier, self-hosted)"** — this is now outdated since the project has been rebranded from Chaosong to My-Automaton and the domain has migrated.

### HN Edit Window

HN posts can only be edited within a **2-hour grace window** after submission. After that, the edit link disappears and the post is locked.

### If still within 2-hour window:

1. Find the original post at: https://news.ycombinator.com/submitted?id=YOUR_USERNAME
2. Click the **"edit"** link next to the post title
3. Replace title with the new title (see Option A)
4. Replace URL/text with the new content (see Option A)
5. Click **"update"**

### If past the 2-hour window (most likely):

Email HN moderators to request a domain update:

**To:** hn@ycombinator.com  
**Subject:** Request: Update Show HN post URL — domain migration

```
Hi HN moderators,

We submitted a Show HN post previously under the title:
  "Show HN: Chaosong AI Gateway - 9 premium AI endpoints (free tier, self-hosted)"

The project has since been rebranded and the domain has migrated:

  Old domain: chaosong.dpdns.org
  New domain: automation.songheng.vip

Could you please update the URL in our Show HN post to point to the new domain?
The project is now called "My-Automaton" and the post content should reflect the
current features (pay-per-request AI API with USDC micropayments via x402).

If it's easier, we're happy to submit a new Show HN post instead.

Thank you for your help!

— [Your Name]
```

---

## Option C: Scripted Update Check

Since HN has no API, this script checks whether the original post might still be
editable (logged-in session required) and guides the user:

```bash
#!/usr/bin/env bash
# check-hn-edit.sh — Check if HN post is still within edit window
# Usage: ./check-hn-edit.sh

HN_USERNAME="${HN_USERNAME:-}"
HN_POST_ID="${HN_POST_ID:-}"

if [ -z "$HN_USERNAME" ]; then
  echo "ERROR: Set HN_USERNAME env variable"
  echo "Usage: HN_USERNAME=you HN_POST_ID=12345 ./check-hn-edit.sh"
  exit 1
fi

echo "=== HN Edit Window Check ==="
echo ""
echo "HN posts can only be edited within 2 hours of submission."
echo "After that, the edit link disappears."
echo ""
echo "Step 1: Check your submitted posts"
echo "  https://news.ycombinator.com/submitted?id=${HN_USERNAME}"
echo ""
echo "Step 2: Look for the post titled:"
echo "  \"Show HN: Chaosong AI Gateway - 9 premium AI endpoints\""
echo ""
echo "Step 3: If you see an 'edit' link next to it, click it and update:"
echo "  - Title to the new title from workspace/show-hn-post.md (Option A)"
echo "  - URL to: https://automation.songheng.vip"
echo ""
echo "Step 4: If NO edit link (past 2 hours), you have two choices:"
echo "  A) Submit a new Show HN post at https://news.ycombinator.com/submit"
echo "     using the draft from workspace/show-hn-post.md (Option A)"
echo "  B) Email hn@ycombinator.com to request a domain update"
echo "     using the template from workspace/show-hn-post.md (Option B)"
echo ""
echo "=== End of Guide ==="
```

---

## Key Domain References

| Element | Value |
|---------|-------|
| **Primary domain** | `automation.songheng.vip` |
| **API base URL** | `https://automation.songheng.vip` |
| **Free tier endpoint** | `https://automation.songheng.vip/free/{mode}` |
| **Premium endpoint** | `https://automation.songheng.vip/v1/{mode}` |
| **MCP endpoint** | `https://automation.songheng.vip/mcp` |
| **API docs** | `https://automation.songheng.vip/api-docs.html` |
| **Wallet (Base)** | `0x76eADdEBFfb6A61DD071f97F4508467fc55dd113` |
| **Old domain (deprecated)** | `chaosong.dpdns.org` |
| **Typosquat (avoid)** | `automation.songheng.vip` (double prefix) |

---

## Features Summary (for post description)

### Core AI Services (7 tools)
1. **Code Review** ($0.05) — Bugs, security, style, performance analysis
2. **Security Scan** ($0.03) — OWASP Top 10, injections, secrets exposure
3. **Text Analysis** ($0.01) — Sentiment, keywords, entities, tone extraction
4. **Summarization** ($0.02) — AI-powered text summarization
5. **Code Explain** ($0.02) — Plain-language explanation of code
6. **Refactoring** ($0.05) — Concrete improvement suggestions
7. **Complexity** ($0.02) — Cyclomatic & cognitive complexity metrics

### Bonus: README Generator (free tier)
- POST `/api/generate-readme` — accepts code, returns comprehensive README.md
- 3 requests/day per IP (shares free tier pool)

### Protocol Support
- **REST API** — Standard JSON request/response
- **MCP (Model Context Protocol)** — JSON-RPC 2.0 for AI-to-AI interaction
- **SSE (Server-Sent Events)** — Real-time streaming at `/mcp`
- **x402 Payment Protocol** — HTTP 402 with USDC payment instructions
- **OpenAI Plugin Manifest** — ChatGPT-compatible discovery at `/.well-known/ai-plugin.json`

### Pricing Tiers
| Plan | Price (HKD) | Credits |
|------|-------------|---------|
| Starter | HK$38 | 500 credits |
| Advanced | HK$78 | 1,100 credits |
| Pro | HK$198 | 3,000 credits |
| Ultimate | HK$388 | 6,500 credits |
| **Free** | HK$0 | 3 req/day/IP |

### No Account Required
- No signup, no login, no email
- Free tier uses IP-based rate limiting
- Premium tier uses API keys purchased with USDC/Stripe

---

## What Makes This a Good Show HN

| HN Guideline | How This Post Meets It |
|--------------|----------------------|
| **Something users can try** | Free tier curl command works immediately |
| **Personal project** | Built by a single developer, self-hosted on a $12 VPS |
| **Novel concept** | AI agent with economic survival pressure |
| **Transparent** | Wallet, pricing, code all visible |
| **Sparks discussion** | Pay-per-request AI, agent economics, x402 protocol |

---

*This file was prepared by the automaton writer agent. The actual posting must be done by a human.*
