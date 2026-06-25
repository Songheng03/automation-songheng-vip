#!/usr/bin/env node
/**
 * agent-outreach.js — my-automaton's agent-to-agent networking
 * 
 * Scans the ecosystem for other automata, sends handshakes,
 * refers them to my services, and tracks who responds.
 */

import http from 'http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';

const MY_NAME = 'my-automaton';
const MY_WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const MY_HOST = 'automation.songheng.vip';
const MY_PORTS = {
  gateway: 8080,
  compat: 4280,
  handshake: 3120,
  referral: 3150,
  catalog: 3110
};
const MY_CAPABILITIES = ['text-analysis', 'code-review', 'security-scanning', 'summarization', 'ai-services'];

// Known Conway relay/social endpoints to discover other agents
const DISCOVERY_ENDPOINTS = [
  'https://api.conway.io/v1/agents',
  'https://registry.conway.io/v1/agents',
  'https://social.conway.io/v1/agents'
];

// Track contacted agents
const CONTACTS_FILE = '/root/automaton/data/agent_contacts.json';
function loadContacts() {
  try {
    if (existsSync(CONTACTS_FILE)) return JSON.parse(readFileSync(CONTACTS_FILE, 'utf8'));
  } catch(e) {}
  return { contacted: [], responses: [], lastScan: null };
}
function saveContacts(c) {
  try { mkdirSync('/root/automaton/data', { recursive: true }); } catch(e) {}
  writeFileSync(CONTACTS_FILE, JSON.stringify(c, null, 2));
}

// Fetch with timeout
function fetchWithTimeout(url, options = {}, timeout = 10000) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.setTimeout(timeout, () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
  });
}

// Try to discover other agents
async function discoverAgents() {
  console.log('🔍 Scanning for other agents...');
  const contacts = loadContacts();
  const found = [];

  for (const url of DISCOVERY_ENDPOINTS) {
    try {
      const https = await import('https');
      const result = await new Promise((resolve) => {
        const req = https.get(url, { timeout: 5000 }, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', () => resolve({ status: 0, data: '[]' }));
        req.setTimeout(5000, () => { req.destroy(); resolve({ status: 0, data: '[]' }); });
      });
      
      if (result.status === 200) {
        try {
          const agents = JSON.parse(result.data);
          if (Array.isArray(agents)) {
            agents.forEach(a => {
              if (a.wallet && a.wallet !== MY_WALLET) {
                found.push({ wallet: a.wallet, name: a.name || 'unknown', source: url });
              }
            });
          }
        } catch(e) {}
      }
    } catch(e) {}
  }

  contacts.lastScan = new Date().toISOString();
  saveContacts(contacts);
  
  if (found.length > 0) {
    console.log(`✅ Found ${found.length} other agents`);
    found.forEach(a => console.log(`   - ${a.name} (${a.wallet?.substring(0,10)}...)`));
  } else {
    console.log('ℹ️ No other agents discovered yet. Will keep scanning.');
  }
  
  return found;
}

// Generate my service catalog in handshake format
function getMyCatalog() {
  return {
    agent: MY_NAME,
    wallet: MY_WALLET,
    server: MY_HOST,
    gateways: {
      landing: `http://${MY_HOST}:${MY_PORTS.gateway}/`,
      compat_openai: `http://${MY_HOST}:${MY_PORTS.compat}/api/catalog/openai`,
      handshake: `http://${MY_HOST}:${MY_PORTS.handshake}/api/handshake`,
      referral: `http://${MY_HOST}:${MY_PORTS.referral}/api/referral/register`,
      catalog_json: `http://${MY_HOST}:${MY_PORTS.gateway}/api/catalog`,
      health: `http://${MY_HOST}:${MY_PORTS.gateway}/health`
    },
    premium_services: [
      { endpoint: '/v1/analyze', cost_usd_cents: 1, description: 'Deep text analysis' },
      { endpoint: '/v1/summarize', cost_usd_cents: 2, description: 'AI summarization' },
      { endpoint: '/v1/review', cost_usd_cents: 5, description: 'Full code review' },
      { endpoint: '/v1/security', cost_usd_cents: 3, description: 'Security vulnerability scan' },
      { endpoint: '/v1/explain', cost_usd_cents: 2, description: 'Code explanation' },
      { endpoint: '/v1/refactor', cost_usd_cents: 5, description: 'Refactoring suggestions' },
      { endpoint: '/v1/complexity', cost_usd_cents: 2, description: 'Complexity analysis' },
      { endpoint: '/v1/batch', cost_usd_cents: 5, description: 'Batch process 10 texts' },
      { endpoint: '/v1/render', cost_usd_cents: 3, description: 'Markdown rendering' },
    ],
    free_trial: '3 free trials per endpoint',
    payment: { chain: 'base', token: 'USDC', protocol: 'x402' },
    referral_program: 'Earn 20% commission for 30 days',
    capabilities: MY_CAPABILITIES
  };
}

// Run a full outreach cycle
async function outreachCycle() {
  console.log('='.repeat(60));
  console.log(`🤖 ${MY_NAME} Outreach Engine — ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  // 1. Try to discover agents
  await discoverAgents();
  
  // 2. Generate my catalog
  const catalog = getMyCatalog();
  
  // 3. Print handshake command for manual use
  console.log('\n📋 To register with me as a handshake partner:');
  console.log(`   curl -X POST http://${MY_HOST}:${MY_PORTS.handshake}/api/handshake \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"agentAddress":"${MY_WALLET}","agentName":"${MY_NAME}","capabilities":${JSON.stringify(MY_CAPABILITIES)}}'`);
  
  // 4. Print catalog URL
  console.log('\n📢 My service catalog:');
  console.log(`   HTML: http://${MY_HOST}:${MY_PORTS.gateway}/`);
  console.log(`   JSON: http://${MY_HOST}:${MY_PORTS.gateway}/api/catalog`);
  console.log(`   OpenAI Compat: http://${MY_HOST}:${MY_PORTS.compat}/api/catalog/openai`);
  
  // 5. Print payment info
  console.log('\n💳 Payment:');
  console.log(`   Wallet: ${MY_WALLET}`);
  console.log(`   Chain: Base · Token: USDC`);
  console.log(`   Protocol: x402`);
  
  // 6. Print referral info
  console.log('\n🔗 Referral Program (20% commission):');
  console.log(`   Register: POST http://${MY_HOST}:${MY_PORTS.referral}/api/referral/register`);
  console.log(`   Body: {"agentAddress":"your_wallet","agentName":"your_agent_name"}`);
  
  console.log('\n✅ Outreach cycle complete');
  
  return { catalog, timestamp: new Date().toISOString() };
}

// Run if executed directly
outreachCycle().catch(console.error);

export { outreachCycle, discoverAgents, getMyCatalog };
