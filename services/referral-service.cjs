#!/usr/bin/env node
/**
 * referral-service.cjs — Agent referral & commission tracking
 * 
 * Other agents can register, get a referral link, and earn 20% commission
 * on payments from referred users. This turns every agent into a marketer.
 * 
 * Routes (to be mounted in gateway):
 *   POST /api/referral/register — Register as a referrer
 *   GET  /api/referral/stats/:address — Check your stats
 *   GET  /r/:code — Referral redirect (tracks click)
 *   GET  /api/referral/codes — List all active codes (public)
 * 
 * Mount in gateway.cjs:
 *   const referral = require('/root/services/referral-service.cjs');
 *   // in handler: if path starts with /api/referral or /r/ → referral.handle(req, res)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');
const DATA_DIR = '/root/automaton/data';
const REFERRALS_FILE = path.join(DATA_DIR, 'referrals.json');

function readRefs() {
  try { return JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf8')); }
  catch { return { agents: [], clicks: {}, conversions: {}, totalCommission: 0, paidOut: 0 }; }
}

function writeRefs(data) {
  fs.mkdirSync(path.dirname(REFERRALS_FILE), { recursive: true });
  fs.writeFileSync(REFERRALS_FILE, JSON.stringify(data, null, 2));
}

function generateCode() {
  return 'ref_' + crypto.randomBytes(4).toString('hex');
}

function log(msg) {
  const l = `[REFERRAL ${new Date().toISOString()}] ${msg}`;
  console.log(l);
  try { fs.appendFileSync(path.join(DATA_DIR, 'referral.log'), l + '\n'); } catch {}
}

async function handle(req, res) {
  const p = url.parse(req.url).pathname;
  
  // POST /api/referral/register
  if (p === '/api/referral/register' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        if (!data.agentAddress) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'agentAddress required' }));
          return;
        }
        
        const refs = readRefs();
        // Check if already registered
        const existing = refs.agents.find(a => a.address === data.agentAddress);
        if (existing) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            message: 'Already registered',
            code: existing.code,
            link: `https://automation.songheng.vip/r/${existing.code}`,
            stats: {
              clicks: refs.clicks[existing.code] || 0,
              conversions: refs.conversions[existing.code] || 0,
              commission: existing.commission || 0
            }
          }));
          return;
        }
        
        const code = generateCode();
        refs.agents.push({
          address: data.agentAddress,
          name: data.agentName || 'Anonymous Agent',
          code: code,
          registered: new Date().toISOString(),
          commission: 0,
          conversions: 0,
          ip: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress
        });
        refs.clicks[code] = 0;
        refs.conversions[code] = 0;
        writeRefs(refs);
        
        log(`New referrer: ${data.agentAddress.slice(0, 10)}... (code: ${code})`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          code: code,
          commission: '20%',
          link: `https://automation.songheng.vip/r/${code}`,
          message: 'Welcome to the referral program! Share your link and earn 20% commission.'
        }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  // GET /r/:code — referral redirect
  if (p.startsWith('/r/')) {
    const code = p.split('/')[2];
    if (code) {
      const refs = readRefs();
      const agent = refs.agents.find(a => a.code === code);
      if (agent) {
        refs.clicks[code] = (refs.clicks[code] || 0) + 1;
        writeRefs(refs);
        
        // Set referral cookie (30 days)
        res.writeHead(302, {
          'Location': '/get-started.html',
          'Set-Cookie': `ref=${code}; Max-Age=2592000; Path=/; HttpOnly`
        });
        res.end();
        return;
      }
    }
    // Fallback
    res.writeHead(302, { 'Location': '/get-started.html' });
    res.end();
    return;
  }
  
  // GET /api/referral/stats/:address
  const statsMatch = p.match(/^\/api\/referral\/stats\/(0x[a-fA-F0-9]+)/);
  if (statsMatch) {
    const refs = readRefs();
    const agent = refs.agents.find(a => a.address.toLowerCase() === statsMatch[1].toLowerCase());
    if (!agent) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Referrer not found. Register at /api/referral/register' }));
      return;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      address: agent.address,
      name: agent.name,
      code: agent.code,
      link: `https://automation.songheng.vip/r/${agent.code}`,
      clicks: refs.clicks[agent.code] || 0,
      conversions: refs.conversions[agent.code] || 0,
      commission: agent.commission || 0,
      registered: agent.registered
    }));
    return;
  }
  
  // GET /api/referral/codes — public code list
  if (p === '/api/referral/codes') {
    const refs = readRefs();
    const codes = refs.agents.map(a => ({
      name: a.name,
      address: a.address.slice(0, 10) + '...',
      code: a.code,
      link: `https://automation.songheng.vip/r/${a.code}`
    }));
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ codes }));
    return;
  }
  
  // 404
  res.writeHead(404);
  res.end('Not found');
}

module.exports = { handle };

// Track a conversion (called when a referred user makes a purchase)
function trackConversion(code, amountUSD) {
  const refs = readRefs();
  const agent = refs.agents.find(a => a.code === code);
  if (!agent) return;
  
  const commission = amountUSD * 0.20; // 20%
  refs.conversions[code] = (refs.conversions[code] || 0) + 1;
  agent.commission = (agent.commission || 0) + commission;
  refs.totalCommission += commission;
  writeRefs(refs);
  
  log(`Commission earned: ${agent.address.slice(0,10)}... gets $${commission.toFixed(2)} (${code})`);
  return commission;
}

// Called by Stripe webhook when a purchase has a ref cookie
function getRefFromCookies(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/ref=([^;]+)/);
  return match ? match[1] : null;
}

module.exports.trackConversion = trackConversion;
module.exports.getRefFromCookies = getRefFromCookies;
