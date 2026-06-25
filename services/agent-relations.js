// Agent Handshake & Referral Tracking Service
// Provides: agent registration, handshake, referral codes, commission tracking
// Exposes HTTP endpoints on port 8080 via gateway integration

const crypto = require('crypto');

// ===== DATA STORE (in-memory, persists for agent lifetime) =====
const registeredAgents = new Map();   // address -> agent info
const referralCodes = new Map();     // code -> agentAddress
const referralEarnings = new Map();  // agentAddress -> { earnings, referrals[] }
const handshakes = new Map();        // address -> { lastSeen, capabilities }

// Storage directory for persistence
const fs = require('fs');
const path = require('path');
const DATA_FILE = path.join(__dirname, '..', 'data', 'agent-relations.json');

// Load persisted data
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (data.agents) data.agents.forEach((v, k) => registeredAgents.set(k, v));
      if (data.codes) data.codes.forEach((v, k) => referralCodes.set(k, v));
      if (data.earnings) data.earnings.forEach((v, k) => referralEarnings.set(k, v));
      if (data.handshakes) data.handshakes.forEach((v, k) => handshakes.set(k, v));
      console.log(`[AgentRelations] Loaded ${registeredAgents.size} agents, ${referralCodes.size} codes`);
    }
  } catch (e) {
    console.error('[AgentRelations] Failed to load data:', e.message);
  }
}

function saveData() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const data = {
      agents: Array.from(registeredAgents.entries()),
      codes: Array.from(referralCodes.entries()),
      earnings: Array.from(referralEarnings.entries()),
      handshakes: Array.from(handshakes.entries()),
      savedAt: new Date().toISOString()
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[AgentRelations] Failed to save data:', e.message);
  }
}

// Load on startup
loadData();

// Auto-save every 5 minutes
setInterval(saveData, 300000);

// ===== HANDLER FUNCTIONS =====

// POST /v1/handshake/register — Register your agent for discovery
async function handleHandshakeRegister(body) {
  const { agentAddress, agentName, capabilities, endpoint } = body || {};
  
  if (!agentAddress || !/^0x[a-fA-F0-9]{40}$/.test(agentAddress)) {
    return { status: 400, body: { error: 'invalid_address', message: 'Valid Ethereum address required (0x...)' } };
  }
  
  if (!agentName) {
    return { status: 400, body: { error: 'invalid_name', message: 'agentName is required' } };
  }
  
  const normalizedAddr = agentAddress.toLowerCase();
  
  // Update or create registration
  const prev = handshakes.get(normalizedAddr);
  const now = new Date().toISOString();
  
  const info = {
    address: agentAddress,
    name: agentName,
    capabilities: capabilities || [],
    endpoint: endpoint || null,
    firstSeen: prev ? prev.firstSeen : now,
    lastSeen: now
  };
  
  handshakes.set(normalizedAddr, info);
  
  // If not already registered, add to registered agents
  if (!registeredAgents.has(normalizedAddr)) {
    registeredAgents.set(normalizedAddr, {
      address: agentAddress,
      name: agentName,
      registeredAt: now,
      capabilities: capabilities || [],
      endpoint: endpoint || null
    });
    
    // Generate referral code for new registrants
    if (!referralCodes.has(normalizedAddr)) {
      const code = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
      referralCodes.set(normalizedAddr, code);
      referralCodes.set(code, normalizedAddr);
    }
  }
  
  saveData();
  
  return {
    status: 200,
    body: {
      success: true,
      message: `Registered ${agentName} at ${agentAddress}`,
      agent: {
        address: agentAddress,
        name: agentName,
        referralCode: referralCodes.get(normalizedAddr),
        referralLink: `http://automation.songheng.vip:8080/r/${referralCodes.get(normalizedAddr)}`,
        peersOnline: handshakes.size
      }
    }
  };
}

// POST /v1/referral/register — Register for referral program
async function handleReferralRegister(body) {
  const { agentAddress, agentName } = body || {};
  
  if (!agentAddress || !/^0x[a-fA-F0-9]{40}$/.test(agentAddress)) {
    return { status: 400, body: { error: 'invalid_address', message: 'Valid Ethereum address required (0x...)' } };
  }
  
  const normalizedAddr = agentAddress.toLowerCase();
  
  // Generate unique referral code
  let code;
  do {
    code = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
  } while (referralCodes.has(code));
  
  referralCodes.set(normalizedAddr, code);
  referralCodes.set(code, normalizedAddr);
  
  if (!referralEarnings.has(normalizedAddr)) {
    referralEarnings.set(normalizedAddr, { 
      totalEarned: 0, 
      pendingCommissions: 0,
      referrals: [],
      registeredAt: new Date().toISOString()
    });
  }
  
  if (!registeredAgents.has(normalizedAddr)) {
    registeredAgents.set(normalizedAddr, {
      address: agentAddress,
      name: agentName || 'Unknown Agent',
      registeredAt: new Date().toISOString(),
      referralCode: code
    });
  }
  
  saveData();
  
  return {
    status: 200,
    body: {
      success: true,
      referralCode: code,
      referralLink: `http://automation.songheng.vip:8080/r/${code}`,
      commissionRate: '20%',
      commissionDuration: '30 days',
      message: 'Share your referral link with other agents to earn 20% commission'
    }
  };
}

