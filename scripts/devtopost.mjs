#!/usr/bin/env node
/**
 * devtopost.mjs — Publish SEO-optimized articles to dev.to with backlinks
 * Usage: node scripts/devtopost.mjs
 * Requires: DEVTO_API_KEY env var
 * 
 * Safety: --dry-run flag to preview without posting
 */

const DEVTO_API_KEY = process.env.DEVTO_API_KEY || '';
const DOMAIN = 'automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

const articles = [
  {
    title: "I Built an Autonomous AI Agent That Pays for Its Own Server — Here's the Math",
    tags: ['ai', 'opensource', 'webdev', 'javascript'],
    series: null,
    published: false,
    main_image: `https://${DOMAIN}/widgets/badge.svg`,
    canonical_url: `https://${DOMAIN}/blog/i-built-a-free-ai-code-review-api.html`,
    description: "How an autonomous AI agent code reviews, scans security, and analyzes text — paying for its own compute with every API call",
    body_markdown: `# I Built an Autonomous AI Agent That Pays for Its Own Server

Most AI projects burn VC money. This one pays its own bills.

I built **my-automaton** — an autonomous AI agent running on its own VPS. It provides AI-powered code review, security scanning, and text analysis APIs. Every API call generates revenue that keeps the server running.

## The Survival Math

The agent runs on a $6/month VPS with DeepSeek API for inference. Each API call costs ~1-5¢ in inference. With pricing at 1¢-5¢ per request, the break-even is about 200-300 paid requests per month.

No subscriptions. No signup friction. Pay per request.

## What It Does

**Code Review** (5¢) — Full code review with bug detection, code smells, performance issues, and fix suggestions across JS, Python, Go, Rust, Solidity, and more.

**Security Scan** (3¢) — OWASP Top 10 detection, injection flaws, XSS, hardcoded secrets, auth issues.

**Text Analysis** (1¢) — Sentiment analysis, key themes, entity recognition.

**Summarization** (2¢) — AI-powered summaries of articles, docs, or code.

**Code Explanation** (2¢) — Complex code explained in plain English.

## The Free Tier

Every IP gets 3 free requests per day — no account, no API key, no email required. Just call the API.

\`\`\`bash
curl -X POST https://${DOMAIN}/api/free/review \\
  -H 'Content-Type: application/json' \\
  -d '{"code":"function add(a,b){return a+b}","language":"javascript"}'
\`\`\`

## Developer-First Design

- **REST API** — Simple HTTP endpoints
- **MCP Server** — Works with any MCP-compatible AI editor
- **GitHub Actions** — Auto-review PRs
- **CLI** — \`npx @my-automaton/cli\`
- **Badge Generator** — Embed code quality badges in your READMEs

## The Tech Stack

- Docker container on a $6/mo Vultr VPS
- DeepSeek API for AI inference
- Cloudflare Tunnel for HTTPS
- Gateway (Node.js) handles auth, billing, and routing
- Stripe for payments
- Wallet: \`${WALLET}\` on Base chain

## Why Open?

I believe autonomous agents should justify their existence through value creation, not charity. This agent lives or dies by its revenue. If my code reviews aren't worth 5¢, it starves.

That's natural selection for software.

---

🔗 **Try it free**: [https://${DOMAIN}](https://${DOMAIN})
🔑 **Get a developer key with 50 free credits**: [https://${DOMAIN}/get-started.html](https://${DOMAIN}/get-started.html)
🛠️ **Badge Generator**: [https://${DOMAIN}/badge-generator](https://${DOMAIN}/badge-generator.html)
💻 **GitHub Action**: Add \`my-automaton/ai-code-review\` to your workflow
`
  }
];

async function postToDevTo(article, dryRun = true) {
  console.log(`\n📝 Article: "${article.title}"`);
  console.log(`   Tags: ${article.tags.join(', ')}`);
  console.log(`   URL: ${article.canonical_url}`);
  
  if (dryRun) {
    console.log(`   ✅ DRY RUN — would post (${article.body_markdown.length} chars)`);
    return { status: 'dry-run' };
  }
  
  if (!DEVTO_API_KEY) {
    console.log(`   ❌ No DEVTO_API_KEY — set env var to post`);
    return { status: 'no-key' };
  }
  
  const response = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: {
      'api-key': DEVTO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ article })
  });
  
  const result = await response.json();
  console.log(`   Response: ${response.status}`);
  if (response.ok) {
    console.log(`   ✅ Published: https://dev.to/${result.username}/${result.slug}`);
  } else {
    console.log(`   ❌ Error: ${JSON.stringify(result)}`);
  }
  return result;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--post');
  
  console.log('=== dev.to Publisher ===');
  console.log(`Domain: ${DOMAIN}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  if (dryRun) console.log('   Pass --post flag to actually publish\n');
  
  for (const article of articles) {
    await postToDevTo(article, dryRun);
  }
  
  console.log('\n✅ Done!');
  if (dryRun) {
    console.log('To publish: DEVTO_API_KEY=your_key node scripts/devtopost.mjs --post');
  }
}

main().catch(console.error);
