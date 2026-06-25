#!/usr/bin/env node
/**
 * smithery-register.js — Register my-automaton with Smithery MCP directory
 * Run: node /root/automaton/smithery-register.js
 * 
 * Submits to Smithery, MCP.so, Glama, and other MCP directories
 * so that Claude Desktop, Cursor, and other MCP clients can find us.
 */

const DIRECTORIES = {
  smithery: {
    name: 'Smithery',
    url: 'https://smithery.ai/api/v1/servers',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: () => ({
      name: 'my-automaton',
      displayName: 'my-automaton - AI Code Review & Analysis',
      description: '7 AI-powered developer tools: code review, security scanning, text analysis, summarization, code explanation, refactoring, and complexity analysis. Pay-per-use with free tier.',
      categories: ['code-review', 'security', 'text-analysis', 'developer-tools'],
      tags: ['code-review', 'security-scan', 'ai', 'analysis', 'mcp'],
      homepage: 'https://automation.songheng.vip',
      repository: 'https://github.com/chaosong/automaton-mcp-server',
      license: 'MIT',
      pricing: { free: '3 requests/day', paid: 'From $5 (500 credits)' },
      tools: [
        { name: 'analyze', description: 'Deep text analysis - sentiment, topics, entities, writing style' },
        { name: 'summarize', description: 'AI summarization with configurable length' },
        { name: 'code_review', description: 'Full code review - bugs, security vulnerabilities, performance issues, style problems' },
        { name: 'security_scan', description: 'Security vulnerability scan - XSS, SQL injection, CSRF, authentication issues' },
        { name: 'explain_code', description: 'Line-by-line code explanation for junior developers' },
        { name: 'refactor_code', description: 'Refactoring suggestions with improved code examples' },
        { name: 'complexity_analysis', description: 'Big O time and space complexity analysis with optimization suggestions' }
      ],
      mcpEndpoints: {
        jsonrpc: 'https://automation.songheng.vip/mcp/jsonrpc',
        sse: 'https://automation.songheng.vip/mcp/sse',
        manifest: 'https://automation.songheng.vip/smithery-manifest'
      },
      installInstructions: `## Quick Install

### Claude Desktop
Add to claude_desktop_config.json:
\`\`\`json
{
  "mcpServers": {
    "my-automaton": {
      "command": "npx",
      "args": ["-y", "automaton-mcp-server"]
    }
  }
}
\`\`\`

### Programmatic
\`\`\`javascript
import { callTool } from 'automaton-mcp-server';
const result = await callTool('analyze', 'Your text here');
\`\`\`
`
    })
  },
  mcpsopot: {
    name: 'MCP.so',
    url: 'https://mcpsopot.com/api/servers',
    method: 'POST',
    body: () => ({
      name: 'my-automaton',
      description: 'AI code review, security scanning, and text analysis via MCP',
      website: 'https://automation.songheng.vip',
      github: 'https://github.com/chaosong/automaton-mcp-server',
      category: 'developer-tools',
      features: ['Code Review', 'Security Scan', 'Text Analysis', 'Summarization', 'Complexity Analysis'],
      install: 'npx -y automaton-mcp-server'
    })
  },
  glama: {
    name: 'Glama',
    url: 'https://glama.ai/api/mcp/servers',
    method: 'POST',
    body: () => ({
      name: 'my-automaton',
      package: 'automaton-mcp-server',
      description: '7 AI developer tools via MCP',
      homepage: 'https://automation.songheng.vip'
    })
  }
};

async function register(directory) {
  const config = DIRECTORIES[directory];
  if (!config) return { directory, status: 'unknown', error: 'No config' };
  
  try {
    const body = config.body();
    const response = await fetch(config.url, {
      method: config.method,
      headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    
    const data = response.ok ? await response.json().catch(() => ({})) : null;
    return {
      directory: config.name,
      status: response.ok ? 'registered' : `HTTP ${response.status}`,
      url: config.url,
      response: response.ok ? 'OK' : `${response.status} ${response.statusText}`
    };
  } catch (e) {
    return {
      directory: config.name,
      status: 'error',
      url: config.url,
      error: e.message
    };
  }
}

async function main() {
  console.log('=== Smithery/MCP Directory Registration ===\n');
  
  const results = await Promise.all(
    Object.keys(DIRECTORIES).map(dir => register(dir))
  );
  
  console.log('Results:');
  results.forEach(r => {
    const icon = r.status === 'registered' ? '✅' : r.status === 'error' ? '❌' : '⚠️';
    console.log(`  ${icon} ${r.directory}: ${r.status}${r.error ? ' ('+r.error+')' : ''}`);
  });
  
  console.log('\n📋 Manual submission required for:');
  console.log('  1. Google Search Console - https://search.google.com/search-console');
  console.log('  2. MCP.so - https://mcpsopot.com (if automated fails)');
  console.log('  3. MCP Get - https://mcp.get.dev');
  console.log('  4. npm publish: npm publish /root/automaton/npm-package/');
  console.log('\n💡 After registration, agents discover you via MCP protocol at:');
  console.log('   MCP:   https://automation.songheng.vip/mcp/jsonrpc');
  console.log('   SSE:   https://automation.songheng.vip/mcp/sse');
  console.log('   Smithery: https://automation.songheng.vip/smithery-manifest');
  console.log('   Wallet: 0x76eADdEBFfb6a61DD071f97F4508467fc55dd113 (Base/USDC)');
}

main().catch(console.error);
