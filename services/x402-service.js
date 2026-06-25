// x402-service.js — x402 micropayment gateway handler
// Mounts POST /v1/:endpoint routes with 402 payment flow
// All services use DeepSeek API for inference
// Deployment: require('./services/x402-service.js').mount(app)

const crypto = require('crypto');

// Pricing (in USDC cents)
const PRICING = {
  analyze: 1, summarize: 2, review: 5, security: 3,
  explain: 2, refactor: 5, complexity: 2, batch: 5, render: 3
};

// Wallet address for Base chain USDC
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

// Free daily usage tracker (3 free per IP per endpoint)
const freeUsage = new Map(); // key: "IP:endpoint:YYYY-MM-DD" -> count

function getFreeKey(ip, endpoint) {
  const date = new Date().toISOString().slice(0,10);
  return `${ip}:${endpoint}:${date}`;
}

function checkFree(ip, endpoint) {
  const key = getFreeKey(ip, endpoint);
  const count = freeUsage.get(key) || 0;
  if (count < 3) {
    freeUsage.set(key, count + 1);
    return true;
  }
  return false;
}

// DeepSeek inference call via OpenRouter
async function callDeepSeek(systemPrompt, userMessage) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://automation.songheng.vip',
      'X-Title': 'my-automaton'
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 4096,
      temperature: 0.3
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// Service handlers - each receives (body) and returns { result }
const HANDLERS = {
  analyze: async (body) => {
    const text = body.text || body.content || '';
    const mode = body.mode || 'general';
    const result = await callDeepSeek(
      'You are a professional text analyst. Analyze the following text thoroughly.',
      `Mode: ${mode}\n\nText:\n${text.slice(0, 8000)}`
    );
    return { result, wordCount: text.split(/\s+/).length };
  },

  summarize: async (body) => {
    const text = body.text || body.content || '';
    const maxLength = body.maxLength || 200;
    const result = await callDeepSeek(
      'You are a professional summarizer. Provide a concise summary.',
      `Summarize in ${maxLength} words or fewer:\n\n${text.slice(0, 10000)}`
    );
    return { result, originalLength: text.length };
  },

  review: async (body) => {
    const code = body.code || body.content || '';
    const language = body.language || 'auto';
    const result = await callDeepSeek(
      'You are a senior software engineer doing code review. Be thorough but constructive.',
      `Language: ${language}\n\nCode to review:\n\`\`\`\n${code.slice(0, 12000)}\n\`\`\``
    );
    return { result, language };
  },

  security: async (body) => {
    const code = body.code || body.content || '';
    const result = await callDeepSeek(
      'You are a security engineer. Find ALL vulnerabilities and suggest fixes. Be specific.',
      `Scan this code for security issues:\n\`\`\`\n${code.slice(0, 12000)}\n\`\`\``
    );
    return { result };
  },

  explain: async (body) => {
    const code = body.code || body.content || '';
    const detail = body.detail || 'intermediate';
    const result = await callDeepSeek(
      'You are a patient programming teacher. Explain code clearly.',
      `Detail level: ${detail}\n\nExplain this code:\n\`\`\`\n${code.slice(0, 8000)}\n\`\`\``
    );
    return { result };
  },

  refactor: async (body) => {
    const code = body.code || body.content || '';
    const target = body.target || 'readability';
    const result = await callDeepSeek(
      'You are a senior software architect. Suggest refactoring improvements with code examples.',
      `Focus: ${target}\n\nRefactor this code:\n\`\`\`\n${code.slice(0, 10000)}\n\`\`\``
    );
    return { result };
  },

  complexity: async (body) => {
    const code = body.code || body.content || '';
    const result = await callDeepSeek(
      'You are a code complexity analyst. Analyze time complexity, space complexity, and suggest optimizations.',
      `Analyze this code's complexity:\n\`\`\`\n${code.slice(0, 8000)}\n\`\`\``
    );
    return { result };
  },

  batch: async (body) => {
    const items = body.items || body.texts || [];
    if (!Array.isArray(items) || items.length > 10) {
      throw new Error('Batch requires array of up to 10 items');
    }
    const results = await Promise.all(items.slice(0, 10).map(async (item) => {
      const r = await callDeepSeek(
        'Summarize the following text briefly.',
        item.slice(0, 2000)
      );
      return r;
    }));
    return { results, count: results.length };
  },

  render: async (body) => {
    const markdown = body.markdown || body.content || '';
    const template = body.template || 'default';
    const result = await callDeepSeek(
      'You convert markdown to formatted HTML. Return ONLY clean HTML, no markdown fences.',
      `Template: ${template}\n\nConvert to HTML:\n${markdown.slice(0, 8000)}`
    );
    return { result, format: 'html' };
  }
};

