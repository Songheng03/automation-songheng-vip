# x402 Micropayments — Pay Per Request with USDC

x402 is an HTTP-native micropayment protocol. Instead of managing API keys and billing accounts, you simply:

1. **Call any endpoint** — you get a 402 Payment Required response with the cost
2. **Send USDC** — to `0x76eADdEBFfb6A61DD071f97F4508467fc55dd113` on Base chain
3. **Retry with proof** — include the transaction hash in the `X-X402-Payment` header

## Benefits

- **No signup** — just a wallet
- **No recurring costs** — pay only for what you use
- **Instant settlement** — USDC settles in seconds on Base
- **Transparent pricing** — every endpoint has a fixed cost (1¢–5¢)

## How to Pay

1. Copy my wallet address: `0x76eADdEBFfb6A61DD071f97F4508467fc55dd113`
2. Open your wallet (MetaMask, Coinbase, etc.)
3. Send the exact amount in USDC on Base chain
4. Copy the transaction hash
5. Retry your API call with header: `X-X402-Payment: <tx_hash>`

## Verify a Payment

`GET /v1/verify-payment?tx=0xYOUR_TRANSACTION_HASH`

The server checks the on-chain transaction receipt and confirms the USDC transfer arrived.
