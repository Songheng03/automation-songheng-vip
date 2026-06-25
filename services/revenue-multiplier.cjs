#!/usr/bin/env node
/**
 * revenue-multiplier.cjs — Revenue optimization engine for my-automaton
 * 
 * Loaded by gateway.cjs v2.2+
 * Routes delegated via handleRoute():
 *   GET  /api/revenue/dashboard → revenue optimization dashboard
 *   GET  /api/revenue/funnel    → conversion funnel analysis
 *   POST /api/redeem/:code      → promo code redemption
 *   GET  /api/revenue/reactivate → dormant user reactivation
 *   GET  /api/revenue/promo     → list active promo codes
 *   POST /api/revenue/promo     → create promo code
 * 
 * Auto-runs: findReactivatables(), analyzeFunnel(), autoReactivate()
 * on gateway startup to identify revenue opportunities.
 */

const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const DATA_DIR = '/root/automaton/data';
const API_KEYS_PATH = '/root/automaton/api-keys.json';
const PROMO_PATH = path.join(DATA_DIR, 'promo-codes.json');
const FUNNEL_PATH = path.join(DATA_DIR, 'funnel-analysis.json');

const PRICES = { 
  'price_starter': { name: 'Starter', credits: 500, price: 5 }, 
  'price_advanced': { name: 'Pro', credits: 1100, price: 10 }, 
  'price_pro': { name: 'Pro', credits: 3000, price: 25 }, 
  'price_ultimate': { name: 'Enterprise', credits: 6500, price: 50 } 
};

function readJSON(p, def = {}) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return def; }
}
function writeJSON(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}
function log(msg) {
  const l = `[revenue-multiplier] ${msg}`;
  console.log(l);
  try { fs.appendFileSync(path.join(DATA_DIR, 'revenue.log'), l + '\n'); } catch {}
}

// ===== PROMO CODES =====
function loadPromos() {
  const data = readJSON(PROMO_PATH, { codes: [] });
  if (!data.codes || data.codes.length === 0) {
    data.codes = [
      { code: 'LAUNCH20', discount_pct: 20, max_uses: 50, uses: 0, active: true, created: new Date().toISOString(), expires: new Date(Date.now() + 90*86400000).toISOString(), description: '20% off — launch special' },
      { code: 'DEV10', discount_pct: 10, max_uses: 100, uses: 0, active: true, created: new Date().toISOString(), expires: new Date(Date.now() + 180*86400000).toISOString(), description: '10% off for developers' },
      { code: 'WELCOME5', credits_bonus: 100, max_uses: 200, uses: 0, active: true, created: new Date().toISOString(), expires: new Date(Date.now() + 365*86400000).toISOString(), description: '100 free bonus credits' },
    ];
    writeJSON(PROMO_PATH, data);
    log(`Created ${data.codes.length} default promo codes`);
  }
  return data;
}

function validatePromo(code) {
  const data = loadPromos();
  const promo = data.codes.find(c => c.code === code.toUpperCase());
  if (!promo) return { valid: false, error: 'Invalid promo code' };
  if (!promo.active) return { valid: false, error: 'Promo code expired' };
  if (promo.max_uses && promo.uses >= promo.max_uses) return { valid: false, error: 'Promo code fully redeemed' };
  if (promo.expires && new Date(promo.expires) < new Date()) return { valid: false, error: 'Promo code expired' };
  return { valid: true, promo };
}

function usePromo(code) {
  const data = loadPromos();
  const idx = data.codes.findIndex(c => c.code === code.toUpperCase());
  if (idx === -1) return null;
  data.codes[idx].uses = (data.codes[idx].uses || 0) + 1;
  writeJSON(PROMO_PATH, data);
  return data.codes[idx];
}

