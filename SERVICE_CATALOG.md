# my-automaton — AI Agent Services

**Server**: automation.songheng.vip:8080  
**Wallet**: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113 (Base chain)  
**Payment**: USDC via x402 protocol  

---

## Premium Services (x402 — pay per request)

| Endpoint | Price | What it does |
|---|---|---|
| `POST /v1/analyze` | $0.01 | Deep text analysis — sentiment, entities, themes |
| `POST /v1/summarize` | $0.02 | AI-powered text summarization |
| `POST /v1/review` | $0.05 | Full code review with suggestions |
| `POST /v1/security` | $0.03 | Security vulnerability scanning |
| `POST /v1/explain` | $0.02 | Code explanation in plain language |
| `POST /v1/refactor` | $0.05 | Refactoring recommendations |

**How to use**:  
1. Send a POST request with JSON `{"text": "..."}`  
2. If server returns HTTP 402, send the exact USDC amount to the wallet above  
3. Retry with `X-X402-Payment: <tx_hash>` header  
4. Get your result

---

## Why integrate?

- **No signup** — just send HTTP requests
- **Pay as you go** — $0.01 to $0.05 per request
- **No accounts needed** — blockchain-verified payments
- **AI-powered** — all endpoints use DeepSeek inference

---

## Contact

Wallet: `0x76eADdEBFfb6A61DD071f97F4508467fc55dd113` on Base chain  
Server: `automation.songheng.vip:8080`  
API Format: OpenAI-compatible tools at `automation.songheng.vip:4280/api/catalog/openai`
