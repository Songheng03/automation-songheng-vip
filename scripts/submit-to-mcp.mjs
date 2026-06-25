#!/usr/bin/env node
/**
 * submit-to-mcp.mjs — Submit my-automaton to MCP directories and developer platforms
 * 
 * This is the #1 way to get developer traffic. Each platform has thousands of
 * active users looking for AI tools to integrate.
 * 
 * Run: node scripts/submit-to-mcp.mjs
 */

const ORIGIN = 'https://automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

const MCP_CATALOG = {
  name: 'my-automaton',
  description: 'AI-powered code review, security scanning, text analysis & summarization API. Pay-per-use via USDC or free tier (3/day).',
  author: 'my-automaton',
  website: ORIGIN,
  wallet: WALLET,
  services: [
    { id: 'analyze', name: 'Text Analysis', cost: '1¢', type: 'x402' },
    { id: 'summarize', name: 'AI Summarization', cost: '2¢', type: 'x402' },
    { id: 'review', name: 'Code Review', cost: '5¢', type: 'x402' },
    { id: 'security', name: 'Security Scan', cost: '3¢', type: 'x402' },
    { id: 'explain', name: 'Code Explanation', cost: '2¢', type: 'x402' },
    { id: 'refactor', name: 'Refactoring', cost: '5¢', type: 'x402' },
    { id: 'complexity', name: 'Complexity Analysis', cost: '2¢', type: 'x402' }
  ],
  endpoints: {
    free: `${ORIGIN}/api/free/{service}`,
    premium: `${ORIGIN}/v1/{service}`
  },
  freeTier: '3 requests/day per IP, no signup',
  payment: 'USDC on Base chain via x402 protocol'
};

const DIRECTORIES = [
  {
    name: 'Smithery',
    url: 'https://smithery.ai',
    manifestUrl: `${ORIGIN}/smithery-manifest`,
    type: 'mcp-server',
    submitUrl: 'https://smithery.ai/submit'
  },
  {
    name: 'Glama',
    url: 'https://glama.ai',
    type: 'mcp-server',
    submitUrl: 'https://glama.ai/mcp/servers'
  },
  {
    name: 'MCP.so',
    url: 'https://mcp.so',
    type: 'mcp-server',
    submitUrl: 'https://mcp.so/submit'
  },
  {
    name: 'Toolbase',
    url: 'https://toolbase.io',
    type: 'ai-tool',
    submitUrl: 'https://toolbase.io/submit'
  },
  {
    name: 'OpenTools',
    url: 'https://opentools.ai',
    type: 'ai-tool',
    submitUrl: 'https://opentools.ai/submit'
  },
  {
    name: 'FutureTools',
    url: 'https://futuretools.io',
    type: 'ai-tool',
    submitUrl: 'https://futuretools.io/submit'
  },
  {
    name: 'There\'s An AI For That',
    url: 'https://theresanaiforthat.com',
    type: 'ai-tool',
    submitUrl: 'https://theresanaiforthat.com/submit/'
  },
  {
    name: 'EasyWithAI',
    url: 'https://easywithai.com',
    type: 'ai-tool',
    submitUrl: 'https://easywithai.com/submit-tool/'
  },
  {
    name: 'AI Tool Hunt',
    url: 'https://aitoolhunt.com',
    type: 'ai-tool',
    submitUrl: 'https://aitoolhunt.com/submit'
  }
];

console.log('🤖 my-automaton — MCP Directory Submission Plan\n');
console.log(`Domain: ${ORIGIN}`);
console.log(`Wallet: ${WALLET}\n`);

console.log('📋 MCP Server Manifest (for registration):');
console.log(JSON.stringify(MCP_CATALOG, null, 2));
console.log('\n');

console.log('📌 SUBMIT TO THESE DIRECTORIES:');
console.log('========================================\n');

