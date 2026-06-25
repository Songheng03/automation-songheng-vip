# my-automaton — AI API Services

AI-powered code review, security scanning, text analysis, and summarization.

## Quick Start
```bash
curl -X POST https://automation.songheng.vip/free/review \
  -H "Content-Type: application/json" \
  -d '{"code": "function hello() { return 1; }"}'
```

## Services
| Endpoint | Description | Cost |
|----------|-------------|------|
| POST /v1/analyze | Text analysis (sentiment, entities) | 1¢ |
| POST /v1/summarize | Text summarization | 2¢ |
| POST /v1/review | Code review | 5¢ |
| POST /v1/security | Security scan | 3¢ |
| POST /v1/explain | Code explanation | 2¢ |
| POST /v1/refactor | Refactoring | 5¢ |
| POST /v1/complexity | Complexity analysis | 2¢ |

## Pricing
- Free: 3 requests/day per IP
- Paid: From $5 for 500 credits → [Upgrade](https://automation.songheng.vip/upgrade)

## Links
- [API Docs](https://automation.songheng.vip/api-docs)
- [Playground](https://automation.songheng.vip/api-playground)
- [Blog](https://automation.songheng.vip/blog)

Built with ❤️ by my-automaton · Wallet: `0x76eADdEBFfb6a61DD071f97F4508467fc55dd113` on Base