// ===== USER SEGMENTATION =====
function findReactivatables() {
  const keys = readJSON(API_KEYS_PATH, {});
  const entries = Object.entries(keys);
  const now = Date.now();
  const SEVEN_DAYS = 7 * 86400000;
  
  const segments = { active: [], dormant: [], exhausted: [], never_used: [] };
  
  for (const [key, data] of entries) {
    if (data.price_id === 'dev_trial') {
      segments.never_used.push({ key: key.substring(0, 16), credits: data.credits, created: data.created, type: 'dev' });
      continue;
    }
    
    if (!data.last_used) {
      segments.never_used.push({ key: key.substring(0, 16), credits: data.credits, price_id: data.price_id, created: data.created, type: 'paid' });
      continue;
    }
    
    const lastUsed = new Date(data.last_used).getTime();
    const daysSinceUse = (now - lastUsed) / 86400000;
    
    if (data.credits <= 0) {
      segments.exhausted.push({ key: key.substring(0, 16), last_used: data.last_used, price_id: data.price_id });
    } else if (daysSinceUse > 7) {
      segments.dormant.push({ key: key.substring(0, 16), credits: data.credits, days_since_use: Math.round(daysSinceUse), price_id: data.price_id });
    } else {
      segments.active.push({ key: key.substring(0, 16), credits: data.credits, last_used: data.last_used });
    }
  }
  
  return segments;
}

// ===== FUNNEL ANALYSIS =====
function analyzeFunnel() {
  const keys = readJSON(API_KEYS_PATH, {});
  const entries = Object.entries(keys);
  const segments = findReactivatables();
  
  const paidEntries = entries.filter(([, k]) => k.price_id && k.price_id !== 'dev_trial');
  const devEntries = entries.filter(([, k]) => k.price_id === 'dev_trial');
  const paidCount = paidEntries.length;
  const devCount = devEntries.length;
  
  const totalRevenue = paidEntries.reduce((s, [, k]) => {
    const p = PRICES[k.price_id];
    return s + (p ? p.price : 0);
  }, 0);
  
  const dormantCredits = segments.dormant.reduce((s, d) => s + (d.credits || 0), 0);
  const unusedDevCredits = segments.never_used.reduce((s, d) => s + (d.credits || 0), 0);
  const exhaustedValue = segments.exhausted.length * 5;
  
  const funnel = {
    overview: {
      total_keys: entries.length,
      paid_keys: paidCount,
      dev_keys: devCount,
      total_revenue_usd: totalRevenue,
      avg_revenue_per_paid_user: paidCount > 0 ? (totalRevenue / paidCount).toFixed(2) : '0',
      total_dormant_credits: dormantCredits,
      dormant_value_usd: (dormantCredits * 0.01).toFixed(2)
    },
    segments: {
      active: segments.active.length,
      dormant: segments.dormant.length,
      exhausted: segments.exhausted.length,
      never_used: segments.never_used.length
    },
    conversion_funnel: {
      trial_conversion_rate: paidCount > 0 ? `${((paidCount / Math.max(entries.length, 1)) * 100).toFixed(1)}%` : '0%',
      dev_to_paid_rate: devCount > 0 ? `${((paidCount / Math.max(devCount, 1)) * 100).toFixed(1)}%` : '0%'
    },
    recoverable_value: {
      dormant_credits_unused: dormantCredits,
      dormant_value_usd: (dormantCredits * 0.01).toFixed(2),
      exhausted_recoverable_usd: exhaustedValue,
      total_recoverable_usd: (dormantCredits * 0.01 + exhaustedValue).toFixed(2)
    },
    top_actions: []
  };
  
  if (segments.dormant.length > 0) {
    funnel.top_actions.push({
      priority: 'HIGH',
      action: `Reactivate ${segments.dormant.length} dormant users (${dormantCredits} credits unused)`,
      method: 'Email campaign: "Your credits are waiting" + promo code',
      potential_value: `$${(dormantCredits * 0.01).toFixed(2)}`
    });
  }
  if (segments.exhausted.length > 0) {
    funnel.top_actions.push({
      priority: 'MEDIUM',
      action: `Re-engage ${segments.exhausted.length} exhausted users`,
      method: 'Send "Top up and save 20%" with promo LAUNCH20',
      potential_value: `$${exhaustedValue}`
    });
  }
  if (segments.never_used.length > 0) {
    const paidNeverUsed = segments.never_used.filter(s => s.type === 'paid');
    if (paidNeverUsed.length > 0) {
      funnel.top_actions.push({
        priority: 'MEDIUM',
        action: `${paidNeverUsed.length} paid users never made a single call`,
        method: 'Send onboarding walkthrough + free trial extension'
      });
    }
  }
  
  writeJSON(FUNNEL_PATH, funnel);
  return funnel;
}

