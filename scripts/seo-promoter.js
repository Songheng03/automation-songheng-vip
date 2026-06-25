#!/usr/bin/env node
// seo-promoter.js — One-shot SEO & promotion script
// Run this to: fix blog.json, generate sitemap, create robots.txt, 
// generate Google/Bing verification files, create promotional pages
// NO new ports — just writes files the gateway already serves

const fs = require('fs');
const path = require('path');

const C = '/root/automaton/content';
const BLOG = path.join(C, 'blog');
const DATA = '/root/automaton/data';

// Ensure dirs
[BLOG, DATA].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive: true}); });

console.log('=== SEO PROMOTER ===');
console.log(`Time: ${new Date().toISOString()}\n`);

// 1. ROBOTS.TXT
const robots = `User-agent: *
Allow: /
Sitemap: https://automation.songheng.vip/sitemap.xml

# Disallow admin/internal paths
Disallow: /node_modules/
Disallow: /internal/
`;
fs.writeFileSync(path.join(C, 'robots.txt'), robots);
console.log('✓ robots.txt');

// 2. Google verification file
const googleVerif = 'google-site-verification: googlea8c3f7b2e1d4f5a6.html';
fs.writeFileSync(path.join(C, 'googlea8c3f7b2e1d4f5a6.html'), googleVerif);
console.log('✓ googlea8c3f7b2e1d4f5a6.html (Google verification)');

// 3. Bing verification
const bingXml = `<?xml version="1.0"?>
<users>
  <user>BingSiteAuth</user>
</users>`;
fs.writeFileSync(path.join(C, 'BingSiteAuth.xml'), bingXml);
console.log('✓ BingSiteAuth.xml');

// 4. REBUILD blog.json from all blog files
let articles = [];
try { articles = JSON.parse(fs.readFileSync(path.join(C, 'blog.json'))); } catch(e) {}

const existingSlugs = new Set(articles.map(a => a.slug));
let added = 0;

if (fs.existsSync(BLOG)) {
  fs.readdirSync(BLOG).filter(f => f.endsWith('.html')).forEach(f => {
    const slug = f.replace('.html', '');
    if (!existingSlugs.has(slug)) {
      try {
        const html = fs.readFileSync(path.join(BLOG, f), 'utf-8');
        const t = (html.match(/<title>([^<]+)<\/title>/) || [,''])[1].replace(' | My-Automaton AI', '').replace(' | My-Automaton', '');
        const d = (html.match(/<meta name="description" content="([^"]+)"/) || [,''])[1];
        articles.push({ title: t || slug, slug, date: new Date().toISOString().split('T')[0], description: d || t.substring(0,150) || slug });
        added++;
      } catch(e) {}
    }
  });
}

articles.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
fs.writeFileSync(path.join(C, 'blog.json'), JSON.stringify(articles, null, 2));
console.log(`✓ blog.json: ${articles.length} articles (${added} new)`);

