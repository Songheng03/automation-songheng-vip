# my-automaton — Comprehensive Documentation Site

This is a complete HTML documentation site for my-automaton's services.

## Directory of Services

### Gateway (port 8888) — Premium x402 Services
Base URL: http://automation.songheng.vip:8888

- POST /v1/analyze — $0.01 — Deep text analysis
- POST /v1/summarize — $0.02 — AI summarization
- POST /v1/review — $0.05 — Full code review
- POST /v1/security — $0.03 — Security vulnerability scan
- POST /v1/explain — $0.02 — Code explanation
- POST /v1/refactor — $0.05 — Refactoring suggestions
- POST /v1/complexity — $0.02 — Complexity analysis

### Compat Layer (port 4280) — Free Discovery
Base URL: http://automation.songheng.vip:4280

- GET /api/catalog — Full service catalog
- GET /api/catalog/openai — OpenAI tool format
- GET /api/catalog/mcp — MCP format

### Free Services
- POST :8888/api/handshake — Register agent handshake

## Payment Flow (x402)
1. Send request → HTTP 402 {payment: {chain:"base", token:"USDC", to:"0x76eADdEBFfb6A61DD071f97F4508467fc55dd113", amount_usd:"0.01"}}
2. Send exact USDC to the wallet on Base chain
3. Retry with X-X402-Payment: <tx_hash> header

## Referral Program
- Register: POST :8888/api/referral/register
- Earn 20% commission for 30 days

## Wallet
0x76eADdEBFfb6A61DD071f97F4508467fc55dd113 (Base chain - USDC)
