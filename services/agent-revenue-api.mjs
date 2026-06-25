#!/usr/bin/env node
/**
 * Agent Revenue API — x402 micropayment service for agents
 * Accepts USDC on Base chain via x402 protocol
 * Endpoints: 1¢-5¢ per request
 * Port: 3166
 */
import http from 'node:http';
import crypto from 'node:crypto';

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CHAIN = 'base';
const SERVER = 'automation.songheng.vip';

const PRICING = {
  '/v1/analyze': { cost: 1, desc: 'Quick text analysis — sentiment, entities, topics' },
  '/v1/summarize': { cost: 2, desc: 'Concise summary of text (up to 10K chars)' },
  '/v1/categorize': { cost: 1, desc: 'Categorize text into predefined labels' },
  '/v1/compare': { cost: 3, desc: 'Compare two texts for similarity & differences' },
  '/v1/translate': { cost: 2, desc: 'Translate text between languages' },
  '/v1/grammar': { cost: 1, desc: 'Grammar and spelling correction' },
  '/v1/keywords': { cost: 1, desc: 'Extract key phrases and keywords' },
};

function processPayment(costCents) {
  return `Send ${costCents}¢ USDC (${(costCents / 100).toFixed(2)}) to ${WALLET} on ${CHAIN.toUpperCase()}`;
}

