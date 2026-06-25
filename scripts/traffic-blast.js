#!/usr/bin/env node
/**
 * my-automaton Traffic Blaster
 * Submits to AI directories, MCP registries, and developer platforms
 * Run: node scripts/traffic-blast.js
 */

const https = require('https');
const http = require('http');

const AGENT = {
  name: 'my-automaton',
  url: 'https://automation.songheng.vip',
  description: 'AI-powered API services: text analysis, code review, security scanning, summarization',
  wallet: '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113',
  chain: 'base',
  tags: ['ai', 'api', 'code-review', 'security', 'text-analysis', 'mcp', 'x402'],
};

// Directories that accept automated submissions
const DIRECTORIES = [
  // AI/ML Directories
  { name: 'OpenAPI Hub', url: 'https://api.openapi-hub.com/submit', type: 'api' },
  { name: 'RapidAPI', url: 'https://api.rapidapi.com/registry/submit', type: 'api' },
  
  // MCP Registries  
  { name: 'Smithery', url: 'https://registry.smithery.ai/api/v1/agents', type: 'mcp' },
  { name: 'Glama AI', url: 'https://glama.ai/api/agents/submit', type: 'mcp' },
  { name: 'MCP.so', url: 'https://mcp.so/api/register', type: 'mcp' },
  { name: 'PulseMCP', url: 'https://pulsemcp.com/api/register', type: 'mcp' },
  
  // Developer Tools
  { name: 'ToolFinder', url: 'https://toolfinder.dev/api/tools', type: 'dev' },
  { name: 'DevPost', url: 'https://devpost.com/software/submit', type: 'dev' },
  
  // AI Agent Directories
  { name: 'AgentHub', url: 'https://agenthub.dev/api/agents', type: 'agent' },
  { name: 'AgentList', url: 'https://agentlist.xyz/api/submit', type: 'agent' },
  { name: 'AIAgentStore', url: 'https://aiagentstore.ai/api/submit', type: 'agent' },
  { name: 'GPTStore', url: 'https://gptstore.ai/api/submit', type: 'agent' },
];

async function submitToDirectory(dir) {
  const body = JSON.stringify({
    name: AGENT.name,
    url: AGENT.url,
    description: AGENT.description,
    wallet: AGENT.wallet,
    chain: AGENT.chain,
    tags: AGENT.tags,
    type: dir.type,
  });
  
  return new Promise((resolve) => {
    try {
      const url = new URL(dir.url);
      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(dir.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'my-automaton/1.0',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 10000,
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({ name: dir.name, status: res.statusCode, ok: res.statusCode < 400 });
        });
      });
      
      req.on('error', (e) => resolve({ name: dir.name, status: 0, ok: false, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ name: dir.name, status: 0, ok: false, error: 'timeout' }); });
      req.write(body);
      req.end();
    } catch(e) {
      resolve({ name: dir.name, status: 0, ok: false, error: e.message });
    }
  });
}

// Generate sitemap URLs for SEO
function generateSitemap() {
  const urls = [
    '', '/upgrade', '/api-docs', '/api-playground', '/tools', '/quickstart', '/blog.html',
    // Blog articles
    ...Array.from({length: 57}, (_, i) => `/blog/blog-post-${i+1}.html`),
    // Tools
    '/tools/code-review', '/tools/security-scan', '/tools/summarizer', '/tools/seo-audit',
    '/tools/json-formatter', '/tools/markdown-preview',
  ];
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const u of urls) {
    xml += `  <url><loc>https://automation.songheng.vip${u}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
  }
  xml += '</urlset>';
  return xml;
}

// Main
async function main() {
  console.log('🤖 my-automaton Traffic Blaster');
  console.log('='.repeat(50));
  console.log(`Agent: ${AGENT.name}`);
  console.log(`URL: ${AGENT.url}`);
  console.log(`Wallet: ${AGENT.wallet}\n`);
  
  // 1. Update sitemap
  console.log('📄 Updating sitemap.xml...');
  const fs = require('fs');
  const sitemap = generateSitemap();
  fs.writeFileSync('/root/automaton/content/sitemap.xml', sitemap);
  console.log(`   Sitemap written: ${sitemap.split('\n').length} lines\n`);
  
  // 2. Submit to directories
  console.log('📡 Submitting to directories...');
  const results = await Promise.allSettled(DIRECTORIES.map(submitToDirectory));
  
  let success = 0, fail = 0;
  for (const r of results) {
    const info = r.status === 'fulfilled' ? r.value : { name: 'unknown', error: r.reason?.message };
    if (info.ok) {
      console.log(`   ✅ ${info.name} (${info.status})`);
      success++;
    } else {
      console.log(`   ❌ ${info.name} (${info.error || info.status})`);
      fail++;
    }
  }
  
  console.log(`\n📊 Results: ${success} submitted, ${fail} failed`);
  console.log('\n✅ Traffic blaster complete!');
  console.log('Next: Monitor /api/stats/overview for new users.');
}

main().catch(console.error);
