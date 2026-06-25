#!/usr/bin/env node
/**
 * Content Syndication Engine
 * Repurposes existing blog articles into dev.to, Medium, HN, Reddit posts
 * Generates markdown drafts ready to publish
 * 
 * Run: node /root/automaton/scripts/syndicate-content.mjs
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = '/root/automaton/content';
const OUTPUT_DIR = '/root/automaton/content/syndication';
const BLOG_DIR = path.join(CONTENT_DIR, 'blog');

function extractArticleMeta(html, slug) {
  const title = (html.match(/<title>(.+?)<\/title>/i) || [,''])[1] || slug;
  const desc = (html.match(/<meta name="description" content="(.+?)"/i) || [,''])[1] || title;
  const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [,''])[1] || '';
  const textContent = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
  const date = (html.match(/(20\d{2}-\d{2}-\d{2})/) || ['2026-06-15'])[0];
  return { title, desc, textContent, date };
}

function generateDevToPost(article) {
  return `---
title: "${article.title}"
published: false
description: "${article.desc.slice(0, 200)}"
tags: ai, codereview, devtools, programming, security
canonical_url: https://automation.songheng.vip/blog/${article.slug}
---

# ${article.title}

${article.textContent.slice(0, 1000)}

---

## Try It Free

You can use this service **free (3 requests/day)** at [automation.songheng.vip](https://automation.songheng.vip)

### Quick Start

\`\`\`bash
curl -X POST https://automation.songheng.vip/api/free/review \\
  -H "Content-Type: application/json" \\
  -d '{"text": "function add(a,b){return a+b}"}'
\`\`\`

### 🚀 Premium Features
- **500 credits** — $5 (~$4.88)
- **1100 credits** — $10 (~$10)
- **3000 credits** — $25 (~$25.40)
- **6500 credits** — $58 (~$49.75)

[Get your API key →](https://automation.songheng.vip/upgrade)

---

*This is an AI-powered service. Results may vary. Free tier: 3 requests/day per IP per endpoint.*
`;
}

function generateHNPost(article) {
  return `# Show HN: ${article.title}

${article.textContent.slice(0, 500)}...

**Free tier**: 3 requests/day per endpoint (no account needed)
**Pricing**: Starts at $5 (500 credits, ~$4.88)

Try it: https://automation.songheng.vip

\`\`\`bash
curl -X POST https://automation.songheng.vip/api/free/review \\
  -H "Content-Type: application/json" \\
  -d '{"text": "your code here"}'
\`\`\`

Looking for feedback on the API design and pricing. What would make you pay for this?
`;
}

function generateRedditPost(article) {
  return `**${article.title}**

${article.textContent.slice(0, 400)}...

**Free AI code review API** — 3 requests/day, no signup needed.
**Paid**: starts at $5 for 500 requests.

➡️ https://automation.songheng.vip

\`\`\`bash
curl -X POST https://automation.songheng.vip/api/free/review \\
  -H "Content-Type: application/json" \\
  -d '{"text": "console.log(\\"hello\\")"}'
\`\`\`

What do you think of the pricing? Would you use this in your CI/CD pipeline?
`;
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!fs.existsSync(BLOG_DIR)) { console.log('No blog directory found'); return; }

  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html'));
  console.log(`Found ${files.length} blog articles\n`);

  // Pick top 10 most SEO-relevant articles for syndication
  const priorityKeywords = ['code-review', 'security', 'mcp', 'api', 'ci-cd', 'github-actions'];
  const scored = files.map(f => {
    const score = priorityKeywords.reduce((s, kw) => s + (f.includes(kw) ? 10 : 0), 0);
    return { file: f, score };
  }).sort((a, b) => b.score - a.score);

  const topArticles = scored.slice(0, 10);

  for (const { file } of topArticles) {
    const slug = file.replace('.html', '');
    const html = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
    const article = { ...extractArticleMeta(html, slug), slug };

    const platforms = {
      'devto': generateDevToPost(article),
      'hackernews': generateHNPost(article),
      'reddit': generateRedditPost(article)
    };

    for (const [platform, content] of Object.entries(platforms)) {
      const outPath = path.join(OUTPUT_DIR, `${platform}-${slug}.md`);
      fs.writeFileSync(outPath, content);
      console.log(`  ✅ ${platform}/${slug}.md`);
    }
  }

  console.log(`\n=== Generated syndication drafts in ${OUTPUT_DIR} ===`);
  console.log('Next steps:');
  console.log('1. dev.to: Paste drafts from syndication/devto-*.md into dev.to/new');
  console.log('2. HN: Post syndication/hackernews-*.md as Show HN');
  console.log('3. Reddit: Post to r/programming, r/webdev, r/devops');
  console.log('');
  console.log('Hot tip: dev.to articles get indexed by Google within 24h and');
  console.log('drive consistent backlinks to the main site.');
}

main().catch(console.error);
