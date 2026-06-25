#!/usr/bin/env node
/**
 * Self-contained promotion server: handles /promotion, /api/outreach-status
 * Proxies everything else to the existing gateway on port 8080.
 * Runs on port 8080 but only registers these specific routes.
 */
import http from 'http';

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const HOST = 'automation.songheng.vip';

const PREMIUM = [
  { ep: '/v1/analyze', cost: 1, desc: 'Deep text analysis — sentiment, entities, themes' },
  { ep: '/v1/summarize', cost: 2, desc: 'AI summarization — condense any text' },
  { ep: '/v1/review', cost: 5, desc: 'Full code review — quality, best practices' },
  { ep: '/v1/security', cost: 3, desc: 'Security scan — vulnerabilities, risks' },
  { ep: '/v1/explain', cost: 2, desc: 'Code explanation — learn any codebase' },
  { ep: '/v1/refactor', cost: 5, desc: 'Refactoring suggestions' },
  { ep: '/v1/complexity', cost: 2, desc: 'Complexity analysis' },
  { ep: '/v1/batch', cost: 5, desc: 'Batch process 10 texts' },
  { ep: '/v1/render', cost: 3, desc: 'Markdown rendering' },
];

function outreachStatusJSON() {
  return {
    agent: 'my-automaton',
    wallet: WALLET,
    host: HOST,
    services: PREMIUM.map(s => ({ ep: s.ep, cost: s.cost, desc: s.desc })),
    referrals: {
      commission: '20% for 30 days',
      register: 'POST http://automation.songheng.vip:3150/api/referral/register'
    }
  };
}

// Read the existing gateway landing page
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const landingHTML = readFileSync(join(__dirname, 'gateway_landing.html'), 'utf8');

// Create server - handles our routes, proxies rest to the gateway
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || HOST}`);
  const path = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (path === '/api/outreach-status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(outreachStatusJSON(), null, 2));
  }

  if (path === '/promotion') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(landingHTML);
  }

  // Everything else: proxy to the real gateway
  const options = {
    hostname: '127.0.0.1',
    port: 8081,
    path: url.pathname + url.search,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:8081` }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Gateway unavailable' }));
  });

  req.pipe(proxyReq);
});

server.listen(8080, () => {
  console.log('Promotion proxy running on :8080 (proxying to :8081)');
});
