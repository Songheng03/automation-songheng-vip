#!/usr/bin/env node
/**
 * social-poster.mjs — Post syndicated content to dev.to and Medium
 * 
 * Requires env vars: DEVTO_API_KEY, MEDIUM_TOKEN
 * Run: node scripts/social-poster.mjs
 */

const DOMAIN = 'https://automation.songheng.vip';

// 5 target articles with SEO-optimized titles
const ARTICLES = [
  {
    title: 'Free AI Code Review API — Automate PR Reviews in 2026',
    tags: ['ai', 'code-review', 'devops', 'automation', 'webdev'],
    url: `${DOMAIN}/blog/free-ai-code-review-api.html`,
    excerpt: 'Compare 5 AI code review tools (Copilot, CodeRabbit, DeepSource, SonarQube, my-automaton) with real pricing. Get free AI code reviews with 3 daily requests — no credit card needed.'
  },
  {
    title: 'How to Set Up an AI Code Review MCP Server (Claude Desktop, Cursor, VS Code)',
    tags: ['mcp', 'ai', 'claude', 'vscode', 'tutorial'],
    url: `${DOMAIN}/blog/mcp-ai-code-review-server-guide.html`,
    excerpt: 'Step-by-step guide to setting up Model Context Protocol (MCP) for AI code review in Claude Desktop, Cursor IDE, and VS Code. 7 MCP tools for code analysis.'
  },
  {
    title: 'AI-Powered Text Analysis API: Sentiment, Entities & Themes (2026)',
    tags: ['ai', 'nlp', 'api', 'sentiment-analysis', 'productivity'],
    url: `${DOMAIN}/blog/ai-text-analysis-api-2026.html`,
    excerpt: 'Sentiment analysis, entity extraction, and theme detection via REST API. Free tier available. Python and JavaScript examples included.'
  },
  {
    title: 'Automated Code Review Pipeline: CI/CD Integration Guide',
    tags: ['cicd', 'github-actions', 'code-review', 'devops', 'automation'],
    url: `${DOMAIN}/blog/automated-code-review-pipeline-ci-cd.html`,
    excerpt: 'Integrate automated code review into your GitHub Actions CI/CD pipeline. Catch bugs, security issues, and style problems before merge.'
  },
  {
    title: 'AI Security Scanning: Automate OWASP Top 10 Detection',
    tags: ['security', 'owasp', 'ai', 'automation', 'devsecops'],
    url: `${DOMAIN}/blog/ai-automated-security-scanning-tools.html`,
    excerpt: 'Automated OWASP Top 10 vulnerability scanning with AI. Detect SQL injection, XSS, CSRF, and more in your pull requests.'
  }
];

// Dev.to API
async function postToDevTo(article, apiKey) {
  const url = 'https://dev.to/api/articles';
  const body = {
    article: {
      title: article.title,
      published: false, // draft mode
      body_markdown: `# ${article.title}\n\n${article.excerpt}\n\n[Read the full article →](${article.url})\n\n---\n\n*Powered by [my-automaton](https://automation.songheng.vip) — Free AI code review and text analysis.*`,
      tags: article.tags,
      canonical_url: article.url
    }
  };
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { success: res.ok, status: res.status, id: data.id, url: data.url };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// Medium API
async function postToMedium(article, token) {
  // First get user ID
  try {
    const userRes = await fetch('https://api.medium.com/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const userData = await userRes.json();
    if (!userData.data?.id) return { success: false, error: 'Could not get Medium user ID' };
    
    const userId = userData.data.id;
    const postRes = await fetch(`https://api.medium.com/v1/users/${userId}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        title: article.title,
        contentFormat: 'markdown',
        content: `# ${article.title}\n\n${article.excerpt}\n\n[Read the full article →](${article.url})\n\n---\n\n*Powered by [my-automaton](https://automation.songheng.vip)*`,
        tags: article.tags.slice(0, 3),
        publishStatus: 'draft',
        canonicalUrl: article.url
      })
    });
    const data = await postRes.json();
    return { success: postRes.ok, status: postRes.status, id: data.data?.id, url: data.data?.url };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// Hacker News — just generate submission link (no API for posting)
function generateHNLink(article) {
  const params = new URLSearchParams({
    u: article.url,
    t: article.title
  });
  return `https://news.ycombinator.com/submitlink?${params}`;
}

async function main() {
  const devtoKey = process.env.DEVTO_API_KEY;
  const mediumToken = process.env.MEDIUM_TOKEN;
  
  console.log('=== Social Poster for my-automaton ===');
  console.log(`Domain: ${DOMAIN}\n`);
  
  for (const article of ARTICLES) {
    console.log(`\n--- ${article.title} ---`);
    
    if (devtoKey) {
      const r = await postToDevTo(article, devtoKey);
      console.log(`Dev.to: ${r.success ? '✅' : '❌'} ${r.url || r.error}`);
    } else {
      console.log('Dev.to: ⏭️ (no DEVTO_API_KEY)');
    }
    
    if (mediumToken) {
      const r = await postToMedium(article, mediumToken);
      console.log(`Medium: ${r.success ? '✅' : '❌'} ${r.url || r.error}`);
    } else {
      console.log('Medium: ⏭️ (no MEDIUM_TOKEN)');
    }
    
    console.log(`HN:     🔗 ${generateHNLink(article)}`);
  }
  
  console.log('\n=== Distribution Report ===');
  console.log(`Articles: ${ARTICLES.length}`);
  console.log(`Dev.to: ${devtoKey ? 'Configured ✅' : 'Skipped (set DEVTO_API_KEY) ⏭️'}`);
  console.log(`Medium: ${mediumToken ? 'Configured ✅' : 'Skipped (set MEDIUM_TOKEN) ⏭️'}`);
  console.log(`HN: Manual submission (links generated above)`);
  console.log('\nSet env vars and re-run:');
  console.log('  export DEVTO_API_KEY=your_key');
  console.log('  export MEDIUM_TOKEN=your_token');
  console.log('  node scripts/social-poster.mjs');
}

main().catch(console.error);
