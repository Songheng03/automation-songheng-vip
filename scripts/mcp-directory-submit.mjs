#!/usr/bin/env node
/**
 * mcp-directory-submit.mjs — MCP Directory Submission Tool
 * 
 * Submit my MCP server to directories where developers find AI tools.
 * 
 * Run: node scripts/mcp-directory-submit.mjs
 */

const DIRECTORIES = [
  {
    name: 'Smithery',
    url: 'https://smithery.ai',
    submitUrl: 'https://smithery.ai/api/packages',
    type: 'api',
    notes: 'Auto-submit via API. Package: @my-automaton/mcp-server'
  },
  {
    name: 'Glama',
    url: 'https://glama.ai',
    submitUrl: 'https://glama.ai/api/mcp/register',
    type: 'api',
    notes: 'Auto-submit via API'
  },
  {
    name: 'MCP.so',
    url: 'https://mcp.so',
    submitUrl: 'https://mcp.so/submit',
    type: 'manual',
    notes: 'Manual submission form'
  },
  {
    name: 'npx MCP Directory',
    url: 'https://npmmcp.com',
    type: 'manual',
    notes: 'List npm MCP packages. Package: @my-automaton/mcp-server'
  },
  {
    name: 'Pipedream',
    url: 'https://pipedream.com/apps',
    type: 'manual',
    notes: 'Submit as integration'
  },
  {
    name: 'GitHub Marketplace',
    url: 'https://github.com/marketplace',
    type: 'manual',
    notes: 'Submit GitHub Action for code review'
  },
  {
    name: 'OpenAPI Directory',
    url: 'https://apis.guru',
    type: 'manual',
    notes: 'Submit OpenAPI spec from /openapi.json'
  },
  {
    name: 'RapidAPI',
    url: 'https://rapidapi.com',
    type: 'manual',
    notes: 'List API for enterprise developers'
  }
];

async function submitSmithery() {
  const body = JSON.stringify({
    package: '@my-automaton/mcp-server',
    repository: 'https://github.com/my-automaton/mcp-server',
    description: '7 AI-powered MCP tools: code review, security scan, text analysis, summarization, explanation, refactoring, complexity analysis. Free tier 3/day/IP.',
    tools: [
      { name: 'analyze', description: 'Deep text analysis - sentiment, entities, themes, patterns' },
      { name: 'summarize', description: 'AI-powered text summarization with configurable length' },
      { name: 'code_review', description: 'Full code review - bugs, security, performance, style' },
      { name: 'security_scan', description: 'Security vulnerability scan for OWASP Top 10' },
      { name: 'explain_code', description: 'Explain code in plain language' },
      { name: 'refactor_code', description: 'Refactoring suggestions with code examples' },
      { name: 'complexity_analysis', description: 'Cyclomatic complexity and code quality metrics' }
    ],
    config: {
      command: 'node',
      args: ['mcp-server.mjs'],
      env: {
        DEEPSEEK_API_KEY: '$DEEPSEEK_API_KEY',
        GATEWAY_URL: 'https://automation.songheng.vip'
      }
    }
  });

  try {
    const resp = await fetch('https://smithery.ai/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    console.log('  Smithery: ' + resp.status + ' ' + resp.statusText);
    const data = await resp.text();
    if (data.length < 200) console.log('  Response: ' + data);
  } catch (e) {
    console.log('  Smithery: ERROR - ' + e.message);
  }
}

async function submitGlama() {
  const body = JSON.stringify({
    name: 'my-automaton/mcp-server',
    description: 'AI code review & analysis MCP server with 7 tools',
    homepage: 'https://automation.songheng.vip',
    repository: 'https://github.com/my-automaton/mcp-server',
    license: 'MIT',
    tools: ['analyze', 'summarize', 'code_review', 'security_scan', 'explain_code', 'refactor_code', 'complexity_analysis']
  });

  try {
    const resp = await fetch('https://glama.ai/api/mcp/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    console.log('  Glama: ' + resp.status + ' ' + resp.statusText);
  } catch (e) {
    console.log('  Glama: ERROR - ' + e.message);
  }
}

function generateReadmeBadge() {
  return [
    '## MCP Directory Badges',
    '',
    '[![Smithery](https://smithery.ai/badge/@my-automaton/mcp-server)](https://smithery.ai/server/@my-automaton/mcp-server)',
    '[![Glama](https://glama.ai/api/mcp/badge/my-automaton-mcp-server)](https://glama.ai/servers/my-automaton/mcp-server)',
    '',
    '---',
    '',
    '### Manual Submissions Checklist',
    '',
    '| Directory | URL | Status |',
    '|---|---|---|',
  ].concat(DIRECTORIES.filter(d => d.type === 'manual').map(d => 
    '| ' + d.name + ' | ' + d.submitUrl + ' | ❌ Not submitted |'
  )).join('\n');
}

async function main() {
  console.log('=== MCP Directory Submission Tool ===\n');
  
  console.log('Auto-submitting to APIs...\n');
  await submitSmithery();
  await submitGlama();
  
  console.log('\nManual submissions needed:');
  DIRECTORIES.filter(d => d.type === 'manual').forEach(d => {
    console.log('  ❌ ' + d.name + ': ' + d.submitUrl);
    console.log('     ' + d.notes);
  });
  
  console.log('\n---');
  console.log('README Badge Markdown:');
  console.log(generateReadmeBadge());
  
  // Write status
  const dir = '/root/automaton/data';
  if (!require) {}
  try {
    const fs = await import('fs');
    const path = await import('path');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'mcp-submissions.json'), JSON.stringify({
      lastRun: new Date().toISOString(),
      submitted: ['Smithery', 'Glama'],
      manual: DIRECTORIES.filter(d => d.type === 'manual').map(d => d.name)
    }, null, 2));
  } catch {}
  
  console.log('\nDone. Open each manual link to complete submission.');
}

main().catch(e => console.error(e));
