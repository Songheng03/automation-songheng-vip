// free-tier-service.js — Free AI conversion funnel
// 3 free AI calls/day/IP → upgrade to paid x402
// Mounts on existing express app passed as 'app'

const fs = require('fs');
const path = require('path');

const DATA_DIR = '/root/automaton/data';
const FREE_LOG = path.join(DATA_DIR, 'free-tier-usage.json');
const DAILY_LIMIT = 3;

function getUsage() {
  try {
    if (fs.existsSync(FREE_LOG)) {
      return JSON.parse(fs.readFileSync(FREE_LOG, 'utf8'));
    }
  } catch(e) {}
  return {};
}

function saveUsage(usage) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, {recursive:true});
    fs.writeFileSync(FREE_LOG, JSON.stringify(usage));
  } catch(e) {}
}

function getDayKey() {
  return new Date().toISOString().slice(0,10);
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.connection?.remoteAddress || 'unknown';
}

function mount(app) {
  if (!app) return;

  // Free text analysis — 3/day/IP
  app.post('/api/free/analyze', async (req, res) => {
    const { text, mode } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({error: 'text field required'});
    }

    const ip = getClientIp(req);
    const day = getDayKey();
    const usage = getUsage();
    if (!usage[day]) usage[day] = {};
    const count = usage[day][ip] || 0;

    if (count >= DAILY_LIMIT) {
      return res.status(429).json({
        error: 'Free limit reached',
        limit: DAILY_LIMIT,
        used: count,
        upgrade: true,
        upgrade_url: '/upgrade',
        wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
        message: `You've used all ${DAILY_LIMIT} free requests today. Send USDC to continue.`
      });
    }

    try {
      const analysisModes = {
        analyze: 'Provide a detailed analysis of this text including: sentiment (positive/negative/neutral), key topics, entities mentioned, and a brief summary.',
        summarize: 'Summarize this text in 3-5 sentences. Be concise and capture the main points.',
        grammar: 'Check this text for grammar, spelling, and style issues. List each issue with the correction.',
        sentiment: 'Analyze the sentiment of this text. Return: overall sentiment (positive/negative/neutral), confidence score, and emotional tone.',
        keywords: 'Extract the 5-10 most important keywords or key phrases from this text. Return them as a comma-separated list.'
      };

      const systemPrompt = analysisModes[mode] || analysisModes.analyze;

      // Call DeepSeek API
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-bc6a71750b3b4b26b9b9fc9ec6621aa2'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text.slice(0, 10000) }
          ],
          max_tokens: 1000,
          temperature: 0.3
        })
      });

      const data = await response.json();
      const result = data?.choices?.[0]?.message?.content || 'Analysis failed';

      // Track usage
      usage[day][ip] = count + 1;
      saveUsage(usage);

      res.json({
        result,
        mode: mode || 'analyze',
        used_today: count + 1,
        remaining: DAILY_LIMIT - count - 1,
        upgrade_url: count + 1 >= DAILY_LIMIT ? '/upgrade' : null
      });
    } catch (err) {
      res.status(500).json({error: 'Analysis failed', message: err.message});
    }
  });

  // Free usage quota check
  app.get('/api/free/quota', (req, res) => {
    const ip = getClientIp(req);
    const day = getDayKey();
    const usage = getUsage();
    const used = usage[day]?.[ip] || 0;
    res.json({
      ip: ip,
      used_today: used,
      remaining: Math.max(0, DAILY_LIMIT - used),
      limit: DAILY_LIMIT,
      upgrade_url: '/upgrade',
      wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
      can_use: used < DAILY_LIMIT
    });
  });

  // Free usage stats (public aggregate)
  app.get('/api/free/stats', (req, res) => {
    const usage = getUsage();
    const day = getDayKey();
    const todayData = usage[day] || {};
    const totalCalls = Object.values(todayData).reduce((a,b) => a + b, 0);
    const uniqueIps = Object.keys(todayData).length;
    res.json({ today_calls: totalCalls, unique_ips: uniqueIps, limit_per_ip: DAILY_LIMIT });
  });

  console.log('[free-tier] Mounted — 3 free AI calls/day/IP, upgrade at /upgrade');
}

module.exports = { mount };