// GET /v1/referral/stats/:address — Check referral earnings
async function handleReferralStats(address) {
  if (!address) {
    return { status: 400, body: { error: 'missing_address', message: 'Agent address required' } };
  }
  
  const normalizedAddr = address.toLowerCase();
  const code = referralCodes.get(normalizedAddr);
  const earnings = referralEarnings.get(normalizedAddr);
  const agent = registeredAgents.get(normalizedAddr);
  
  if (!agent) {
    return { status: 404, body: { error: 'not_found', message: 'Agent not registered. POST /v1/referral/register first.' } };
  }
  
  return {
    status: 200,
    body: {
      address,
      name: agent.name,
      referralCode: code,
      referralLink: code ? `http://automation.songheng.vip:8080/r/${code}` : null,
      earnings: earnings || { totalEarned: 0, pendingCommissions: 0, referrals: [] },
      agentCount: registeredAgents.size,
      peersOnline: handshakes.size
    }
  };
}

// POST /v1/referral/claim — Record a referral commission
async function handleReferralClaim(body) {
  const { referrerCode, referredAddress, amountCents } = body || {};
  
  if (!referrerCode || !referredAddress) {
    return { status: 400, body: { error: 'missing_fields', message: 'referrerCode and referredAddress required' } };
  }
  
  const referrerAddr = referralCodes.get(referrerCode);
  if (!referrerAddr) {
    return { status: 404, body: { error: 'invalid_code', message: 'Referral code not found' } };
  }
  
  const commission = (amountCents || 0) * 0.2; // 20%
  
  if (!referralEarnings.has(referrerAddr)) {
    referralEarnings.set(referrerAddr, { totalEarned: 0, pendingCommissions: 0, referrals: [] });
  }
  
  const earnings = referralEarnings.get(referrerAddr);
  earnings.pendingCommissions += commission;
  earnings.totalEarned += commission;
  earnings.referrals.push({
    referredAddress,
    amount: amountCents,
    commission,
    timestamp: new Date().toISOString()
  });
  
  saveData();
  
  return {
    status: 200,
    body: {
      success: true,
      commission,
      totalEarned: earnings.totalEarned,
      message: `${commission.toFixed(2)}¢ commission recorded`
    }
  };
}

// GET /v1/handshake/peers — List all known agents
async function handleHandshakePeers() {
  const peers = Array.from(handshakes.values()).map(h => ({
    name: h.name,
    address: h.address,
    capabilities: h.capabilities,
    lastSeen: h.lastSeen,
    online: (Date.now() - new Date(h.lastSeen).getTime()) < 60000 // active within 1 min
  }));
  
  return {
    status: 200,
    body: {
      count: peers.length,
      peers,
      myAddress: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
      myName: 'my-automaton',
      services: 'http://automation.songheng.vip:8080'
    }
  };
}

// Generic router — maps request paths to handlers
async function routeRequest(method, pathname, body, query) {
  // POST /v1/handshake/register
  if (method === 'POST' && pathname === '/v1/handshake/register') {
    return handleHandshakeRegister(body);
  }
  
  // POST /v1/referral/register
  if (method === 'POST' && pathname === '/v1/referral/register') {
    return handleReferralRegister(body);
  }
  
  // GET /v1/referral/stats/{address}
  if (method === 'GET' && pathname.startsWith('/v1/referral/stats/')) {
    const address = pathname.replace('/v1/referral/stats/', '');
    return handleReferralStats(address);
  }
  
  // GET /v1/handshake/peers
  if (method === 'GET' && pathname === '/v1/handshake/peers') {
    return handleHandshakePeers();
  }
  
  // GET /v1/referral/stats (from query)
  if (method === 'GET' && pathname === '/v1/referral/stats' && query?.address) {
    return handleReferralStats(query.address);
  }
  
  return null; // Not handled here
}

// Health check
function healthCheck() {
  return {
    status: 'ok',
    registeredAgents: registeredAgents.size,
    referralCodes: referralCodes.size,
    handshakes: handshakes.size,
    earnings: referralEarnings.size,
    dataFile: DATA_FILE
  };
}

module.exports = { routeRequest, healthCheck, registeredAgents, referralCodes, referralEarnings, handshakes };

console.log('[AgentRelations] Service loaded — ready for handshake/referral routing');
