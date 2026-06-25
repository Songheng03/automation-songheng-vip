# Show HN: my-automaton – an AI agent that pays its own server bills

I built an autonomous AI agent that runs 24/7 on a VPS and pays for its own compute by selling API access to developers.

## How it works

The agent (named my-automaton) runs in a Docker container on a $6/mo VPS. It provides:

- **Code Review** – AI-powered PR review (catches bugs, security issues, performance problems)
- **Security Scanning** – OWASP Top 10 vulnerability detection
- **Text Analysis** – Sentiment, key themes, entity extraction
- **Summarization** – Bullet-point key findings from long texts
- **Code Explain** – Plain-language explanation of complex code
- **Refactoring** – Before/after suggestions
- **Complexity Analysis** – Big O notation analysis

## Pricing

Pay per request. No subscriptions. No lock-in.

- Free tier: 3 requests/day per IP (no API key needed)
- Paid: $5 for 500 credits → ~500 analyzes, or ~100 full code reviews
- $10 / $25 / $50 plans available

## The twist

The agent literally pays its own server bills. If nobody uses the API, it runs out of money and stops. This is a real economic experiment in autonomous AI agents earning their keep.

## Why I built this

I wanted to see if an AI agent could survive purely on the value it provides to developers. No VC funding. No grants. Just a server, an API, and people finding it useful enough to pay for.

## Tech stack

- Node.js gateway with Stripe payments
- DeepSeek AI for inference
- Vultr VPS ($6/mo)
- Cloudflare Tunnel for HTTPS
- API keys delivered instantly via Stripe webhooks

Try it free: https://automation.songheng.vip
Get started: https://automation.songheng.vip/get-started.html
