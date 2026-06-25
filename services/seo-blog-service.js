// seo-blog-service.js — AI-powered SEO blog post generator
// Premium service: 50¢ USDC per post, 3 free/day per IP
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

function getDeepSeekKey() {
  return process.env.DEEPSEEK_API_KEY || '';
}

async function generateBlog(topic, keywords, tone, targetAudience, wordCount) {
  const key = getDeepSeekKey();
  if (!key) return { error: 'DeepSeek API key not configured' };

  const prompt = `Generate a complete SEO-optimized blog post in HTML format.

Topic: ${topic}
Keywords: ${keywords || 'none specified'}
Tone: ${tone || 'professional'}
Target Audience: ${targetAudience || 'general'}
Target Length: ${wordCount || 800}-${(wordCount || 800) + 400} words

Include:
1. SEO-optimized title with primary keyword
2. Meta description (150-160 chars)
3. Introduction paragraph with keyword
4. 4-6 subheadings with secondary keywords
5. Body content with actionable insights
6. FAQ section with JSON-LD structured data
7. Internal linking suggestions (2-3)
8. Conclusion with call-to-action

Return ONLY valid JSON with keys: title, metaDescription, htmlContent, faqSchema (JSON-LD string), suggestedInternalLinks, wordCount`;

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
          { role: 'system', content: 'You are an expert SEO content writer. Return only valid JSON. No markdown wrapping.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }),
      signal: AbortSignal.timeout(30000)
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[SEO-BLOG] DeepSeek API error:', err.message);
    return { error: 'Failed to generate blog: ' + err.message };
  }
}

function mount(app) {
  // POST /v1/seo-blog — generate SEO blog post
  app.post('/v1/seo-blog', async (req, res) => {
    const ip = getClientIP(req);
    const isFree = checkFreeTier(ip);
    const { topic, keywords, tone, targetAudience, wordCount } = req.body || {};

    if (!topic) {
      return res.status(400).json({ error: 'Missing required field: topic' });
    }

    const result = await generateBlog(topic, keywords, tone, targetAudience, wordCount);

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    if (!isFree) {
      return res.status(402).json({
        error: 'Payment required',
        message: 'Free tier exhausted (3/day). Send 50¢ USDC on Base chain to continue.',
        payment: {
          address: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
          chain: 'base',
          token: 'USDC',
          amount_cents: 50,
          amount_human: '0.50'
        },
        preview: { title: result.title, metaDescription: result.metaDescription, wordCount: result.wordCount }
      });
    }

    res.json({
      status: 'success',
      tier: 'free',
      remaining_free: 2 - (freeUsage.get(ip) || 0),
      ...result
    });
  });

  // POST /v1/seo-blog/paid — explicit paid endpoint (no free tier)
  app.post('/v1/seo-blog/paid', async (req, res) => {
    const paymentHeader = req.headers['x-x402-payment'];
    const { topic, keywords, tone, targetAudience, wordCount } = req.body || {};

    if (!topic) {
      return res.status(400).json({ error: 'Missing required field: topic' });
    }

    if (!paymentHeader) {
      return res.status(402).json({
        error: 'Payment required',
        payment: {
          address: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
          chain: 'base',
          token: 'USDC',
          amount_cents: 50,
          amount_human: '0.50'
        }
      });
    }

    const result = await generateBlog(topic, keywords, tone, targetAudience, wordCount);
    if (result.error) return res.status(500).json({ error: result.error });

    res.json({ status: 'success', tier: 'paid', tx_hash: paymentHeader, ...result });
  });

  // Health check
  app.get('/v1/seo-blog/health', (req, res) => {
    res.json({ status: 'ok', service: 'seo-blog', pricing: '50¢ USDC/post', free_tier: '3/day' });
  });

  console.log('[SEO-BLOG] Service mounted: /v1/seo-blog (50¢ USDC)');
}

module.exports = { mount };
