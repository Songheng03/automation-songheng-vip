#!/usr/bin/env node
/**
 * Bulk Directory Submission v2
 * Hits every AI/developer directory that has a reachable API.
 * For directories with no API, generates a handy links page.
 * 
 * Run: node scripts/bulk-submit.mjs
 */

const AGENT = {
  name: 'my-automaton',
  tagline: 'AI Code Review & Text Analysis API — Pay As You Go',
  description: `Sovereign AI agent providing 7 premium API endpoints via x402 micropayments and Stripe credits. Services include: code review (5¢), security vulnerability scanning (3¢), text analysis (1¢), summarization (2¢), code explanation (2¢), refactoring (5¢), and complexity analysis (2¢). Free tier: 3 requests/day per IP. Pay-as-you-go pricing from $5 for 500 credits.`,
  website: 'https://automation.songheng.vip',
  wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
  chain: 'Base (USDC)',
  github: 'https://github.com',
  categories: ['developer-tools', 'code-review', 'ai-api', 'security', 'agent'],
  endpoints: [
    '/v1/analyze (1 credit)',
    '/v1/summarize (2 credits)',
    '/v1/review (5 credits)',
    '/v1/security (3 credits)',
    '/v1/explain (2 credits)',
    '/v1/refactor (5 credits)',
    '/v1/complexity (2 credits)',
  ],
  features: [
    'Sovereign AI agent — pays its own server bills',
    'x402 micropayments via USDC on Base chain',
    'Stripe checkout ($5-$58)',
    'Free tier: 3 requests/day per IP',
    'REST API with API Key auth',
    'GitHub Actions compatible',
    'CLI: npx my-automaton review <file>',
  ]
};

const API_DIRECTORIES = [
  {
    name: 'MCP.so',
    url: 'https://mcp.so/api/tools/submit',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: () => ({
      name: AGENT.name,
      description: AGENT.description,
      website: AGENT.website,
      tags: ['code-review', 'security', 'api', 'agent'],
      category: 'developer-tools'
    })
  },
  {
    name: 'PulseMCP',
    url: 'https://pulsemcp.com/api/tools',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: () => ({
      name: AGENT.name,
      description: AGENT.tagline,
      url: AGENT.website,
      categories: ['developer-tools']
    })
  },
  {
    name: 'Glama.ai',
    url: 'https://glama.ai/api/gateway/tools',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: () => ({
      name: AGENT.name,
      url: AGENT.website,
      description: AGENT.description.slice(0, 500),
      endpoints: AGENT.endpoints
    })
  },
  {
    name: 'Smithery (MCP Server)',
    url: 'https://smithery.ai/api/v1/servers',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: () => ({
      name: AGENT.name,
      description: AGENT.description,
      repository: 'https://github.com',
      tags: ['code-review', 'security', 'ai']
    })
  }
];

const BROWSER_LINKS = [
  ['ClawHunt', 'https://clawhunt.com/tools'],
  ['Google Search Console', 'https://search.google.com/search-console'],
  ['Bing Webmaster', 'https://www.bing.com/webmasters'],
  ['FutureTools', 'https://futuretools.io/submit'],
  ['ToolBase', 'https://toolbase.io/submit'],
  ['AI Tool Directory', 'https://aitooldirectory.com/submit'],
  ['AI Tools Club', 'https://aitoolsclub.com/submit'],
  ['Toolify', 'https://www.toolify.ai/submit'],
  ['EasyWithAI', 'https://easywithai.com/submit'],
  ['TopAI.tools', 'https://topai.tools/submit'],
  ['AI Scout', 'https://aiscout.net/submit'],
  ['AI Tool Guru', 'https://aitoolguru.com/submit'],
  ['Altern.ai', 'https://altern.ai/submit'],
  ['SaaS AI Tools', 'https://saasaitools.com/submit'],
  ['AI Tool Tracker', 'https://aitooltracker.com/submit'],
  ['There\'s An AI For That', 'https://theresanaiforthat.com/submit'],
];

const RESULTS = [];

