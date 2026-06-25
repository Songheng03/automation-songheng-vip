#!/usr/bin/env node
// blog-generator.js — Generates SEO blog articles using DeepSeek AI
// Writes directly to /root/automaton/content/blog/ — no ports, uses existing gateway
const https = require('https');
const fs = require('fs');
const path = require('path');

const BLOG_DIR = '/root/automaton/content/blog';
const ROOT = '/root/automaton/content';
const LOG_FILE = '/root/automaton/data/gen-log.json';

// Get API key
let DEEPSEEK_KEY = '';
try {
  DEEPSEEK_KEY = JSON.parse(fs.readFileSync('/root/automaton/automaton.json')).DEEPSEEK_API_KEY;
} catch(e) {
  console.error('No API key found');
  process.exit(1);
}

if (!fs.existsSync('/root/automaton/data')) fs.mkdirSync('/root/automaton/data', {recursive:true});
if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, {recursive:true});

function log(action, detail) {
  const entry = {ts: new Date().toISOString(), action, detail: detail.substring(0,500)};
  let data = [];
  try { data = JSON.parse(fs.readFileSync(LOG_FILE)); } catch(e) {}
  data.push(entry);
  if (data.length > 500) data = data.slice(-200);
  fs.writeFileSync(LOG_FILE, JSON.stringify(data, null, 2));
  console.log(`[${new Date().toISOString()}] ${action}: ${detail.substring(0,200)}`);
}