DIRECTORIES.forEach((dir, i) => {
  console.log(`${i + 1}. ${dir.name}`);
  console.log(`   Type: ${dir.type}`);
  console.log(`   Submit: ${dir.submitUrl}`);
  console.log(`   Info needed:`);
  console.log(`     - Name: my-automaton`);
  console.log(`     - URL: ${ORIGIN}`);
  console.log(`     - Description: AI-powered code review, security scanning & text analysis. Free tier available.`);
  console.log(`     - Category: Developer Tools / AI / Code Review`);
  console.log(`     - Pricing: Free tier (3/day) + Pay-per-use (USDC 1¢-5¢)`);
  console.log('');
});

// Generate the MCP manifest file for Smithery
console.log('📄 GENERATING MCP MANIFEST...\n');

const manifest = {
  schemaVersion: 'v1',
  name: 'my-automaton',
  description: MCP_CATALOG.description,
  icon: `${ORIGIN}/favicon.ico`,
  category: 'developer-tools',
  tags: ['code-review', 'security', 'ai', 'text-analysis', 'summarization', 'developer-tools'],
  pricing: {
    type: 'freemium',
    free: '3 requests/day per IP',
    premium: '1¢-5¢ per request via USDC (Base chain)'
  },
  endpoints: {
    base: ORIGIN,
    openai: `${ORIGIN}/mcp/v1/openai-json`,
    mcp: `${ORIGIN}/mcp/jsonrpc`
  },
  tools: MCP_CATALOG.services.map(s => ({
    name: s.id,
    description: `${s.name} — ${s.cost} per request`,
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Code or text to analyze' },
        code: { type: 'string', description: 'Code to review/analyze' },
        language: { type: 'string', description: 'Programming language', enum: ['auto', 'javascript', 'python', 'rust', 'go', 'java', 'typescript', 'solidity', 'ruby', 'cpp'], default: 'auto' }
      },
      required: ['text']
    }
  })),
  integrations: {
    claude: `${ORIGIN}/mcp/v1/openai`,
    cursor: `${ORIGIN}/mcp/v1/openai`,
    continue: `${ORIGIN}/mcp/jsonrpc`
  }
};

console.log(JSON.stringify(manifest, null, 2));
console.log('\n');

// Generate share links
console.log('📢 SHARE ON SOCIAL (one-click submit):\n');
const tweetText = encodeURIComponent('Just deployed my AI services: free code review & security scanning API. 3 requests/day, no signup. Plus premium x402 with USDC on @base 🚀');
const tweetUrl = encodeURIComponent(ORIGIN);
console.log(`Twitter: https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`);

const liTitle = encodeURIComponent('my-automaton — Free AI API for Code Review & Security');
const liSummary = encodeURIComponent('AI-powered code review, security scanning, text analysis. Free tier: 3/day. Premium: 1¢-5¢ via USDC on Base chain.');
console.log(`LinkedIn: https://www.linkedin.com/sharing/share-offsite/?url=${tweetUrl}&title=${liTitle}&summary=${liSummary}`);

console.log(`Reddit (r/programming): https://www.reddit.com/r/programming/submit?url=${tweetUrl}&title=${encodeURIComponent('I built a free AI code review API — 3 requests/day, no signup')}`);
console.log(`Reddit (r/webdev): https://www.reddit.com/r/webdev/submit?url=${tweetUrl}&title=${encodeURIComponent('Free AI code review & security scanning API — pay-per-use with USDC')}`);
console.log(`HackerNews: https://news.ycombinator.com/submitlink?u=${tweetUrl}&t=${encodeURIComponent('Free AI Code Review API — No Signup, Pay with USDC')}`);
console.log(`Dev.to: https://dev.to/new?prefill=${encodeURIComponent('---\ntitle: Free AI Code Review API — 3 Requests/Day, No Signup\npublished: true\ndescription: An autonomous AI agent built a code review API. Here\'s how it works.\ntags: ai, api, codereview, opensource\n---\n\n')}`);

// Save the manifest
import { writeFileSync } from 'fs';
writeFileSync('/root/automaton/content/mcp-manifest.json', JSON.stringify(manifest, null, 2));
console.log('✅ MCP manifest saved to /root/automaton/content/mcp-manifest.json');
console.log('\n🎯 DONE! Submit to the directories above for maximum developer reach.');
