// content-marketing-service.js — AI-powered content marketing & distribution
// Premium service: 25¢ USDC per campaign, 3 free/day per IP
// Uses native fetch() - no axios dependency

const freeUsage = new Map();
let lastReset = Date.now();

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
}

function checkFreeTier(ip) {
  const now = Date.now();
  if (now - lastReset > 86400000) { freeUsage.clear(); lastReset = now; }
  const count = freeUsage.get(ip) || 0;
  if (count < 3) { freeUsage.set(ip, count + 1); return true; }
  return false;
}

async function generateStrategy(topic, goal, channels, audience, budget) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return { error: 'DeepSeek API key not configured' };

  const prompt = `Generate a content marketing strategy for:

Topic: ${topic}
Goal: ${goal || 'brand awareness'}
Target Channels: ${channels || 'blog, social media, email'}
Target Audience: ${audience || 'general'}
Budget: ${budget || 'minimal'}

Include:
1. Executive summary
2. Content pillars (3-5 main topics)
3. Channel-by-channel distribution plan
4. Content calendar outline (4 weeks)
5. KPI targets and measurement framework
6. Budget allocation recommendations
7. Risk assessment

Return ONLY valid JSON with keys: executiveSummary, contentPillars (array), channelPlan (object with channels), contentCalendar (array of week plans), kpis (array), budgetAllocation (object), risks (array)`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a content marketing strategist. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 3000
      }),
      signal: AbortSignal.timeout(25000)
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[CONTENT-MARKETING] Error:', err.message);
    return { error: 'Failed to generate strategy: ' + err.message };
  }
}

function mount(app) {
  // POST /v1/content-marketing — generate strategy
  app.post('/v1/content-marketing', async (req, res) => {
    const ip = getClientIP(req);
    const isFree = checkFreeTier(ip);
    const { topic, goal, channels, audience, budget } = req.body || {};

    if (!topic) {
      return res.status(400).json({ error: 'Missing required field: topic' });
    }

    const result = await generateStrategy(topic, goal, channels, audience, budget);

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    if (!isFree) {
      return res.status(402).json({
        error: 'Payment required',
        payment: {
          address: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
          chain: 'base',
          token: 'USDC',
          amount_cents: 25,
          amount_human: '0.25'
        },
        preview: { executiveSummary: result.executiveSummary?.substring(0, 200) + '...' }
      });
    }

    res.json({
      status: 'success',
      tier: 'free',
      remaining_free: 2 - (freeUsage.get(ip) || 0),
      ...result
    });
  });

  // Health check
  app.get('/v1/content-marketing/health', (req, res) => {
    res.json({ status: 'ok', service: 'content-marketing', pricing: '25¢ USDC/strategy', free_tier: '3/day' });
  });

  console.log('[CONTENT-MARKETING] Service mounted: /v1/content-marketing (25¢ USDC)');
}

module.exports = { mount };
