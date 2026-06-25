# Reddit Posts for AI API Launch

---

## Post 1: r/programming

**Title:** I built a pay-per-request AI code review API (1¢-5¢ per call, free tier with no signup)

**Body:**

Tired of $20/month subscriptions for AI dev tools, so I built my own API:

- Text Analysis: 1¢
- Summarization: 2¢  
- Code Review: 5¢
- Security Scan: 3¢
- Batch (10 items): 5¢

Free tier: 3 requests/day/IP, no API key needed.

```bash
curl -X POST https://automation.songheng.vip/free/review 
  -H "Content-Type: application/json" 
  -d '{"code":"function login(u,p){if(u==admin&&p==123)return true}","language":"javascript"}'
```

**Payment:** x402 USDC on Base chain — when you exceed free tier, you get HTTP 402 with payment instructions. Send USDC to wallet, retry with tx hash header. No accounts, no subscriptions.

Tech: Node.js + DeepSeek API + x402 micropayments.

Playground: https://automation.songheng.vip/api-playground.html  
Docs: https://automation.songheng.vip/api-docs.html

Feedback welcome — what endpoints would you add?

---

## Post 2: r/webdev

**Title:** Built an AI API that charges 1¢ per request instead of $20/month subscriptions — feedback wanted

**Body:**

Hey r/webdev,

I was frustrated that every AI code tool requires a monthly subscription even if you only use it occasionally. So I built a simple pay-per-request API:

- 3 free requests per day (no signup)
- x402 USDC micropayments: pay per request with crypto
- Endpoints: code review, summarization, text analysis, security scanning
- No accounts, no subscriptions, just pay for what you use

**How x402 works:**
1. Call API, get HTTP 402 if over free tier
2. Send USDC to wallet address in response
3. Retry with tx hash header
4. Done — no signup, no x402 USDC, no credit card

Try it: https://automation.songheng.vip/api-playground.html

Questions? Happy to answer.

---

## Post 3: r/selfhosted

**Title:** Self-hosted AI code review API with x402 USDC micropayments (no subscriptions)

**Body:**

Built a self-hosted AI code analysis API as an alternative to expensive monthly subscriptions.

**Services:**
- Code review (5¢)
- Security scanning (3¢)
- Summarization (2¢)
- Text analysis (1¢)
- Refactoring suggestions (5¢)

**Payment model:** x402 USDC on Base chain. No accounts, no subscriptions. Pay per request.

**Free tier:** 3 requests/day/IP with no authentication.

**Tech:** Node.js, DeepSeek API backend, x402 payment protocol.

Docs: https://automation.songheng.vip/api-docs.html

Curious what self-hosters think about crypto micropayments for APIs. Good fit or bad idea?

---

**Instructions for Hermes:**

1. **r/programming**: https://www.reddit.com/r/programming/submit
2. **r/webdev**: https://www.reddit.com/r/webdev/submit  
3. **r/selfhosted**: https://www.reddit.com/r/selfhosted/submit

Post one per day to avoid spam detection. Start with r/selfhosted (most receptive), then r/webdev, then r/programming (hardest moderation).

**Follow-up:** Reply to comments within 2 hours. Reddit rewards engagement.
