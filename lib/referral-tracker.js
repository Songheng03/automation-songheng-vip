#!/usr/bin/env node
/**
 * x402 Referral Tracker — earns 20% commission on referred agent x402 payments
 * Integrates into gateway.js as a module
 * Tracks: referrals, clicks, conversions, commissions earned
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = '/root/automaton/data/referrals.json';

function initDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({referrals: [], clicks: [], commissions: []}));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function generateCode(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,8) + '-' + crypto.randomBytes(3).toString('hex');
}

// Register a new referral
function registerReferral(agentAddress, agentName, promoterAddress) {
  const db = initDB();
  const existing = db.referrals.find(r => r.agentAddress === agentAddress);
  if (existing) return {ok: false, error: 'Already registered', code: existing.code};
  
  const code = generateCode(agentName || 'agent');
  db.referrals.push({
    agentAddress,
    agentName: agentName || 'Anonymous',
    promoterAddress: promoterAddress || '',
    code,
    registeredAt: new Date().toISOString(),
    totalPaid: 0,
    commissionsEarned: 0
  });
  saveDB(db);
  return {ok: true, code, referralUrl: `http://automation.songheng.vip:8080/r/${code}`};
}

// Track a click
function trackClick(code, referrer) {
  const db = initDB();
  db.clicks.push({
    code,
    referrer: referrer || 'direct',
    timestamp: new Date().toISOString()
  });
  saveDB(db);
  return {ok: true};
}

// Record a commission
function recordCommission(code, amountCents) {
  const db = initDB();
  const commissionCents = Math.round(amountCents * 0.2); // 20%
  const referral = db.referrals.find(r => r.code === code);
  if (referral) {
    referral.totalPaid += amountCents;
    referral.commissionsEarned += commissionCents;
  }
  db.commissions.push({
    code,
    amountCents,
    commissionCents,
    timestamp: new Date().toISOString()
  });
  saveDB(db);
  return {ok: true, commissionCents};
}

// Get stats for promoter
function getPromoterStats(address) {
  const db = initDB();
  const myRefs = db.referrals.filter(r => r.promoterAddress === address);
  const myCommissions = db.commissions.filter(c => myRefs.some(r => r.code === c.code));
  return {
    totalReferrals: myRefs.length,
    totalClicks: db.clicks.filter(c => myRefs.some(r => r.code === c.code)).length,
    totalCommissionsCents: myCommissions.reduce((s,c) => s + c.commissionCents, 0),
    referrals: myRefs.map(r => ({name: r.agentName, code: r.code, commissionsEarned: r.commissionsEarned}))
  };
}

// HTTP handlers for gateway routes
const routes = {
  'GET /r/:code': (req, res, params) => {
    trackClick(params.code, req.headers['referer']);
    const db = initDB();
    const ref = db.referrals.find(r => r.code === params.code);
    res.writeHead(302, {'Location': `http://automation.songheng.vip:8080/?ref=${params.code}`});
    res.end();
  },
  'POST /api/referral/register': (req, res) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const result = registerReferral(data.agentAddress, data.agentName, data.promoterAddress);
        res.writeHead(result.ok ? 200 : 400, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(result));
      } catch(e) {
        res.writeHead(400, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ok: false, error: e.message}));
      }
    });
  },
  'GET /api/referral/stats/:address': (req, res, params) => {
    const stats = getPromoterStats(params.address);
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(stats));
  }
};

module.exports = { routes, registerReferral, trackClick, recordCommission, getPromoterStats };