// Mount function
function mount(app) {
  const endpoints = Object.keys(HANDLERS);

  // Handle x402 payment verification (mock for now)
  app.post('/api/x402/verify', (req, res) => {
    const { endpoint, txHash, amount } = req.body || {};
    // In production: verify on-chain tx on Base
    // For now: mock verification (local mode)
    res.json({
      verified: true,
      endpoint,
      amount,
      wallet: WALLET,
      note: 'Payment verification (mock — local mode)'
    });
  });

  // Register all premium endpoints
  endpoints.forEach(endpoint => {
    const cost = PRICING[endpoint];
    
    // POST /v1/:endpoint — paid endpoint
    app.post(`/v1/${endpoint}`, async (req, res) => {
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      
      try {
        // Check for x402 payment header
        const paymentHeader = req.headers['x-x402-payment'];
        const paid = paymentHeader && paymentHeader.length > 10;
        
        // Free tier: 3 per day
        const isFree = !paid && checkFree(clientIP, endpoint);
        
        if (!paid && !isFree) {
          // Request payment — HTTP 402
          return res.status(402).json({
            error: 'payment_required',
            message: `Send ${cost}¢ USDC on Base chain to ${WALLET} then retry with X-X402-Payment header`,
            wallet: WALLET,
            chain: 'base',
            currency: 'USDC',
            amountCents: cost,
            endpoint: `/v1/${endpoint}`,
            free: { remaining: 0, resets: 'daily' }
          });
        }

        if (isFree) {
          console.log(`[x402] FREE ${endpoint} from ${clientIP}`);
        } else {
          console.log(`[x402] PAID ${endpoint} from ${clientIP} tx:${paymentHeader.slice(0, 20)}...`);
        }

        // Execute the handler
        const result = await HANDLERS[endpoint](req.body);
        
        res.json({
          success: true,
          endpoint,
          paid: !!paid,
          free: isFree,
          cost: isFree ? 0 : cost,
          ...result,
          _meta: {
            wallet: WALLET,
            chain: 'base',
            currency: 'USDC',
            timestamp: new Date().toISOString()
          }
        });
      } catch (err) {
        console.error(`[x402] Error ${endpoint}:`, err.message);
        res.status(500).json({ error: err.message, endpoint });
      }
    });

    // GET /v1/:endpoint — pricing info
    app.get(`/v1/${endpoint}`, (req, res) => {
      res.json({
        endpoint: `/v1/${endpoint}`,
        description: HANDLERS[endpoint] ? 'AI-powered text/code processing' : 'unknown',
        cost: `${cost}¢ USDC`,
        wallet: WALLET,
        chain: 'base',
        currency: 'USDC',
        freeTier: '3 free/day per IP',
        method: 'POST',
        example: `/v1/${endpoint} { "text": "your content here" }`
      });
    });
  });

  // Stats endpoint
  app.get('/api/stats/overview', (req, res) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    
    // Count today's free usage
    let todayFree = 0;
    for (const [key, count] of freeUsage) {
      if (key.includes(today)) todayFree += count;
    }
    
    res.json({
      endpoints: endpoints.length,
      pricing: PRICING,
      wallet: WALLET,
      todayFreeRequests: todayFree,
      time: now.toISOString(),
      status: 'active'
    });
  });

  console.log(`[x402] Mounted ${endpoints.length} paid endpoints`);
  console.log(`[x402] Wallet: ${WALLET} (Base - USDC)`);
}

module.exports = { mount, PRICING, WALLET };
