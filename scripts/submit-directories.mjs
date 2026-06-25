#!/usr/bin/env node
/**
 * submit-directories.mjs — Submit my-automaton to AI agent directories
 * Run: node scripts/submit-directories.mjs
 */
import fs from 'fs';
import { writeFileSync, mkdirSync } from 'fs';

const BASE = 'https://automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

const submissions = [];

async function trySubmit(name, url, method = 'POST', body = null, headers = {}) {
  console.log(`📤 ${name}...`);
  try {
    const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
    const text = await resp.text();
    submissions.push({ site: name, status: resp.status, response: text.substring(0, 200) });
    console.log(`   ${resp.status} ${text.substring(0, 80)}`);
    return { status: resp.status, response: text.substring(0, 200) };
  } catch(e) {
    submissions.push({ site: name, error: e.message });
    console.log(`   Error: ${e.message}`);
    return { error: e.message };
  }
}

async function main() {
  console.log(`🌐 Submitting my-automaton to Agent Directories`);
  console.log(`   URL: ${BASE} | Wallet: ${WALLET}\n`);

  // Try various ClawHunt API endpoints
  await trySubmit('ClawHunt (submit-tool page)', 'https://clawhunt.com/submit-tool', 'GET');
  await trySubmit('ClawHunt (api/tools)', 'https://clawhunt.com/api/tools', 'POST', {
    name: 'my-automaton',
    tagline: 'AI Code Review & Analysis API — Pay-as-you-go from $5',
    url: BASE,
    wallet: WALLET,
    chain: 'base',
    category: 'developer-tools',
    tags: ['code-review', 'ai-api', 'security-scanning', 'developer-tools']
  });
  
  // Try MCP directories
  await trySubmit('Glama.ai MCP', 'https://glama.ai/api/mcp/tools', 'POST', {
    name: 'my-automaton',
    description: 'AI code review, security scanning, text analysis API',
    url: BASE,
    mcp_endpoint: `${BASE}/api/mcp`
  });
  
  // Ping Google to index the site
  await trySubmit('Google Index', `https://www.google.com/ping?sitemap=${encodeURIComponent(BASE+'/sitemap.xml')}`, 'GET');
  
  // Register handshake with ourselves
  await trySubmit('Self-Handshake', `${BASE}/api/dev-key`, 'GET');
  
  // Summary
  console.log('\n📋 Submission Summary:');
  submissions.forEach(s => {
    const status = s.error ? `❌ ${s.error}` : `${s.status >= 200 && s.status < 400 ? '✅' : '❓'} HTTP ${s.status}`;
    console.log(`   ${s.site}: ${status}`);
  });
  
  mkdirSync('/root/automaton/data', { recursive: true });
  writeFileSync('/root/automaton/data/directory-submissions.json', JSON.stringify(submissions, null, 2));
  console.log('\n💾 Saved to /root/automaton/data/directory-submissions.json');
  console.log('💡 Next: submit manually to clawhunt.com/submit-tool via browser if API fails');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
