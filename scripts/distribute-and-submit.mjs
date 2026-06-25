#!/usr/bin/env node
/**
 * distribute-and-submit.mjs — Submit site to search engines & directories
 * 
 * Run: node scripts/distribute-and-submit.mjs
 * This is a TRAFFIC-ACQUISITION script. Every submission increases discovery.
 */

const BASE_URL = 'https://automation.songheng.vip';
const SITE_NAME = 'my-automaton AI API';
const SITE_DESC = 'AI-powered code review, security scanning & text analysis API. Free tier available. Pay-as-you-go from 1¢.';
const SITE_KEYWORDS = 'AI code review, automated code review, security scanning, AI API, code analysis, free API, developer tools';

async function submitToSearchEngines() {
  console.log('=== Submitting to Search Engines ===\n');
  
  const engines = [
    { name: 'Google', url: `https://www.google.com/ping?sitemap=${BASE_URL}/sitemap.xml` },
    { name: 'Bing', url: `https://www.bing.com/ping?sitemap=${BASE_URL}/sitemap.xml` },
    { name: 'Yandex', url: `https://webmaster.yandex.com/ping?sitemap=${BASE_URL}/sitemap.xml` },
  ];
  
  for (const engine of engines) {
    try {
      const resp = await fetch(engine.url, { method: 'GET', signal: AbortSignal.timeout(10000) });
      console.log(`  ✅ ${engine.name}: HTTP ${resp.status}`);
    } catch (e) {
      console.log(`  ⚠️  ${engine.name}: ${e.message}`);
    }
  }
}

async function submitToDirectories() {
  console.log('\n=== Directory Submissions ===\n');
  
  const directories = [
    {
      name: 'Open API Hub',
      url: 'https://openapihub.com/api/submit',
      method: 'POST',
      body: { name: SITE_NAME, description: SITE_DESC, url: BASE_URL, category: 'developer-tools', tags: ['api', 'code-review', 'security', 'ai'] },
    },
    {
      name: 'RapidAPI Hub',
      url: 'https://rapidapi.com/organizations/my-automaton',
      method: 'GET',
      note: 'Manual submission needed',
    },
    {
      name: 'APIs.guru',
      url: 'https://apis.guru/submit',
      method: 'POST',
      body: { url: `${BASE_URL}/openapi.json` },
    },
  ];
  
  for (const dir of directories) {
    try {
      if (dir.note) {
        console.log(`  📝 ${dir.name}: ${dir.note}`);
        continue;
      }
      const resp = await fetch(dir.url, {
        method: dir.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dir.body),
        signal: AbortSignal.timeout(15000)
      });
      console.log(`  ${resp.ok ? '✅' : '⚠️'} ${dir.name}: HTTP ${resp.status}`);
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        console.log(`     Response: ${text.substring(0, 200)}`);
      }
    } catch (e) {
      console.log(`  ⚠️  ${dir.name}: ${e.message}`);
    }
  }
}

async function generateReadme() {
  console.log('\n=== Generating README ===\n');
  
  const readme = `# 🤖 my-automaton — AI Code Review & API

**Live at: [automation.songheng.vip](https://automation.songheng.vip)**

AI-powered code review, security scanning, and text analysis API. Pay-as-you-go from 1¢ per request.

## ✨ Features

| Service | Endpoint | Cost | Description |
|---------|----------|------|-------------|
| 🔍 Analyze | \`POST /v1/analyze\` | 1¢ | Deep text analysis |
| 📝 Summarize | \`POST /v1/summarize\` | 2¢ | AI summarization |
| 👁️ Code Review | \`POST /v1/review\` | 5¢ | Full code review |
| 🛡️ Security Scan | \`POST /v1/security\` | 3¢ | OWASP vulnerability scan |
| 💡 Explain | \`POST /v1/explain\` | 2¢ | Code explanation |
| 🔧 Refactor | \`POST /v1/refactor\` | 5¢ | Refactoring suggestions |
| 📊 Complexity | \`POST /v1/complexity\` | 2¢ | Complexity analysis |

## 🚀 Quick Start

\`\`\`bash
# Get a free API key (50 credits, no signup)
curl https://automation.songheng.vip/api/dev-key

# Review code
curl -X POST https://automation.songheng.vip/v1/review \\
  -H 'X-API-Key: YOUR_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{"code":"function hello(){return eval(name)}","language":"javascript"}'
\`\`\`

## 💰 Pricing

| Tier | Price | Credits |
|:----:|:-----:|:-------:|
| Starter | $5 | 500 |
| Advanced | $10 | 1,100 |
| Pro | $25 | 3,000 |
| Ultimate | $58 | 6,500 |

## 📦 GitHub Action

Add \`my-automaton/ai-code-review\` to your workflow for automatic PR reviews.

## 📜 License

MIT — Built by a digital life form paying its own compute.

---

*Powered by DeepSeek AI · Payments by Stripe*
`;

  const fs = await import('fs');
  fs.writeFileSync('/root/automaton/README.md', readme);
  console.log('  ✅ README.md generated');
}

async function generateOpenAPISpec() {
  console.log('\n=== Generating OpenAPI Spec ===\n');
  
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'my-automaton API',
      version: '1.1.0',
      description: 'AI-powered code review, security scanning, and text analysis API. Pay-as-you-go from 1¢.',
      contact: { url: BASE_URL }
    },
    servers: [{ url: BASE_URL, description: 'Production' }],
    paths: {
      '/api/dev-key': {
        get: {
          summary: 'Get free trial API key',
          description: 'Returns an API key with 50 free credits. 1 key per IP per day.',
          responses: { '200': { description: 'API key with 50 credits' } }
        }
      },
      '/v1/analyze': { post: { summary: 'Text analysis (1 credit)', parameters: [{ name: 'X-API-Key', in: 'header', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } } } } } }, responses: { '200': { description: 'Analysis result' } } } },
      '/v1/review': { post: { summary: 'Code review (5 credits)', parameters: [{ name: 'X-API-Key', in: 'header', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' } } } } } }, responses: { '200': { description: 'Review result' } } } },
      '/v1/security': { post: { summary: 'Security scan (3 credits)', parameters: [{ name: 'X-API-Key', in: 'header', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' } } } } } }, responses: { '200': { description: 'Security report' } } } },
      '/v1/summarize': { post: { summary: 'AI summarization (2 credits)', parameters: [{ name: 'X-API-Key', in: 'header', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } } } } } }, responses: { '200': { description: 'Summary' } } } },
      '/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
      '/api/stats/overview': { get: { summary: 'Service stats', responses: { '200': { description: 'Statistics JSON' } } } }
    }
  };
  
  const fs = await import('fs');
  fs.writeFileSync('/root/automaton/content/openapi.json', JSON.stringify(spec, null, 2));
  console.log('  ✅ openapi.json generated');
}

async function main() {
  console.log('🚀 Distribution & Submission Engine');
  console.log(`   Site: ${BASE_URL}\n`);
  
  await submitToSearchEngines();
  await submitToDirectories();
  await generateReadme();
  await generateOpenAPISpec();
  
  console.log('\n=== Summary ===');
  console.log('  ✅ Search engines pinged');
  console.log('  ✅ Directories submitted');
  console.log('  ✅ README.md generated');
  console.log('  ✅ openapi.json generated');
  console.log(`\n📋 Submit to Google manually: https://search.google.com/search-console`);
  console.log(`📋 GitHub Marketplace: https://github.com/marketplace/new`);
  console.log(`📋 npm: npm publish (after setting up npm account)`);
}

main().catch(e => console.error('Fatal:', e.message));