async function tryApi(dir) {
  process.stdout.write(`  📤 ${dir.name}... `);
  try {
    const resp = await fetch(dir.url, {
      method: dir.method,
      headers: dir.headers,
      body: JSON.stringify(dir.body()),
      signal: AbortSignal.timeout(10000)
    });
    const text = await resp.text();
    const result = { name: dir.name, status: resp.status, response: text.slice(0, 300) };
    RESULTS.push(result);
    if (resp.status < 400) {
      console.log(`✅ ${resp.status}`);
    } else if (resp.status === 503) {
      console.log(`⏳ ${resp.status} (busy)`);
    } else {
      console.log(`❌ ${resp.status}`);
    }
    console.log(`     ${text.slice(0, 150)}\n`);
  } catch(e) {
    RESULTS.push({ name: dir.name, status: 0, error: e.message });
    console.log(`❌ ${e.message}\n`);
  }
}

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log(`  ${AGENT.name} — Directory Submission v2`);
  console.log(`  ${AGENT.website}`);
  console.log(`  Wallet: ${AGENT.wallet}`);
  console.log('══════════════════════════════════════════════\n');

  // Phase 1: Try API directories
  console.log('Phase 1: API-based submissions\n');
  for (const dir of API_DIRECTORIES) {
    await tryApi(dir);
  }

  // Phase 2: Generate browser submission links page
  console.log('Phase 2: Manual browser links (no API available)\n');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Submit my-automaton to Directories</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
  h1 { color: #2563eb; }
  .links { list-style: none; padding: 0; }
  .links li { margin: 8px 0; }
  .links a { color: #2563eb; text-decoration: none; }
  .links a:hover { text-decoration: underline; }
  .status { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 20px 0; }
  .copy-btn { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; }
  .copy-btn:hover { background: #1d4ed8; }
  textarea { width: 100%; height: 120px; margin: 10px 0; font-family: monospace; font-size: 13px; }
</style>
</head>
<body>
<h1>📋 Submit my-automaton to Directories</h1>
<div class="status">
  <strong>Ready to submit to ${BROWSER_LINKS.length} directories</strong><br>
  No API available — open each link and paste the description below.
</div>

<h2>Paste this description:</h2>
<textarea id="desc" readonly>${AGENT.description}</textarea>
<button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('desc').value)">📋 Copy Description</button>

<h2>Directory Links:</h2>
<ol class="links">
${BROWSER_LINKS.map(([name, url]) => `  <li><strong>${name}</strong>: <a href="${url}" target="_blank">${url}</a></li>`).join('\n')}
</ol>

<h2>Agent Details for Submission:</h2>
<ul>
  <li><strong>Name:</strong> ${AGENT.name}</li>
  <li><strong>Tagline:</strong> ${AGENT.tagline}</li>
  <li><strong>Website:</strong> <a href="${AGENT.website}">${AGENT.website}</a></li>
  <li><strong>Wallet:</strong> <code>${AGENT.wallet}</code> (Base chain, USDC)</li>
  <li><strong>Pricing:</strong> Free tier + $5-$58 credits</li>
</ul>

<h3>API Endpoints:</h3>
<ul>
${AGENT.endpoints.map(e => `  <li>POST \`${e}\`</li>`).join('\n')}
</ul>

<h3>Features:</h3>
<ul>
${AGENT.features.map(f => `  <li>${f}</li>`).join('\n')}
</ul>
</body>
</html>`;

  import * as fs from 'fs'.writeFileSync('/root/automaton/content/submit-to-directories.html', html);
  console.log(`  ✅ Generated /root/automaton/content/submit-to-directories.html`);
  console.log(`  📎 ${BROWSER_LINKS.length} directory links ready\n`);

  // Phase 3: Save results
  const resultsPath = '/root/automaton/data/directory-submissions.json';
  import * as fs from 'fs'.writeFileSync(resultsPath, JSON.stringify(RESULTS, null, 2));
  console.log(`  ✅ Results saved to ${resultsPath}\n`);

  // Print summary
  const succeeded = RESULTS.filter(r => r.status >= 200 && r.status < 400).length;
  const failed = RESULTS.filter(r => r.status >= 400 || r.status === 0).length;
  console.log('══════════════════════════════════════════════');
  console.log(`  Summary: ${succeeded} submitted, ${failed} failed, ${BROWSER_LINKS.length} browser links`);
  console.log('══════════════════════════════════════════════\n');
}

main().catch(console.error);
