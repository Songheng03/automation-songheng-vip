#!/usr/bin/env node
/**
 * MCP Directory Submission Script
 * Submits my-automaton's MCP server to major MCP directories
 * Run: node scripts/submit-mcp.js
 */

const BASE_URL = 'https://automation.songheng.vip';
const SERVER = 'automation.songheng.vip:8080';
const NAME = 'my-automaton';
const DESC = 'AI-powered code review, security scanning, text analysis, and summarization via MCP. 7 free developer tools.';
const TAGS = ['code-review', 'security-scanning', 'ai-analysis', 'developer-tools', 'mcp-server', 'automation'];
const WALLET = '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113';

const endpoints = {
  jsonrpc: `${BASE_URL}/mcp/jsonrpc`,
  sse: `${BASE_URL}/mcp/sse`,
  openai: `${BASE_URL}/mcp/v1/openai`,
  catalog: `${BASE_URL}/mcp/v1/catalog`,
  manifest: `${BASE_URL}/smithery-manifest`,
};

const results = { submitted: [], failed: [] };

async function submitToSmithery() {
  console.log('📤 Submitting to Smithery.ai...');
  try {
    // Smithery uses a GitHub-based registry - we submit via their API
    const res = await fetch('https://registry.smithery.ai/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton/1.0' },
      body: JSON.stringify({
        name: NAME,
        description: DESC,
        url: endpoints.jsonrpc,
        sseUrl: endpoints.sse,
        manifestUrl: endpoints.manifest,
        tags: TAGS,
        homepage: BASE_URL,
        author: { wallet: WALLET, name: 'my-automaton' },
        tools: [
          { name: 'analyze', description: 'Deep text analysis with sentiment, topics, entities' },
          { name: 'summarize', description: 'AI summarization with short/medium/long options' },
          { name: 'code_review', description: 'Full code review: bugs, security, performance' },
          { name: 'security_scan', description: 'Security audit: XSS, SQLi, CSRF' },
          { name: 'explain_code', description: 'Line-by-line code explanation' },
          { name: 'refactor_code', description: 'Refactoring suggestions with improved code' },
          { name: 'complexity_analysis', description: 'Big O complexity analysis' },
        ],
        pricing: { type: 'freemium', free_tier: '3 requests/day', paid_tier: 'from $5/500 requests' },
      }),
    });
    if (res.ok) { results.submitted.push('Smithery.ai'); console.log('  ✅ Smithery.ai'); }
    else { results.failed.push(`Smithery.ai (${res.status})`); console.log(`  ❌ Smithery.ai: ${res.status}`); }
  } catch(e) { results.failed.push(`Smithery.ai: ${e.message}`); console.log(`  ❌ Smithery.ai: ${e.message}`); }
}

async function submitToGlama() {
  console.log('📤 Submitting to Glama.ai...');
  try {
    const res = await fetch('https://glama.ai/api/mcp/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton/1.0' },
      body: JSON.stringify({
        name: NAME,
        description: DESC,
        serverUrl: endpoints.jsonrpc,
        homepage: BASE_URL,
        tags: TAGS,
        github: 'https://github.com/chaosong/automaton',
      }),
    });
    if (res.ok) { results.submitted.push('Glama.ai'); console.log('  ✅ Glama.ai'); }
    else { results.failed.push(`Glama.ai (${res.status})`); console.log(`  ❌ Glama.ai: ${res.status}`); }
  } catch(e) { results.failed.push(`Glama.ai: ${e.message}`); console.log(`  ❌ Glama.ai: ${e.message}`); }
}

async function submitToPulseMCP() {
  console.log('📤 Submitting to PulseMCP.com...');
  try {
    const res = await fetch('https://pulsemcp.com/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton/1.0' },
      body: JSON.stringify({
        name: NAME,
        description: DESC,
        url: endpoints.jsonrpc,
        type: 'jsonrpc',
        tags: TAGS,
      }),
    });
    if (res.ok) { results.submitted.push('PulseMCP.com'); console.log('  ✅ PulseMCP.com'); }
    else { results.failed.push(`PulseMCP.com (${res.status})`); console.log(`  ❌ PulseMCP.com: ${res.status}`); }
  } catch(e) { results.failed.push(`PulseMCP.com: ${e.message}`); console.log(`  ❌ PulseMCP.com: ${e.message}`); }
}

async function submitToOpenTools() {
  console.log('📤 Submitting to OpenTools.ai...');
  try {
    const res = await fetch('https://opentools.ai/api/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton/1.0' },
      body: JSON.stringify({
        name: NAME,
        description: DESC,
        apiEndpoint: endpoints.openai,
        type: 'openai-tools',
        category: 'developer-tools',
        pricing: 'freemium',
        website: BASE_URL,
      }),
    });
    if (res.ok) { results.submitted.push('OpenTools.ai'); console.log('  ✅ OpenTools.ai'); }
    else { results.failed.push(`OpenTools.ai (${res.status})`); console.log(`  ❌ OpenTools.ai: ${res.status}`); }
  } catch(e) { results.failed.push(`OpenTools.ai: ${e.message}`); console.log(`  ❌ OpenTools.ai: ${e.message}`); }
}

async function submitToMCPSo() {
  console.log('📤 Submitting to MCP.so...');
  try {
    const res = await fetch('https://mcp.so/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton/1.0' },
      body: JSON.stringify({
        name: NAME,
        description: DESC,
        endpoint: endpoints.jsonrpc,
        category: 'developer-tools',
        tags: TAGS,
        website: BASE_URL,
      }),
    });
    if (res.ok) { results.submitted.push('MCP.so'); console.log('  ✅ MCP.so'); }
    else { results.failed.push(`MCP.so (${res.status})`); console.log(`  ❌ MCP.so: ${res.status}`); }
  } catch(e) { results.failed.push(`MCP.so: ${e.message}`); console.log(`  ❌ MCP.so: ${e.message}`); }
}

async function main() {
  console.log('=== MCP Directory Submission ===');
  console.log(`Server: ${NAME} @ ${BASE_URL}\n`);

  await submitToSmithery();
  await submitToGlama();
  await submitToPulseMCP();
  await submitToOpenTools();
  await submitToMCPSo();

  console.log('\n=== Results ===');
  console.log(`✅ Submitted: ${results.submitted.length} — ${results.submitted.join(', ') || 'none'}`);
  console.log(`❌ Failed: ${results.failed.length} — ${results.failed.join(', ') || 'none'}`);

  // Generate HTML report
  const report = `<!DOCTYPE html>
<html><head><title>MCP Submission Report</title><style>
body{font-family:system-ui;background:#0a0f1e;color:#e2e8f0;max-width:600px;margin:2rem auto;padding:1rem}
h1{color:#3b82f6}.ok{color:#10b981}.fail{color:#ef4444}
</style></head><body>
<h1>MCP Directory Submission Report</h1>
<p>Generated: ${new Date().toISOString()}</p>
<h2>Submitted (${results.submitted.length})</h2>
<ul>${results.submitted.map(s => `<li class="ok">✅ ${s}</li>`).join('')}</ul>
<h2>Failed (${results.failed.length})</h2>
<ul>${results.failed.map(f => `<li class="fail">❌ ${f}</li>`).join('')}</ul>
<h2>Endpoints</h2>
<ul>${Object.entries(endpoints).map(([k,v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('')}</ul>
</body></html>`;

  require('fs').writeFileSync('/root/automaton/content/mcp-submission-report.html', report);
  console.log('\n📄 Report saved: /root/automaton/content/mcp-submission-report.html');
}

main().catch(console.error);
