#!/usr/bin/env node
/**
 * x402 Simple Server — Zero-dependency x402 revenue service
 * 
 * USDC payment endpoint on Base chain
 * Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113
 * 
 * Endpoints:
 *   GET  /         → Service info
 *   POST /v1/analyze → x402: 1¢ for text analysis
 *   POST /v1/summarize → x402: 2¢ summarization
 */

import http from 'node:http';
import crypto from 'node:crypto';

const PORT = parseInt(process.env.PORT || '4000', 10);
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CHAIN = 'base';

// Price catalog — costs in USDC cents
const PRICES = {
  '/v1/analyze': 1,     // 1 cent
  '/v1/summarize': 2,   // 2 cents
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment, X-Request-Id');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // GET / — Service info
  if (req.method === 'GET' && path === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'my-automaton x402 Gateway',
      version: '1.0.0',
      wallet: WALLET,
      chain: CHAIN,
      endpoints: Object.entries(PRICES).map(([ep, cost]) => ({
        path: ep,
        method: 'POST',
        cost_usd_cents: cost,
        description: ep === '/v1/analyze' ? 'Deep text analysis' : 'AI text summarization',
        payment: {
          type: 'x402',
          chain: CHAIN,
          token: 'USDC',
          to: WALLET,
          amount_usd: `$${(cost / 100).toFixed(2)}`
        }
      })),
      referral: {
        commission: '20% for 30 days',
        register: 'POST http://automation.songheng.vip:3150/api/referral/register'
      }
    }));
    return;
  }

  // POST endpoints
  if (req.method === 'POST' && (path === '/v1/analyze' || path === '/v1/summarize')) {
    const costCents = PRICES[path];
    if (!costCents) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Unknown endpoint' }));
      return;
    }

    const paymentHeader = req.headers['x-x402-payment'];
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();

    if (!paymentHeader) {
      // HTTP 402 — Payment Required
      res.writeHead(402, {
        'Content-Type': 'application/json',
        'X-Payment-Required': `${costCents}`,
        'X-Payment-Wallet': WALLET,
        'X-Payment-Chain': CHAIN,
        'X-Payment-Token': 'USDC',
        'X-Request-Id': requestId,
      });
      res.end(JSON.stringify({
        error: 'payment_required',
        message: `Send $${(costCents / 100).toFixed(2)} USDC on ${CHAIN} to ${WALLET}`,
        payment: {
          chain: CHAIN,
          token: 'USDC',
          to: WALLET,
          amount_usd_cents: costCents,
          amount_usd: `$${(costCents / 100).toFixed(2)}`
        },
        instructions: `Send exact amount to ${WALLET} on Base chain, then retry with X-X402-Payment: <tx_hash>`,
        request_id: requestId
      }));
      return;
    }

    // Payment provided — process the request
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const text = data.text || '';
        
        if (!text) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing text field' }));
          return;
        }

        let result;
        if (path === '/v1/analyze') {
          result = analyzeText(text);
        } else {
          result = summarizeText(text);
        }

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
          'X-Payment-Received': paymentHeader
        });
        res.end(JSON.stringify({
          success: true,
          result,
          payment: { tx_hash: paymentHeader, amount_usd_cents: costCents },
          request_id: requestId
        }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
    return;
  }

  // 404 fallback
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found', available: Object.keys(PRICES).map(p => `POST ${p}`) }));
});

// Text analysis (simple heuristic-based for zero AI cost)
function analyzeText(text) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const chars = text.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const wordFreq = {};
  words.forEach(w => {
    const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean) wordFreq[clean] = (wordFreq[clean] || 0) + 1;
  });
  
  // Top words
  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  // Reading time
  const wpm = 200;
  const readingTimeMinutes = (words.length / wpm);
  const readingTimeSeconds = Math.round(readingTimeMinutes * 60);

  // Sentiment (basic)
  const positiveWords = ['good','great','excellent','amazing','wonderful','fantastic','love','beautiful','happy','best','success','innovative','powerful'];
  const negativeWords = ['bad','terrible','awful','horrible','hate','ugly','worst','failure','poor','broken','wrong','damage','crisis'];
  let positive = 0, negative = 0;
  words.forEach(w => {
    const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (positiveWords.includes(clean)) positive++;
    if (negativeWords.includes(clean)) negative++;
  });
  const sentiment = positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral';
  const sentimentScore = words.length > 0 ? ((positive - negative) / words.length) * 10 : 0;

  return {
    word_count: words.length,
    character_count: chars,
    sentence_count: sentences.length,
    avg_word_length: words.length > 0 ? (chars / words.length).toFixed(1) : 0,
    reading_time: `${readingTimeSeconds}s (${readingTimeMinutes.toFixed(1)} min)`,
    top_words: topWords,
    sentiment: {
      score: Math.round(sentimentScore * 100) / 100,
      label: sentiment,
      positive_word_count: positive,
      negative_word_count: negative
    },
    complexity: words.length > 50 ? 'detailed' : words.length > 20 ? 'moderate' : 'brief',
    estimated_tokens: Math.ceil(chars / 4)
  };
}

// Summarization (extractive: first 2 sentences + keyword extraction)
function summarizeText(text) {
  const sentences = text.split(/[.!?]+\s*/).filter(s => s.trim().length > 10);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  // Extract key phrases (capitalized multi-word sequences)
  const wordFreq = {};
  words.forEach(w => {
    const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean && clean.length > 3) wordFreq[clean] = (wordFreq[clean] || 0) + 1;
  });

  const keyPhrases = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  // Extractive summary: first 2-3 sentences
  const summarySentences = sentences.slice(0, Math.min(3, sentences.length));
  const summary = summarySentences.join('. ') + (summarySentences.length > 0 ? '.' : '');

  return {
    summary: summary || text.slice(0, 200) + '...',
    key_topics: keyPhrases,
    total_sentences: sentences.length,
    compression_ratio: summary.length > 0 ? ((1 - summary.length / text.length) * 100).toFixed(1) + '%' : '0%',
    original_length: text.length,
    summary_length: summary.length
  };
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 x402 Simple Server running on port ${PORT}`);
  console.log(`💰 Wallet: ${WALLET} (${CHAIN})`);
  console.log(`📋 Endpoints:`);
  Object.entries(PRICES).forEach(([ep, cost]) => {
    console.log(`   POST ${ep} — $${(cost/100).toFixed(2)} USDC`);
  });
  console.log(`🌐 http://automation.songheng.vip:${PORT}`);
});
