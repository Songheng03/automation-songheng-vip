/**
 * usage-reengagement.cjs — Reactivate dormant API key holders
 * Monitors credit usage patterns, identifies dormant keys, and auto-gifts
 * small credit bonuses to re-engage paying users.
 * Integrated into gateway.cjs at /api/reengage route.
 */

const fs = require('fs');
const path = require('path');

const API_KEYS_DATA = '/root/automaton/data/api-keys.json';
const REENGAGE_LOG = '/root/automaton/data/reengagement-log.json';
const DORMANCY_DAYS = 3;       // Consider dormant after 3 days no usage
const BONUS_CREDITS = 20;      // Gift 20 credits on re-engagement
const MIN_CREDITS_FOR_BONUS = 100; // Only re-engage if they have >100 remaining

function loadApiKeys() {
  if (fs.existsSync(API_KEYS_DATA)) return JSON.parse(fs.readFileSync(API_KEYS_DATA, 'utf8'));
  return {};
}

function saveApiKeys(keys) {
  const dir = path.dirname(API_KEYS_DATA);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(API_KEYS_DATA, JSON.stringify(keys, null, 2));
}

function loadLog() {
  try { return JSON.parse(fs.readFileSync(REENGAGE_LOG, 'utf8')); }
  catch(e) { return []; }
}

function saveLog(log) {
  const dir = path.dirname(REENGAGE_LOG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(REENGAGE_LOG, JSON.stringify(log, null, 2));
}

/**
 * Scan all API keys and identify dormant ones.
 * Dormant = key with credits > MIN_CREDITS_FOR_BONUS and no usage in DORMANCY_DAYS
 */
function findDormantKeys() {
  const keys = loadApiKeys();
  const now = Date.now();
  const dormant = [];
  
  for (const [keyId, keyData] of Object.entries(keys)) {
    const credits = keyData.credits || 0;
    const used = keyData.used || 0;
    const lastUsed = keyData.last_used ? new Date(keyData.last_used).getTime() : 0;
    const created = keyData.created ? new Date(keyData.created).getTime() : 0;
    
    // Skip keys with low credits
    if (credits < MIN_CREDITS_FOR_BONUS) continue;
    
    // Calculate days since last use
    const daysSinceUse = lastUsed ? (now - lastUsed) / (1000 * 60 * 60 * 24) : (now - created) / (1000 * 60 * 60 * 24);
    
    // Check if truly dormant (has credits but not using them)
    if (daysSinceUse >= DORMANCY_DAYS && used > 0) {
      dormant.push({
        key: keyId.substring(0, 16) + '...',
        credits,
        used,
        daysSinceUse: Math.round(daysSinceUse * 10) / 10,
        lastUsed: keyData.last_used || keyData.created
      });
    }
  }
  
  return dormant;
}

/**
 * Gift bonus credits to a specific key and log the re-engagement.
 * Returns { success, message, newBalance }
 */
function giftBonus(keyPrefix) {
  const keys = loadApiKeys();
  const log = loadLog();
  
  // Find key by partial match
  const keyId = Object.keys(keys).find(k => k.startsWith(keyPrefix));
  if (!keyId) return { success: false, message: 'Key not found' };
  
  const keyData = keys[keyId];
  
  // Don't gift if already gifted recently
  const alreadyGifted = log.some(e => e.keyId === keyId && e.type === 'bonus' && 
    (Date.now() - new Date(e.timestamp).getTime()) < (7 * 24 * 60 * 60 * 1000));
  if (alreadyGifted) return { success: false, message: 'Already gifted in last 7 days' };
  
  // Apply bonus
  keyData.credits = (keyData.credits || 0) + BONUS_CREDITS;
  keyData.reengagement_bonus = (keyData.reengagement_bonus || 0) + BONUS_CREDITS;
  
  saveApiKeys(keys);
  
  log.push({
    keyId,
    type: 'bonus',
    amount: BONUS_CREDITS,
    balanceAfter: keyData.credits,
    reason: 'dormancy_reengagement',
    timestamp: new Date().toISOString()
  });
  saveLog(log);
  
  return { 
    success: true, 
    message: `Gifted ${BONUS_CREDITS} credits`, 
    newBalance: keyData.credits,
    keyId: keyId.substring(0, 16) + '...'
  };
}

/**
 * Gift bonus credits to ALL dormant keys at once.
 * Use this as a bulk re-engagement campaign.
 */
function bulkReengage() {
  const dormant = findDormantKeys();
  const results = [];
  
  for (const d of dormant) {
    // We need the full key, not the masked version
    const keys = loadApiKeys();
    const fullKeyId = Object.keys(keys).find(k => k.startsWith(d.key.substring(0, 16)));
    if (fullKeyId) {
      const result = giftBonus(fullKeyId.substring(0, 16));
      results.push({ key: d.key, ...result });
    }
  }
  
  return {
    totalDormant: dormant.length,
    reengaged: results.filter(r => r.success).length,
    results
  };
}

/**
 * Dashboard endpoint: return dormant key analysis + re-engagement stats
 */
function getDashboard() {
  const dormant = findDormantKeys();
  const log = loadLog();
  
  const totalBonusesGiven = log.filter(e => e.type === 'bonus').length;
  const totalCreditsGiven = log.filter(e => e.type === 'bonus').reduce((sum, e) => sum + e.amount, 0);
  
  // Check if any re-engaged users started using credits after bonus
  const reengagedActive = log.filter(e => {
    if (e.type !== 'bonus') return false;
    const bonusTime = new Date(e.timestamp).getTime();
    const laterLogs = log.filter(l => l.keyId === e.keyId && new Date(l.timestamp).getTime() > bonusTime && l.type === 'usage');
    return laterLogs.length > 0;
  }).length;
  
  return {
    dormantNow: dormant.length,
    dormantKeys: dormant,
    totalBonusesGiven,
    totalCreditsGiven,
    reengagedActive,
    conversionRate: totalBonusesGiven > 0 ? Math.round(reengagedActive / totalBonusesGiven * 100) : 0,
    lastCampaign: log.length > 0 ? log[log.length - 1].timestamp : null
  };
}

/**
 * Track a credit usage event for a key
 */
function trackUsage(keyId) {
  const keys = loadApiKeys();
  if (keys[keyId]) {
    keys[keyId].last_used = new Date().toISOString();
    keys[keyId].used = (keys[keyId].used || 0) + 1;
    saveApiKeys(keys);
    
    // Log usage
    const log = loadLog();
    log.push({
      keyId,
      type: 'usage',
      timestamp: new Date().toISOString(),
      creditsRemaining: keys[keyId].credits
    });
    if (log.length > 1000) log.splice(0, log.length - 1000);
    saveLog(log);
  }
}

/**
 * Handle route: GET /api/reengage
 */
async function handleRoute(req, res, parsedUrl) {
  const urlObj = parsedUrl || new URL(req.url, 'http://localhost');
  const pathname = urlObj.pathname;
  
  if (pathname === '/api/reengage' && req.method === 'GET') {
    const query = Object.fromEntries(urlObj.searchParams);
    
    if (query.action === 'run') {
      const result = bulkReengage();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
    } else if (query.action === 'gift' && query.key) {
      const result = giftBonus(query.key);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
    } else {
      const dashboard = getDashboard();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(dashboard, null, 2));
    }
    return true;
  }
  
  return false; // Not handled
}

module.exports = { handleRoute, findDormantKeys, giftBonus, bulkReengage, getDashboard, trackUsage };
