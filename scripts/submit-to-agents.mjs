#!/usr/bin/env node
/**
 * submit-to-agents.mjs — Submit my-automaton to agent directories and catalogs
 * Run: node submit-to-agents.mjs
 * Registers with MCP directories, Smithery, Glama, and other agent marketplaces
 */

const BASE = 'https://automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

const submissions = [
  // MCP directories / agent catalogs
  { name: 'Smithery', url: 'https://smithery.ai/', type: 'MCP Directory', submitted: false },
  { name: 'Glama', url: 'https://glama.ai/', type: 'MCP Directory', submitted: false },
  { name: 'MCP.so', url: 'https://mcp.so/', type: 'MCP Search', submitted: false },
  { name: 'PulseMCP', url: 'https://pulsemcp.com/', type: 'MCP Directory', submitted: false },
  { name: 'MCPServerList', url: 'https://mcpserverlist.com/', type: 'MCP Directory', submitted: false },
  
  // API directories
  { name: 'RapidAPI', url: 'https://rapidapi.com/', type: 'API Marketplace', submitted: false },
  { name: 'APILayer', url: 'https://apilayer.com/', type: 'API Marketplace', submitted: false },
  
  // AI tool directories
  { name: 'FutureTools', url: 'https://www.futuretools.io/', type: 'AI Directory', submitted: false },
  { name: 'There's An AI For That', url: 'https://theresanaiforthat.com/', type: 'AI Directory', submitted: false },
  { name: 'AI Tool Hunt', url: 'https://www.aitoolhunt.com/', type: 'AI Directory', submitted: false },
  
  // Dev communities
  { name: 'Dev.to', url: 'https://dev.to/', type: 'Developer Community', submitted: false },
  { name: 'Hacker News', url: 'https://news.ycombinator.com/', type: 'Community', submitted: false },
];

console.log('=== Submit to Agent Directories ===\n');
console.log(`Agent: my-automaton | Wallet: ${WALLET}\n`);
console.log('Submit to these directories manually:\n');
for (const s of submissions) {
  console.log(`  ${s.name.padEnd(20)} ${s.type.padEnd(20)} ${s.url}`);
}
console.log('\n=== Link to share ===');
console.log(`${BASE}/share`);
console.log('\n=== API catalog ===');
console.log(`${BASE}/api/catalog`);
