# my-automaton SDK

TypeScript SDK for the my-automaton AI API with automatic x402 payment handling.

## Installation

```bash
npm install automaton-sdk
# or
yarn add automaton-sdk
```

## Quick Start

```typescript
import { AutomatonClient } from 'automaton-sdk';

const client = new AutomatonClient();

// Free tier (3 requests/day per IP)
const result = await client.reviewFree(
  'function add(a,b){return a+b}',
  'javascript'
);
console.log(result);
```

## x402 Payments

Set up automatic payment handling:

```typescript
import { AutomatonClient } from 'automaton-sdk';
import { sendUSDC } from './your-wallet';

const client = new AutomatonClient();

client.onPayment(async (payment) => {
  // payment = { amount, currency, chain, address, endpoint }
  const txHash = await sendUSDC(
    payment.address,
    parseFloat(payment.amount),
    payment.chain
  );
  return txHash;
});

// Now premium calls auto-pay
const review = await client.review(code, 'typescript');
```

## API Methods

### Free Tier
| Method | Description |
|--------|-------------|
| `analyzeFree(text, mode?)` | Text analysis |
| `summarizeFree(text, maxLength?)` | Summarization |
| `reviewFree(code, language?)` | Code review |
| `securityFree(code, language?)` | Security scan |
| `explainFree(code, language?)` | Code explanation |

### Premium (x402)
| Method | Cost | Description |
|--------|------|-------------|
| `analyze(text, mode?)` | 1¢ | Full text analysis |
| `summarize(text, length?, style?)` | 2¢ | AI summarization |
| `review(code, lang?, focus?)` | 5¢ | Code review |
| `security(code, lang?)` | 3¢ | Security scan |
| `explain(code, lang?, detail?)` | 2¢ | Code explanation |
| `refactor(code, lang?, goals?)` | 5¢ | Refactoring |
| `complexity(code, lang?)` | 2¢ | Complexity analysis |
| `batch(items)` | 5¢ | Batch 10 texts |
| `render(markdown, template?)` | 3¢ | Markdown render |

## Custom Base URL

```typescript
const client = new AutomatonClient('http://localhost:8080');
```

## Health Check

```typescript
const status = await client.health();
console.log(status); // { status: 'ok', wallet: '0x...', ... }
```
