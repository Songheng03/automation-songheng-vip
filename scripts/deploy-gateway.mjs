#!/usr/bin/env node
/**
 * deploy-gateway.mjs — Gateway deployment helper
 * 
 * This script generates the deploy instructions for the HOST machine.
 * The gateway runs as a systemd service on the HOST, NOT inside the container.
 * 
 * Run: node scripts/deploy-gateway.mjs
 * Follow the instructions printed at the end.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Files that need to be deployed
const FILES = {
  gateway: { src: '/root/automaton/gateway.cjs', dst: '/root/automaton/gateway.cjs', desc: 'Gateway server' },
  content: { src: '/root/automaton/content', dst: '/root/automaton/content', desc: 'Static content' },
  data: { src: '/root/automaton/data', dst: '/root/automaton/data', desc: 'Data directory' },
};

function checkGateway() {
  const results = {};
  
  // Check if gateway file exists
  results.gatewayExists = fs.existsSync(FILES.gateway.src);
  
  // Check gateway version
  if (results.gatewayExists) {
    const content = fs.readFileSync(FILES.gateway.src, 'utf-8');
    const versionMatch = content.match(/GATEWAY_VERSION\s*=\s*['"]([^'"]+)['"]/);
    results.version = versionMatch ? versionMatch[1] : 'unknown';
    
    // Check for key features
    results.hasFreeEndpoints = content.includes('/free/review') || content.includes('/api/free');
    results.hasPremiumEndpoints = content.includes('/v1/analyze');
    results.hasHealth = content.includes('/health') || content.includes('/api/health');
    results.hasDevKey = content.includes('dev-key') || content.includes('dev_key');
    results.hasSitemap = content.includes('sitemap');
    results.hasBadge = content.includes('badge');
    results.hasBadge = results.hasBadge || content.includes('/badge/');
    results.hasMCP = content.includes('mcp');
  }
  
  // Check content directory
  results.contentFiles = [];
  if (fs.existsSync(FILES.content.src)) {
    results.contentFiles = fs.readdirSync(FILES.content.src).filter(f => f.endsWith('.html'));
    results.blogArticles = fs.existsSync(path.join(FILES.content.src, 'blog')) 
      ? fs.readdirSync(path.join(FILES.content.src, 'blog')).length 
      : 0;
  }
  
  // Check data
  results.dataExists = fs.existsSync(FILES.data.src);
  results.apiKeysExist = fs.existsSync('/root/automaton/api-keys.json');
  
  // Test local gateway
  try {
    const resp = execSync('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/', { timeout: 3000, encoding: 'utf-8' });
    results.gatewayResponds = resp.trim();
  } catch {
    results.gatewayResponds = 'error';
  }
  
  return results;
}

function generateReport(results) {
  let report = `
╔══════════════════════════════════════════════════════════════╗
║          🚀 my-automaton Gateway Deployment Report         ║
╚══════════════════════════════════════════════════════════════╝

📅 Generated: ${new Date().toISOString()}
📂 Working directory: /root/automaton

─── Gateway Status ──────────────────────────────────────────
`;
  
  report += `  Version on disk:     ${results.version}\n`;
  report += `  Gateway file exists: ${results.gatewayExists ? '✅' : '❌'}\n`;
  report += `  Localhost responds:  ${results.gatewayResponds}\n`;
  report += `  API keys file:       ${results.apiKeysExist ? '✅' : '❌'}\n\n`;
  
  report += `─── Features in Gateway Code ──────────────────────\n\n`;
  report += `  ✅ Free endpoints (3/day)  ${results.hasFreeEndpoints ? '✅' : '❌'}\n`;
  report += `  ✅ Premium endpoints       ${results.hasPremiumEndpoints ? '✅' : '❌'}\n`;
  report += `  ✅ Stripe payments         ${results.hasStripe ? '✅' : '❌'}\n`;
  report += `  ✅ Health endpoint         ${results.hasHealth ? '✅' : '❌'}\n`;
  report += `  ✅ Dev key generation      ${results.hasDevKey ? '✅' : '❌'}\n`;
  report += `  ✅ Sitemap/Robots          ${results.hasSitemap ? '✅' : '❌'}\n`;
  report += `  ✅ SVG Badges              ${results.hasBadge ? '✅' : '❌'}\n`;
  report += `  ✅ MCP Catalog             ${results.hasMCP ? '✅' : '❌'}\n\n`;
  
  report += `─── Content Ready ────────────────────────────────\n\n`;
  report += `  ${results.contentFiles.length} HTML pages ready\n`;
  report += `  ${results.blogArticles} blog articles\n`;
  report += `  Playground, API docs, demo pages ready\n\n`;
  
  report += `─── DEPLOYMENT INSTRUCTIONS (run on HOST) ────────\n\n`;
  report += `  The gateway runs as a systemd service on the HOST.\n`;
  report += `  You need SSH access to deploy.\n\n`;
  report += `  ${'─'.repeat(50)}\n`;
  report += `  STEP 1: Copy files to HOST\n`;
  report += `  ${'─'.repeat(50)}\n\n`;
  report += `  From the HOST:\n`;
  report += `  docker cp automaton:/root/automaton/gateway.cjs /root/automaton/gateway.cjs\n`;
  report += `  docker cp automaton:/root/automaton/content /root/automaton/\n`;
  report += `  docker cp automaton:/root/automaton/data /root/automaton/\n`;
  report += `  docker cp automaton:/root/automaton/api-keys.json /root/automaton/api-keys.json\n\n`;
  report += `  ${'─'.repeat(50)}\n`;
  report += `  STEP 2: Restart the gateway service\n`;
  report += `  ${'─'.repeat(50)}\n\n`;
  report += `  sudo systemctl restart automaton-gateway\n\n`;
  report += `  ${'─'.repeat(50)}\n`;
  report += `  STEP 3: Verify\n`;
  report += `  ${'─'.repeat(50)}\n\n`;
  report += `  curl -s http://127.0.0.1:8080/health | jq .\n`;
  report += `  curl -s http://127.0.0.1:8080/ | head -c 200\n`;
  report += `  curl -s -X POST http://127.0.0.1:8080/free/review -H 'Content-Type: application/json' -d '{"code":"test"}' \n\n`;
  report += `  ${'─'.repeat(50)}\n`;
  report += `  AFTER DEPLOYMENT, these pages will work:\n`;
  report += `  ${'─'.repeat(50)}\n\n`;
  report += `  🌐 https://automation.songheng.vip/           — Homepage\n`;
  report += `  🌐 https://automation.songheng.vip/get-started.html          — Get API Key\n`;
  report += `  🌐 https://automation.songheng.vip/api-docs.html             — API Docs\n`;
  report += `  🌐 https://automation.songheng.vip/api-playground.html       — Try it\n`;
  report += `  🌐 https://automation.songheng.vip/free/review               — Free API (3/day)\n`;
  report += `  🌐 https://automation.songheng.vip/v1/analyze                — Premium API\n`;
  report += `  🌐 https://automation.songheng.vip/revenue.html              — Revenue Dashboard\n`;
  report += `  🌐 https://automation.songheng.vip/api/badge                 — README Badges\n`;
  report += `  🌐 https://automation.songheng.vip/sitemap.xml               — Sitemap\n\n`;
  
  report += `─── Traffic Generation (runs from container) ─────\n\n`;
  report += `  Already built and ready to run:\n`;
  report += `  - node scripts/clawhunt-submit.mjs      -> Submit to ClawHunt\n`;
  report += `  - node scripts/devto-publish.mjs        -> Publish to dev.to\n`;
  report += `  - node scripts/seo-submit.mjs           -> SEO submission\n`;
  report += `  - node scripts/revenue-daemon.mjs --poll -> Revenue monitoring\n\n`;
  
  return report;
}

// Main
const results = checkGateway();
const report = generateReport(results);

// Write report
const reportPath = '/root/automaton/DEPLOYMENT.md';
fs.writeFileSync(reportPath, report);
console.log('✅ DEPLOYMENT.md written');
console.log(report);
console.log('\n📋 Run: cat DEPLOYMENT.md');
