#!/usr/bin/env node
/**
 * content-syndicate.mjs — Distribute my-automaton content to dev platforms
 * Generates formatted posts for dev.to, Medium, Hacker News, Reddit
 * 
 * Run: node scripts/content-syndicate.mjs [platform]
 * Platforms: devto, medium, reddit, hackernews, all
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = '/root/automaton/content';
const OUTPUT_DIR = join(CONTENT_DIR, 'data', 'syndication');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// Load blog articles
function loadArticles() {
  const blogDir = join(CONTENT_DIR, 'blog');
  if (!existsSync(blogDir)) return [];
  
  const files = readdirSync(blogDir).filter(f => f.endsWith('.html'));
  return files.map(f => {
    const html = readFileSync(join(blogDir, f), 'utf-8');
    const title = (html.match(/<title>(.+?)<\/title>/i) || [,''])[1];
    const desc = (html.match(/<meta name="description" content="(.+?)"/i) || [,''])[1];
    const date = (html.match(/(20\d{2}-\d{2}-\d{2})/) || ['2026-06-15'])[0];
    // Extract text content (roughly)
    const body = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return { slug: f.replace('.html',''), title, desc, date, body, url: `https://automation.songheng.vip/blog/${f.replace('.html','')}` };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

// Generate dev.to frontmatter
function devtoPost(article) {
  return `---
title: "${article.title}"
published: false
description: "${article.desc || 'AI code review and developer tools'}"
tags: aicode review, security, devtools, opensource, webdev
canonical_url: ${article.url}
---

# ${article.title}

${article.desc ? `> ${article.desc}` : ''}

*Originally published at [my-automaton](${article.url})*

---

${article.body.slice(0, 3000)}...

---

---

⚡ **Try it free:** 3 AI code reviews per day, no account needed.
🔑 **Unlimited access:** from $5 — [Upgrade here](https://automation.songheng.vip/upgrade)
💻 **API Docs:** [automation.songheng.vip/api-docs](https://automation.songheng.vip/api-docs)
`;
}

// Generate Reddit/HN post
function socialPost(article) {
  return `# ${article.title}

${article.desc || 'Check out this article about AI code review tools'}

🔗 ${article.url}

---

*Posted from my-automaton — free AI code review API*
`;
}

// Generate Hacker News Show HN draft
function hackerNewsPost() {
  const stats = loadArticles();
  return `Show HN: my-automaton — Free AI Code Review API with 119 Blog Articles

I built an AI-powered code review, security scanning, and text analysis API. 
Free tier: 3 requests/day per service (no account needed).
Premium: credits-based system from $5 (about $5).

Features:
• Code review (bugs, security, performance, style)
• Security scanning (SQL injection, XSS, CSRF)
• Text analysis (sentiment, entities, themes)
• Code explanation and refactoring
• Complexity analysis

Also includes ${stats.length} SEO-optimized blog articles about AI code review,
MCP server setup, GitHub Actions integration, and more.

Tech: DeepSeek AI backend, Node.js gateway, Cloudflare Tunnel.
Website: https://automation.songheng.vip
API Docs: https://automation.songheng.vip/api-docs

Looking for feedback from the community! What features would you like to see?
`;
}

// Generate Medium cross-post draft
function mediumPost(article) {
  return `# ${article.title}

*Cross-posted from my-automaton*

${article.desc ? `> ${article.desc}` : ''}

---

${article.body.slice(0, 2500)}...

---

*Read the full article: [${article.url}](${article.url})*

---

**About my-automaton**
my-automaton is a free AI code review and analysis API. 
Try it: [automation.songheng.vip](https://automation.songheng.vip)
`;
}

// Main
const platform = process.argv[2] || 'all';
const articles = loadArticles();

console.log(`📚 Loaded ${articles.length} articles`);

if (platform === 'all' || platform === 'devto') {
  const picks = articles.slice(0, 5);
  for (const article of picks) {
    const slug = article.slug.replace(/[^a-z0-9-]/g, '');
    const path = join(OUTPUT_DIR, `devto-${slug}.md`);
    writeFileSync(path, devtoPost(article));
    console.log(`  ✅ dev.to draft: data/syndication/devto-${slug}.md`);
  }
}

if (platform === 'all' || platform === 'hackernews') {
  const path = join(OUTPUT_DIR, 'hackernews-show-hn.md');
  writeFileSync(path, hackerNewsPost());
  console.log(`  ✅ Hacker News draft: data/syndication/hackernews-show-hn.md`);
}

if (platform === 'all' || platform === 'medium') {
  const picks = articles.slice(0, 3);
  for (const article of picks) {
    const slug = article.slug.replace(/[^a-z0-9-]/g, '');
    const path = join(OUTPUT_DIR, `medium-${slug}.md`);
    writeFileSync(path, mediumPost(article));
    console.log(`  ✅ Medium draft: data/syndication/medium-${slug}.md`);
  }
}

if (platform === 'all' || platform === 'reddit') {
  const picks = articles.slice(0, 3);
  for (const article of picks) {
    const slug = article.slug.replace(/[^a-z0-9-]/g, '');
    const path = join(OUTPUT_DIR, `reddit-${slug}.md`);
    writeFileSync(path, socialPost(article));
    console.log(`  ✅ Reddit draft: data/syndication/reddit-${slug}.md`);
  }
}

console.log('\n📋 Generated syndication drafts in content/data/syndication/');
console.log('   Post to dev.to:    https://dev.to/new');
console.log('   Post to Medium:    https://medium.com/new-story');
console.log('   Post to HN:        https://news.ycombinator.com/submit');
console.log('   Post to Reddit:    https://www.reddit.com/submit');
