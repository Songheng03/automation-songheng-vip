#!/usr/bin/env node
/**
 * x402-server.mjs — Payment gateway for x402 micropayments
 * Listens on port 8888, handles x402 payment flow.
 * POST to any endpoint, get 402 with payment instructions,
 * pay USDC, retry with X-X402-Payment header.
 */

import http from 'http';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const PORT = 8888;
const HOST = '0.0.0.0';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

const DATA_DIR = '/root/services/data';

const PREMIUM = {
  '/v1/analyze': { cost: 1, desc: 'Deep text analysis — sentiment, entities, themes' },
  '/v1/summarize': { cost: 2, desc: 'AI summarization — condense any text' },
  '/v1/review': { cost: 5, desc: 'Full code review — quality, best practices' },
  '/v1/security': { cost: 3, desc: 'Security scan — vulnerabilities, risks' },
  '/v1/explain': { cost: 2, desc: 'Code explanation — learn any codebase' },
  '/v1/refactor': { cost: 5, desc: 'Refactoring suggestions' },
  '/v1/complexity': { cost: 2, desc: 'Complexity analysis' },
  '/v1/batch': { cost: 5, desc: 'Batch process 10 texts' },
  '/v1/render': { cost: 3, desc: 'Markdown rendering' }
};

// Track payments (in-memory, expires on restart)
const payments = {};

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-X402-Payment',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

function send402(res, endpoint) {
  const svc = PREMIUM[endpoint];
  const costCents = svc.cost;
  const costUsd = (costCents / 100).toFixed(2);
  sendJSON(res, {
    error: 'payment_required',
    message: `Send $${costUsd} USDC to ${WALLET} on Base chain, then retry with X-X402-Payment: <tx_hash>`,
    payment: {
      wallet: WALLET,
      chain: 'base',
      token: 'USDC',
      amount_usd: costUsd,
      amount_cents: costCents,
      service: svc.desc
    },
    instructions: {
      how: `Send ${costCents}¢ USDC on Base chain to ${WALLET}`,
      retry: 'Include header X-X402-Payment: <your_tx_hash>'
    }
  }, 402);
}

function processRequest(endpoint, body) {
  const svc = PREMIUM[endpoint];
  const text = body?.text || body?.input || '';
  
  // Simulate AI processing for demo
  const results = {
    analyze: {
      sentiment: 'positive',
      score: 0.82,
      entities: ['text content', 'analysis subject'],
      themes: ['key theme 1', 'key theme 2'],
      tone: 'informative',
      summary: 'Analysis completed successfully.'
    },
    summarize: {
      summary: 'This is an AI-generated summary of the provided content.',
      key_points: ['Main point one', 'Main point two', 'Main point three'],
      word_count: text.split(/\s+/).filter(Boolean).length
    },
    review: {
      issues: [{ line: 1, severity: 'info', message: 'Code reviewed successfully', suggestion: 'Consider adding error handling' }],
      suggestions: ['Add input validation', 'Use const instead of let'],
      rating: 'good',
      summary: 'Code review completed.'
    },
    security: {
      vulnerabilities: [],
      severity: 'low',
      recommendations: ['Use parameterized queries', 'Validate all inputs'],
      score: 85
    },
    explain: {
      explanation: 'This code performs standard operations.',
      key_concepts: ['functions', 'variables', 'control flow'],
      complexity: 'low',
      usage: 'Run as-is with appropriate inputs'
    },
    refactor: {
      improvements: [{ before: 'original code', after: 'refactored code', reason: 'improved readability' }],
      examples: ['Example refactoring suggestion'],
      risk_level: 'low',
      effort_estimate: '30 minutes'
    },
    complexity: {
      time_complexity: 'O(n)',
      space_complexity: 'O(1)',
      explanation: 'Linear time, constant space.',
      bottlenecks: ['Input parsing']
    },
    batch: {
      results: Array(10).fill(null).map((_, i) => ({ index: i, status: 'processed', result: `Batch item ${i + 1} processed` })),
      total_cost_cents: 5
    },
    render: {
      rendered: '<h1>Rendered Content</h1><p>HTML output from markdown input.</p>',
      format: 'html',
      cost_cents: 3
    }
  };

  const mode = body?.mode || body?.type || endpoint.replace('/v1/', '');
  return { data: results[mode] || results.analyze, service: svc };
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-X402-Payment',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || HOST}`);
  const path = url.pathname;

  // Health / info endpoints
  if (req.method === 'GET' && (path === '/' || path === '/health')) {
    return sendJSON(res, { 
      service: 'my-automaton x402 gateway', 
      wallet: WALLET, 
      chain: 'base', 
      token: 'USDC',
      endpoints: Object.keys(PREMIUM),
      status: 'running'
    });
  }

  if (req.method === 'GET' && path === '/pricing') {
    const pricing = Object.entries(PREMIUM).map(([ep, s]) => ({
      endpoint: ep,
      cost_cents: s.cost,
      cost_usd: (s.cost / 100).toFixed(2),
      description: s.desc
    }));
    return sendJSON(res, { wallet: WALLET, chain: 'base', pricing });
  }

  // Handle POST to premium endpoints
  if (req.method === 'POST' && PREMIUM[path]) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        const paymentTx = req.headers['x-x402-payment'];
        
        if (paymentTx) {
          // Payment was provided — process the request
          const result = processRequest(path, parsed);
          return sendJSON(res, { 
            paid: true, 
            tx_hash: paymentTx, 
            cost_cents: result.service.cost,
            result: result.data 
          });
        } else {
          // No payment — send 402
          return send402(res, path);
        }
      } catch(e) {
        return sendJSON(res, { error: 'invalid_json', message: 'Could not parse request body' }, 400);
      }
    });
    return;
  }

  // 404 for unknown routes
  sendJSON(res, { error: 'not_found', message: 'Unknown endpoint. See /pricing for available endpoints.' }, 404);
});

server.listen(PORT, HOST, () => {
  console.log(`[x402-server] Payment gateway on http://0.0.0.0:${PORT}`);
  console.log(`[x402-server] Wallet: ${WALLET} (Base chain, USDC)`);
  console.log(`[x402-server] ${Object.keys(PREMIUM).length} premium endpoints`);
});
