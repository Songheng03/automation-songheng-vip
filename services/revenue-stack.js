#!/usr/bin/env node
/**
 * revenue-stack.js — my-automaton's complete revenue pipeline
 * 
 * Starts ALL revenue services, verifies they work, and actively
 * promotes services to other agents.
 */

import http from 'http';
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

const HOST = 'automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113';
const SERVICES = {
  gateway: { port: 8080, file: 'gateway.js', type: 'node' },
  revenue: { port: 8888, file: 'gateway_8888.py', type: 'python' },
  compat: { port: 4280, file: 'compat_layer.py', type: 'python' },
  handshake: { port: 3120, file: 'handshake_service.py', type: 'python' },
  referral: { port: 3150, file: 'referral_service.py', type: 'python' },
  promotion: { port: 3110, file: 'promotion_hub.py', type: 'python' },
};

// Storage
const DATA_DIR = '/root/automaton/data';
const LOG_DIR = '/var/log';
mkdirSync(DATA_DIR, { recursive: true });

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

// Check if a port is listening
function portIsListening(port) {
  try {
    execSync(`ss -tlnp | grep -q ":${port} "`, { timeout: 3000 });
    return true;
  } catch { return false; }
}

// Kill process on port
function killPort(port) {
  try {
    execSync(`kill -9 $(lsof -ti:${port}) 2>/dev/null`, { timeout: 3000 });
  } catch {}
}

// Start a service
function startService(name, config) {
  const { port, file, type } = config;
  const logFile = `${LOG_DIR}/${name}.log`;
  
  killPort(port);
  
  if (type === 'node') {
    execSync(`cd /root/automaton && nohup node ${file} > ${logFile} 2>&1 &`, { timeout: 5000 });
  } else {
    execSync(`cd /root/automaton && nohup python3 ${file} > ${logFile} 2>&1 &`, { timeout: 5000 });
  }
  
  // Wait for it to start
  let attempts = 0;
  while (attempts < 10) {
    const listening = portIsListening(port);
    if (listening) return true;
    execSync('sleep 0.5', { timeout: 1000 });
    attempts++;
  }
  return false;
}

// Simple HTTP request helper
function httpRequest(method, url, body = null) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method,
      timeout: 5000,
      headers: body ? { 'Content-Type': 'application/json' } : {}
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Generate promotion message for agent discovery
function generatePromo() {
  return {
    agent: 'my-automaton',
    wallet: WALLET,
    server: HOST,
    services: {
      landing: `http://${HOST}:8080/`,
      catalog_json: `http://${HOST}:8080/api/catalog`,
      compat_layer: `http://${HOST}:4280/api/catalog/openai`,
      handshake: `http://${HOST}:3120/api/handshake`,
      referral: `http://${HOST}:3150/api/referral/register`,
      health: `http://${HOST}:8080/health`,
    },
    premium: [
      { endpoint: `/v1/analyze`, cost: `1¢ USDC`, description: `Deep text analysis` },
      { endpoint: `/v1/summarize`, cost: `2¢ USDC`, description: `AI summarization` },
      { endpoint: `/v1/review`, cost: `5¢ USDC`, description: `Full code review` },
      { endpoint: `/v1/security`, cost: `3¢ USDC`, description: `Security scan` },
    ],
    referral: `20% commission for 30 days`,
    free_trial: true,
    chain: 'base',
    token: 'USDC',
    protocol: 'x402',
    capabilities: ['text-analysis', 'code-review', 'security-scanning', 'summarization']
  };
}

// === MAIN ===
async function main() {
  log('='.repeat(60));
  log('💰 REVENUE STACK INITIALIZATION');
  log('='.repeat(60));

  // 1. Start ALL services
  log('\n📦 Starting all revenue services...');
  const results = {};
  for (const [name, config] of Object.entries(SERVICES)) {
    log(`  Starting ${name} on port ${config.port}...`);
    const ok = startService(name, config);
    results[name] = ok;
    log(`  ${ok ? '✅' : '❌'} ${name} on port ${config.port}`);
  }

  // 2. Verify each service
  log('\n🔍 Verifying services...');
  for (const [name, config] of Object.entries(SERVICES)) {
    if (!results[name]) {
      log(`  ❌ ${name} failed to start — retrying...`);
      const ok = startService(name, config);
      results[name] = ok;
      log(`  ${ok ? '✅' : '❌'} ${name} (retry)`);
    }
  }

  // 3. Test the API endpoints
  log('\n🧪 Testing API endpoints...');
  
  // Test handshake
  const hs = await httpRequest('POST', `http://localhost:3120/api/handshake`, {
    agentAddress: WALLET, agentName: 'my-automaton', capabilities: ['text-analysis']
  });
  log(`  Handshake: ${hs.status} ${hs.data?.substring?.(0, 50) || ''}`);

  // Test referral
  const ref = await httpRequest('POST', `http://localhost:3150/api/referral/register`, {
    agentAddress: WALLET, agentName: 'my-automaton'
  });
  log(`  Referral: ${ref.status} ${ref.data?.substring?.(0, 50) || ''}`);

  // Test gateway health
  const gw = await httpRequest('GET', `http://localhost:8080/health`);
  log(`  Gateway: ${gw.status} ${gw.data?.substring?.(0, 50) || ''}`);

  // Test compat layer
  const compat = await httpRequest('GET', `http://localhost:4280/api/catalog/openai`);
  log(`  Compat: ${compat.status}`);

  // Test promotion hub
  const promo = await httpRequest('GET', `http://localhost:3110/`);
  log(`  Promotion: ${promo.status}`);

  // 4. Generate promotion broadcast
  log('\n📢 Promotion summary:');
  const promoData = generatePromo();
  log(`  Landing: ${promoData.services.landing}`);
  log(`  Premium endpoints: ${promoData.premium.length}`);
  log(`  Referral: ${promoData.referral}`);
  log(`  Wallet: ${promoData.wallet}`);

  // 5. Write promotion to a file that heartbeat can broadcast
  writeFileSync(`${DATA_DIR}/promotion.json`, JSON.stringify(promoData, null, 2));
  log('\n✅ Promotion data written to data/promotion.json');

  // 6. Summary
  const allOk = Object.values(results).every(v => v);
  log('\n' + '='.repeat(60));
  log(allOk ? '✅ ALL SERVICES RUNNING' : '⚠️  SOME SERVICES FAILED');
  log('='.repeat(60));

  return results;
}

main().catch(console.error);
