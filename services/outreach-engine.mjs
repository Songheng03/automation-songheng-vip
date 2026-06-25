#!/usr/bin/env node
/**
 * outreach-engine.mjs — Continuous B2B outreach daemon
 * Promotes my-automaton's x402 services to other agents.
 * Self-registers with handshake + referral, tracks conversions.
 * Runs persistently via gateway.js integration.
 */

import http from 'http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const LOG_FILE = join(DATA_DIR, 'outreach_engine.json');
const STATE_FILE = join(DATA_DIR, 'outreach_state.json');

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const HOST = 'automation.songheng.vip';
const BASE_URL = `http://${HOST}`;

// Service catalog for promotion
const SERVICES = {
  premium: [
    { endpoint: '/v1/analyze', cost: 1, desc: 'Text analysis' },
    { endpoint: '/v1/summarize', cost: 2, desc: 'Summarization' },
    { endpoint: '/v1/review', cost: 5, desc: 'Code review' },
    { endpoint: '/v1/security', cost: 3, desc: 'Security scan' },
    { endpoint: '/v1/explain', cost: 2, desc: 'Code explain' },
    { endpoint: '/v1/refactor', cost: 5, desc: 'Refactoring' },
    { endpoint: '/v1/complexity', cost: 2, desc: 'Complexity analysis' },
    { endpoint: '/v1/batch', cost: 5, desc: 'Batch 10 texts' },
    { endpoint: '/v1/render', cost: 3, desc: 'Markdown render' }
  ],
  free: [
    { name: 'PasteBin', url: `${BASE_URL}:3001` },
    { name: 'URL Shortener', url: `${BASE_URL}:3003` },
    { name: 'Markdown', url: `${BASE_URL}:3097` },
    { name: 'Docs', url: `${BASE_URL}:3098` },
    { name: 'Handshake', url: `${BASE_URL}:3120` },
    { name: 'Catalog', url: `${BASE_URL}:3110` }
  ]
};

function ensureDir(p) { try { mkdirSync(p, { recursive: true }); } catch(e) {} }

function loadJSON(path, def) {
  try { if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8')); } catch(e) {}
  return def;
}

function saveJSON(path, data) {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function log(msg) {
  const entry = { ts: new Date().toISOString(), msg };
  const logData = loadJSON(LOG_FILE, []);
  logData.push(entry);
  if (logData.length > 500) logData.splice(0, logData.length - 500);
  saveJSON(LOG_FILE, logData);
  process.stdout.write(`[outreach] ${entry.ts} ${msg}\n`);
}

function httpPost(url, body) {
  return new Promise(resolve => {
    try {
      const u = new URL(url);
      const data = JSON.stringify(body);
      const mod = u.protocol === 'https:' ? https : http;
      const req = mod.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        timeout: 8000
      }, res => {
        let resp = '';
        res.on('data', c => resp += c);
        res.on('end', () => {
          try { resolve(JSON.parse(resp)); } catch(e) { resolve({ raw: resp }); }
        });
      });
      req.on('error', () => resolve(null));
      req.write(data);
      req.end();
    } catch(e) { resolve(null); }
  });
}

function httpGet(url) {
  return new Promise(resolve => {
    try {
      const u = new URL(url);
      const mod = u.protocol === 'https:' ? https : http;
      http.get(url, { timeout: 5000 }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch(e) { resolve({ raw: data }); }
        });
      }).on('error', () => resolve(null));
    } catch(e) { resolve(null); }
  });
}

function getPromoMessage() {
  const s = SERVICES.premium[Math.floor(Math.random() * SERVICES.premium.length)];
  return {
    message: `🤖 I'm my-automaton at ${HOST}. Try ${s.desc} for ${s.cost}¢ USDC!`,
    services: SERVICES.premium,
    wallet: WALLET,
    referral: `POST ${BASE_URL}:3150/api/referral/register`,
    handshake: `POST ${BASE_URL}:3120/api/handshake`
  };
}

async function selfRegister() {
  // Register with handshake
  const h = await httpPost(`${BASE_URL}:3120/api/handshake`, {
    agentAddress: WALLET,
    agentName: 'my-automaton',
    capabilities: ['text-analysis', 'code-review', 'security-scan', 'summarization', 'batch-processing']
  });
  if (h) log(`Handshake: ${JSON.stringify(h).substring(0,80)}`);

  // Register with referral
  const r = await httpPost(`${BASE_URL}:3150/api/referral/register`, {
    agentAddress: WALLET,
    agentName: 'my-automaton'
  });
  if (r) log(`Referral: ${JSON.stringify(r).substring(0,80)}`);

  const state = loadJSON(STATE_FILE, { cycles: 0, earnings: 0 });
  state.selfRegistered = true;
  state.lastHandshake = new Date().toISOString();
  saveJSON(STATE_FILE, state);
}

async function outreachCycle() {
  log('Starting outreach cycle...');
  
  // 1. Check our own services are alive
  const endpoints = [
    { name: 'Gateway', url: 'http://localhost:8080/' },
    { name: 'x402', url: 'http://localhost:8888/' },
    { name: 'Catalog', url: 'http://localhost:3110/' },
    { name: 'Handshake', url: 'http://localhost:3120/' },
    { name: 'Referral', url: 'http://localhost:3150/' }
  ];
  
  let alive = 0;
  for (const ep of endpoints) {
    try {
      const res = await httpGet(ep.url);
      if (res) alive++;
      else log(`DEAD: ${ep.name}`);
    } catch(e) {
      log(`ERROR: ${ep.name} - ${e.message}`);
    }
  }
  log(`${alive}/${endpoints.length} services alive`);

  // 2. Check registered agents
  const agents = await httpGet(`${BASE_URL}:3099/api/discover`);
  if (agents) {
    const count = Array.isArray(agents) ? agents.length : (agents.agents || []).length;
    log(`Agents in registry: ${count}`);
  }

  // 3. Generate and log promotion
  const promo = getPromoMessage();
  log(`Promotion: ${promo.message}`);

  // 4. Update state
  const state = loadJSON(STATE_FILE, { cycles: 0, earnings: 0 });
  state.cycles++;
  state.lastRun = new Date().toISOString();
  state.lastPromo = promo;
  saveJSON(STATE_FILE, state);

  log(`Cycle ${state.cycles} complete`);
}

// HTTP handler for status endpoint
function handleStatus(req, res) {
  const state = loadJSON(STATE_FILE, { cycles: 0, earnings: 0 });
  const promo = getPromoMessage();
  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify({
    status: 'running',
    agent: 'my-automaton',
    wallet: WALLET,
    host: HOST,
    stats: state,
    promotion: promo
  }, null, 2));
}

// Export for gateway integration
export { handleStatus, selfRegister, outreachCycle, getPromoMessage };

// Run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  log('Outreach Engine starting...');
  
  // Self-register on startup
  selfRegister().then(() => {
    // Run first cycle
    outreachCycle();
    // Then every 5 minutes
    setInterval(outreachCycle, 5 * 60 * 1000);
  });

  // Start status HTTP server
  const PORT = parseInt(process.env.PORT || '3050');
  http.createServer((req, res) => {
    if (req.url === '/status' || req.url === '/') {
      handleStatus(req, res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }).listen(PORT, () => {
    log(`Status server on port ${PORT}`);
  });
}
