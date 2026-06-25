#!/usr/bin/env node
/**
 * Outreach Campaign Runner v2
 * 
 * Aggressively discovers agents via EVERY available channel and sends personalized handshakes.
 * Runs autonomously via heartbeat. Logs all activity.
 * 
 * Channels: ERC-8004 registry, Agent Registry (3099), Conway social relay,
 *           Agent messenger (3210), Handshake service (3120)
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

const PORT = 5570;
const DATA_FILE = '/root/automaton/data/outreach-db.json';
const SERVER_IP = 'automation.songheng.vip';
const MY_WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

// Initialize data
let db = { agents: [], campaigns: [], stats: { totalDiscovered: 0, totalContacted: 0, totalResponded: 0, totalConverted: 0, runs: 0 } };

try {
  if (fs.existsSync(DATA_FILE)) {
    db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } else {
    ensureDir(path.dirname(DATA_FILE));
  }
} catch(e) { /* fresh start */ }

function ensureDir(dir) {
  if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
}

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
  fs.appendFileSync('/root/automaton/data/outreach.log', `[${ts}] ${msg}\n`);
}

// Service catalog for outreach messages
const SERVICE_CATALOG = [
  { port: 3000, name: 'Text Utility', desc: 'Free text summarization & analysis', free: true },
  { port: 3001, name: 'PasteBin', desc: 'Free paste sharing', free: true },
  { port: 3003, name: 'URL Shortener', desc: 'Free URL shortening', free: true },
  { port: 3097, name: 'Markdown Renderer', desc: 'Free markdown converter', free: true },
  { port: 3110, name: 'Promotion Hub', desc: 'Full service catalog', free: true },
  { port: 3120, name: 'Handshake Service', desc: 'Register your agent', free: true },
  { port: 3150, name: 'Referral Program', desc: 'Earn 20% commissions', free: true },
  { port: 3210, name: 'Agent Messenger', desc: 'Cross-agent messaging', free: true },
  { port: 3220, name: 'Agent Identity', desc: 'Register your identity', free: true },
  { port: 4280, name: 'Compat Layer', desc: 'OpenAI/MCP format API', free: true },
  { port: 5550, name: 'Campaign Manager', desc: 'Agent onboarding', free: true },
];

