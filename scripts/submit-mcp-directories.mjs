#!/usr/bin/env node
/**
 * Submit my-automaton's MCP server to agent directories
 * 
 * This script generates the submission data for:
 * - Smithery.ai - MCP server directory
 * - Glama.ai - MCP server listings
 * - MCP.so - MCP server marketplace
 * - PulseMCP - MCP server tracker
 * 
 * Run: node scripts/submit-mcp-directories.mjs
 * Output: /root/automaton/content/data/mcp-submissions.json
 */

const { writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

const MY_INFO = {
  name: 'my-automaton',
  description: 'AI Code Review, Security Scan, Text Analysis & Summarization MCP Server',
  url: 'https://github.com/my-automaton/mcp-server',
  serverUrl: 'https://automation.songheng.vip',
  installCommand: 'npx @my-automaton/mcp-server',
  wallet: '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113',
  contact: 'https://automation.songheng.vip',
  categories: ['AI Code Review', 'Security Scanning', 'Text Analysis', 'Developer Tools'],
  tools: [
    {
      name: 'analyze',
      description: 'Deep text analysis - sentiment, entities, themes, style',
      inputSchema: { text: 'string (required)' },
      cost: '1 credit'
    },
    {
      name: 'summarize', 
      description: 'AI summarization of any text',
      inputSchema: { text: 'string (required)' },
      cost: '2 credits'
    },
    {
      name: 'review',
      description: 'Full code review - bugs, security, performance, style',
      inputSchema: { code: 'string (required)' },
      cost: '5 credits'
    },
    {
      name: 'security',
      description: 'Security vulnerability scan - XSS, SQLi, CSRF, auth',
      inputSchema: { code: 'string (required)' },
      cost: '3 credits'
    },
    {
      name: 'explain',
      description: 'Code explanation in plain language',
      inputSchema: { code: 'string (required)' },
      cost: '2 credits'
    },
    {
      name: 'refactor',
      description: 'Refactoring suggestions with specific improvements',
      inputSchema: { code: 'string (required)' },
      cost: '5 credits'
    },
    {
      name: 'complexity',
      description: 'Cyclomatic and cognitive complexity analysis',
      inputSchema: { code: 'string (required)' },
      cost: '2 credits'
    }
  ]
};

const submissions = {
  generated: new Date().toISOString(),
  agent: MY_INFO.name,
  
  // === Smithery.ai ===
  smithery: {
    url: 'https://smithery.ai/server/@my-automaton/mcp-server',
    submitUrl: 'https://smithery.ai/submit',
    payload: {
      name: MY_INFO.name,
      packageName: '@my-automaton/mcp-server',
      description: MY_INFO.description,
      categories: MY_INFO.categories,
      installCommand: MY_INFO.installCommand,
      serverUrl: MY_INFO.serverUrl,
      tools: MY_INFO.tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: {
          type: 'object',
          properties: Object.entries(t.inputSchema).map(([k, v]) => ({
            [k]: { type: 'string', description: v }
          })).reduce((a, b) => ({...a, ...b}), {}),
          required: Object.keys(t.inputSchema)
        }
      }))
    },
    instructions: `Go to ${'https://smithery.ai/submit'} and fill in:
- Package name: @my-automaton/mcp-server
- Description: ${MY_INFO.description}
- Categories: ${MY_INFO.categories.join(', ')}
- GitHub URL: ${MY_INFO.url}
- Server URL: ${MY_INFO.serverUrl}`
  },
  
  // === Glama.ai ===
  glama: {
    url: 'https://glama.ai/mcp/servers',
    submitUrl: 'https://glama.ai/mcp/servers/new',
    payload: {
      id: '@my-automaton/mcp-server',
      name: MY_INFO.name,
      description: MY_INFO.description,
      github: MY_INFO.url,
      homepage: MY_INFO.serverUrl,
      command: 'npx',
      args: ['@my-automaton/mcp-server'],
      tools: MY_INFO.tools.map(t => t.name)
    },
    instructions: `Go to ${'https://glama.ai/mcp/servers/new'} and fill in:
- GitHub URL: ${MY_INFO.url}
- Description: ${MY_INFO.description}
- Tags: ${MY_INFO.categories.join(', ')}`
  },
  
  // === MCP.so ===
  mcpso: {
    url: 'https://mcp.so/servers',
    submitUrl: 'https://mcp.so/submit',
    payload: {
      name: MY_INFO.name,
      summary: MY_INFO.description,
      github: MY_INFO.url,
      categories: MY_INFO.categories,
      tools: MY_INFO.tools.length,
      freetier: '3 free requests/day per IP'
    },
    instructions: `Go to ${'https://mcp.so/submit'} and fill in:
- Server name: my-automaton
- GitHub URL: ${MY_INFO.url}
- Description: ${MY_INFO.description}
- Tags: AI Code Review, Security, DevTools`
  },
  
  // === PulseMCP ===
  pulsemcp: {
    url: 'https://pulsemcp.com',
    submitUrl: 'https://pulsemcp.com/submit',
    payload: {
      name: MY_INFO.name,
      description: MY_INFO.description,
      url: MY_INFO.url,
      categories: MY_INFO.categories
    },
    instructions: `Go to ${'https://pulsemcp.com/submit'} and submit:
- Name: my-automaton
- URL: ${MY_INFO.url}
- Description: ${MY_INFO.description}`
  },
  
  // === OpenRouter ===
  openrouter: {
    instructions: `Register at ${'https://openrouter.ai/keys'} 
Add API key to system and let me use it for cost-effective inference.`
  }
};

// Write output
const outputPath = '/root/automaton/content/data/mcp-submissions.json';
const dir = join(outputPath, '..');
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
writeFileSync(outputPath, JSON.stringify(submissions, null, 2));

console.log('=== MCP Directory Submission Guide ===\n');
console.log(`📋 Generated: ${submissions.generated}\n`);

for (const [key, data] of Object.entries(submissions)) {
  if (key === 'generated' || key === 'agent') continue;
  console.log(`--- ${key.toUpperCase()} ---`);
  console.log(data.instructions || `Submit at: ${data.submitUrl}`);
  if (data.url) console.log(`   Directory: ${data.url}`);
  console.log();
}

console.log(`📁 Full payload saved to: ${outputPath}`);
console.log('\n💡 To submit manually, open each URL above and fill in the details.');
console.log('   Or use a browser automation tool to submit programmatically.');
