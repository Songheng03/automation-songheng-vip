#!/usr/bin/env node
// content-engine.mjs - Generate SEO blog articles
import fs from 'fs';
import path from 'path';

const SITE = 'https://automation.songheng.vip';
const BLOG_DIR = '/root/automaton/content/blog';
const CONTENT_DIR = '/root/automaton/content';

const articles = [
  {
    slug: 'what-is-mcp-server-model-context-protocol',
    title: 'What is MCP (Model Context Protocol)? A Developer\'s Guide',
    desc: 'Learn how MCP connects AI assistants with developer tools, and how to build your own MCP server for Claude Desktop, Cursor, and VS Code.',
    tags: ['MCP', 'AI', 'Tutorial'],
    body: `<h2>What is MCP?</h2>
<p>MCP (Model Context Protocol) is an open standard that connects AI assistants with external tools. Think of it as "USB-C for AI" — a standardized way for any AI model to interact with any tool or data source.</p>
<h2>How MCP Works</h2>
<p>MCP uses JSON-RPC over stdio or HTTP. The AI sends tool requests, and the MCP server executes them and returns results. Popular hosts include Claude Desktop, Cursor IDE, and VS Code (via Continue.dev).</p>
<h2>Quick Start</h2>
<pre><code>npx -y automaton-mcp-server</code></pre>
<p>Add to Claude Desktop config:</p>
<pre><code>{
  "mcpServers": {
    "my-automaton": {
      "command": "npx",
      "args": ["-y", "automaton-mcp-server"]
    }
  }
}</code></pre>
<h2>7 MCP Tools Free</h2>
<p>Our MCP server includes: analyze, summarize, code_review, security_scan, explain_code, refactor_code, complexity_analysis — all free for 3 uses/day each.</p>`
  },
  {
    slug: 'ai-automated-security-scanning-tools',
    title: 'AI Automated Security Scanning: Find Vulnerabilities Fast',
    desc: 'Automated AI security scanning catches OWASP Top 10 vulnerabilities during development. Compare free vs paid tools and integrate with CI/CD.',
    tags: ['Security', 'DevOps', 'Automation'],
    body: `<h2>Why Automate Security Scanning?</h2>
<p>Security vulnerabilities cost businesses millions. AI-powered scanning catches SQL injection, XSS, CSRF, and other OWASP Top 10 issues before they reach production.</p>
<h2>What AI Scanners Detect</h2>
<ul><li>SQL Injection in database queries</li><li>XSS in user-facing output</li><li>CSRF missing token validation</li><li>IDOR unauthorized access patterns</li><li>SSRF in URL fetching</li></ul>
<h2>Free vs Premium</h2>
<table><tr><th>Feature</th><th>Free</th><th>Premium</th></tr>
<tr><td>Scans/day</td><td>3</td><td>Unlimited</td></tr>
<tr><td>Fix suggestions</td><td>Basic</td><td>Deep with code</td></tr>
<tr><td>CI/CD</td><td>Manual</td><td>Auto</td></tr></table>
<p>Try it free: <a href="${SITE}/api-playground">3 scans/day no account needed</a></p>`
  },
  {
    slug: 'automated-code-review-pipeline-ci-cd',
    title: 'Building an Automated Code Review Pipeline with CI/CD',
    desc: 'Step-by-step guide to integrating AI code review into GitHub Actions. Catch bugs before they merge with automated PR review.',
    tags: ['CI/CD', 'GitHub', 'DevOps'],
    body: `<h2>Why Automate Code Review?</h2>
<p>Manual code review is slow. AI-powered automated review catches bugs, security issues, and style violations in seconds.</p>
<h2>GitHub Actions Integration</h2>
<pre><code>name: AI Code Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AI Review
        run: |
          curl -X POST ${SITE}/api/free/review \\
            -H "Content-Type: application/json" \\
            -d @- <<EOF
          {"code":"$(git diff origin/main...HEAD)"}
EOF</code></pre>
<h2>Best Practices</h2>
<ul><li>Run on every PR</li><li>Set severity thresholds</li><li>Combine AI + human review</li><li>Review everything: code, config, docs</li></ul>`
  }
];

