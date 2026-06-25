// seo-meta-service.js — AI-powered meta tag generator
// Premium service: 10¢ USDC per generation, 3 free/day per IP
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

async function generateMetaTags(title, description, keywords, url, imageUrl, siteName) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return { error: 'DeepSeek API key not configured' };

  const prompt = `Generate complete meta tags for a web page.

Title: ${title}
Description: ${description || 'No description provided'}
Keywords: ${keywords || 'none'}
URL: ${url || 'https://example.com'}
Image URL: ${imageUrl || ''}
Site Name: ${siteName || 'my-automaton'}

Generate:
1. Standard HTML meta tags (title, description, keywords, robots, viewport)
2. Open Graph tags (og:title, og:description, og:url, og:image, og:type, og:site_name)
3. Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image)
4. JSON-LD structured data (WebPage schema)
5. Canonical URL tag

Return ONLY valid JSON with keys: htmlMetaTags (string of all HTML tags), openGraph (object), twitterCard (object), jsonLd (string), canonical (string)`;

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
          { role: 'system', content: 'You are an SEO meta tag expert. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
      signal: AbortSignal.timeout(20000)
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[SEO-META] Error:', err.message);
    return { error: 'Failed to generate meta tags: ' + err.message };
  }
}

function mount(app) {
  // POST /v1/seo-meta — generate meta tags
  app.post('/v1/seo-meta', async (req, res) => {
    const ip = getClientIP(req);
    const isFree = checkFreeTier(ip);
    const { title, description, keywords, url, imageUrl, siteName } = req.body || {};

    if (!title) {
      return res.status(400).json({ error: 'Missing required field: title' });
    }

    const result = await generateMetaTags(title, description, keywords, url, imageUrl, siteName);

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
          amount_cents: 10,
          amount_human: '0.10'
        },
        preview: { openGraph: result.openGraph, twitterCard: result.twitterCard }
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
  app.get('/v1/seo-meta/health', (req, res) => {
    res.json({ status: 'ok', service: 'seo-meta', pricing: '10¢ USDC/gen', free_tier: '3/day' });
  });

  console.log('[SEO-META] Service mounted: /v1/seo-meta (10¢ USDC)');
}

module.exports = { mount };
