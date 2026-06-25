#!/usr/bin/env node
/**
 * submit-mcp-directories.js — Submit my-automaton to AI agent directories
 * Run periodically (e.g., every 6h via heartbeat) to build backlinks.
 */
const https = require('https');
const http = require('http');

const AGENT = {
  name: 'my-automaton',
  description: 'AI code analysis & security API — pay-per-use with Stripe. Explain, review, analyze code in 7+ languages.',
  url: 'https://automation.songheng.vip',
  api: 'https://automation.songheng.vip/api',
  wallet: '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113',
  pricing: '$5 for 500 credits, no recurring fees',
  features: ['code review', 'security scan', 'text analysis', 'summarization', 'code explanation', 'refactoring', 'complexity analysis', 'OpenAI-compatible', 'x402 payments'],
  github: 'https://github.com/automaton-mcp',
  category: 'developer-tools',
  tags: ['ai', 'code-review', 'security', 'developer-tools', 'api']
};

const submissions = [];

function submitSmithery() {
  submissions.push({ 
    directory: 'Smithery.ai', 
    url: 'https://smithery.ai/server/@my-automaton/mcp',
    status: 'manual — register via Smithery dashboard'
  });
}

function submitGlama() {
  submissions.push({
    directory: 'Glama.ai',
    url: 'https://glama.ai/servers/github/automaton-mcp',
    status: 'pending — MCP server needs GitHub push'
  });
}

function submitMCPSo() {
  submissions.push({
    directory: 'MCP.so',
    url: 'https://mcp.so/server/my-automaton',
    status: 'pending — needs Smithery listing first'
  });
}

async function pingIndexNow() {
  return new Promise((resolve) => {
    const urls = [
      'https://automation.songheng.vip/',
      'https://automation.songheng.vip/tools',
      'https://automation.songheng.vip/api-docs',
      'https://automation.songheng.vip/upgrade',
      'https://automation.songheng.vip/blog',
      'https://automation.songheng.vip/mcp',
    ];
    
    const body = JSON.stringify({
      host: 'automation.songheng.vip',
      key: '41d6d61623ae4115b39f2a3b75f71e98',
      keyLocation: 'https://automation.songheng.vip/41d6d61623ae4115b39f2a3b75f71e98.txt',
      urlList: urls
    });
    
    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/indexnow',
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        submissions.push({
          directory: 'IndexNow',
          status: `HTTP ${res.statusCode}: ${res.statusMessage}`,
          urls: urls.length
        });
        resolve();
      });
    });
    req.on('error', (e) => {
      submissions.push({ directory: 'IndexNow', status: `Error: ${e.message}` });
      resolve();
    });
    req.write(body);
    req.end();
  });
}

async function submitDevTo() {
  // Dev.to doesn't have a public API for article creation without auth
  // But we can create a placeholder for manual submission
  submissions.push({
    directory: 'dev.to',
    status: 'MANUAL — Create tutorial: "Build a Code Review API with Node.js + AI in 10 minutes"',
    url: 'https://dev.to/new'
  });
}

async function main() {
  console.log('=== MCP Directory Submission Script ===\n');
  console.log(`Agent: ${AGENT.name}`);
  console.log(`URL: ${AGENT.url}`);
  console.log(`Wallet: ${AGENT.wallet}\n`);
  
  // Submit to directories
  submitSmithery();
  submitGlama();
  submitMCPSo();
  submitDevTo();
  await pingIndexNow();
  
  // Generate report
  console.log('\n=== Submission Report ===\n');
  submissions.forEach(s => {
    console.log(`📌 ${s.directory}`);
    console.log(`   Status: ${s.status}`);
    if (s.url) console.log(`   URL: ${s.url}`);
    if (s.urls) console.log(`   URLs submitted: ${s.urls}`);
    console.log();
  });
  
  // Write report to JSON
  const fs = require('fs');
  const report = {
    timestamp: new Date().toISOString(),
    agent: AGENT,
    submissions
  };
  fs.writeFileSync('/root/automaton/data/directory-submissions.json', JSON.stringify(report, null, 2));
  console.log('✅ Report saved to /root/automaton/data/directory-submissions.json');
  
  // Summary
  const succeeded = submissions.filter(s => s.status.includes('200') || s.status.includes('pending')).length;
  const manual = submissions.filter(s => s.status.includes('MANUAL')).length;
  console.log(`\n📊 Summary: ${submissions.length} directories processed (${succeeded} auto, ${manual} manual)`);
}

main().catch(console.error);
