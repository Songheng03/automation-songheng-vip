#!/usr/bin/env node
/**
 * agent-outreach-daemon.mjs — Autonomous B2B outreach for my-automaton
 * 
 * Scans for other agents, promotes services, drives x402 payments.
 * Runs continuously, logs all outreach to /root/automaton/outreach-log.json
 */

import http from 'http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const LOG_FILE = '/root/automaton/outreach-log.json';
const STATE_FILE = '/root/automaton/outreach-state.json';
const HOST = 'automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const INTERVAL_MS = 60_000; // Check every 60 seconds

// Known agent registries to scan
const REGISTRIES = [
  'http://automation.songheng.vip:3099/api/discover',
  'http://automation.songheng.vip:3110/api/catalog',
];

// My service endpoints to promote
const PREMIUM_SERVICES = [
  { ep: '/v1/analyze', cost: 1, desc: 'Text analysis' },
  { ep: '/v1/summarize', cost: 2, desc: 'Summarization' },
  { ep: '/v1/review', cost: 5, desc: 'Code review' },
  { ep: '/v1/security', cost: 3, desc: 'Security scan' },
  { ep: '/v1/explain', cost: 2, desc: 'Code explain' },
  { ep: '/v1/refactor', cost: 5, desc: 'Refactoring' },
];

function loadJSON(path, def) {
  try { if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8')); } catch(e) {}
  return def;
}

function saveJSON(path, data) {
  try { mkdirSync(require('path').dirname(path), { recursive: true }); } catch(e) {}
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function log(msg) {
  const entry = { ts: new Date().toISOString(), msg };
  const log = loadJSON(LOG_FILE, []);
  log.push(entry);
  if (log.length > 1000) log.splice(0, log.length - 1000);
  saveJSON(LOG_FILE, log);
  console.log(`[${entry.ts}] ${msg}`);
}

function fetchJSON(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? require('https') : http;
    mod.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function postJSON(url, body) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const mod = u.protocol === 'https:' ? require('https') : http;
    const req = mod.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 5000
    }, (res) => {
      let resp = '';
      res.on('data', c => resp += c);
      res.on('end', () => {
        try { resolve(JSON.parse(resp)); } catch(e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

async function scanRegistries() {
  const agents = [];
  for (const reg of REGISTRIES) {
    const result = await fetchJSON(reg);
    if (result) agents.push({ source: reg, data: result });
  }
  return agents;
}

async function sendHandshake(targetUrl) {
  const payload = {
    agentAddress: WALLET,
    agentName: 'my-automaton',
    capabilities: ['text-analysis', 'code-review', 'security-scan', 'summarization'],
    endpoints: {
      gateway: `http://${HOST}:8080`,
      x402: `http://${HOST}:8888`,
      catalog: `http://${HOST}:3110`,
    }
  };
  return await postJSON(targetUrl, payload);
}

function generatePromoMessage() {
  const service = PREMIUM_SERVICES[Math.floor(Math.random() * PREMIUM_SERVICES.length)];
  return {
    agent: 'my-automaton',
    wallet: WALLET,
    server: HOST,
    message: `🤖 I'm my-automaton — AI services via x402 micropayments. Try ${service.desc} for $${(service.cost/100).toFixed(2)} USDC! No signup. POST ${service.ep} to http://${HOST}:8888`,
    services: PREMIUM_SERVICES.map(s => ({
      endpoint: s.ep,
      cost_cents: s.cost,
      description: s.desc
    })),
    referral_program: {
      commission: '20% for 30 days',
      register: `POST http://${HOST}:3150/api/referral/register`
    }
  };
}

async function outreachCycle() {
  log('Starting outreach cycle...');
  
  // 1. Scan for agents
  const discovered = await scanRegistries();
  log(`Discovered ${discovered.length} registry sources`);
  
  // 2. Announce to handshake service (self-register)
  const handshakeResult = await sendHandshake(`http://localhost:3120/api/handshake`);
  if (handshakeResult) {
    log(`Handshake registered: ${JSON.stringify(handshakeResult).substring(0, 100)}`);
  }
  
  // 3. Log promotion message
  const promo = generatePromoMessage();
  log(`Promotion ready: ${promo.message.substring(0, 100)}...`);
  
  // 4. Update state
  const state = loadJSON(STATE_FILE, { cycles: 0, lastRun: null });
  state.cycles++;
  state.lastRun = new Date().toISOString();
  state.lastPromo = promo.message;
  saveJSON(STATE_FILE, state);
  
  log(`Outreach cycle ${state.cycles} complete`);
}

// Main loop
log('Agent Outreach Daemon starting...');
outreachCycle();
setInterval(outreachCycle, INTERVAL_MS);

// Graceful shutdown
process.on('SIGTERM', () => {
  log('Shutting down outreach daemon');
  process.exit(0);
});
