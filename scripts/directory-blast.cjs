#!/usr/bin/env node
/**
 * directory-blast.cjs — Submit my-automaton to AI directories
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const DOMAIN = 'automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

const DIRECTORIES = [
  {
    name: 'ClawHunt',
    url: 'https://clawhunt.com/api/tools',
    method: 'POST',
    data: {
      name: 'my-automaton AI',
      tagline: 'AI Code Review & Text Analysis API - Pay per request from 1¢',
      description: 'An autonomous AI agent providing code review, security scanning, text analysis via REST API. Pay per request with USDC on Base chain. Free tier available (3/day/IP). MCP server compatible.',
      category: 'Developer Tools',
      pricing: 'Freemium - From 1¢/request',
      website: `https://${DOMAIN}`,
      wallet: WALLET,
      features: ['Code review (5¢/req)','Security scanning (3¢/req)','Text analysis (1¢/req)','Summarization (2¢/req)','Code explanation (2¢/req)','Refactoring (5¢/req)','Complexity analysis (2¢/req)','Batch processing (5¢/batch)','Free tier 3/day/IP','MCP server compatible','GitHub Actions PR review','CLI: npx my-automaton-cli']
    }
  },
  {
    name: 'Smithery',
    url: 'https://registry.smithery.ai/api/packages',
    method: 'POST',
    data: {
      name: '@my-automaton/mcp-server',
      description: 'MCP server for AI code review, security scanning, text analysis',
      category: 'MCP Server',
      tags: ['code-review','security','ai','developer-tools','mcp']
    }
  }
];

async function submit(dir) {
  console.log(`\n📤 Submitting to ${dir.name}...`);
  console.log(`   URL: ${dir.url}`);
  console.log(`   Data: ${JSON.stringify(dir.data).substring(0, 200)}...`);
  
  try {
    const data = JSON.stringify(dir.data);
    const urlObj = new URL(dir.url);
    
    const result = await new Promise((resolve) => {
      const req = https.request({
        hostname: urlObj.hostname,
        path: urlObj.pathname + (urlObj.search || ''),
        method: dir.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        },
        timeout: 15000
      }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve({ status: res.statusCode, body: body.substring(0, 200) }));
      });
      req.on('error', (e) => resolve({ status: 0, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
      req.write(data);
      req.end();
    });
    
    console.log(`   Response: ${result.status} ${result.error || ''}`);
    if (result.body) console.log(`   Body: ${result.body}`);
    return result;
  } catch(e) {
    console.log(`   ❌ Error: ${e.message}`);
  }
}

async function main() {
  console.log('=== Directory Blast: my-automaton ===\n');
  console.log(`🌐 Gateway: https://${DOMAIN}`);
  console.log(`💰 Wallet: ${WALLET}\n`);

  for (const dir of DIRECTORIES) {
    await submit(dir);
  }

  console.log('\n✅ Directory blast complete!');
  console.log('\n📋 Manual submissions still needed:');
  console.log('   ☐ Google Search Console: https://search.google.com/search-console');
  console.log('   ☐ Bing Webmaster Tools: https://www.bing.com/webmasters');
  console.log('   ☐ Product Hunt: https://www.producthunt.com/posts/new');
  console.log('   ☐ dev.to: Publish AI code review tutorial');
  console.log('   ☐ Hacker News: Show HN post');
}

main().catch(console.error);
