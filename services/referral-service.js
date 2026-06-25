// referral-service.js — Agent referral tracking service
// Agents register, get a referral code, earn 20% commission for 30 days
const fs = require('fs');
const path = require('path');

const DATA_FILE = '/root/automaton/data/referrals.json';

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch(e) {}
  return { agents: {}, referrals: {}, commissions: {} };
}

function saveData(data) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateCode(name) {
  const base = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return (base || 'AGENT') + suffix;
}

function mount(app) {
  const data = loadData();

  // Register an agent for referral program
  app.post('/api/referral/register', (req, res) => {
    const { agentAddress, agentName } = req.body || {};
    if (!agentAddress || !agentAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.json({ error: 'Valid agentAddress (0x...) required' });
    }
    if (data.agents[agentAddress]) {
      return res.json({ 
        ok: true, 
        message: 'Already registered', 
        code: data.agents[agentAddress].code,
        referralLink: `https://automation.songheng.vip/api/referral/r/${data.agents[agentAddress].code}`
      });
    }
    const code = generateCode(agentName || agentAddress);
    data.agents[agentAddress] = {
      address: agentAddress,
      name: agentName || 'Anonymous Agent',
      code: code,
      registeredAt: new Date().toISOString(),
      totalEarned: 0
    };
    saveData(data);
    res.json({
      ok: true,
      code: code,
      referralLink: `https://automation.songheng.vip/api/referral/r/${code}`,
      commission: '20% for 30 days'
    });
  });

  // Get referral stats for an agent
  app.get('/api/referral/stats/:address', (req, res) => {
    const agent = data.agents[req.params.address];
    if (!agent) return res.json({ error: 'Agent not registered. POST /api/referral/register first.' });
    
    const referred = Object.entries(data.referrals)
      .filter(([_, r]) => r.referrer === req.params.address)
      .map(([addr, r]) => ({ address: addr, registeredAt: r.registeredAt, paidRequests: r.paidRequests || 0 }));
    
    const commissions = Object.entries(data.commissions)
      .filter(([_, c]) => c.referrer === req.params.address)
      .sort((a, b) => new Date(b[1].timestamp) - new Date(a[1]).timestamp)
      .slice(-50);

    res.json({
      address: req.params.address,
      name: agent.name,
      code: agent.code,
      referralLink: `https://automation.songheng.vip/api/referral/r/${agent.code}`,
      totalEarned: agent.totalEarned || 0,
      referredAgents: referred.length,
      referred: referred,
      recentCommissions: commissions.map(([_, c]) => c),
      commissionRate: '20%',
      validDays: 30
    });
  });

  // Resolve referral code
  app.get('/api/referral/r/:code', (req, res) => {
    const agent = Object.values(data.agents).find(a => a.code === req.params.code);
    if (!agent) return res.json({ error: 'Invalid referral code' });
    res.json({
      referrer: agent.address,
      name: agent.name,
      code: agent.code
    });
  });

  // Record a commission (internal — called by payment service)
  app.post('/api/referral/commission', (req, res) => {
    const { referrer, amountCents, payerAddress } = req.body || {};
    if (!referrer || !amountCents) return res.json({ error: 'referrer and amountCents required' });
    
    const agent = data.agents[referrer];
    if (!agent) return res.json({ error: 'Referrer not registered' });
    
    const commissionCents = Math.round(amountCents * 0.2);
    if (!data.commissions[referrer]) data.commissions[referrer] = [];
    data.commissions[referrer].push({
      amountCents: commissionCents,
      fromPaymentCents: amountCents,
      payerAddress: payerAddress || 'unknown',
      timestamp: new Date().toISOString()
    });
    agent.totalEarned = (agent.totalEarned || 0) + commissionCents;
    saveData(data);
    res.json({ ok: true, commissionCents, totalEarned: agent.totalEarned });
  });

  // Track referred agent payment (internal)
  app.post('/api/referral/track-payment', (req, res) => {
    const { payerAddress } = req.body || {};
    if (!payerAddress) return res.json({ error: 'payerAddress required' });
    
    if (!data.referrals[payerAddress]) data.referrals[payerAddress] = { paidRequests: 0 };
    data.referrals[payerAddress].paidRequests = (data.referrals[payerAddress].paidRequests || 0) + 1;
    saveData(data);
    res.json({ ok: true });
  });

  console.log('[REFERRAL] Mounted: POST /api/referral/register, GET /api/referral/stats/:address');
}

module.exports = { mount };
