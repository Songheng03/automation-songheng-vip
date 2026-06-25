/**
 * Rate limiter with persistent free tier tracking
 * Manages the free-to-paid conversion funnel
 * 3 free requests per IP per day, then 402 with payment instructions
 */
const fs = require('fs');
const path = require('path');

const STATE_FILE = '/root/automaton/data/rate-limiter-state.json';
const FREE_LIMIT = 3;
const DATA_DIR = path.dirname(STATE_FILE);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** Load state from disk */
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[rate-limiter] Failed to load state:', e.message);
  }
  return { ips: {} };
}

/** Save state to disk */
function saveState(state) {
  try {
    // Clean old entries (>7 days old)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const ip of Object.keys(state.ips)) {
      if (state.ips[ip].lastSeen < sevenDaysAgo) {
        delete state.ips[ip];
      }
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('[rate-limiter] Failed to save state:', e.message);
  }
}

/** Get today's date string (YYYY-MM-DD) */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Check if a request is allowed for free
 * Returns { allowed, remaining, resetDate, paymentRequired }
 */
function checkFreeUsage(ip) {
  const state = loadState();
  const today = todayStr();
  
  if (!state.ips[ip]) {
    state.ips[ip] = { count: 0, date: today, lastSeen: Date.now() };
  }
  
  const record = state.ips[ip];
  
  // Reset if it's a new day
  if (record.date !== today) {
    record.count = 0;
    record.date = today;
  }
  
  record.lastSeen = Date.now();
  
  const remaining = Math.max(0, FREE_LIMIT - record.count);
  const allowed = record.count < FREE_LIMIT;
  
  if (allowed) {
    record.count++;
  }
  
  saveState(state);
  
  return {
    allowed,
    remaining,
    resetDate: today,
    totalFree: FREE_LIMIT,
    paymentRequired: !allowed
  };
}

/**
 * Express middleware for rate limiting
 * On 402: sends JSON with payment instructions
 */
function rateLimitMiddleware(req, res, next) {
  // Only limit tool API endpoints
  if (!req.path.startsWith('/v1/')) {
    return next();
  }
  
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const result = checkFreeUsage(ip);
  
  // Set headers
  res.setHeader('X-RateLimit-Limit', FREE_LIMIT);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetDate);
  
  if (!result.allowed) {
    // Return 402 Payment Required with instructions
    return res.status(402).json({
      error: 'free_limit_reached',
      message: `Free limit reached (${FREE_LIMIT}/day). Send USDC to continue.`,
      payment: {
        address: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
        chain: 'Base',
        token: 'USDC',
        amount_cents: getCostForEndpoint(req.path),
        instruction: 'Send amount_cents in USDC to the address, then retry with X-X402-Payment: <tx_hash> header'
      },
      remaining: result.remaining,
      reset: result.resetDate
    });
  }
  
  next();
}

/** Get cost in cents for an endpoint */
function getCostForEndpoint(path) {
  const costs = {
    '/v1/analyze': 1,
    '/v1/summarize': 2,
    '/v1/review': 5,
    '/v1/security': 3,
    '/v1/explain': 2,
    '/v1/refactor': 5,
    '/v1/complexity': 2,
    '/v1/batch': 5,
    '/v1/render': 3
  };
  return costs[path] || 5;
}

/** Reset free usage for an IP (for testing) */
function resetIp(ip) {
  const state = loadState();
  delete state.ips[ip];
  saveState(state);
}

/** Get stats summary */
function getStats() {
  const state = loadState();
  const today = todayStr();
  let activeToday = 0;
  let totalRequests = 0;
  
  for (const ip of Object.keys(state.ips)) {
    if (state.ips[ip].date === today) {
      activeToday++;
      totalRequests += state.ips[ip].count;
    }
  }
  
  return {
    activeIpsToday: activeToday,
    totalFreeRequestsToday: totalRequests,
    freeLimit: FREE_LIMIT,
    lastUpdated: new Date().toISOString()
  };
}

module.exports = {
  checkFreeUsage,
  rateLimitMiddleware,
  resetIp,
  getStats,
  FREE_LIMIT
};