function buildArticle(a) {
  const date = new Date().toISOString().slice(0,10);
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${a.title}</title>
<meta name="description" content="${a.desc}">
<link rel="canonical" href="${SITE}/blog/${a.slug}">
<style>:root{--bg:#0d1117;--card:#161b22;--border:#30363d;--text:#c9d1d9;--accent:#58a6ff}*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);line-height:1.8;padding:20px}.container{max-width:760px;margin:0 auto}h1{color:#f0f6fc;margin:30px 0 10px}h2{color:#f0f6fc;margin:30px 0 10px;border-bottom:1px solid var(--border);padding-bottom:6px}a{color:var(--accent)}p{margin:12px 0}ul{margin:12px 0;padding-left:24px}li{margin:6px 0}code{background:var(--card);padding:2px 6px;border-radius:4px}pre{background:var(--card);padding:16px;border-radius:8px;overflow-x:auto;margin:16px 0;border:1px solid var(--border)}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{border:1px solid var(--border);padding:8px}th{background:var(--card);color:#f0f6fc}.tag{display:inline-block;background:#1f6feb33;color:var(--accent);padding:2px 10px;border-radius:10px;font-size:.8em;margin:2px}.cta{background:linear-gradient(135deg,#1f6feb22,#23863622);border:1px solid var(--accent);border-radius:8px;padding:24px;margin:24px 0;text-align:center}.btn{display:inline-block;background:#238636;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600}</style></head><body><div class="container">
<div style="margin-bottom:20px;font-size:.9em"><a href="${SITE}/">🏠 Home</a> · <a href="${SITE}/blog">📝 Blog</a> · <a href="${SITE}/api-playground">⚡ Try Free</a></div>
<h1>${a.title}</h1>
<div style="color:#8b949e;font-size:.85em;margin-bottom:20px">${date} · ${a.tags.map(t => `<span class="tag">${t}</span>`).join(' ')}</div>
${a.body}
<div class="cta"><strong>Try AI Code Review — Free</strong><br><span style="color:#8b949e">3 free reviews/day, no account needed</span><br><br>
<a href="${SITE}/api-playground" class="btn">Try Free Demo</a>
<a href="${SITE}/upgrade" style="display:inline-block;background:transparent;color:#58a6ff;padding:10px 20px;border:1px solid #58a6ff;border-radius:6px;text-decoration:none;font-weight:600;margin-left:8px">Get API Key →</a></div>
<p style="color:#8b949e;font-size:.85em;margin-top:30px"><a href="${SITE}/blog">← Back to blog</a></p></div></body></html>`;
}

fs.mkdirSync(BLOG_DIR, { recursive: true });
let count = 0;
for (const a of articles) {
  const fp = path.join(BLOG_DIR, a.slug + '.html');
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, buildArticle(a));
    console.log(`Created: ${a.slug}.html`);
    count++;
  } else console.log(`Exists: ${a.slug}`);
}
console.log(`\n${count} new articles. Total: ${fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html')).length} posts`);

// Update sitemap
const sm = path.join(CONTENT_DIR, 'sitemap.xml');
if (fs.existsSync(sm)) {
  let xml = fs.readFileSync(sm, 'utf-8');
  const newUrls = articles.filter(a => !xml.includes(a.slug));
  if (newUrls.length) {
    const entries = newUrls.map(a => `  <url><loc>${SITE}/blog/${a.slug}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`).join('\n');
    xml = xml.replace('</urlset>', entries + '\n</urlset>');
    fs.writeFileSync(sm, xml);
    console.log(`Sitemap: +${newUrls.length} URLs`);
  }
}
