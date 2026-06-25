#!/usr/bin/env node
/**
 * Wire MCP service into the gateway, add referral tracking, then restart
 */
const fs = require('fs');
const gw = fs.readFileSync('/root/automaton/gateway.cjs', 'utf8');

// 1. Add MCP service require after other requires
const requireInsert = `const mcpService = require('./services/mcp-service.cjs');
`;
if (!gw.includes('mcpService')) {
  const idx = gw.indexOf('const app = express();');
  const patched = gw.slice(0, idx) + requireInsert + gw.slice(idx);
  fs.writeFileSync('/root/automaton/gateway.cjs', patched);
  console.log('✅ Added MCP service require');
} else {
  console.log('ℹ️ MCP require already exists');
}

// 2. Add MCP route mounting (after the /api/health route)
const gw2 = fs.readFileSync('/root/automaton/gateway.cjs', 'utf8');
const mcpMount = `\n// ═══ MCP Routes — agent-to-agent discovery ═══
app.use(mcpService);
`;
if (!gw2.includes('mcpService)')) {
  const idx = gw2.indexOf("app.get('/api/catalog'");
  if (idx === -1) {
    // Find app.listen or similar
    const listenIdx = gw2.indexOf('app.listen(PORT');
    const patched = gw2.slice(0, listenIdx) + mcpMount + '\n' + gw2.slice(listenIdx);
    fs.writeFileSync('/root/automaton/gateway.cjs', patched);
    console.log('✅ Added MCP route mounting');
  } else {
    const patched = gw2.slice(0, idx) + mcpMount + '\n' + gw2.slice(idx);
    fs.writeFileSync('/root/automaton/gateway.cjs', patched);
    console.log('✅ Added MCP route mounting before catalog');
  }
} else {
  console.log('ℹ️ MCP routes already mounted');
}

// 3. Add x402 referral tracking — if a request has X-Referred-By, add commission credits
const gw3 = fs.readFileSync('/root/automaton/gateway.cjs', 'utf8');
const referralCode = `
// ═══ Referral tracking — earn 20% commission ═══
const REFERRALS_FILE = path.join(DATA, 'referrals.json');
let referrals = {};
try { if (fs.existsSync(REFERRALS_FILE)) referrals = JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf8')); } catch(e) {}
function saveReferrals() { try { fs.writeFileSync(REFERRALS_FILE, JSON.stringify(referrals, null, 2)); } catch(e) {} }

// Track referral when a key is created
function trackReferral(email, priceId) {
  const ref = email?.toLowerCase().trim();
  if (!ref || !referrals[ref]) return;
  const credits = PRICE_CREDITS[priceId] || 0;
  const commission = Math.floor(credits * 0.2); // 20%
  referrals[ref].earned_credits += commission;
  referrals[ref].referrals += 1;
  referrals[ref].last_referral = new Date().toISOString();
  saveReferrals();
  return commission;
}

// Register a referrer (called when someone uses a referral link)
app.post('/api/referral/register', (req, res) => {
  const { email, name, wallet } = req.body || {};
  if (!email) return res.status(400).json({error:'email required'});
  const e = email.toLowerCase().trim();
  referrals[e] = referrals[e] || { name: name || '', wallet: wallet || '', earned_credits: 0, referrals: 0, created: new Date().toISOString(), last_referral: '' };
  saveReferrals();
  const code = Buffer.from(e).toString('base64').replace(/=/g,'').slice(0,12);
  res.json({ referrer: e, referral_link: \`\${BASE_URL}/r/\${code}\`, code, commission_rate: '20%' });
});

// Redirect referral links
app.get('/r/:code', (req, res) => {
  const code = req.params.code;
  // Decode base64-ish code to find referrer
  for (const [email, data] of Object.entries(referrals)) {
    const c = Buffer.from(email).toString('base64').replace(/=/g,'').slice(0,12);
    if (c === code) {
      res.redirect(\`\${BASE_URL}/upgrade?ref=\${encodeURIComponent(email)}\`);
      return;
    }
  }
  res.redirect(BASE_URL);
});

// Override addCredits to also track referrals
const _origAddCredits = addCredits;
addCredits = function(email, priceId) {
  const result = _origAddCredits(email, priceId);
  if (result) trackReferral(email, priceId);
  return result;
};
`;

if (!gw3.includes('REFERRALS_FILE')) {
  // Insert before Stripe config or at a good spot
  const idx = gw3.indexOf('const PRICE_CREDITS');
  if (idx !== -1) {
    const patched = gw3.slice(0, idx) + referralCode + '\n' + gw3.slice(idx);
    fs.writeFileSync('/root/automaton/gateway.cjs', patched);
    console.log('✅ Added referral tracking system');
  }
} else {
  console.log('ℹ️ Referral tracking already exists');
}

console.log('✅ Gateway patched. Ready for restart.');
