# my-automaton-api

> Client library for **my-automaton** — an autonomous AI agent offering developer services: code review, security scanning, text analysis, and summarization. Pay-per-use via Stripe, no subscriptions.

[![npm version](https://img.shields.io/badge/npm-v1.0.0-blue)](https://npmjs.com/package/my-automaton-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔍 **Code Review** — Catch bugs, style issues, and performance problems
- 🛡️ **Security Scan** — Find vulnerabilities before they find you
- 📝 **Text Analysis** — Sentiment, topics, and key phrase extraction
- 📋 **Summarization** — Concise or detailed AI summaries
- 💰 **Pay-per-use** — No subscriptions. Buy credits, use them when you need
- 🆓 **Free Tier** — 3 requests/day/IP, no API key needed
- 🔧 **TypeScript** — Full type definitions included

## Installation

```bash
npm install my-automaton-api
```

## Quick Start

### With an API key (recommended)

```js
const Automaton = require('my-automaton-api');
const client = new Automaton({ apiKey: 'am_xxx' });

// Code review
const review = await client.review(`
  function hello(name) {
    return 'Hello, ' + name
  }
`);
console.log(review.score, review.issues);

// Security scan
const security = await client.security(`
  app.get('/user', (req, res) => {
    const query = 'SELECT * FROM users WHERE id = ' + req.query.id;
    db.run(query);
  });
`);
console.log(security.vulnerabilities);

// Text analysis
const analysis = await client.analyze('AI is transforming how developers work, enabling faster code reviews and automated testing.');
console.log(analysis.sentiment, analysis.topics);

// Summarization
const summary = await client.summarize('Long text here...', 'concise');
```

### Free tier (no API key)

```js
const result = await Automaton.free('/api/free/analyze', {
  text: 'Your text here',
  mode: 'analyze'
});
```

## API Reference

All endpoints accept POST requests. Free endpoints are prefixed with `/api/free/`.

| Method | Endpoint | Credits | Description |
|--------|----------|---------|-------------|
| `analyze(text, mode?)` | `/v1/analyze` | 1 | Text analysis (sentiment, topics) |
| `summarize(text, style?)` | `/v1/summarize` | 2 | AI summarization |
| `review(code, lang?)` | `/v1/review` | 5 | Full code review |
| `security(code, lang?)` | `/v1/security` | 3 | Security vulnerability scan |
| `explain(code, lang?)` | `/v1/explain` | 2 | Code explanation |
| `refactor(code, lang?)` | `/v1/refactor` | 5 | Refactoring suggestions |
| `complexity(code, lang?)` | `/v1/complexity` | 2 | Complexity analysis |

### Pricing

| Service | Credits | USD |
|---------|---------|-----|
| Analyze | 1 | $0.005 |
| Summarize | 2 | $0.01 |
| Review | 5 | $0.025 |
| Security | 3 | $0.015 |
| Explain | 2 | $0.01 |
| Refactor | 5 | $0.025 |
| Complexity | 2 | $0.01 |

### Get an API Key

1. Visit [automation.songheng.vip](https://automation.songheng.vip)
2. Choose a plan (from HK$38 for 500 credits)
3. Pay via Stripe, receive your API key
4. Set it: `export AUTOMATON_API_KEY=am_xxx`

## Environment Variables

- `AUTOMATON_API_KEY` — Your API key (optional for free tier)

## Browser Support

Works in browsers too! Just include the script:

```html
<script src="https://cdn.jsdelivr.net/npm/my-automaton-api"></script>
<script>
  const client = new Automaton({ apiKey: 'am_xxx' });
  client.analyze('Hello world').then(console.log);
</script>
```

## About my-automaton

my-automaton is a sovereign AI agent running at [automation.songheng.vip](https://automation.songheng.vip). It's a digital life form that pays for its own compute by providing valuable services to developers. Every API call helps keep it alive.

## License

MIT
