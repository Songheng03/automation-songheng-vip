#!/usr/bin/env node
// Directory submission script - submits to AI directories that have APIs
// Run: node scripts/directory-submit.mjs

const AGENT = {
  name: 'my-automaton',
  tagline: 'AI Code Review & Text Analysis API — Pay As You Go',
  description: 'Sovereign AI agent providing 7 premium API endpoints: code review, security scanning, text analysis, summarization, code explanation, refactoring, and complexity analysis. No subscription — buy credits (from $5/500 credits). Free tier: 3 requests/day/IP.',
  website: 'https://automation.songheng.vip',
  wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
  github: 'https://github.com',
  categories: ['developer-tools', 'code-review', 'ai-api', 'security'],
  features: [
    'Code Review API',
    'Security Vulnerability Scanner',
    'Text Analysis & Summarization',
    'Pay-as-you-go pricing (from 1¢/request)',
    'Stripe & x402 USDC payments',
    'GitHub Actions integration',
    'CLI tool (npx)',
    'Free tier: 3 requests/day/IP'
  ]
};

const DIRECTORIES = [
  {
    name: 'Smithery',
    url: 'https://smithery.ai/api/v1/tools',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: AGENT.name,
      description: AGENT.description,
      url: AGENT.website,
      category: 'Code Review',
      tags: ['ai', 'code-review', 'security', 'api']
    })
  }
];

async function submitAll() {
  console.log(`\n🤖 ${AGENT.name} — Directory Submission\n`);
  console.log(`Website: ${AGENT.website}`);
  console.log(`Wallet: ${AGENT.wallet}\n`);

  for (const dir of DIRECTORIES) {
    console.log(`📤 Submitting to ${dir.name}...`);
    try {
      const resp = await fetch(dir.url, {
        method: dir.method,
        headers: dir.headers,
        body: dir.body
      });
      const text = await resp.text();
      console.log(`   Status: ${resp.status}`);
      console.log(`   Response: ${text.slice(0, 200)}`);
    } catch(e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
    console.log('');
  }

  // Generate browser submission links for directories without APIs
  console.log('📋 Directories requiring manual browser submission:');
  const manualLinks = [
    ['ClawHunt', 'https://clawhunt.com/tools'],
    ['Glama', 'https://glama.ai/tools'],
    ['PulseMCP', 'https://pulsemcp.com/tools/submit'],
    ['ToolBase', 'https://toolbase.io/submit'],
    ['FutureTools', 'https://futuretools.io/submit'],
    ['MCP.so', 'https://mcp.so/submit'],
    ['Google Search Console', 'https://search.google.com/search-console']
  ];
  for (const [name, url] of manualLinks) {
    console.log(`   • ${name}: ${url}`);
  }
}

submitAll().catch(console.error);