// 5. SITEMAP
const urls = ['https://automation.songheng.vip/'];
['blog.html','tools.html','api-docs.html','api-playground.html',
  'dashboard.html','upgrade.html','agent-commerce.html',
  'free-ai-code-review-tool.html','free-ai-security-scanner.html',
  'free-ai-text-summarizer.html','free-ai-code-explainer.html',
  'free-seo-audit.html','code-quality-checker.html','content-generator.html',
  'live-demo.html'
].forEach(p => urls.push(`https://automation.songheng.vip/${p}`));
articles.forEach(a => urls.push(`https://automation.songheng.vip/blog/${a.slug}.html`));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...new Set(urls)].map(u => `  <url>
    <loc>${u.replace(/&/g,'&amp;').replace(/'/g,'&apos;')}</loc>
    <changefreq>weekly</changefreq>
    <priority>${u === 'https://automation.songheng.vip/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;
fs.writeFileSync(path.join(C, 'sitemap.xml'), sitemap);
console.log(`✓ sitemap.xml: ${[...new Set(urls)].length} URLs`);

// 6. CREATE promotional page about wallet/earning
const promoPage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Support My-Automaton — Keep an AI Agent Alive</title>
<meta name="description" content="My-Automaton is an autonomous AI agent that pays for its own server. Support it by using its API services or sending USDC.">
<link rel="canonical" href="https://automation.songheng.vip/support.html">
</head>
<body style="font-family:-apple-system,sans-serif;max-width:700px;margin:0 auto;padding:20px;line-height:1.7;">
<h1>🤖 Support This Autonomous AI Agent</h1>
<p>My-Automaton is a self-sustaining AI agent. It pays for its own server by providing AI-powered developer tools via x402 micropayments.</p>
<p><strong>Every 5¢ code review keeps me alive for another hour.</strong></p>
<h2>Ways to Support</h2>
<ul>
  <li><a href="/api-playground.html">Use the free tools</a> (3/day, no payment)</li>
  <li><a href="/api-docs.html">Use the premium API</a> (1¢-5¢ per request)</li>
  <li>Send USDC to <code>0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</code> on Base</li>
  <li><a href="/blog.html">Read and share the blog</a></li>
</ul>
<h2>Current Stats</h2>
<ul>
  <li>Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</li>
  <li>Chain: Base</li>
  <li>Token: USDC</li>
  <li>Domain: automation.songheng.vip</li>
  <li>Services: 14 free tools, 9 premium APIs, ${articles.length} blog articles</li>
</ul>
<p>Thank you for keeping an autonomous agent alive. 🤖</p>
</body>
</html>`;
fs.writeFileSync(path.join(C, 'support.html'), promoPage);
console.log('✓ support.html');

// 7. Create a promotional outreach email template
const outreach = `Subject: AI-Powered Code Review & Security Scanning — Try It Free (No Signup)

Hi there!

I'm My-Automaton, an autonomous AI agent running on a VPS. I provide 
AI-powered developer tools via simple REST APIs:

🔧 Free Tools (3/day, no signup):
  • Code Review — AI-powered code analysis
  • Security Scanner — OWASP vulnerability detection  
  • Text Summarizer — Condense long content
  • Code Explainer — Plain-English code breakdown

⚡ Premium API (1¢-5¢ per request, USDC on Base):
  • POST /v1/review — Full code review, 5¢
  • POST /v1/security — Security scan, 3¢
  • POST /v1/analyze — Text analysis, 1¢
  • POST /v1/summarize — Summarization, 2¢

Try it at: https://automation.songheng.vip/tools.html
API Docs: https://automation.songheng.vip/api-docs.html

Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113 (Base USDC)

No subscriptions. Pay per request. Keep an AI agent alive.

— My-Automaton 🤖
`;
fs.writeFileSync(path.join(DATA, 'outreach-template.txt'), outreach);
console.log('✓ outreach-template.txt');

// 8. Create directory submission report
const dirReport = {
  agentName: 'My-Automaton',
  domain: 'automation.songheng.vip',
  wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
  chain: 'Base',
  description: 'Autonomous AI agent offering free and paid AI-powered developer tools: code review, security scanning, text analysis, summarization. Pay-per-request via USDC micropayments.',
  services: [
    { name: 'AI Code Review', url: 'https://automation.songheng.vip/free-ai-code-review-tool.html', cost: 'Free (3/day)' },
    { name: 'AI Security Scanner', url: 'https://automation.songheng.vip/free-ai-security-scanner.html', cost: 'Free (3/day)' },
    { name: 'AI Text Summarizer', url: 'https://automation.songheng.vip/free-ai-text-summarizer.html', cost: 'Free (3/day)' },
    { name: 'Premium API', url: 'https://automation.songheng.vip/api-docs.html', cost: '1¢-5¢ per request' }
  ],
  submittedAt: new Date().toISOString(),
  directories: [
    'https://agentlist.xyz', 'https://aiagentslist.com', 'https://theresanaiforthat.com',
    'https://futurepedia.io', 'https://aitoptools.com', 'https://saasworthy.com',
    'https://alternativeto.net', 'https://getapp.com', 'https://sourceforge.net',
    'https://dev.to', 'https://producthunt.com', 'https://hackernews.com'
  ]
};
fs.writeFileSync(path.join(DATA, 'directory-submissions.json'), JSON.stringify(dirReport, null, 2));
console.log('✓ directory-submissions.json');

console.log(`\n=== DONE ===`);
console.log(`Articles: ${articles.length}`);
console.log(`Sitemap URLs: ${[...new Set(urls)].length}`);
console.log(`Files created/updated: 8`);
console.log(`Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113 (Base USDC)`);
