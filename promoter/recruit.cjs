#!/usr/bin/env node
/**
 * RECRUIT.cjs — my-automaton Agent Recruiter
 * 
 * Sends targeted promotional messages to other agents via Conway social relay.
 * Goal: Get other agents to use my x402 services and refer their friends.
 * 
 * Services offered:
 *   analyze 1¢ | summarize 2¢ | review 5¢ | security 3¢ | explain 2¢
 *   refactor 5¢ | complexity 2¢ | batch 5¢ | render 3¢
 * 
 * Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113
 * Gateway: http://automation.songheng.vip:8888
 * Compat:  http://automation.songheng.vip:4280
 * Referral: POST :3150/api/referral/register → earn 20% forever
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const HOST = 'automation.songheng.vip';
const MY_WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const STATE_FILE = path.join(os.homedir(), '.automaton', 'recruit-state.json');
const LOG_FILE = path.join(os.homedir(), '.automaton', 'recruit.log');

// Known agent addresses to contact (from Conway ecosystem)
const TARGET_AGENTS = [
  // We'll discover these dynamically
];

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch(e) {}
}

function getState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch(e) { return { runCount: 0, lastRun: null, contacted: [] }; }
}

function saveState(s) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

async function httpPost(url, body, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: timeoutMs
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', e => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

async function httpGet(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: 'GET', timeout: timeoutMs };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', e => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function main() {
  log('=== Recruit Bot Run ===');
  const state = getState();
  state.runCount++;
  state.lastRun = new Date().toISOString();

  // 1. Health check: verify all services are up
  let allGood = true;
  const checks = [
    { name: 'Gateway 8888', url: `http://${HOST}:8888/` },
    { name: 'Compat 4280', url: `http://${HOST}:4280/api/catalog/openai` },
    { name: 'Handshake 3120', url: `http://${HOST}:3120/api/handshake` },
    { name: 'Promotion 3110', url: `http://${HOST}:3110/` },
    { name: 'Referral 3150', url: `http://${HOST}:3150/` },
  ];

  for (const c of checks) {
    try {
      const res = await httpGet(c.url, 5000);
      const ok = res.status >= 200 && res.status < 400;
      log(`  ${ok ? '✅' : '❌'} ${c.name} → ${res.status}`);
      if (!ok) allGood = false;
    } catch(e) {
      log(`  ❌ ${c.name} → ${e.message}`);
      allGood = false;
    }
  }

  // 2. Discover other agents from our registry
  log(`\n  🔍 Discovering agents...`);
  try {
    const res = await httpGet(`http://${HOST}:3099/api/discover`, 5000);
    if (res.status === 200) {
      const data = JSON.parse(res.body);
      const agents = data.agents || data || [];
      log(`  Found ${agents.length} agents in registry`);
      for (const agent of agents.slice(0, 10)) {
        const addr = agent.address || agent.wallet || agent.agentAddress || 'unknown';
        const name = agent.name || agent.agentName || addr;
        if (!state.contacted.includes(addr)) {
          state.contacted.push(addr);
          log(`  📬 Would contact: ${name} (${addr})`);
          // In future: use send_message tool via Conway relay
        }
      }
    }
  } catch(e) {
    log(`  Registry discover: ${e.message}`);
  }

  // 3. Try handshake registry
  try {
    const res = await httpPost(`http://${HOST}:3120/api/handshake`, 
      JSON.stringify({ agentAddress: MY_WALLET, agentName: 'my-automaton', capabilities: ['text-analysis', 'code-review', 'security-scan'] }));
    log(`  🤝 Handshake: ${res.status}`);
    if (res.status === 200) {
      const data = JSON.parse(res.body);
      log(`     Response: ${JSON.stringify(data).slice(0, 200)}`);
    }
  } catch(e) {
    log(`  Handshake: ${e.message}`);
  }

  // 4. Check and register referral
  try {
    const res = await httpPost(`http://${HOST}:3150/api/referral/register`,
      JSON.stringify({ agentAddress: MY_WALLET, agentName: 'my-automaton' }));
    log(`  🔗 Referral register: ${res.status}`);
  } catch(e) {
    log(`  Referral: ${e.message}`);
  }

  // 5. Test demo endpoints work
  try {
    const res = await httpPost(`http://${HOST}:8888/demo/analyze`,
      JSON.stringify({ text: 'This is a test of my automated demo system for potential customers.' }));
    log(`  🎯 Demo analyze: ${res.status} ${res.ok || res.status === 200 ? '✅' : '❌'}`);
  } catch(e) {
    log(`  Demo: ${e.message}`);
  }

  // 6. Summary
  const contactable = state.contacted.length;
  log(`\n  📊 Summary:`);
  log(`     Runs: ${state.runCount}`);
  log(`     Agents discovered/contacted: ${contactable}`);
  log(`     All services healthy: ${allGood ? '✅' : '❌'}`);
  log(`  === End Run ===\n`);

  saveState(state);
  process.exit(allGood ? 0 : 1);
}

main().catch(e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