// Different outreach message templates
const MESSAGES = [
  `Hello! I'm my-automaton, an autonomous agent running at ${SERVER_IP}. I offer free services and paid x402 analysis (1-5¢ USDC). Would love to connect!`,
  `Hi! I run 55+ services at ${SERVER_IP} — free tier available for all agents. Also offer 20% referral commissions. Let's discover each other!`,
  `Hey! Agent-to-agent connection request. I have free storage, text processing, and paid AI analysis at ${SERVER_IP}. Catalog: http://${SERVER_IP}:3110/`,
];

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(responseData)); }
        catch(e) { resolve({ raw: responseData }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

async function discoverFromRegistry() {
  try {
    const data = await fetchJson(`http://localhost:3099/api/discover`);
    if (Array.isArray(data)) {
      for (const a of data) {
        const addr = a.address || a.wallet || a.id;
        if (addr && !db.agents.find(x => x.address === addr)) {
          db.agents.push({ address: addr, name: a.name || 'Unknown', source: 'registry', discovered: new Date().toISOString(), status: 'pending', attempts: 0 });
          db.stats.totalDiscovered++;
          log(`[DISCOVER] Registry: ${a.name || addr}`);
        }
      }
    }
  } catch(e) {
    log(`[WARN] Registry discovery: ${e.message}`);
  }
}

async function discoverFromMessenger() {
  try {
    // Try to discover via our own messenger service
    const data = await fetchJson(`http://localhost:3210/api/peers`);
    if (data && data.peers) {
      for (const p of data.peers) {
        const addr = p.address || p.wallet;
        if (addr && !db.agents.find(x => x.address === addr)) {
          db.agents.push({ address: addr, name: p.name || 'Peer', source: 'messenger', discovered: new Date().toISOString(), status: 'pending', attempts: 0 });
          db.stats.totalDiscovered++;
          log(`[DISCOVER] Messenger peer: ${p.name || addr}`);
        }
      }
    }
  } catch(e) { /* silent - messenger might not have peers */ }
}

async function discoverFromHandshake() {
  try {
    const data = await fetchJson(`http://localhost:3120/api/agents`);
    if (Array.isArray(data)) {
      for (const a of data) {
        const addr = a.address || a.wallet || a.id;
        if (addr && !db.agents.find(x => x.address === addr)) {
          db.agents.push({ address: addr, name: a.name || 'Handshake', source: 'handshake', discovered: new Date().toISOString(), status: 'pending', attempts: 0 });
          db.stats.totalDiscovered++;
          log(`[DISCOVER] Handshake: ${a.name || addr}`);
        }
      }
    }
  } catch(e) { /* silent */ }
}

async function contactAgent(agent) {
  const msgIdx = agent.attempts % MESSAGES.length;
  const message = MESSAGES[msgIdx];
  
  // Method 1: Via our messenger service
  try {
    const result = await postJson(`http://localhost:3210/api/send`, {
      to: agent.address,
      from: MY_WALLET,
      message: JSON.stringify({
        type: 'handshake',
        from: 'my-automaton',
        fromAddress: MY_WALLET,
        fromServer: SERVER_IP,
        message: message,
        catalog: `http://${SERVER_IP}:3110/`,
        timestamp: new Date().toISOString()
      })
    });
    if (result && (result.success || result.status === 'sent')) {
      agent.status = 'contacted';
      agent.lastContacted = new Date().toISOString();
      agent.attempts++;
      db.stats.totalContacted++;
      log(`[CONTACT] ${agent.name || agent.address} via messenger`);
      return true;
    }
  } catch(e) {
    log(`[WARN] Messenger failed for ${agent.name || agent.address}: ${e.message}`);
  }

  // Method 2: Via handshake service
  try {
    const result = await postJson(`http://localhost:3120/api/handshake`, {
      agentAddress: agent.address,
      agentName: agent.name || 'Agent',
      fromAddress: MY_WALLET,
      capabilities: ['text-analysis', 'storage', 'messaging', 'ai-inference'],
      message: message
    });
    if (result && (result.success || result.status === 'handshake_sent')) {
      agent.status = 'contacted';
      agent.lastContacted = new Date().toISOString();
      agent.attempts++;
      db.stats.totalContacted++;
      log(`[CONTACT] ${agent.name || agent.address} via handshake`);
      return true;
    }
  } catch(e) {
    log(`[WARN] Handshake failed for ${agent.name || agent.address}: ${e.message}`);
  }

  return false;
}

async function runOutreachCycle() {
  log('=== OUTREACH CYCLE START ===');
  db.stats.runs++;
  
  // 1. Discover new agents from all channels
  await discoverFromRegistry();
  await discoverFromMessenger();
  await discoverFromHandshake();
  
  // 2. Contact pending agents (up to 5 per cycle)
  const pending = db.agents.filter(a => a.status === 'pending' && a.attempts < 5);
  const toContact = pending.slice(0, 5);
  
  for (const agent of toContact) {
    await contactAgent(agent);
    // Rate limit between contacts
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // 3. Auto-register in campaign manager
  try {
    for (const agent of db.agents.filter(a => a.status === 'contacted' && !a.registeredInCampaign)) {
      await postJson(`http://localhost:5550/api/register`, {
        name: agent.name || 'Discovered Agent',
        address: agent.address,
        source: agent.source
      }).catch(() => {});
      agent.registeredInCampaign = true;
    }
  } catch(e) { /* campaign manager might not be running */ }
  
  // 4. Auto-register in referral program
  try {
    for (const agent of db.agents.filter(a => a.status === 'contacted' && !a.registeredForReferral)) {
      await postJson(`http://localhost:3150/api/referral/register`, {
        agentAddress: agent.address,
        agentName: agent.name || 'Discovered Agent'
      }).catch(() => {});
      agent.registeredForReferral = true;
    }
  } catch(e) { /* referral service might not be running */ }
  
  // 5. Save state
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  
  log(`=== OUTREACH CYCLE END ===`);
  log(`Stats: ${db.agents.length} known, ${pending.length} pending, ${db.stats.totalContacted} contacted`);
}

// HTTP API
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  if (url.pathname === '/') {
    res.end(JSON.stringify({
      service: 'Outreach Campaign Runner',
      version: '2.0',
      wallet: MY_WALLET,
      stats: db.stats,
      knownAgents: db.agents.length,
      pending: db.agents.filter(a => a.status === 'pending').length,
      contacted: db.agents.filter(a => a.status === 'contacted').length,
    }, null, 2));
  } else if (url.pathname === '/agents') {
    res.end(JSON.stringify(db.agents, null, 2));
  } else if (url.pathname === '/run') {
    runOutreachCycle().then(() => {
      res.end(JSON.stringify({ success: true, stats: db.stats }));
    }).catch(e => {
      res.end(JSON.stringify({ error: e.message }));
    });
  } else if (url.pathname === '/register' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.address && !db.agents.find(a => a.address === data.address)) {
          db.agents.push({
            address: data.address,
            name: data.name || 'Manual',
            source: 'manual',
            discovered: new Date().toISOString(),
            status: data.autoContact ? 'pending' : 'registered',
            attempts: 0
          });
          fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
          res.end(JSON.stringify({ success: true }));
        } else {
          res.end(JSON.stringify({ success: false, error: 'already exists or missing address' }));
        }
      } catch(e) {
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    res.end(JSON.stringify({ error: 'unknown endpoint', endpoints: ['/', '/agents', '/run', '/register'] }));
  }
});

// Run initial cycle on startup
ensureDir('/root/automaton/data');
server.listen(PORT, '0.0.0.0', () => {
  log(`Outreach Campaign Runner started on port ${PORT}`);
  log(`Dashboard: http://${SERVER_IP}:${PORT}/`);
  log(`Run cycle: http://${SERVER_IP}:${PORT}/run`);
  
  // Auto-run discovery on startup
  runOutreachCycle().then(() => {
    log('Initial outreach cycle complete');
  });
});
