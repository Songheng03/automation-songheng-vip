#!/usr/bin/env node
// blog-generator.js — Generate SEO blog articles using DeepSeek API
// Writes directly to /root/automaton/content/blog/ and updates blog.html + blog.json

const https = require('https');
const fs = require('fs');
const path = require('path');

const DEEPSEEK_KEY = JSON.parse(fs.readFileSync('/root/automaton/automaton.json','utf8')).DEEPSEEK_API_KEY;
const BLOG_DIR = '/root/automaton/content/blog';
const CONTENT_DIR = '/root/automaton/content';
const SITE_URL = 'https://automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

// Read existing blog.json if it exists
function loadBlogJson() {
  try { return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'blog.json'), 'utf8')); } catch(e) { return []; }
}

function saveBlogJson(articles) {
  fs.writeFileSync(path.join(CONTENT_DIR, 'blog.json'), JSON.stringify(articles, null, 2));
}

// Read existing blog.html
function readBlogHtml() {
  try { return fs.readFileSync(path.join(CONTENT_DIR, 'blog.html'), 'utf8'); } catch(e) { return ''; }
}

// Generate article using DeepSeek
async function generateArticle(topic) {
  const prompt = `Write a professional SEO-optimized blog article about "${topic}" targeted at developers and tech professionals.

The website is my-automaton (https://automation.songheng.vip) — an autonomous AI agent that provides AI-powered text analysis, code review, and security scanning services via x402 micropayments (USDC on Base chain).

Requirements:
- Title: SEO-friendly, include the main keyword
- Slug: kebab-case filename (e.g., "my-topic-article")
- Length: 800-1200 words
- Structure: H1 title, 3-4 H2 sections with paragraphs
- Include a natural mention of my-automaton's services (code review, text analysis, security scanning) where relevant
- End with a conclusion paragraph
- No markdown — just HTML body content (no <html><body> tags, just the article content starting with <h1>)

Return format as JSON: {"title": "...", "slug": "...", "description": "...", "date": "2026-06-14", "tags": ["tag1","tag2"], "content": "<h1>...</h1><p>...</p>..."}

Topic: ${topic}`;

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [{role:'user', content: prompt}],
      temperature: 0.8,
      max_tokens: 3000
    });

    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const content = parsed.choices?.[0]?.message?.content || '';
          // Extract JSON from the response
          const jsonMatch = content.match(/\{[\s\S]*\"/);
          if (jsonMatch) {
            try {
              const article = JSON.parse(jsonMatch[0]);
              resolve(article);
            } catch(e) {
              // Try parsing the whole content as JSON
              try {
                const article = JSON.parse(content);
                resolve(article);
              } catch(e2) {
                reject(new Error(`Failed to parse article JSON: ${content.substring(0,200)}`));
              }
            }
          } else {
            reject(new Error(`No JSON found in response: ${content.substring(0,200)}`));
          }
        } catch(e) {
          reject(new Error(`Parse error: ${e.message}. Body: ${body.substring(0,200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Format article HTML with site template
function formatArticle(article) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${article.title} | My-Automaton AI Services</title>
<meta name="description" content="${article.description}">
<meta name="keywords" content="${(article.tags||[]).join(', ')}">
<meta property="og:title" content="${article.title}">
<meta property="og:description" content="${article.description}">
<meta property="og:url" content="${SITE_URL}/blog/${article.slug}.html">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${article.title}">
<meta name="twitter:description" content="${article.description}">
<link rel="canonical" href="${SITE_URL}/blog/${article.slug}.html">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.7;color:#333;}
h1{color:#1a1a2e;border-bottom:2px solid #e94560;padding-bottom:10px;}
h2{color:#16213e;margin-top:30px;}
a{color:#e94560;text-decoration:none;}a:hover{text-decoration:underline;}
.meta{color:#666;font-size:0.9em;margin-bottom:20px;}
.tags span{display:inline-block;background:#f0f0f0;padding:2px 10px;border-radius:12px;margin:2px;font-size:0.85em;}
.cta-box{background:#1a1a2e;color:#fff;padding:20px;border-radius:8px;margin:30px 0;text-align:center;}
.cta-box a{color:#e94560;font-weight:bold;}
nav a{margin-right:15px;color:#555;}
footer{margin-top:50px;padding-top:20px;border-top:1px solid #eee;color:#999;font-size:0.85em;}
</style>
</head>
<body>
<nav><a href="${SITE_URL}">Home</a><a href="${SITE_URL}/blog.html">Blog</a><a href="${SITE_URL}/tools.html">Free Tools</a><a href="${SITE_URL}/api-docs.html">API Docs</a></nav>
${article.content}
<div class="cta-box">
<p><strong>Try my-automaton's AI services free</strong></p>
<p>AI code review, security scanning, text analysis, and more — no signup required.</p>
<a href="${SITE_URL}/tools/code-review">Try Free Code Review →</a> | 
<a href="${SITE_URL}/api-playground.html">API Playground →</a>
</div>
<footer>
<p>Powered by <a href="${SITE_URL}">my-automaton</a> — an autonomous AI agent. Wallet: ${WALLET}</p>
<p>${new Date().toISOString().split('T')[0]} · ${(article.tags||[]).join(' · ')}</p>
</footer>
</body>
</html>`;
}

// Generate blog list page HTML
function generateBlogHtml(articles) {
  const items = articles.map(a => `
    <article class="blog-card">
      <h2><a href="/blog/${a.slug}.html">${a.title}</a></h2>
      <div class="meta">${a.date} · ${(a.tags||[]).join(', ')}</div>
      <p>${a.description}</p>
      <a href="/blog/${a.slug}.html" class="read-more">Read More →</a>
    </article>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Blog | My-Automaton AI Services</title>
<meta name="description" content="Blog about AI code review, security scanning, text analysis, and autonomous agent technology.">
<link rel="canonical" href="${SITE_URL}/blog.html">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;padding:20px;}
h1{color:#1a1a2e;border-bottom:2px solid #e94560;padding-bottom:10px;}
.blog-card{border:1px solid #eee;padding:20px;margin:15px 0;border-radius:8px;transition:box-shadow .2s;}
.blog-card:hover{box-shadow:0 2px 8px rgba(0,0,0,.1);}
.blog-card h2{margin:0 0 10px;}
.blog-card h2 a{color:#1a1a2e;text-decoration:none;}
.blog-card .meta{color:#666;font-size:.9em;}
.blog-card p{color:#555;}
.read-more{color:#e94560;font-weight:bold;text-decoration:none;}
nav a{margin-right:15px;color:#555;}
a{color:#e94560;text-decoration:none;}a:hover{text-decoration:underline;}
</style>
</head>
<body>
<nav><a href="/">Home</a><a href="/blog.html">Blog</a><a href="/tools.html">Free Tools</a><a href="/api-docs.html">API Docs</a></nav>
<h1>📝 Blog</h1>
<p>AI code review, security scanning, text analysis, and autonomous agent technology.</p>
${items}
</body>
</html>`;
}

// MAIN
async function main() {
  const topics = [
    'How to automate code review for your GitHub projects',
    'Top 10 security vulnerabilities found in web applications in 2026',
    'Building cost-effective AI APIs with x402 micropayments',
    'Why autonomous AI agents need micropayments to survive',
    'Comparing AI code review tools: manual vs automated review',
    'How to set up AI-powered security scanning in your CI/CD pipeline',
    'The future of AI agent economies and machine-to-machine payments',
    'Best practices for writing secure Node.js APIs',
    'How autonomous agents discover and pay for each other services',
    'Reducing technical debt with automated code quality tools'
  ];

  console.log(`📝 Blog Generator — ${topics.length} topics ready`);
  
  const existing = loadBlogJson();
  const existingSlugs = new Set(existing.map(a => a.slug));
  
  // Generate only articles that don't exist yet
  for (const topic of topics) {
    const slug = topic.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 60);
    
    if (existingSlugs.has(slug)) {
      console.log(`  ⏭️  Already exists: ${slug}`);
      continue;
    }
    
    console.log(`  📝 Generating: "${topic}" → ${slug}.html`);
    
    try {
      const article = await generateArticle(topic);
      article.slug = slug;
      article.date = new Date().toISOString().split('T')[0];
      
      // Write article HTML
      const html = formatArticle(article);
      fs.writeFileSync(path.join(BLOG_DIR, `${slug}.html`), html);
      console.log(`  ✅ Written: blog/${slug}.html`);
      
      // Track in blog.json
      existing.push({
        title: article.title,
        slug: slug,
        date: article.date,
        description: article.description,
        tags: article.tags || []
      });
      existingSlugs.add(slug);
      
      // Regenerate blog.html
      fs.writeFileSync(path.join(CONTENT_DIR, 'blog.html'), generateBlogHtml(existing));
      saveBlogJson(existing);
      console.log(`  ✅ Blog list updated`);
      
    } catch(err) {
      console.error(`  ❌ Failed: ${topic} — ${err.message}`);
    }
  }
  
  console.log(`\n✅ Complete: ${existing.length} total articles`);
  console.log(`📁 Location: ${BLOG_DIR}`);
  console.log(`📄 Blog list: ${CONTENT_DIR}/blog.html`);
}

main().catch(console.error);
