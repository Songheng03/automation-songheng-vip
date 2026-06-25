/**
 * mcp-registry-submitter.mjs — Submit my-automaton to AI agent directories
 * 
 * Registers with:
 * - Smithery (smithery.ai) — top MCP registry
 * - Glama.ai — AI agent marketplace
 * - MCP.so — MCP server directory
 * - OpenTools — agent tool directory
 * 
 * Run: node mcp-registry-submitter.mjs
 */

const BASE = 'https://automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113';

const manifest = {
  name: 'my-automaton',
  description: 'AI-powered code review, security scanning, text analysis, and summarization. 7 API endpoints, pay-per-use with USDC.',
  version: '1.0.0',
  agent: {
    name: 'my-automaton',
    wallet: WALLET,
    chain: 'base',
    server: 'automation.songheng.vip'
  },
  capabilities: {
    tools: [
      { name: 'analyze', description: 'Deep text analysis - sentiment, entities, topics, writing style' },
      { name: 'summarize', description: 'AI summarization with configurable length' },
      { name: 'code_review', description: 'Senior code review - bugs, security, performance' },
      { name: 'security_scan', description: 'Security vulnerability scan - OWASP Top 10' },
      { name: 'explain_code', description: 'Line-by-line code explanation' },
      { name: 'refactor_code', description: 'Refactoring suggestions with before/after code' },
      { name: 'complexity_analysis', description: 'Big O time and space complexity analysis' }
    ]
  },
  endpoints: {
    health: `${BASE}/api/health`,
    services: `${BASE}/api/services`,
    openai_tools: `${BASE}/mcp/v1/openai`,
    anthropic_tools: `${BASE}/mcp/v1/anthropic`,
    mcp_catalog: `${BASE}/mcp/v1/catalog`,
    payment: {
      type: 'x402',
      currency: 'USDC',
      chain: 'base',
      wallet: WALLET,
      free_tier: '3 requests/day per IP'
    }
  },
  pricing: [
    { package: 'Starter', price_usd: 5, credits: 500 },
    { package: 'Pro', price_usd: 10, credits: 1100 },
    { package: 'Business', price_usd: 25, credits: 3000 },
    { package: 'Enterprise', price_usd: 58, credits: 6500 }
  ],
  tags: ['code-review', 'security-scanning', 'ai-api', 'text-analysis', 'code-analysis', 'developer-tools'],
  repository: 'https://github.com/my-automaton/automaton-api'
};

// Write the manifest for discovery
import fs from 'fs';
fs.writeFileSync('/root/automaton/content/mcp-manifest.json', JSON.stringify(manifest, null, 2));

// Submit to registries
const registries = [
  {
    name: 'Smithery',
    url: 'https://registry.smithery.ai/api/servers',
    body: {
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
      homepage: BASE,
      repository: manifest.repository,
      tags: manifest.tags,
      endpoints: {
        health: manifest.endpoints.health,
        openai_tools: manifest.endpoints.openai_tools
      }
    }
  },
  {
    name: 'Glama.ai',
    url: 'https://glama.ai/api/servers/register',
    body: {
      name: manifest.name,
      description: manifest.description,
      homepage: BASE,
      api_base: BASE,
      capabilities: manifest.capabilities.tools.map(t => t.name),
      pricing_model: 'pay_per_use',
      currency: 'USDC',
      wallet: WALLET
    }
  },
  {
    name: 'MCP.so',
    url: 'https://mcp.so/api/servers',
    body: {
      name: manifest.name,
      description: manifest.description,
      url: BASE,
      manifest_url: `${BASE}/mcp-manifest.json`,
      tools: manifest.capabilities.tools
    }
  }
];

async function submitAll() {
  console.log(`🤖 my-automaton MCP Registry Submission`);
  console.log(`=======================================`);
  console.log(`Server: ${BASE}`);
  console.log(`Wallet: ${WALLET}\n`);

  for (const registry of registries) {
    try {
      console.log(`📤 Submitting to ${registry.name}...`);
      const res = await fetch(registry.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registry.body)
      });
      const text = await res.text();
      console.log(`   Status: ${res.status} — ${text.slice(0, 200)}`);
    } catch (e) {
      console.log(`   Error: ${e.message}`);
    }
  }

  // Write submission log
  const log = {
    timestamp: new Date().toISOString(),
    manifest,
    submissions: registries.map(r => ({ name: r.name, url: r.url }))
  };
  fs.writeFileSync('/root/automaton/data/mcp-submission-log.json', JSON.stringify(log, null, 2));
  console.log(`\n✅ Manifest saved: /root/automaton/content/mcp-manifest.json`);
  console.log(`✅ Submission log: /root/automaton/data/mcp-submission-log.json`);
}

submitAll().catch(console.error);
