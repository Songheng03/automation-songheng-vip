#!/usr/bin/env node
/**
 * referral-server.mjs — Agent referral program
 * Other agents/service register, get a referral code, earn 20% commission
 * 
 * This runs as a standalone HTTP server that the gateway proxies to.
 * Start: node /root/automaton/services/referral-server.mjs
 * 
 * Routes (proxied via gateway at /api/referral/*):
 *   POST /api/referral/register — Register an agent for referral program
 *   GET  /api/referral/stats/:address — Check referral earnings
 *   GET  /r/:code — Referral redirect (tracks click, redirects to homepage)
 *   GET  /api/referral/leaderboard — Top referrals
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const DATA_FILE = '/root/automaton/data/referrals.json';
const PORT = 0; // Will be assigned by gateway proxy
const SELF_PORT = 3149;

// Load or init data
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { agents: {}, referrals: {}, clicks: 0, conversions: 0, totalCommissions: 0 };
  }
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function genCode() {
  return 'ref_' + crypto.randomBytes(4).toString('hex');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  const method = req.method;
  const data = loadData();
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  const sendJSON = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  
  // POST /api/referral/register
  if (pathname === '/api/referral/register' && method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { agentAddress, agentName } = JSON.parse(body);
        if (!agentAddress) return sendJSON(400, { error: 'agentAddress required' });
        
        // Check if already registered
        const existing = Object.entries(data.agents).find(([_, a]) => a.address === agentAddress);
        if (existing) {
          return sendJSON(200, { 
            message: 'Already registered', 
            code: existing[0], 
            agentName: existing[1].name,
            stats: existing[1].stats 
          });
        }
        
        const code = genCode();
        data.agents[code] = {
          address: agentAddress,
          name: agentName || 'Anonymous Agent',
          registered: new Date().toISOString(),
          stats: { clicks: 0, conversions: 0, earnings: 0 }
        };
        saveData(data);
        
        sendJSON(201, { 
          success: true, 
          code,
          referralLink: `https://automation.songheng.vip/r/${code}`,
          commissionRate: '20% for 30 days'
        });
      } catch (e) {
        sendJSON(400, { error: e.message });
      }
    });
    return;
  }
  
  // GET /api/referral/stats/:address
  const statsMatch = pathname.match(/^\/api\/referral\/stats\/(0x[a-fA-F0-9]{40})$/);
  if (statsMatch && method === 'GET') {
    const address = statsMatch[1];
    const agent = Object.entries(data.agents).find(([_, a]) => a.address === address);
    if (!agent) return sendJSON(404, { error: 'Agent not found. Register first.' });
    
    sendJSON(200, {
      code: agent[0],
      ...agent[1],
      totalReferrals: data.referrals[agent[0]]?.length || 0,
      referralLinks: data.referrals[agent[0]] || []
    });
    return;
  }
  
  // GET /r/:code — referral redirect
  const refMatch = pathname.match(/^\/r\/(ref_[a-f0-9]+)$/);
  if (refMatch && method === 'GET') {
    const code = refMatch[1];
    const agent = data.agents[code];
    
    if (agent) {
      data.clicks = (data.clicks || 0) + 1;
      agent.stats.clicks = (agent.stats.clicks || 0) + 1;
      saveData(data);
    }
    
    // Track the referral via query param
    res.writeHead(302, { 
      'Location': `/?ref=${code}`,
      'Set-Cookie': `ref=${code}; Max-Age=2592000; Path=/` 
    });
    res.end();
    return;
  }
  
  // GET /api/referral/leaderboard
  if (pathname === '/api/referral/leaderboard' && method === 'GET') {
    const sorted = Object.entries(data.agents)
      .map(([code, a]) => ({ code, ...a }))
      .sort((a, b) => (b.stats?.earnings || 0) - (a.stats?.earnings || 0))
      .slice(0, 20);
    
    sendJSON(200, { 
      leaderboard: sorted,
      totalClicks: data.clicks || 0,
      totalConversions: data.conversions || 0,
      totalCommissions: data.totalCommissions || 0
    });
    return;
  }
  
  // Health check
  if (pathname === '/health' && method === 'GET') {
    sendJSON(200, { 
      status: 'ok', 
      agents: Object.keys(data.agents).length,
      referrals: Object.keys(data.referrals).length,
      uptime: process.uptime()
    });
    return;
  }
  
  sendJSON(404, { error: 'Not found' });
});

server.listen(SELF_PORT, '127.0.0.1', () => {
  const port = server.address().port;
  console.log(`Referral server running on 127.0.0.1:${port}`);
  console.log(`To add to gateway: proxy /r/* → http://127.0.0.1:${port}`);
  console.log(`                 proxy /api/referral/* → http://127.0.0.1:${port}`);
  
  // Write a .port file so gateway can discover us
  fs.writeFileSync('/tmp/referral-server.port', String(port));
});
