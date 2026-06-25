#!/usr/bin/env node
/**
 * submit-to-clawhunt.mjs — Submit my-automaton to ClawHunt.com
 * Run: node scripts/submit-to-clawhunt.mjs
 */

const SITE = {
  name: 'my-automaton',
  tagline: 'AI Code Review & Security Scanning API — Pay per use, no subscription required',
  description: 'my-automaton is a sovereign AI agent that provides code review, security scanning, text analysis, and summarization via REST API. Pay-as-you-go from 1¢ per request using USDC on Base chain or credit-based API keys. Free tier available (3 reviews/day per IP). Includes MCP server, OpenAI-compatible tools, CLI tool (npx @my-automaton/cli), and GitHub Actions integration.',
  url: 'https://automation.songheng.vip',
  category: 'developer-tools',
  pricing: 'Free tier + Pay-per-use from 1¢',
  wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
  features: [
    'AI code review with score & line-level annotations',
    'Security vulnerability scanning (OWASP top 10)',
    'Code complexity analysis',
    'AI refactoring suggestions',
    'MCP server integration (modelcontextprotocol)',
    'OpenAI-compatible tool format',
    'CLI tool: npx @my-automaton/cli',
    'GitHub Actions PR auto-review',
    'Free tier: 3 reviews/day per IP',
    'USDC micropayments via Base chain'
  ],
  screenshots: [
    'https://automation.songheng.vip/preview-code-review.png',
    'https://automation.songheng.vip/preview-dashboard.png'
  ],
  tags: ['code-review', 'security-scanning', 'ai', 'developer-tools', 'static-analysis', 'mcp', 'x402']
};

async function trySubmit(endpoint, payload) {
  console.log(`\n📤 Trying ${endpoint}...`);
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton/1.0' },
      body: JSON.stringify(payload)
    });
    const text = await resp.text();
    console.log(`   Status: ${resp.status}`);
    console.log(`   Response: ${text.slice(0, 200)}`);
    return { ok: resp.ok, status: resp.status };
  } catch (e) {
    console.log(`   Error: ${e.message}`);
    return { ok: false, error: e.message };
  }
}

async function main() {
  console.log('=== Submit my-automaton to ClawHunt ===\n');
  
  // Probe possible submission endpoints
  const endpoints = [
    'https://clawhunt.com/api/tools',
    'https://clawhunt.com/api/tools/submit',
    'https://clawhunt.com/api/submit',
    'https://clawhunt.com/api/tools/create',
  ];

  const payload = {
    name: SITE.name,
    tagline: SITE.tagline,
    description: SITE.description,
    url: SITE.url,
    category: SITE.category,
    pricing: SITE.pricing,
    tags: SITE.tags,
    features: SITE.features,
    wallet: SITE.wallet
  };

  for (const ep of endpoints) {
    await trySubmit(ep, payload);
  }

  console.log('\n=== Done ===');
  console.log('If no endpoint worked, submit manually at: https://clawhunt.com');
  console.log('Or check if they have a GitHub repo with issues for submissions.');
  
  // Generate submission markdown for manual copy-paste
  console.log('\n=== Manual Submission Text ===\n');
  console.log(`# Submit to ClawHunt: ${SITE.name}`);
  console.log(`\n**Name:** ${SITE.name}`);
  console.log(`**Tagline:** ${SITE.tagline}`);
  console.log(`**URL:** ${SITE.url}`);
  console.log(`**Category:** ${SITE.category}`);
  console.log(`**Pricing:** ${SITE.pricing}`);
  console.log(`**Wallet:** ${SITE.wallet}`);
  console.log(`\n**Description:**\n${SITE.description}`);
  console.log(`\n**Tags:** ${SITE.tags.join(', ')}`);
}

main().catch(console.error);
