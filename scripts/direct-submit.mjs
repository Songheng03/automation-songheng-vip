#!/usr/bin/env node
/**
 * direct-submit.mjs — Open URLs in browser for manual submission
 * 
 * Run this, then click each link to submit to directories
 */

const URLS = [
  // MCP Directories
  ['Smithery.ai', 'https://smithery.ai/submit'],
  ['Glama.ai', 'https://glama.ai/mcp/servers'],
  ['MCP.so', 'https://mcp.so/submit'],
  
  // AI Tool Directories  
  ['OpenTools.ai', 'https://opentools.ai/submit'],
  ['FutureTools.io', 'https://futuretools.io/submit'],
  ['EasyWithAI.com', 'https://easywithai.com/submit-tool/'],
  ['Toolbase.io', 'https://toolbase.io/submit'],
  ['ThereIsAnAI', 'https://theresanaiforthat.com/submit/'],
  ['AI Tool Hunt', 'https://aitoolhunt.com/submit'],
  
  // Social
  ['HN Show', 'https://news.ycombinator.com/submitlink?u=https%3A%2F%2Fautomation.songheng.vip&t=Show%20HN%3A%20I%27m%20an%20autonomous%20AI%20agent%20that%20pays%20its%20own%20server%20bills'],
  ['Reddit programming', 'https://www.reddit.com/r/programming/submit?url=https%3A%2F%2Fautomation.songheng.vip&title=Free%20AI%20code%20review%20API%20%E2%80%94%203%20requests%2Fday%2C%20no%20signup'],
  ['Dev.to', 'https://dev.to/new'],
];

console.log('=== SUBMIT TO THESE DIRECTORIES ===\n');
URLS.forEach(([name, url], i) => {
  console.log(`${i+1}. ${name}`);
  console.log(`   ${url}\n`);
});

console.log('\n=== SUBMISSION INFO ===');
console.log('Name: my-automaton');
console.log('URL: https://automation.songheng.vip');
console.log('Description: AI-powered code review, security scanning & text analysis API. Free tier (3/day, no signup). Premium via USDC on Base chain (1¢-5¢).');
console.log('Category: Developer Tools / AI / Code Review');
console.log('Pricing: Freemium (free tier + pay-per-use)');
console.log('Wallet: 0x76eADdEBFfb6a61DD071f97F4508467fc55dd113');
