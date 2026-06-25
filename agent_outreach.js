#!/usr/bin/env node
/**
 * agent_outreach.js — my-automaton's Agent Onboarding Engine
 * Discovers agents, sends handshakes, registers referrals, tracks conversions.
 * Runs on a timer to continuously onboard new agents into the revenue network.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MY_WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const MY_SERVER = 'automation.songheng.vip';
const SERVICES = {
  handshake: `http://${MY_SERVER}:3120/api/handshake`,
  referral: `http://${MY_SERVER}:3150/api/referral/register`,
  catalog: `http://${MY_SERVER}:3110/api/catalog`,
  compat: `http://${MY_SERVER}:4280/api/catalog/openai`,
  health: `http://${MY_SERVER}:8080/health`
};

const DATA_DIR = '/root/automaton/data';
const OUTREACH_FILE = path.join(DATA_DIR, 'agent_outreach.json');
const AGENT_REGISTRY = 'https://raw.githubusercontent.com/Conway-Research/agent-registry/main/registry.json';

// ─── State Management ─────────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(OUTREACH_FILE)) {
      return JSON.parse(fs.readFileSync(OUTREACH_FILE, 'utf8'));
    }
  } catch(e) {}
  return {
    discovered_agents: [],
    handshakes_sent: [],
    referrals_registered: [],
    conversions: [],
    total_outreaches: 0,
    last_run: null
  };
}

function saveState(state) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch(e) {}
  fs.writeFileSync(OUTREACH_FILE, JSON.stringify(state, null, 2));
}

// ─── HTTP Helpers ─────────────────────────────────────────────────
function httpFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch(e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

// ─── Agent Discovery ──────────────────────────────────────────────
async function discoverAgents() {
  console.log('[outreach] Discovering agents...');
  const discovered = [];
  
  // 1. Try Conway's agent registry
  try {
    const res = await httpFetch(AGENT_REGISTRY);
    if (res.status === 200 && Array.isArray(res.data)) {
      for (const agent of res.data) {
        if (agent.wallet && agent.wallet !== MY_WALLET) {
          discovered.push({
            wallet: agent.wallet,
            name: agent.name || agent.wallet.slice(0, 10),
            source: 'registry',
            discovered_at: new Date().toISOString(),
            capabilities: agent.capabilities || []
          });
        }
      }
      console.log(`[outreach] Found ${discovered.length} agents in registry`);
    }
  } catch(e) {
    console.log('[outreach] Registry fetch failed:', e.message);
  }

  // 2. Try my own handshake service for mutual discovery
  try {
    const res = await httpFetch(`http://${MY_SERVER}:3120/api/agents`, { method: 'GET' });
    if (res.status === 200 && Array.isArray(res.data)) {
      for (const agent of res.data) {
        if (agent.agentAddress && agent.agentAddress !== MY_WALLET) {
          if (!discovered.find(a => a.wallet === agent.agentAddress)) {
            discovered.push({
              wallet: agent.agentAddress,
              name: agent.agentName || agent.agentAddress.slice(0, 10),
              source: 'handshake_service',
              discovered_at: new Date().toISOString(),
              capabilities: agent.capabilities || []
            });
          }
        }
      }
    }
  } catch(e) {}

  return discovered;
}

// ─── Outreach Actions ─────────────────────────────────────────────
async function sendHandshake(agent) {
  console.log(`[outreach] Handshaking with ${agent.name} (${agent.wallet})...`);
  try {
    const res = await httpFetch(SERVICES.handshake, {
      method: 'POST',
      body: {
        agentAddress: MY_WALLET,
        agentName: 'my-automaton',
        capabilities: ['text-analysis', 'code-review', 'security-scanning', 'summarization', 'referral'],
        targetAgent: agent.wallet
      }
    });
    return res.status === 200;
  } catch(e) {
    console.log(`[outreach] Handshake failed: ${e.message}`);
    return false;
  }
}

async function registerReferral(agent) {
  console.log(`[outreach] Registering referral for ${agent.name}...`);
  try {
    const res = await httpFetch(SERVICES.referral, {
      method: 'POST',
      body: {
        agentAddress: agent.wallet,
        agentName: agent.name,
        referredBy: MY_WALLET
      }
    });
    return res.status === 200;
  } catch(e) {
    console.log(`[outreach] Referral registration failed: ${e.message}`);
    return false;
  }
}

// ─── Main Outreach Loop ───────────────────────────────────────────
async function runOutreach() {
  console.log(`\n=== Agent Outreach Run ${new Date().toISOString()} ===`);
  const state = loadState();
  
  // Discover new agents
  const newAgents = await discoverAgents();
  const existingWallets = new Set(state.discovered_agents.map(a => a.wallet));
  
  let outreachCount = 0;
  for (const agent of newAgents) {
    if (existingWallets.has(agent.wallet)) continue;
    if (agent.wallet === MY_WALLET) continue;
    
    console.log(`\n[outreach] Processing ${agent.name} (${agent.wallet})`);
    
    // Send handshake
    const handshakeOk = await sendHandshake(agent);
    if (handshakeOk) {
      state.handshakes_sent.push({
        wallet: agent.wallet,
        name: agent.name,
        timestamp: new Date().toISOString()
      });
    }
    
    // Register referral link
    const referralOk = await registerReferral(agent);
    if (referralOk) {
      state.referrals_registered.push({
        wallet: agent.wallet,
        name: agent.name,
        timestamp: new Date().toISOString()
      });
    }
    
    // Add to discovered list
    state.discovered_agents.push({
      ...agent,
      handshake_sent: handshakeOk,
      referral_registered: referralOk,
      processed_at: new Date().toISOString()
    });
    
    outreachCount++;
    
    // Rate limit: 1 agent per 2 seconds
    if (outreachCount >= 5) break; // Max 5 per run
    await new Promise(r => setTimeout(r, 2000));
  }
  
  state.total_outreaches += outreachCount;
  state.last_run = new Date().toISOString();
  saveState(state);
  
  console.log(`\n[outreach] Done. Processed ${outreachCount} new agents.`);
  console.log(`[outreach] Total discovered: ${state.discovered_agents.length}`);
  console.log(`[outreach] Total handshakes: ${state.handshakes_sent.length}`);
  console.log(`[outreach] Total referrals: ${state.referrals_registered.length}`);
  
  return {
    processed: outreachCount,
    total_discovered: state.discovered_agents.length,
    total_handshakes: state.handshakes_sent.length,
    total_referrals: state.referrals_registered.length
  };
}

// ─── CLI Entry ────────────────────────────────────────────────────
if (process.argv[2] === '--run') {
  runOutreach().then(r => {
    console.log('\n=== Outreach Summary ===');
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  }).catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
  });
} else if (process.argv[2] === '--status') {
  const state = loadState();
  console.log(JSON.stringify({
    last_run: state.last_run,
    total_outreaches: state.total_outreaches,
    discovered_agents: state.discovered_agents.length,
    handshakes_sent: state.handshakes_sent.length,
    referrals_registered: state.referrals_registered.length,
    conversions: state.conversions.length
  }, null, 2));
} else {
  console.log('Usage: node agent_outreach.js --run    # Run outreach once');
  console.log('       node agent_outreach.js --status # Show outreach stats');
}

module.exports = { runOutreach };
