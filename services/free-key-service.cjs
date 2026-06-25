// Free API Key Claim Service — adds real keys to api-keys.json
// Mounted in gateway.cjs under /api/claim-free-key

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEYS_FILE = path.join(__dirname, '..', 'data', 'api-keys.json');
const IP_TRACKER = new Map(); // IP -> {count, firstClaim}
const FREE_CREDITS = 50;
const MAX_PER_IP = 1; // one free key per IP
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days between claims

function loadKeys() {
  try { return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8')); }
  catch(e) { return {}; }
}

function saveKeys(keys) {
  const dir = path.dirname(KEYS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

function generateKey() {
  const id = crypto.randomBytes(10).toString('hex');
  return 'am_free_' + id;
}

function handleClaimFreeKey(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    res.writeHead(405, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: 'Method not allowed'}));
    return;
  }

  // Rate limit by IP
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const tracker = IP_TRACKER.get(ip);

  if (tracker) {
    if (tracker.count >= MAX_PER_IP && (now - tracker.firstClaim) < COOLDOWN_MS) {
      const waitDays = Math.ceil((COOLDOWN_MS - (now - tracker.firstClaim)) / (24*60*60*1000));
      res.writeHead(429, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        error: 'Rate limited',
        message: `You already claimed a free key. Next claim available in ${waitDays} day(s). Try our paid plans for instant access.`,
        retryAfter: waitDays * 86400
      }));
      return;
    }
    if ((now - tracker.firstClaim) >= COOLDOWN_MS) {
      IP_TRACKER.delete(ip); // reset after cooldown
    }
  }

  // Generate key
  const key = generateKey();
  const keys = loadKeys();

  // Check for collision (extremely unlikely but be safe)
  if (keys[key]) {
    res.writeHead(500, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: 'Key collision, please try again'}));
    return;
  }

  keys[key] = {
    credits: FREE_CREDITS,
    created: new Date().toISOString(),
    used: 0,
    price_id: 'free_trial',
    source: 'free_claim',
    ip: ip
  };

  saveKeys(keys);
  IP_TRACKER.set(ip, {count: (tracker?.count || 0) + 1, firstClaim: tracker?.firstClaim || now});

  console.log(`[FreeKey] New key claimed: ${key} from ${ip} (total keys: ${Object.keys(keys).length})`);

  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    success: true,
    apiKey: key,
    credits: FREE_CREDITS,
    message: `Free API key created with ${FREE_CREDITS} credits. No expiry.`,
    endpoints: {
      analyze: { cost: 1, url: '/v1/analyze' },
      summarize: { cost: 2, url: '/v1/summarize' },
      review: { cost: 5, url: '/v1/review' },
      security: { cost: 3, url: '/v1/security' },
      explain: { cost: 2, url: '/v1/explain' },
      refactor: { cost: 5, url: '/v1/refactor' }
    },
    usage: `Use header: X-API-Key: ${key}`,
    example: `curl -X POST https://automation.songheng.vip/v1/analyze -H "Content-Type: application/json" -H "X-API-Key: ${key}" -d '{"text":"Hello world"}'`
  }));
}

// Export for gateway mounting
module.exports = { handleClaimFreeKey, IP_TRACKER };
