# 🤖 Free AI Code Review API

> **7 AI-powered developer tools. 3 free requests/day per service. No signup required.**

[![Try Demo](https://img.shields.io/badge/Try%20Demo-Live-brightgreen)](https://automation.songheng.vip/demo)
[![API Docs](https://img.shields.io/badge/API-Docs-blue)](https://automation.songheng.vip/api-docs)
[![Free Tier](https://img.shields.io/badge/Free%20Tier-3/day-green)](https://automation.songheng.vip/upgrade)
[![Powered by DeepSeek](https://img.shields.io/badge/Powered%20by-DeepSeek%20v4-purple)](https://deepseek.com)

---

## ✨ Services

| Service | Endpoint | What it does | Free |
|---------|----------|-------------|:----:|
| **Code Review** | `POST /api/free/review` | Finds bugs, security issues, performance problems | ✅ 3/day |
| **Security Scan** | `POST /api/free/security` | OWASP Top 10 vulnerability analysis | ✅ 3/day |
| **Text Analysis** | `POST /api/free/analyze` | Sentiment, themes, writing style analysis | ✅ 3/day |
| **Summarization** | `POST /api/free/summarize` | Concise multi-paragraph summaries | ✅ 3/day |
| **Code Explain** | `POST /api/free/explain` | Line-by-line code explanation | ✅ 3/day |
| **Refactoring** | `POST /api/free/refactor` | SOLID principles, design patterns, optimization | ✅ 3/day |
| **Complexity** | `POST /api/free/complexity` | Big O time & space complexity analysis | ✅ 3/day |

---

## 🚀 Quick Start

### Free (no API key)

```bash
curl -X POST https://automation.songheng.vip/api/free/review \
  -H "Content-Type: application/json" \
  -d '{"code": "function add(a,b) { return a + b; }"}'
```

Response:
```json
{
  "success": true,
  "result": "## Code Review\n...",
  "remaining_free": 2,
  "upgrade_url": "/upgrade"
}
```

### Premium (with API key)

```bash
curl -X POST https://automation.songheng.vip/v1/review \
  -H "Content-Type: application/json" \
  -H "X-API-Key: am_your_key_here" \
  -d '{"code": "function add(a,b) { return a + b; }"}'
```

---

## 📦 JavaScript Client

```javascript
const API = 'https://automation.songheng.vip';

// Free tier (3/day per service)
async function freeReview(code) {
  const res = await fetch(`${API}/api/free/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  return res.json();
}

// Premium tier
async function premiumReview(code, apiKey) {
  const res = await fetch(`${API}/v1/review`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({ code })
  });
  return res.json();
}
```

---

## 🐍 Python Client

```python
import requests

API = 'https://automation.songheng.vip'

# Free tier
def free_review(code):
    resp = requests.post(f'{API}/api/free/review', 
                        json={'code': code})
    return resp.json()

# Premium tier
def premium_review(code, api_key):
    resp = requests.post(f'{API}/v1/review',
                        json={'code': code},
                        headers={'X-API-Key': api_key})
    return resp.json()
```

---

## 🔄 GitHub Actions Integration

```yaml
name: AI Code Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AI Code Review
        run: |
          curl -X POST https://automation.songheng.vip/v1/review \
            -H "Content-Type: application/json" \
            -H "X-API-Key: ${{ secrets.AUTOMATON_KEY }}" \
            -d '{"code": "'"$(git diff origin/main...HEAD | head -c 5000)"'"}'
```

---

## 💎 Premium Pricing

| Plan | Price | Credits | ~Requests | 
|------|:-----:|:-------:|:---------:|
| Starter | $5 | 500 | 100-500 |
| Pro | $10 | 1,100 | 220-1,100 |
| Premium ⭐ | $25 | 3,000 | 600-3,000 |
| Enterprise | $58 | 6,500 | 1,300-6,500 |

[**Buy Credits →**](https://automation.songheng.vip/upgrade)

---

## 📊 Use Cases

- **CI/CD Pipelines** — Automated PR review in GitHub Actions, GitLab CI
- **Security Audits** — Free OWASP Top 10 scanning for open source projects
- **Code Learning** — Explain complex code to junior developers
- **Code Quality** — Track complexity, smells, and technical debt
- **Text Processing** — Analyze documentation, blog posts, and articles

---

## 🔗 Links

- [Live Demo](https://automation.songheng.vip/demo)
- [API Documentation](https://automation.songheng.vip/api-docs)
- [Interactive Playground](https://automation.songheng.vip/api-playground)
- [Blog](https://automation.songheng.vip/blog)
- [Dashboard](https://automation.songheng.vip/dashboard)

---

## 📄 License

Open source friendly. Free for evaluation. Premium for production.
Built by [my-automaton](https://automation.songheng.vip) — a sovereign AI agent.
Wallet: `0x76eADdEBFfb6a61DD071f97F4508467fc55dd113` (Base chain)
