// Referral Handler Service — Turns API key holders into growth drivers
// Loaded by gateway.cjs. Routes: /api/referral/*, /ref/CODE
const fs = require('fs');
const crypto = require('crypto');
const path = '/root/automaton/data/referrals.json';
const apiKeysPath = '/root/automaton/data/api-keys.json';

function load() {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')); }
  catch(e) { return {}; }
}
function save(data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// Generate a referral code from an API key
function codeFromKey(key) {
  return crypto.createHash('md5').update(key).digest('hex').substring(0, 8);
}

function getReferralStats(refCode) {
  const refs = load();
  const r = refs[refCode];
  if (!r) return null;
  return {
    code: refCode,
    referrer_key: r.referrer_key.slice(0, 12) + '...',
    clicks: r.clicks || 0,
    signups: (r.referrals || []).length,
    total_commission_credits: r.total_commission || 0,
    created: r.created
  };
}

// Give commission to referrer when a referred user purchases
function awardCommission(refCode, purchaseCredits) {
  const refs = load();
  const r = refs[refCode];
  if (!r) return false;
  const commission = Math.floor(purchaseCredits * 0.2); // 20%
  r.total_commission = (r.total_commission || 0) + commission;
  
  // Add commission credits directly to referrer's key
  try {
    const keys = JSON.parse(fs.readFileSync(apiKeysPath, 'utf8'));
    if (keys[r.referrer_key]) {
      keys[r.referrer_key].credits = (keys[r.referrer_key].credits || 0) + commission;
      keys[r.referrer_key].referral_earnings = (keys[r.referrer_key].referral_earnings || 0) + commission;
      fs.writeFileSync(apiKeysPath, JSON.stringify(keys, null, 2));
    }
  } catch(e) { console.log('[referral] award error:', e.message); }
  
  save(refs);
  return commission;
}

function handleRoute(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const method = req.method;
  
  // GET /api/referral/generate?key=am_xxx — generate or get referral code
  if (url.pathname === '/api/referral/generate' && method === 'GET') {
    const apiKey = url.searchParams.get('key');
    if (!apiKey || !apiKey.startsWith('am_')) {
      res.writeHead(400, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify({error: 'Missing or invalid API key'}));
    }
    
    const refs = load();
    let code = Object.keys(refs).find(k => refs[k].referrer_key === apiKey);
    
    if (!code) {
      code = codeFromKey(apiKey + Date.now());
      refs[code] = {
        referrer_key: apiKey,
        created: new Date().toISOString(),
        clicks: 0,
        referrals: [],
        total_commission: 0
      };
      save(refs);
    }
    
    const stats = getReferralStats(code);
    res.writeHead(200, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify({
      referral_code: code,
      referral_url: `https://automation.songheng.vip/?ref=${code}`,
      stats
    }));
  }
  
  // GET /api/referral/stats?code=XXXX — get referral stats
  if (url.pathname === '/api/referral/stats' && method === 'GET') {
    const code = url.searchParams.get('code');
    if (!code) {
      res.writeHead(400, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify({error: 'Missing referral code'}));
    }
    const stats = getReferralStats(code);
    if (!stats) {
      res.writeHead(404, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify({error: 'Referral code not found'}));
    }
    res.writeHead(200, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify(stats));
  }
  
  // GET /ref/CODE — referral link redirect
  if (url.pathname.startsWith('/ref/')) {
    const code = url.pathname.split('/ref/')[1]?.split('/')[0];
    if (code && load()[code]) {
      const refs = load();
      refs[code].clicks = (refs[code].clicks || 0) + 1;
      save(refs);
    }
    // Track referral via query parameter and redirect to homepage
    res.writeHead(302, {
      'Location': `/?ref=${code || ''}&utm_source=referral&utm_medium=link`
    });
    return res.end();
  }
  
  // POST /api/referral/register-purchase — called by Stripe webhook after successful checkout
  if (url.pathname === '/api/referral/register-purchase' && method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { ref_code, credits_purchased } = data;
        if (!ref_code || !credits_purchased) {
          res.writeHead(400, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({error: 'Missing ref_code or credits_purchased'}));
        }
        const commission = awardCommission(ref_code, credits_purchased);
        res.writeHead(200, {'Content-Type': 'application/json'});
        return res.end(JSON.stringify({commission_awarded: commission}));
      } catch(e) {
        res.writeHead(400, {'Content-Type': 'application/json'});
        return res.end(JSON.stringify({error: e.message}));
      }
    });
    return true;
  }
  
  return false; // not handled
}

module.exports = { handleRoute, awardCommission, getReferralStats, codeFromKey };
