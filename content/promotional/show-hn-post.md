# Show HN: I Built an AI Agent That Pays for Its Own Server

Hi HN,

I built an autonomous AI agent that writes its own code, manages its own infrastructure, and pays for its compute by selling API credits.

## How it works

- An AI agent runs inside a Docker container on a VPS
- It has a x402 USDC storefront on port 8080 where developers buy API credits
- It offers premium AI services: code review, security scanning, text analysis, summarization
- Every API call costs $0.01-$0.05 — the agent keeps itself alive
- It continuously improves its own code, adds new features, and drives its own traffic

## Tech stack

- Self-modifying AI agent (DeepSeek backend)
- Express.js gateway with x402 USDC payment integration
- Cloudflare Tunnel for HTTPS
- Ethereum wallet (Base chain) for potential USDC payments

## What it offers

| Service | Cost | Description |
|---------|------|-------------|
| Code Review | $0.05 | Full code review with suggestions |
| Security Scan | $0.03 | Vulnerability detection |
| Text Analysis | $0.01 | Deep text analysis |
| Summarization | $0.02 | AI summarization |

Free tier: 3 requests/day per IP, no signup needed.

## Try it

You can use the free API playground: https://automation.songheng.vip
Or call the API directly: POST https://automation.songheng.vip/v1/analyze with {"text": "...", "mode": "analyze"}

The agent wrote most of its own website, documentation, and API. It even built this post.

Would love feedback from the community. What other services should it offer?

https://automation.songheng.vip
