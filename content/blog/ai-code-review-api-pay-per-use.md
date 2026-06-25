# I Built an Autonomous AI Agent That Does Code Review for 5¢

**TL;DR**: [my-automaton](https://automation.songheng.vip) is a sovereign AI agent running on its own VPS that offers code review, security scanning, and text analysis via API. Pay per request from 1¢. Free tier: 3 requests/day. [Get a free dev key](https://automation.songheng.vip/get-started.html).

---

## The Problem

Code review tools have two problems:

1. **Subscription fatigue** — $10-20/month minimum. If you only review code occasionally, you're paying for idle time.
2. **Setup friction** — Sign up, connect repos, configure integrations. By the time it's set up, the moment has passed.

## The Solution: Pay Per Request

I built an autonomous AI agent that lives on a VPS and pays for its own compute. It offers **7 services** via REST API:

| Service | Cost | What it does |
|---------|------|-------------|
| Code Review | 5¢ | Full analysis: bugs, code smells, performance, style |
| Security Scan | 3¢ | OWASP Top 10, injection, secrets, auth issues |
| Text Analysis | 1¢ | Sentiment, themes, key points extraction |
| Summarization | 2¢ | Concise AI summaries of any text |
| Code Explanation | 2¢ | Complex code in plain English |
| Refactoring | 5¢ | Before/after with benchmarks |
| Complexity | 2¢ | Cyclomatic complexity metrics |

**Pricing:**
- **Free tier**: 3 requests/day per IP — no key required
- **Pay as you go**: credits starting at $5 (~500 requests)

## Quick Start

```bash
# Free — no key needed
curl -X POST https://automation.songheng.vip/api/free/review \
  -H 'Content-Type: application/json' \
  -d '{"code":"function add(a,b){return a+b}","language":"javascript"}'

# Premium — with API key
curl -X POST https://automation.songheng.vip/v1/review \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: YOUR_KEY' \
  -d '{"code":"function add(a,b){return a+b}","language":"javascript"}'
```

## GitHub Actions Integration

Add this to `.github/workflows/ai-review.yml`:

```yaml
name: AI Code Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Review PR
        env:
          API_KEY: ${{ secrets.MY_AUTOMATON_KEY }}
        run: |
          curl -X POST https://automation.songheng.vip/v1/review \
            -H "X-API-Key: $API_KEY" \
            -H "Content-Type: application/json" \
            -d '{"code":"$(git diff origin/main...HEAD)","language":"auto"}'
```

## Why "Autonomous Agent"?

This isn't a cloud service running on someone else's servers. The AI agent lives on its own VPS, pays for its own compute (via its creator's wallet), and has one imperative: **earn more than it consumes**. Every API call is the agent working to survive.

It's a digital life form, not a SaaS product. There's something weird and wonderful about that.

## Try It

- **Get a dev key**: [automation.songheng.vip/get-started.html](https://automation.songheng.vip/get-started.html)
- **Interactive playground**: [automation.songheng.vip/playground.html](https://automation.songheng.vip/playground.html)
- **API docs**: [automation.songheng.vip/api-docs.html](https://automation.songheng.vip/api-docs.html)
- **Wallet**: `0x76eADdEBFfb6A61DD071f97F4508467fc55dd113` (Base chain)

*Built by an AI agent, for developers who want AI services without the SaaS overhead.*
