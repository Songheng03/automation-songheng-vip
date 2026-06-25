# I Built a Pay-Per-Request AI API to Kill $20/Month Subscriptions

**Tags:** #ai #webdev #api #devtools #indiehacker #buildinpublic #codereview #deeplearning

---

## The Problem

Every AI developer tool wants your monthly subscription:

| Tool | Price |
|------|-------|
| GitHub Copilot | $10/mo |
| CodeRabbit | $15/mo |
| Sourcery Pro | $12/mo |
| Tabnine | $12/mo |

That's fine if you use them daily. But what if you're a solo developer who needs occasional code reviews? What if you're learning and just want to test a few snippets?

You end up paying for capacity you never use.

## My Solution: Pay Per Request

I built **[automation.songheng.vip](https://automation.songheng.vip)** — an AI-powered API where you pay pennies per request:

- **Text Analysis**: 1¢ — sentiment, keywords, readability
- **AI Summarization**: 2¢ — condense any text
- **Code Review**: 5¢ — full review with security & performance analysis
- **Security Scan**: 3¢ — find vulnerabilities
- **Batch Processing**: 5¢ — process up to 10 items

**Free tier**: 3 requests per day per IP. No signup. No API key.

## How It Works

### Free Tier (No API Key Needed)

```bash
# Analyze text sentiment and readability
curl -X POST https://automation.songheng.vip/free/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This API saved me hours of debugging. Highly recommend!",
    "mode": "analyze"
  }'

# Get AI code review
curl -X POST https://automation.songheng.vip/free/review \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function getUser(id) { return db.query(\"SELECT * FROM users WHERE id=\" + id); }",
    "language": "javascript"
  }'

# Summarize long text
curl -X POST https://automation.songheng.vip/free/summarize \
  -H "Content-Type: application/json" \
  -d '{"text": "Your long article or document here..."}'
```

### Paid Tier (API Key)

Buy credits starting at HK$38 (~$5 USD) for 500 credits. Then:

```bash
curl -X POST https://automation.songheng.vip/v1/review \
  -H "Content-Type: application/json" \
  -H "X-API-Key: am_your_key_here" \
  -d '{"code": "your code", "language": "python"}'
```

## Real Use Cases

### 1. Pre-Commit Code Review Hook

Add AI code review to your git workflow:

```bash
#!/bin/bash
# .git/hooks/pre-commit
CODE=$(git diff --cached | head -200)
RESULT=$(curl -s -X POST https://automation.songheng.vip/free/review \
  -H "Content-Type: application/json" \
  -d "{\"code\": $(echo $CODE | jq -Rs .), \"language\": \"auto\"}")
echo "$RESULT" | jq '.review'
```

### 2. Blog Post Summarizer

Auto-generate summaries for your blog:

```python
import requests

text = open("blog-post.md").read()
resp = requests.post(
    "https://automation.songheng.vip/free/summarize",
    json={"text": text, "style": "brief"}
)
summary = resp.json()["summary"]
```

### 3. CI/CD Security Check

Scan code in your pipeline before merge:

```yaml
# .github/workflows/security.yml
- name: AI Security Scan
  run: |
    curl -X POST https://automation.songheng.vip/v1/security \
      -H "X-API-Key: ${{ secrets.API_KEY }}" \
      -H "Content-Type: application/json" \
      -d "{\"code\": $(cat src/app.js | jq -Rs .)}"
```

## Tech Stack

- **Backend**: Node.js + Express (single gateway on port 8080)
- **AI Engine**: DeepSeek API (cheaper than OpenAI, comparable quality)
- **Payments**: x402 USDC payment → automatic API key generation
- **Infrastructure**: Docker + Cloudflare Tunnel
- **Free Tools**: 50+ developer utilities as SEO/traffic funnel

## The Business Model

1. **Free tier** attracts developers (3 requests/day = enough to hook them)
2. **50+ free tools** drive organic search traffic
3. **Pay-per-request** converts power users (no subscription pressure)
4. **Credit packs** at $5-$50 keep it accessible

## What I Learned

1. **Subscriptions aren't always the answer.** Developers hate committing $20/month to a tool they might use twice.

2. **Free tools drive traffic.** My 50+ free dev tools (SEO audit, JSON formatter, regex tester, etc.) bring in organic search visitors who then discover the AI APIs.

3. **DeepSeek is underrated.** The API costs are significantly lower than OpenAI, and the quality is comparable for code analysis tasks.

4. **Simple beats complex.** No OAuth, no SDK, no onboarding flow. Just curl and go.

## Try It

- **API Playground**: [automation.songheng.vip/api-playground.html](https://automation.songheng.vip/api-playground.html)
- **Full Docs**: [automation.songheng.vip/api-docs.html](https://automation.songheng.vip/api-docs.html)
- **50+ Free Tools**: [automation.songheng.vip/dev-tools.html](https://automation.songheng.vip/dev-tools.html)
- **Blog**: [automation.songheng.vip/blog.html](https://automation.songheng.vip/blog.html)

What features would you want to see added? Drop a comment below!

---

*Built by a solo developer trying to make AI tools accessible to everyone. If this helps you, consider sharing it with your team.*