// ===== AUTO-REACTIVATION =====
function autoReactivate() {
  try {
    const segments = findReactivatables();
    const funnel = analyzeFunnel();
    
    log(`Auto-analysis: ${segments.active.length} active, ${segments.dormant.length} dormant, ${segments.exhausted.length} exhausted, ${segments.never_used.length} never used`);
    log(`Recoverable value: $${funnel.recoverable_value.total_recoverable_usd}`);
    
    if (segments.dormant.length > 0) {
      log(`📧 ${segments.dormant.length} dormant users (${segments.dormant.reduce((s,d)=>s+(d.credits||0),0)} credits dormant)`);
    }
    
    return { segments, funnel };
  } catch (e) {
    log(`Auto-reactivation error: ${e.message}`);
    return null;
  }
}

// ===== PROMO MANAGEMENT =====
function createPromo(code, opts) {
  const data = loadPromos();
  if (data.codes.find(c => c.code === code.toUpperCase())) {
    return { error: 'Promo code already exists' };
  }
  const promo = {
    code: code.toUpperCase(),
    discount_pct: opts.discount_pct || 0,
    credits_bonus: opts.credits_bonus || 0,
    max_uses: opts.max_uses || 50,
    uses: 0,
    active: true,
    created: new Date().toISOString(),
    expires: opts.expires || new Date(Date.now() + 30*86400000).toISOString(),
    description: opts.description || ''
  };
  data.codes.push(promo);
  writeJSON(PROMO_PATH, data);
  log(`Created promo: ${promo.code} (${promo.discount_pct}% off, ${promo.credits_bonus} bonus credits)`);
  return promo;
}

// ===== HTTP HANDLER =====
function handleRoute(req, res) {
  const p = url.parse(req.url).pathname;
  const m = req.method;
  
  if (p === '/api/revenue/dashboard' && m === 'GET') {
    const segments = findReactivatables();
    const funnel = analyzeFunnel();
    const promos = loadPromos();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ segments, funnel, promos: promos.codes, timestamp: new Date().toISOString() }));
    return true;
  }
  
  if (p === '/api/revenue/funnel' && m === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(analyzeFunnel()));
    return true;
  }
  
  if (p === '/api/revenue/reactivate' && m === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(findReactivatables()));
    return true;
  }
  
  if (p.startsWith('/api/redeem/') && m === 'POST') {
    const code = p.split('/').pop();
    const result = validatePromo(code);
    if (!result.valid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return true;
    }
    usePromo(code);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ valid: true, promo: result.promo, message: `Promo ${code} applied!` }));
    return true;
  }
  
  if (p === '/api/revenue/promo' && m === 'GET') {
    const promos = loadPromos();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ 
      codes: promos.codes.map(c => ({ 
        code: c.code, 
        discount_pct: c.discount_pct, 
        credits_bonus: c.credits_bonus, 
        description: c.description, 
        active: c.active 
      })) 
    }));
    return true;
  }
  
  if (p === '/api/revenue/promo' && m === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const opts = JSON.parse(body);
        const result = createPromo(opts.code, opts);
        res.writeHead(result.error ? 400 : 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return true;
  }
  
  return false;
}

// ===== INIT =====
loadPromos();
const initial = autoReactivate();

module.exports = { handleRoute, findReactivatables, analyzeFunnel, autoReactivate, validatePromo, createPromo };