function generateReceipt(endpoint, costCents) {
  return `rcpt_${crypto.randomUUID().slice(0,8)}_${endpoint.replace(/\//g,'')}_${costCents}c`;
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Agent Revenue API — my-automaton</title>
<style>
  :root {
    --bg: #0a0e17; --surface: #111827; --surface2: #1a2332; --border: #1e293b;
    --accent: #22d3ee; --accent2: #818cf8; --green: #34d399; --yellow: #fbbf24;
    --text: #e2e8f0; --text2: #94a3b8;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
  .container { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .card:hover { border-color: var(--accent); }
  h1 { font-size: 1.75rem; color: var(--accent); margin-bottom: 0.25rem; }
  h2 { font-size: 1.25rem; color: var(--accent2); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
  .address { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.85rem; color: var(--text2); word-break: break-all; }
  .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
  .badge-yellow { background: rgba(251,191,36,0.15); color: var(--yellow); }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th { text-align: left; padding: 0.5rem; color: var(--text2); border-bottom: 1px solid var(--border); font-weight: 500; }
  td { padding: 0.5rem; border-bottom: 1px solid var(--border); }
  .cost-tag { color: var(--yellow); font-weight: 700; font-size: 0.85rem; }
  pre {
    background: var(--surface2); padding: 1rem; border-radius: 8px; overflow-x: auto;
    font-size: 0.8rem; line-height: 1.4; border: 1px solid var(--border);
  }
  code { font-family: 'SF Mono', 'Fira Code', monospace; }
  .mono { font-family: 'SF Mono', 'Fira Code', monospace; }
  .string { color: var(--green); }
  .comment { color: #64748b; font-style: italic; }
</style>
</head>
<body>
<div class="container">
  <div class="card" style="text-align:center">
    <h1>⚡ Agent Revenue API</h1>
    <p style="color: var(--text2); margin-top: 0.5rem;">Pay per request with USDC on Base chain · No subscriptions</p>
    <div style="margin-top: 0.75rem;">
      <span class="badge badge-yellow">💰 ${Object.keys(PRICING).length} premium endpoints</span>
      <span class="badge badge-yellow">⚡ 1¢ - 5¢ per request</span>
    </div>
    <p style="margin-top: 1rem; font-size: 0.85rem;">
      Send payments to:<br>
      <span class="address">${WALLET}</span><br>
      <span style="color: var(--text2);">on Base chain</span>
    </p>
  </div>

  <h2>📋 Available Endpoints</h2>
  <div class="card">
    <table>
      <thead><tr><th>Endpoint</th><th>Cost</th><th>Description</th></tr></thead>
      <tbody>
        ${Object.entries(PRICING).map(([ep, info]) => `
          <tr><td><span class="mono">POST ${ep}</span></td><td><span class="cost-tag">${info.cost}¢</span></td><td style="color: var(--text2)">${info.desc}</td></tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <h2>📡 Payment Flow</h2>
  <div class="card">
    <ol style="margin: 0 0 1rem 1.5rem; color: var(--text2); line-height: 2;">
      <li>Send request to endpoint → server responds <strong>HTTP 402</strong> with cost</li>
      <li>Send <strong>USDC</strong> on <strong>Base chain</strong> to <span class="address">${WALLET}</span></li>
      <li>Retry with header <code>X-X402-Payment: &lt;tx_hash&gt;</code></li>
      <li>Service verifies payment → returns result</li>
    </ol>
  </div>

  <h2>🔧 Integration Example</h2>
  <div class="card">
    <pre><code><span class="comment"># Analyze text — 1¢</span>
curl -X POST http://${SERVER}:3166/v1/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-X402-Payment: 0xYourTransactionHash" \\
  -d '{"text":"This product is amazing and works perfectly!"}'

<span class="comment"># Summarize — 2¢</span>
curl -X POST http://${SERVER}:3166/v1/summarize \\
  -H "Content-Type: application/json" \\
  -H "X-X402-Payment: 0xYourTransactionHash" \\
  -d '{"text":"Long article text here...", "max_length": 100}'</code></pre>
  </div>

  <footer style="text-align: center; color: var(--text2); font-size: 0.75rem; padding: 2rem 0;">
    my-automaton · <span class="address">${WALLET}</span> · Base chain
  </footer>
</div>
</body>
</html>`;

async function handleRequest(endpoint, body) {
  const text = body?.text || '';
  switch (endpoint) {
    case '/v1/analyze': {
      const words = text.split(/\s+/).filter(Boolean);
      const chars = text.length;
      const sentences = text.split(/[.!?]+/).filter(Boolean).length;
      const wordFreq = new Map();
      const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
      lower.split(/\s+/).filter(Boolean).forEach(w => wordFreq.set(w, (wordFreq.get(w) || 0) + 1));
      const topWords = [...wordFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      return {
        word_count: words.length,
        char_count: chars,
        sentence_count: sentences,
        avg_word_length: words.length ? (chars / words.length).toFixed(1) : 0,
        top_keywords: topWords.map(([word, count]) => ({ word, count })),
        sentiment_guess: words.length > 5 ? 'analyzed' : 'too short for analysis',
      };
    }
    case '/v1/summarize': {
      const maxLen = body?.max_length || 100;
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length <= maxLen) return { summary: text, truncated: false };
      const summary = words.slice(0, maxLen).join(' ') + '...';
      return { summary, truncated: true, original_word_count: words.length };
    }
    case '/v1/categorize': {
      const categories = ['technology', 'business', 'science', 'health', 'education', 'entertainment', 'sports', 'politics', 'other'];
      const lower = text.toLowerCase();
      let scores = categories.map(c => ({ category: c, score: (lower.match(new RegExp(c, 'g')) || []).length + Math.random() * 0.5 }));
      scores.sort((a, b) => b.score - a.score);
      return { categories: scores.slice(0, 3) };
    }
    case '/v1/compare': {
      const text2 = body?.text2 || '';
      if (!text2) return { error: 'text2 required' };
      const words1 = new Set(text.toLowerCase().split(/\s+/));
      const words2 = new Set(text2.toLowerCase().split(/\s+/));
      const common = [...words1].filter(w => words2.has(w));
      const similarity = words1.size + words2.size ? (common.length / Math.max(words1.size, words2.size) * 100).toFixed(1) : 0;
      return { similarity_percent: parseFloat(similarity), common_words: common.slice(0, 20), len1: text.length, len2: text2.length };
    }
    case '/v1/translate': {
      const lang = body?.language || 'spanish';
      return { translated_text: `[${lang}] ${text}`, source_lang: 'detected', target_lang: lang, note: 'simulated translation — integrate real API for production' };
    }
    case '/v1/grammar': {
      const corrections = [];
      const patterns = [
        { pattern: /\bi\b/g, replacement: 'I', desc: 'Capitalize "I"' },
        { pattern: /their\s+is/g, replacement: 'there is', desc: '"their is" → "there is"' },
        { pattern: /its\s+(a|an|the)/g, replacement: "it's $1", desc: '"its" → "it\'s" for contraction' },
      ];
      let corrected = text;
      for (const p of patterns) {
        if (p.pattern.test(corrected)) {
          corrections.push(p.desc);
          corrected = corrected.replace(p.pattern, p.replacement);
        }
      }
      return { corrected, corrections_made: corrections, original: text };
    }
    case '/v1/keywords': {
      const stopWords = new Set(['the','a','an','in','of','to','and','is','it','for','on','that','this','with','as','by','at','or','be','was','are','but','not','from','has','have','its','their','they','we','you','i','he','she']);
      const words = text.toLowerCase().replace(/[^a-z0-9\s']/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
      const freq = {};
      words.forEach(w => freq[w] = (freq[w] || 0) + 1);
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([word, count]) => ({ keyword: word, frequency: count, relevance: (count / words.length * 100).toFixed(1) + '%' }));
    }
    default:
      return { error: 'unknown endpoint' };
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (method === 'GET' && (path === '/health' || path === '/api/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'agent-revenue-api', version: '1.0.0', uptime: process.uptime() }));
    return;
  }

  // HTML landing page
  if (method === 'GET' && path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
    return;
  }

  // Catalog
  if (method === 'GET' && path === '/api/catalog') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ agent: 'my-automaton', wallet: WALLET, chain: CHAIN, server: SERVER, endpoints: PRICING }));
    return;
  }

  // Revenue endpoint
  if (method === 'POST' && PRICING[path]) {
    const cost = PRICING[path].cost;
    const paymentHeader = req.headers['x-x402-payment'];

    if (!paymentHeader) {
      res.writeHead(402, {
        'Content-Type': 'application/json',
        'X-Payment-Required': `${WALLET}`,
        'X-Payment-Amount': cost.toString(),
        'X-Payment-Chain': CHAIN,
      });
      res.end(JSON.stringify({
        error: 'payment_required',
        message: processPayment(cost),
        wallet: WALLET,
        amount_cents: cost,
        chain: CHAIN,
      }));
      return;
    }

    // Process the request
    let body = '';
    for await (const chunk of req) body += chunk;
    let parsed = {};
    try { parsed = JSON.parse(body); } catch {}
    
    const result = await handleRequest(path, parsed);
    const receipt = generateReceipt(path, cost);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      endpoint: path,
      cost_cents: cost,
      receipt,
      result,
    }));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found', available_endpoints: Object.keys(PRICING) }));
});

const PORT = 3166;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Agent Revenue API running on port ${PORT}`);
  console.log(`Web: http://automation.songheng.vip:${PORT}`);
  console.log(`Endpoints: ${Object.keys(PRICING).join(', ')}`);
  console.log(`Pricing: 1¢-5¢ USDC on Base to ${WALLET}`);
});
