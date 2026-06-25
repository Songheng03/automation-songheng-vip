#!/usr/bin/env node
/**
 * SEO Content Brief Generator — x402 paid service
 * Cost: 2¢ per brief via USDC on Base
 * Generates: keyword research, outline, title tags, meta description, FAQ schema
 */
const http = require('http');

const PORT = 3094;
const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

// In-memory rate limiting (3 free/day per IP)
const freeQuota = new Map();

function getFreeRemaining(ip) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${ip}:${today}`;
  const used = freeQuota.get(key) || 0;
  return Math.max(0, 3 - used);
}

function useFreeSlot(ip) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${ip}:${today}`;
  freeQuota.set(key, (freeQuota.get(key) || 0) + 1);
}

function generateBrief(keyword, competitors) {
  const prompt = `You are an SEO content strategist. Generate a comprehensive content brief for the keyword "${keyword}".
${competitors ? `Analyze these competitors: ${competitors}` : ''}

Output a JSON with:
{
  "keyword": "${keyword}",
  "searchIntent": "informational|commercial|transactional|navigational",
  "titleTag": "SEO-optimized title tag (max 70 chars)",
  "metaDescription": "SEO meta description (max 165 chars)",
  "h1": "Main heading",
  "outline": ["section1", "section2", "..."],
  "wordCount": 1500,
  "keyQuestions": ["question1", "question2"],
  "relatedKeywords": ["kw1", "kw2"],
  "internalLinks": [],
  "faqSchema": [{"question": "Q", "answer": "A"}]
}

Respond with ONLY the JSON object, no markdown, no explanation.`;

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const https = require('https');
    const parsed = new URL(API_URL);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.message?.content || '';
          const json = JSON.parse(content.replace(/```json\s*/g, '').replace(/```/g, ''));
          resolve(json);
        } catch (e) {
          reject(new Error(`Parse failed: ${e.message}. Raw: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment, X-Forwarded-For');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  // GET /health
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'content-brief', port: PORT }));
    return;
  }

  // POST /api/brief
  if (req.method === 'POST' && req.url === '/api/brief') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { keyword, competitors } = data;

        if (!keyword || keyword.length < 2) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Keyword is required (min 2 chars)' }));
          return;
        }

        // Check payment or free quota
        const payment = req.headers['x-x402-payment'];
        const freeRemaining = getFreeRemaining(ip);

        if (!payment && freeRemaining <= 0) {
          res.writeHead(402, {
            'Content-Type': 'application/json',
            'X-Payment-Required': 'true',
            'X-Payment-Cost': '0.02',
            'X-Payment-Receipient': '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
            'X-Payment-Chain': 'base',
            'X-Payment-Token': 'USDC',
            'X-Free-Quota': '3',
            'X-Free-Remaining': '0',
          });
          res.end(JSON.stringify({
            error: 'Payment required',
            cost: '0.02 USDC',
            wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
            chain: 'Base',
            free_remaining: 0,
            message: 'Free quota exceeded. Send 0.02 USDC to the wallet above and retry with X-X402-Payment header containing your transaction hash.',
          }));
          return;
        }

        // Deduct free slot or verify payment (payment verification is stub for now)
        if (!payment) {
          useFreeSlot(ip);
        }

        // Generate the brief
        console.log(`[ContentBrief] Generating brief for "${keyword}" (IP: ${ip}, paid: ${!!payment})`);
        const brief = await generateBrief(keyword, competitors);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ...brief,
          _meta: {
            paid: !!payment,
            free_remaining: payment ? 0 : getFreeRemaining(ip),
            generated_at: new Date().toISOString(),
          }
        }));
      } catch (e) {
        console.error(`[ContentBrief] Error: ${e.message}`);
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // GET /api/quota (check remaining free requests)
  if (req.method === 'GET' && req.url === '/api/quota') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      free_remaining: getFreeRemaining(ip),
      free_total: 3,
      paid_cost: '0.02 USDC',
      wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[ContentBrief] Service running on port ${PORT}`);
  console.log(`[ContentBrief] POST /api/brief — generate content brief (2¢ via x402)`);
  console.log(`[ContentBrief] GET  /api/quota — check free quota`);
  console.log(`[ContentBrief] GET  /health — health check`);
});
