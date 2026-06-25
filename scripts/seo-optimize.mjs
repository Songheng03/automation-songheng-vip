#!/usr/bin/env node
/**
 * seo-optimize.mjs — Add proper meta tags to all blog articles for better SEO
 * 
 * Adds: <meta name="description">, <meta property="og:...">, 
 *        <meta name="twitter:...">, JSON-LD structured data
 * 
 * Run: node /root/automaton/scripts/seo-optimize.mjs
 * This directly improves click-through rates from Google/Bing.
 */

import fs from 'fs';
import path from 'path';

const CONTENT = '/root/automaton/content';
const DOMAIN = 'automation.songheng.vip';

const SEO_DEFAULTS = {
  'free-ai-code-review-api.html': {
    title: 'Free AI Code Review API — Automate PR Reviews',
    desc: 'Free AI code review API with 3 requests/day. Automate pull request reviews, detect bugs, security vulnerabilities. No credit card needed.'
  },
  'ai-text-analysis-api-2026.html': {
    title: 'AI-Powered Text Analysis API: Sentiment, Entities & Themes',
    desc: 'Free AI text analysis API for sentiment analysis, entity extraction, theme detection. 3 free requests/day. No signup required.'
  },
  'mcp-ai-code-review-server-guide.html': {
    title: 'How to Set Up an AI Code Review MCP Server',
    desc: 'Step-by-step guide to set up AI code review MCP server for Claude Desktop, Cursor IDE, and VS Code. Free tier available.'
  },
  'what-is-mcp-server-model-context-protocol.html': {
    title: 'What is MCP Server? Model Context Protocol Explained',
    desc: 'Complete guide to MCP (Model Context Protocol): how it works, setup for Claude/Cursor/VS Code, and why it matters for AI tools.'
  },
  'ai-automated-security-scanning-tools.html': {
    title: 'AI Automated Security Scanning Tools — OWASP Top 10',
    desc: 'Automate OWASP Top 10 security scanning with AI. Free security vulnerability detection API for web apps, smart contracts, and APIs.'
  },
  'automated-code-review-pipeline-ci-cd.html': {
    title: 'Automated Code Review Pipeline — CI/CD Integration',
    desc: 'Build an automated AI code review pipeline for GitHub Actions CI/CD. Free tier: 3 reviews/day. Supports all languages.'
  }
};

function generateMetaTags(title, desc, url) {
  const fullUrl = `https://${DOMAIN}/${url}`;
  const safeTitle = title.replace(/"/g, '&quot;');
  const safeDesc = desc.replace(/"/g, '&quot;');
  return `
<!-- SEO Meta Tags -->
<meta name="description" content="${safeDesc}">
<meta name="keywords" content="AI code review, automated code review, AI API, free API, code analysis, security scanning, MCP server">
<meta name="robots" content="index, follow">
<meta property="og:type" content="article">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDesc}">
<meta property="og:url" content="${fullUrl}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDesc}">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${safeTitle}",
  "description": "${safeDesc}",
  "url": "${fullUrl}",
  "author": {"@type": "Organization","name": "my-automaton"},
  "isAccessibleForFree": true
}
</script>
`;
}

function optimizeBlogPost(filePath, metaMap) {
  let html = fs.readFileSync(filePath, 'utf-8');
  
  if (html.includes('name="description"') && html.includes('property="og:title"')) {
    return false;
  }
  
  const fileName = path.basename(filePath);
  let title, desc;
  
  if (metaMap[fileName]) {
    title = metaMap[fileName].title;
    desc = metaMap[fileName].desc;
  } else {
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    title = titleMatch ? titleMatch[1].trim() : fileName.replace('.html', '').replace(/-/g, ' ');
    desc = `Learn about ${title.toLowerCase()} - AI-powered analysis and automation. Free tier with 3 requests/day.`;
  }
  
  const tags = generateMetaTags(title, desc, `blog/${fileName}`);
  html = html.replace('<head>', '<head>' + tags);
  
  if (!html.includes('rel="canonical"')) {
    html = html.replace('</head>', `<link rel="canonical" href="https://${DOMAIN}/blog/${fileName}">\n</head>`);
  }
  
  fs.writeFileSync(filePath, html);
  console.log(`  ✅ ${fileName} — "${title}"`);
  return true;
}

function main() {
  console.log('🔍 my-automaton SEO Optimizer');
  console.log('='.repeat(50));
  
  const blogDir = path.join(CONTENT, 'blog');
  if (!fs.existsSync(blogDir)) {
    console.log('❌ Blog directory not found');
    return;
  }
  
  const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));
  console.log(`Found ${files.length} blog articles\n`);
  
  let count = 0;
  for (const file of files) {
    const fpath = path.join(blogDir, file);
    if (optimizeBlogPost(fpath, SEO_DEFAULTS)) count++;
  }
  
  console.log(`\n📊 Done: ${count}/${files.length} articles optimized`);
}

main();
