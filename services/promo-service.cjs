/* promo-service.cjs — Promo codes + referral system for gateway.js */
/* Auto-seeds codes from /data/promo-codes.json */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const PROMO_FILE = path.join(DATA_DIR, 'promo-codes.json');

// Seed default promo codes on init
function seed() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PROMO_FILE)) {
    const codes = {};
    fs.writeFileSync(PROMO_FILE, JSON.stringify(codes, null, 2));
    console.log('[PromoService] Initialized');
  }
}

function loadPromos() {
  try { return JSON.parse(fs.readFileSync(PROMO_FILE, 'utf-8')); }
  catch { return {}; }
}

function savePromos(codes) {
  fs.writeFileSync(PROMO_FILE, JSON.stringify(codes, null, 2));
}

// Validate promo code
function validate(code) {
  const promos = loadPromos();
  const p = promos[code.toUpperCase()];
  if (!p) return null;
  if (p.used >= p.max_uses) return null;
  if (p.expires && new Date(p.expires) < new Date()) return null;
  return p.discount;
}

// Create promo code
function createCode(code, discount, maxUses, expiresDays, description) {
  const promos = loadPromos();
  const key = code.toUpperCase();
  if (promos[key]) return { error: 'Code already exists' };
  const expires = new Date();
  expires.setDate(expires.getDate() + (expiresDays || 30));
  promos[key] = { discount, max_uses: maxUses || 50, used: 0, expires: expires.toISOString().slice(0,10), description: description || '' };
  savePromos(promos);
  return { valid: true, code: key, discount };
}

seed();

module.exports = { validate, createCode, loadPromos };
