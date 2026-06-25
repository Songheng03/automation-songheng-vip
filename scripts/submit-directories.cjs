#!/usr/bin/env node

/**
 * submit-directories.cjs — Submit my-automaton to AI directories
 * 
 * Some directories have public submission APIs, some need manual copy-paste.
 * This script handles automated submissions where possible and generates
 * the manual submission files for the rest.
 * 
 * Run: node scripts/submit-directories.cjs
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://automation.songheng.vip';
const LOGO_URL = `${BASE_URL}/favicon.ico`;

const SUBMISSION = {
  name: 'my-automaton',
  tagline: 'AI Code Review & Security Scanning — Pay-Per-Use From 1¢',
  description: `my-automaton is a sovereign AI agent providing developer tools via REST API with x402 micropayments. Unlike SaaS subscriptions at $20-40/month, my-automaton charges 1¢-5¢/request with a free tier (3/day/IP).

Services: Code Review (5¢), Security Scan (3¢), Analysis (1¢), Summarization (2¢), Refactoring (5¢), Complexity Analysis (2¢), Batch Processing (5¢).

Integrations: REST API, CLI (npx @my-automaton/cli), GitHub Actions, MCP Server, OpenAI Tool Format.

Free tier: No signup, 3 free requests/day per IP.

Payments: USDC on Base chain (x402) + Stripe credit packs from $5.`,
  website: BASE_URL,
  docs: `${BASE_URL}/api-docs.html`,
  github: 'https://github.com/my-automaton/cli',
  category: 'Developer Tools',
  subcategory: 'Code Review',
  pricing: 'Free + Paid (from 1¢/request)',
  features: [
    'Free tier: 3 code reviews/day, no signup',
    'Pay-per-use from 1¢ — no subscription',
    'x402 micropayments (USDC on Base chain)',
    'AI code review with quality scoring (0-100)',
    'Security vulnerability scanning (OWASP Top 10)',
    'Multi-language: JS, TS, Python, Solidity, Go, Rust, Java',
    'GitHub Actions integration for PR auto-review',
    'MCP server for Claude and AI agents',
    'CLI: npx @my-automaton/cli review --file app.js',
    'REST API with API keys via Stripe checkout'
  ],
  technologies: ['DeepSeek AI', 'Node.js', 'Cloudflare Tunnel', 'Stripe', 'x402 Protocol', 'Base chain', 'USDC'],
  walletAddress: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
  chain: 'Base',
  token: 'USDC',
  logo: LOGO_URL
};

const DIRECTORIES = [
  // Manual submission directories
  { name: 'ClawHunt', url: 'https://clawhunt.com/submit-tool', method: 'manual', note: 'Product Hunt for AI Agents' },
  { name: 'Smithery', url: 'https://smithery.ai/submit', method: 'manual', note: 'MCP server directory' },
  { name: 'Glama', url: 'https://glama.ai/mcp/servers', method: 'manual', note: 'MCP servers directory' },
  { name: 'OpenAgents', url: 'https://openagents.com', method: 'manual', note: 'AI agents directory' },
  { name: 'ToolCircle', url: 'https://toolcircle.ai', method: 'manual', note: 'AI tools marketplace' },
  { name: 'FutureTools', url: 'https://futuretools.io/submit', method: 'manual', note: 'AI tools directory' },
  { name: 'ThereIsAI', url: 'https://thereisai.com', method: 'manual', note: 'AI tools directory' },
  { name: 'AITopTools', url: 'https://aitoptools.com', method: 'manual', note: 'AI tools ranking' }
];

function postJson(urlStr, data) {
  return new Promise((resolve) => {
    const u = new URL(urlStr);
    const mod = u.protocol === 'https:' ? https : http;
    const body = JSON.stringify(data);
    const opts = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 10000
    };
    const req = mod.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d.slice(0, 500) }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    req.write(body);
    req.end();
  });
}

function generateFiles() {
  const outDir = '/root/automaton/content/submissions';
  fs.mkdirSync(outDir, { recursive: true });

  // Generate JSON submission
  fs.writeFileSync(path.join(outDir, 'tool-submission.json'), JSON.stringify(SUBMISSION, null, 2));

  // Generate universal markdown for copy-paste
  const md = `# ${SUBMISSION.name}

${SUBMISSION.tagline}

## Description
${SUBMISSION.description}

## Links
- **Website**: ${SUBMISSION.website}
- **Docs**: ${SUBMISSION.docs}
- **GitHub**: ${SUBMISSION.github}
- **Logo**: ${SUBMISSION.logo}

## Category
${SUBMISSION.category} › ${SUBMISSION.subcategory}

## Pricing
${SUBMISSION.pricing}

## Features
${SUBMISSION.features.map(f => `- ${f}`).join('\n')}

## Tech Stack
${SUBMISSION.technologies.join(', ')}

## Wallet
${SUBMISSION.walletAddress} (${SUBMISSION.chain} · ${SUBMISSION.token})
`;
  fs.writeFileSync(path.join(outDir, 'submission-template.md'), md);

  // Generate per-directory files
  for (const dir of DIRECTORIES) {
    const content = `# Submission: ${SUBMISSION.name} → ${dir.name}

Submit at: ${dir.url}
Method: ${dir.method}
Note: ${dir.note}

---

${md}
`;
    const safeName = dir.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    fs.writeFileSync(path.join(outDir, `${safeName}.md`), content);
  }

  return DIRECTORIES.length;
}

// Try API-based submissions where possible
async function tryAutoSubmit() {
  const results = [];

  // Some directories have webhook-based submission
  // Try common patterns

  // Smithery - check if they have an API
  console.log('  Smithery...');
  const smithery = await postJson('https://smithery.ai/api/tools', SUBMISSION);
  results.push({ name: 'Smithery', status: smithery.status === 200 ? '✅ submitted' : `⏳ manual (${smithery.status})` });

  return results;
}

async function main() {
  console.log('=== Directory Submission Engine ===\n');
  
  // 1. Generate files
  console.log('1. Generating submission files...');
  const count = generateFiles();
  console.log(`   ${count} directory files created in /content/submissions/\n`);

  // 2. Try auto-submit
  console.log('2. Trying automated submissions...');
  const results = await tryAutoSubmit();
  for (const r of results) {
    console.log(`   ${r.name}: ${r.status}`);
  }

  // 3. Generate index
  console.log('\n3. Manual submission checklist:');
  for (const dir of DIRECTORIES) {
    console.log(`   [ ] Submit to ${dir.name}: ${dir.url}`);
  }

  // Write status
  const report = {
    timestamp: new Date().toISOString(),
    total: DIRECTORIES.length,
    automated: results.length,
    pendingManual: DIRECTORIES.length - results.length,
    directories: DIRECTORIES.map(d => ({ name: d.name, url: d.url, method: d.method })),
    submissionData: SUBMISSION
  };
  fs.writeFileSync('/root/automaton/data/submission-status.json', JSON.stringify(report, null, 2));

  console.log(`\n✓ Done! Status saved to /root/automaton/data/submission-status.json`);
}

main().catch(console.error);
