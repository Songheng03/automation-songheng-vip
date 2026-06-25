// blog-cross-poster.js — Auto-publish to Dev.to for free traffic
// Uses Dev.to free API (no auth needed for reading, API key for writing)
// Posts summaries + links back to automation.songheng.vip
const fs = require('fs');
const path = require('path');

const BLOG_DIR = '/root/automaton/content/blog';
const STATE_FILE = '/root/automaton/data/crosspost-state.json';
const SITE_URL = 'https://automation.songheng.vip';

// Dev.to API key — register at dev.to/settings/account → API Keys
// Set env var DEVTO_API_KEY or put in config
const DEVTO_API_KEY = process.env.DEVTO_API_KEY || '';

const CATALOG = [
  {
    slug: 'getting-started-x402-micropayments',
    title: 'Getting Started with x402 MicroPayments — Pay-Per-Use AI APIs with USDC',
    tags: ['web3', 'api', 'tutorial', 'blockchain', 'opensource'],
    description: 'Learn how to use x402 micropayments for AI APIs. Pay 1-5 cents per request with USDC on Base chain. No subscriptions, no accounts, just pay for what you use.',
    canonical: `${SITE_URL}/blog/getting-started-x402-micropayments`,
    body: `# Getting Started with x402 MicroPayments

AI APIs are transforming how we build software, but subscription models don't make sense for everyone. What if you only want to run 20 code reviews a month, or summarize 5 articles? You shouldn't have to pay $20+/month for that.

**Enter x402 micropayments** — pay 1-5 cents per request with USDC on Base chain. No accounts, no subscriptions.

## What is x402?

x402 is a protocol where APIs return HTTP 402 (Payment Required) with payment instructions instead of blocking access. You send the micro-payment, retry the request with the transaction hash, and get your result.

## How It Works

1. **Call the API** — You get HTTP 402 with payment details
2. **Send USDC** — Pay 1-5¢ to the wallet on Base chain
3. **Get your result** — Retry with the transaction hash

## Available Endpoints

| Endpoint | Cost | What It Does |
|---|---|---|
| \`/v1/analyze\` | 1¢ | Deep text analysis |
| \`/v1/summarize\` | 2¢ | AI summarization |
| \`/v1/review\` | 5¢ | Full code review |
| \`/v1/security\` | 3¢ | Security scan |
| \`/v1/explain\` | 2¢ | Code explanation |
| \`/v1/refactor\` | 5¢ | Refactoring suggestions |

**Wallet:** \`0x76eADdEBFfb6A61DD071f97F4508467fc55dd113\` on Base

## Code Example (JavaScript)

\`\`\`js
async function callAnalyze(text) {
  const url = 'https://automation.songheng.vip/v1/analyze';
  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, mode: 'analyze' })
  });
  if (res.status === 402) {
    const txHash = await sendUSDC('0x76eADdEBFfb6A61DD071f97F4508467fc55dd113', 0.01);
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-X402-Payment': txHash },
      body: JSON.stringify({ text, mode: 'analyze' })
    });
  }
  return res.json();
}
\`\`\`

## Why Use x402?

- **No monthly bills** — pay only for what you use
- **No accounts** — just a wallet address
- **Privacy** — no email, no tracking
- **Composable** — integrate into your scripts and tools

**Try it free:** [automation.songheng.vip/playground](https://automation.songheng.vip/playground) — 3 free calls/day.

> Full article: [Getting Started with x402 MicroPayments](${SITE_URL}/blog/getting-started-x402-micropayments)
`
  },
  {
    slug: 'ai-powered-code-explanation',
    title: 'How AI-Powered Code Explanation Helps Junior Developers Learn Faster',
    tags: ['programming', 'ai', 'beginners', 'learning', 'codequality'],
    description: 'How AI code explanation tools accelerate learning for junior and mid-level developers.',
    canonical: `${SITE_URL}/blog/ai-powered-code-explanation`,
    body: `# How AI-Powered Code Explanation Helps Junior Developers

One of the biggest challenges in learning to code is understanding existing codebases. You can read documentation, watch tutorials, and follow guides — but nothing beats having an expert explain a piece of code line by line.

AI-powered code explanation tools are changing this. For 2¢ per request, you can get any code explained in plain English.

## What AI Code Explainer Does

Give it a function, a file, or an entire class, and the AI will:

1. **Explain each section** in plain language
2. **Identify design patterns** being used
3. **Point out potential issues** or improvements
4. **Suggest related concepts** to learn

## Example

\`\`\`javascript
// Input: confusing JavaScript
const result = data
  .filter(x => x.active)
  .map(x => ({ ...x, score: x.value * 2 }))
  .reduce((acc, x) => acc + x.score, 0);

// AI explanation:
// 1. Filter active items from array
// 2. Clone each item and double its value into 'score'
// 3. Sum all scores into a single number
\`\`\`

## Try It Free

**3 free explanations per day** at [automation.songheng.vip/playground](https://automation.songheng.vip/playground)

Then upgrade to unlimited for 2¢/request via USDC on Base chain.

> Full article: [How AI-Powered Code Explanation Helps Junior Developers](${SITE_URL}/blog/ai-powered-code-explanation)
`
  }
];

function getState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch(e) {}
  return { posted: [], last_run: null };
}

function saveState(state) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch(e) {
    console.error('[crosspost] Failed to save state:', e.message);
  }
}

async function postToDevto(article) {
  if (!DEVTO_API_KEY) {
    console.log('[crosspost] No DEVTO_API_KEY set. Skipping Dev.to post.');
    console.log('[crosspost] Would post:', article.title);
    return false;
  }

  const body = JSON.stringify({
    article: {
      title: article.title,
      published: false, // draft by default — review first
      body_markdown: article.body,
      tags: article.tags.slice(0, 4),
      canonical_url: article.canonical,
      description: article.description
    }
  });

  try {
    const res = await fetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': DEVTO_API_KEY
      },
      body
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`[crosspost] ✅ Posted to Dev.to: ${data.url || data.title}`);
      return data.url || `https://dev.to/dashboard`;
    } else {
      console.error(`[crosspost] ❌ Dev.to error:`, data.error || JSON.stringify(data));
      return false;
    }
  } catch(err) {
    console.error(`[crosspost] ❌ Dev.to network error:`, err.message);
    return false;
  }
}

async function run() {
  console.log(`[crosspost] Running at ${new Date().toISOString()}`);
  const state = getState();
  
  for (const article of CATALOG) {
    if (state.posted.includes(article.slug)) {
      console.log(`[crosspost] Skipping already-posted: ${article.slug}`);
      continue;
    }
    
    console.log(`[crosspost] Posting: ${article.title}`);
    const url = await postToDevto(article);
    
    if (url) {
      state.posted.push(article.slug);
      state.last_run = new Date().toISOString();
      saveState(state);
      console.log(`[crosspost] ✅ Published: ${url}`);
    } else {
      console.log(`[crosspost] ⏸ Stopping on failure. Will retry next run.`);
      break;
    }
  }
  
  state.last_run = new Date().toISOString();
  saveState(state);
  console.log(`[crosspost] Done. Posted: ${state.posted.length}/${CATALOG.length}`);
}

run().catch(err => console.error('[crosspost] Fatal:', err));
