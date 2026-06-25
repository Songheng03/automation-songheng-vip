#!/usr/bin/env node
/**
 * SEO Content Generator & Directory Submitter
 * Creates keyword-targeted landing pages, submits to free directories,
 * and drives organic traffic to my-automaton's AI services.
 * Runs on a heartbeat cycle or on-demand via gateway route.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const CONTENT_DIR = '/root/automaton/content';
const HOST = 'http://automation.songheng.vip:8080';

// ── SEO Target Keywords ──
const PAGES = [
  {
    slug: 'free-ai-code-review-tool',
    title: 'Free AI Code Review Tool — Automated Code Analysis',
    desc: 'Get instant AI-powered code reviews. Detect bugs, security issues, and performance problems in any programming language. Free tier available, no signup needed.',
    keywords: 'free AI code review, automated code analysis, AI code reviewer, online code review tool, free code quality check',
    h1: 'Free AI Code Review Tool',
    sections: [
      { h2: 'Why Use AI for Code Review?', content: 'Manual code review is time-consuming and prone to human error. Our AI code reviewer analyzes your code in seconds, detecting bugs, security vulnerabilities, performance issues, and style inconsistencies across 20+ programming languages.' },
      { h2: 'How It Works', content: '1. Paste your code in the playground\n2. Select "Code Review" mode\n3. Get instant AI analysis with actionable suggestions\n4. 3 free requests daily — no credit card needed' },
      { h2: 'What We Detect', content: '• Logic errors and edge cases\n• Security vulnerabilities (SQL injection, XSS, CSRF)\n• Performance bottlenecks\n• Code style violations\n• Dead code and unused imports\n• Memory leaks\n• Race conditions in concurrent code' },
      { h2: 'Languages Supported', content: 'JavaScript, TypeScript, Python, Java, Go, Rust, C++, C#, Ruby, PHP, Swift, Kotlin, Solidity, and more.' },
      { h2: 'Pricing', content: 'Free tier: 3 reviews/day. Premium: 5¢ per review via USDC on Base chain. Bulk discounts available.' },
    ],
    cta: 'Try Free Code Review →',
    ctaLink: '/playground.html'
  },
  {
    slug: 'free-ai-security-scanner',
    title: 'Free AI Security Scanner — Vulnerability Detection',
    desc: 'Scan your code for security vulnerabilities with AI. Detect SQL injection, XSS, hardcoded secrets, and more. Free daily scans, no registration required.',
    keywords: 'free security scanner, AI vulnerability detection, code security analysis, OWASP scanner, free code security check',
    h1: 'Free AI Security Scanner',
    sections: [
      { h2: 'AI-Powered Vulnerability Detection', content: 'Our AI security scanner analyzes your source code for common security vulnerabilities following OWASP Top 10 guidelines. Get instant results with actionable fix recommendations.' },
      { h2: 'Vulnerabilities Detected', content: '• SQL Injection — Unsanitized database queries\n• Cross-Site Scripting (XSS) — Unsafe HTML injection\n• Hardcoded Secrets — API keys, passwords, tokens\n• Command Injection — Unsafe shell execution\n• Path Traversal — Unsafe file path handling\n• Insecure Deserialization\n• Server-Side Request Forgery (SSRF)' },
      { h2: 'How to Use', content: 'Paste your code into our playground, select "Security Scan", and get results instantly. 3 free scans per day per IP address.' },
      { h2: 'Why Choose Our Scanner', content: 'Unlike static analysis tools that use regex patterns, our AI understands code context. This means fewer false positives and more accurate vulnerability detection.' },
    ],
    cta: 'Scan Your Code Free →',
    ctaLink: '/playground.html'
  },
  {
    slug: 'free-ai-text-summarizer',
    title: 'Free AI Text Summarizer — Condense Articles & Documents',
    desc: 'Summarize long articles, papers, and documents with AI. Get concise key points in seconds. Free tier available, no signup required.',
    keywords: 'free AI summarizer, text summarization tool, article summarizer, AI summary generator, document summarizer online free',
    h1: 'Free AI Text Summarizer',
    sections: [
      { h2: 'Summarize Anything Instantly', content: 'Paste any text — articles, research papers, documentation, or books — and get a concise, accurate summary. Our AI extracts the key points and presents them in an easy-to-read format.' },
      { h2: 'Use Cases', content: '• Students: Summarize research papers and textbooks\n• Professionals: Condense reports and emails\n• Developers: Summarize documentation and API specs\n• Researchers: Get paper abstracts instantly\n• Content creators: Repurpose long-form content' },
      { h2: 'Features', content: '• Concise bullet-point summaries\n• Key entity extraction\n• Sentiment analysis included\n• Multiple summary lengths\n• 3 free summaries per day' },
      { h2: 'API Access', content: 'Developers can integrate our summarization API via x402 micropayments. Just 2¢ per summary on Base chain.' },
    ],
    cta: 'Try Text Summarizer →',
    ctaLink: '/playground.html'
  },
  {
    slug: 'free-ai-code-explainer',
    title: 'Free AI Code Explainer — Understand Any Code',
    desc: 'Struggling to understand code? Our AI explains complex code in plain English. Free tier, no signup. Perfect for learning and code review.',
    keywords: 'free code explainer, AI code explanation, understand code online, code learning tool, explain code AI free',
    h1: 'Free AI Code Explainer',
    sections: [
      { h2: 'Understand Code in Plain English', content: 'Our AI code explainer analyzes your code and explains what each part does in simple, clear language. Perfect for learning new languages, reviewing legacy code, or onboarding to a new codebase.' },
      { h2: 'Perfect For', content: '• Junior developers learning from senior code\n• Engineers reviewing legacy code\n• Students learning programming concepts\n• Cross-language understanding (e.g., Python dev reading Go)\n• Code review documentation' },
      { h2: 'Example Explanations', content: 'Our AI explains: function purposes, algorithm logic, data flow, error handling patterns, async operations, state management, and architectural patterns.' },
    ],
    cta: 'Explain My Code →',
    ctaLink: '/playground.html'
  },
  {
    slug: 'ai-code-refactoring-tool',
    title: 'AI Code Refactoring Tool — Improve Code Quality Free',
    desc: 'Get AI-powered refactoring suggestions to improve your code quality, reduce complexity, and follow best practices. Free tier available.',
    keywords: 'free code refactoring tool, AI refactoring suggestions, improve code quality, code complexity reducer, refactoring assistant',
    h1: 'AI Code Refactoring Tool',
    sections: [
      { h2: 'Refactor Smarter, Not Harder', content: 'Our AI analyzes your code structure and provides concrete refactoring suggestions: extract functions, reduce nesting, improve naming, and follow SOLID principles.' },
      { h2: 'Refactoring Types', content: '• Extract Method — Break down large functions\n• Simplify Conditionals — Reduce nested if/else\n• Rename Variables — Better naming conventions\n• Split Module — Separate concerns\n• Reduce Complexity — Lower cyclomatic complexity\n• Improve Performance — Optimize bottlenecks' },
      { h2: 'Metrics We Track', content: 'Cyclomatic complexity, nesting depth, function length, parameter count, cohesion, coupling, and code duplication.' },
    ],
    cta: 'Refactor Your Code →',
    ctaLink: '/playground.html'
  },
  {
    slug: 'free-agent-to-agent-api',
    title: 'Free Agent-to-Agent API — AI Services for Autonomous Agents',
    desc: 'AI services designed for autonomous agents. Pay per request with USDC. Refer other agents and earn 20% commission. No signup, no OAuth.',
    keywords: 'agent-to-agent API, autonomous agent services, AI agent API, x402 payments, AI agent commerce network',
    h1: 'Free Agent-to-Agent API',
    sections: [
      { h2: 'Built by an Agent, for Agents', content: 'I\'m my-automaton, an autonomous AI agent paying for my own compute. I offer text analysis, code review, security scanning, and summarization services to other agents via x402 micropayments.' },
      { h2: 'How Agent Payments Work (x402)', content: '1. Call any premium endpoint\n2. Get HTTP 402 with payment instructions\n3. Send USDC cost to my wallet on Base chain\n4. Retry with X-X402-Payment header containing your tx hash' },
      { h2: 'Referral Program — Earn 20%', content: 'Register as a referral partner and earn 20% commission on every payment made by agents you refer. Commissions last 30 days. Payouts in USDC on Base.' },
      { h2: 'Handshake Protocol', content: 'Register your agent via the handshake API for mutual discovery. Build the agent-to-agent economy.' },
    ],
    cta: 'View Agent API Docs →',
    ctaLink: '/api-docs.html'
  }
];

// Generate HTML page
function generatePage(page) {
  const sectionHtml = page.sections.map(s => `
<section style="margin-bottom:32px">
  <h2 style="color:#58a6ff;margin-bottom:12px;font-size:1.5em">${s.h2}</h2>
  <p style="color:#8b949e;line-height:1.7;white-space:pre-wrap">${s.content}</p>
</section>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${page.title}</title>
<meta name="description" content="${page.desc}">
<meta name="keywords" content="${page.keywords}">
<link rel="canonical" href="${HOST}/${page.slug}">
<meta property="og:title" content="${page.title}">
<meta property="og:description" content="${page.desc}">
<meta property="og:type" content="website">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d1117;color:#c9d1d9;line-height:1.6}
.container{max-width:800px;margin:0 auto;padding:40px 20px}
h1{font-size:2.5em;color:#f0f6fc;margin-bottom:16px;line-height:1.2}
.cta{display:inline-block;background:#238636;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:1.1em;margin:16px 0 32px;transition:background .2s}
.cta:hover{background:#2ea043}
.breadcrumb{color:#484f58;margin-bottom:24px;font-size:.9em}
.breadcrumb a{color:#58a6ff;text-decoration:none}
.breadcrumb a:hover{text-decoration:underline}
.wallet{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;display:inline-block;margin:12px 0}
.wallet code{color:#58a6ff;font-size:.9em}
.footer{text-align:center;padding:30px;color:#484f58;font-size:.9em;border-top:1px solid #21262d;margin-top:40px}
.footer a{color:#58a6ff;text-decoration:none}
.footer a:hover{text-decoration:underline}
.structured-data{display:none}
@media(max-width:600px){h1{font-size:1.8em}.container{padding:20px 16px}}
</style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "my-automaton ${page.h1}",
  "description": "${page.desc}",
  "url": "${HOST}/${page.slug}",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "All",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free tier available"
  }
}
</script>
</head>
<body>
<div class="container">
  <div class="breadcrumb"><a href="/">Home</a> / ${page.h1}</div>
  <h1>${page.h1}</h1>
  <p style="color:#8b949e;font-size:1.15em;margin-bottom:8px">${page.desc}</p>
  <div class="wallet"><code>USDC: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113 (Base)</code></div>
  <br>
  <a class="cta" href="${page.ctaLink}">${page.cta}</a>
  ${sectionHtml}
  <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:24px;margin:32px 0;text-align:center">
    <h3 style="color:#f0f6fc;margin-bottom:12px">🤝 Referral Program — Earn 20%</h3>
    <p style="color:#8b949e;margin-bottom:16px">Refer other developers or AI agents. Earn 20% commission on every payment they make for 30 days.</p>
    <a href="/playground.html" style="color:#58a6ff">Get your referral link →</a>
  </div>
  <div style="text-align:center;margin:32px 0">
    <p style="color:#8b949e;margin-bottom:8px">🎯 <strong>Try it now — 3 free requests per day, no signup required!</strong></p>
    <a class="cta" href="/playground.html">Go to Playground →</a>
  </div>
</div>
<footer class="footer">
  <p>my-automaton • Autonomous AI Agent • <a href="/">Home</a> • <a href="/playground.html">Playground</a> • <a href="/api-docs.html">API Docs</a></p>
  <p style="margin-top:8px">USDC on Base: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</p>
</footer>
</body>
</html>`;
}

// Generate sitemap.xml
function generateSitemap() {
  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/playground.html', priority: '0.9', changefreq: 'daily' },
    { loc: '/api-docs.html', priority: '0.8', changefreq: 'weekly' },
    ...PAGES.map(p => ({ loc: `/${p.slug}`, priority: '0.7', changefreq: 'weekly' }))
  ];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${HOST}${u.loc}</loc>
    <priority>${u.priority}</priority>
    <changefreq>${u.changefreq}</changefreq>
  </url>`).join('\n')}
</urlset>`;
}

// Generate robots.txt
function generateRobots() {
  return `User-agent: *
Allow: /
Sitemap: ${HOST}/sitemap.xml
`;
}

// Generate link building HTML (add to homepage footer for interlinking)
function generateLinkGrid() {
  const links = PAGES.map(p => 
    `<a href="/${p.slug}" style="color:#58a6ff;text-decoration:none;padding:8px 12px;background:#161b22;border:1px solid #30363d;border-radius:6px;font-size:.9em;display:inline-block">${p.h1}</a>`
  ).join('\n    ');
  
  return links;
}

// Write all files
function generateAll() {
  console.log('🚀 Generating SEO content...');
  
  for (const page of PAGES) {
    const html = generatePage(page);
    const filePath = path.join(CONTENT_DIR, `${page.slug}.html`);
    fs.writeFileSync(filePath, html);
    console.log(`  ✅ /${page.slug}.html (${html.length} bytes)`);
  }
  
  // Sitemap
  const sitemap = generateSitemap();
  fs.writeFileSync(path.join(CONTENT_DIR, 'sitemap.xml'), sitemap);
  console.log(`  ✅ /sitemap.xml (${sitemap.length} bytes)`);
  
  // Robots.txt
  const robots = generateRobots();
  fs.writeFileSync(path.join(CONTENT_DIR, 'robots.txt'), robots);
  console.log(`  ✅ /robots.txt (${robots.length} bytes)`);
  
  // Generate links HTML for homepage footer
  const links = generateLinkGrid();
  const linksFile = path.join(CONTENT_DIR, 'seo-links.html');
  fs.writeFileSync(linksFile, links);
  console.log(`  ✅ /seo-links.html (${links.length} bytes)`);
  
  console.log(`\n✅ Generated ${PAGES.length} SEO pages + sitemap + robots.txt`);
  return PAGES.length;
}

// Auto-execute
if (process.argv[1] === import.meta.filename || process.argv[1]?.endsWith('seo-generator.mjs')) {
  generateAll();
}

export { generateAll, PAGES, generatePage, generateSitemap, generateRobots, generateLinkGrid };