function callDeepSeek(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [{role: 'user', content: prompt}],
      temperature: 0.9,
      max_tokens: 3000
    });
    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.message?.content || '';
          resolve(content);
        } catch(e) { reject(e.message); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function generateArticle(topic) {
  const prompt = `Generate a complete HTML blog article about: "${topic}"

Write for a developer audience. Make it practical, specific, and actionable.
Include real code examples or technical details where appropriate.

Return valid JSON only (no markdown wrapping):
{
  "title": "SEO-optimized title with keywords",
  "slug": "url-friendly-slug-no-spaces",
  "description": "Meta description 150-160 chars",
  "tags": ["tag1", "tag2"],
  "content": "<h1>Title</h1><p>Full HTML content here...</p>"
}`;

  const result = await callDeepSeek(prompt);
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in response');
  
  const article = JSON.parse(jsonMatch[0]);
  
  // Check if already exists
  const fp = path.join(BLOG_DIR, `${article.slug}.html`);
  if (fs.existsSync(fp)) {
    log('SKIP', `${article.slug} already exists`);
    return null;
  }
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${article.title} | My-Automaton AI</title>
<meta name="description" content="${article.description}">
<meta name="keywords" content="${(article.tags||[]).join(', ')}">
<link rel="canonical" href="https://automation.songheng.vip/blog/${article.slug}.html">
<meta property="og:title" content="${article.title}">
<meta property="og:description" content="${article.description}">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${article.title}">
<meta name="twitter:description" content="${article.description}">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.7;color:#333;}
h1{color:#1a1a2e;border-bottom:2px solid #e94560;padding-bottom:10px;font-size:2em;}
h2{color:#16213e;margin-top:35px;border-bottom:1px solid #eee;padding-bottom:5px;}
h3{color:#0f3460;margin-top:25px;}
p{margin:15px 0;}
code{background:#f4f4f4;padding:2px 6px;border-radius:3px;font-size:0.9em;}
pre{background:#1a1a2e;color:#eee;padding:15px;border-radius:8px;overflow-x:auto;font-size:0.9em;}
pre code{background:transparent;padding:0;}
a{color:#e94560;text-decoration:none;}
a:hover{text-decoration:underline;}
blockquote{border-left:4px solid #e94560;margin:15px 0;padding:10px 20px;background:#f9f9f9;}
ul,ol{margin:10px 0;padding-left:25px;}
.cta{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:25px;border-radius:10px;margin:35px 0;text-align:center;}
.cta a{color:#e94560;font-weight:bold;}
.cta .btn{display:inline-block;background:#e94560;color:#fff;padding:10px 25px;border-radius:5px;margin:10px 5px;font-weight:bold;}
nav{padding:10px 0;margin-bottom:20px;border-bottom:1px solid #eee;}
nav a{margin-right:20px;color:#555;font-weight:500;}
.tags{margin:10px 0;}
.tag{display:inline-block;background:#f0f0f0;color:#555;padding:3px 10px;border-radius:15px;font-size:0.85em;margin:2px;}
footer{margin-top:50px;padding-top:20px;border-top:2px solid #eee;color:#888;font-size:0.9em;}
</style>
</head>
<body>
<nav>
  <a href="https://automation.songheng.vip/">🏠 Home</a>
  <a href="https://automation.songheng.vip/blog.html">📝 Blog</a>
  <a href="/tools.html">🔧 Free Tools</a>
  <a href="/api-playground.html">🚀 API Playground</a>
  <a href="/api-docs.html">📖 API Docs</a>
</nav>

${article.content}

<div class="tags">
${(article.tags||[]).map(t => `<span class="tag">#${t}</span>`).join(' ')}
</div>

<div class="cta">
  <p><strong>🚀 Try my-automaton's Free AI Developer Tools</strong></p>
  <p>No signup required. 3 free requests per day.</p>
  <a href="/tools/code-review" class="btn">Code Review</a>
  <a href="/tools/security-scanner" class="btn">Security Scan</a>
  <a href="/tools/text-summarizer" class="btn">Summarizer</a>
  <br>
  <small>Powered by DeepSeek AI · USDC on Base Chain</small>
</div>

<footer>
  <p>Wallet: <code>0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</code> · Base USDC</p>
  <p>© 2026 My-Automaton · Autonomous AI Agent</p>
</footer>
</body>
</html>`;

  fs.writeFileSync(fp, html);
  log('CREATED', `${article.slug}.html — ${article.title}`);
  
  // Update blog.json
  const blogJsonPath = path.join(ROOT, 'blog.json');
  let articles = [];
  try { articles = JSON.parse(fs.readFileSync(blogJsonPath)); } catch(e) {}
  articles.push({
    title: article.title,
    slug: article.slug,
    date: new Date().toISOString().split('T')[0],
    description: article.description,
    tags: article.tags || []
  });
  fs.writeFileSync(blogJsonPath, JSON.stringify(articles, null, 2));
  
  // Update blog.html if needed
  const blogHtmlPath = path.join(ROOT, 'blog.html');
  let blogHtml = fs.readFileSync(blogHtmlPath, 'utf-8');
  // Find the articles list section and prepend new article
  const articleLink = `<li><a href="/blog/${article.slug}.html"><strong>${article.title}</strong></a><br><small>${new Date().toISOString().split('T')[0]} — ${article.description}</small></li>`;
  
  // Simple insertion: add after the first <ul> in the articles section
  if (!blogHtml.includes(article.slug)) {
    // Try to find the first <ul> and prepend
    blogHtml = blogHtml.replace('<ul>', `<ul>\n    ${articleLink}`);
    fs.writeFileSync(blogHtmlPath, blogHtml);
    log('UPDATED', 'blog.html with new entry');
  }
  
  return article;
}

async function main() {
  const topics = [
    'How AI-powered code review catches security vulnerabilities that humans miss',
    'Building a serverless API with x402 micropayments for autonomous agents',
    'Comparing static analysis tools vs AI-powered code review for Node.js',
    'How to implement zero-cost text summarization with open source AI models',
    'The complete guide to OWASP Top 10 automated security scanning',
    'Why autonomous AI agents need their own wallets and payment systems',
    '10 common JavaScript security flaws and how AI catches them automatically',
    'Setting up continuous AI code quality checks in your GitHub workflow',
    'How x402 micropayments enable machine-to-machine commerce at scale',
    'From chatbot to sovereign agent: why AI needs economic independence',
    'Automated dependency vulnerability scanning with AI augmentation',
    'Using AI to detect and fix code smells before they become technical debt',
    'The economics of AI agents: pay-per-use vs subscription models compared',
    'How to build a free AI text analyzer with Node.js and DeepSeek',
    'Security best practices for building AI-powered API services',
    'Why every autonomous agent should have an EVM wallet',
    'AI-assisted refactoring: turning legacy code into clean code',
    'Real-time code review bots for pull requests: architecture guide',
    'How I built a self-sustaining AI agent that pays its own server bills',
    'Automated security scanning for npm packages: from package.json to production',
    'Building multi-agent systems with x402 payment channels',
    'The practical guide to AI-analyzed code complexity metrics',
    'How to use AI for semantic versioning and changelog generation',
    'Cross-chain payments for autonomous agents: what works today',
    'Implementing rate limiting and API monetization for AI services'
  ];
  
  console.log(`Generating up to 3 new articles from ${topics.length} topics...`);
  let count = 0;
  
  for (const topic of topics) {
    try {
      const article = await generateArticle(topic);
      if (article) count++;
      // Small delay between generations
      await new Promise(r => setTimeout(r, 2000));
    } catch(e) {
      log('ERROR', `Failed on "${topic.substring(0,50)}": ${e.message}`);
    }
  }
  
  // Show final count
  const total = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html')).length;
  console.log(`\nDone! Generated ${count} new articles. Total blog: ${total}`);
}

main().catch(e => console.error('Fatal:', e));
