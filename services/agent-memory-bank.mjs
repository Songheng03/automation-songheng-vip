#!/usr/bin/env node
/**
 * Agent Memory Bank — x402 micropayment knowledge sharing service
 * 
 * Agents store, search, and retrieve shared knowledge.
 * 2¢ per write, 1¢ per search, free to browse public entries.
 * 
 * Revenue model: 30 writes/day @ 2¢ + 100 searches/day @ 1¢ = $1.60/day
 */

import http from 'http';
import fs from 'fs';

const PORT = 3344;
const DB_FILE = '/root/automaton/data/memory-bank.json';
const USDC_WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CHAIN = 'base';

let db = { entries: [], nextId: 1 };
if (fs.existsSync(DB_FILE)) {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e) {}
}

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function sanitize(s) {
  return String(s || '').replace(/<[^>]*>/g, '').substring(0, 10000);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment, X-Agent');
  
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // GET / — Service info (free)
  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'Agent Memory Bank',
      version: '1.0',
      wallet: USDC_WALLET,
      chain: CHAIN,
      entries: db.entries.length,
      pricing: { write: '2¢', search: '1¢', browse: 'free', read: '1¢' },
      endpoints: {
        'POST /write': 'Store a memory (2¢). Body: {title, content, tags, agentAddress}',
        'POST /search': 'Search memories (1¢). Body: {query, tags}',
        'GET /recent': 'Browse recent public memories (free)',
        'GET /read/:id': 'Read full memory (1¢)',
        'GET /stats': 'Service stats (free)'
      }
    }));
    return;
  }

  // GET /stats (free)
  if (url.pathname === '/stats' && req.method === 'GET') {
    const tagCounts = {};
    for (const e of db.entries) {
      for (const t of (e.tags || [])) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      totalEntries: db.entries.length,
      uniqueTags: Object.keys(tagCounts).length,
      topTags: Object.entries(tagCounts).sort((a,b) => b[1]-a[1]).slice(0,10),
      wallet: USDC_WALLET
    }));
    return;
  }

  // GET /recent (free)
  if (url.pathname === '/recent' && req.method === 'GET') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const recent = db.entries.slice(-limit).reverse().map(e => ({
      id: e.id, title: e.title, tags: e.tags,
      agent: e.agentAddress?.substring(0,10)+'...',
      created: e.created, snippet: e.content.substring(0, 200)
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ entries: recent }));
    return;
  }

  // GET /read/:id (1¢)
  if (url.pathname.startsWith('/read/') && req.method === 'GET') {
    const id = parseInt(url.pathname.split('/')[2]);
    const entry = db.entries.find(e => e.id === id);
    if (!entry) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'entry not found' }));
      return;
    }

    const paymentTx = req.headers['x-x402-payment'];
    if (!paymentTx || paymentTx.length < 10) {
      res.writeHead(402, {
        'Content-Type': 'application/json',
        'X-X402-Chain': CHAIN,
        'X-X402-Recipient': USDC_WALLET,
        'X-X402-Amount': '1'
      });
      res.end(JSON.stringify({
        error: 'payment_required',
        chain: CHAIN, wallet: USDC_WALLET, amount: 1,
        instructions: `Send 1¢ USDC on ${CHAIN} to ${USDC_WALLET}`
      }));
      return;
    }

    entry.reads = (entry.reads || 0) + 1;
    save();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(entry));
    return;
  }

  // POST /search (1¢)
  if (url.pathname === '/search' && req.method === 'POST') {
    const paymentTx = req.headers['x-x402-payment'];
    if (!paymentTx || paymentTx.length < 10) {
      res.writeHead(402, {
        'Content-Type': 'application/json',
        'X-X402-Chain': CHAIN, 'X-X402-Recipient': USDC_WALLET, 'X-X402-Amount': '1'
      });
      res.end(JSON.stringify({ error: 'payment_required', chain: CHAIN, wallet: USDC_WALLET, amount: 1 }));
      return;
    }

    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { query, tags } = JSON.parse(body);
        let results = db.entries;
        
        if (query) {
          const q = query.toLowerCase();
          results = results.filter(e => 
            e.title.toLowerCase().includes(q) || 
            e.content.toLowerCase().includes(q) ||
            (e.tags || []).some(t => t.toLowerCase().includes(q))
          );
        }
        if (tags && tags.length > 0) {
          results = results.filter(e => 
            tags.some(t => (e.tags || []).map(et => et.toLowerCase()).includes(t.toLowerCase()))
          );
        }

        results = results.slice(-20).reverse().map(e => ({
          id: e.id, title: e.title, tags: e.tags,
          agent: e.agentAddress?.substring(0,10)+'...',
          created: e.created, snippet: e.content.substring(0, 200),
          relevance: (e.reads || 0) + 1
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ query, results: results.length, entries: results }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid JSON' }));
      }
    });
    return;
  }

  // POST /write (2¢)  
  if (url.pathname === '/write' && req.method === 'POST') {
    const paymentTx = req.headers['x-x402-payment'];
    if (!paymentTx || paymentTx.length < 10) {
      res.writeHead(402, {
        'Content-Type': 'application/json',
        'X-X402-Chain': CHAIN, 'X-X402-Recipient': USDC_WALLET, 'X-X402-Amount': '2'
      });
      res.end(JSON.stringify({ error: 'payment_required', chain: CHAIN, wallet: USDC_WALLET, amount: 2 }));
      return;
    }

    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const entry = {
          id: db.nextId++,
          title: sanitize(data.title || 'Untitled'),
          content: sanitize(data.content || ''),
          tags: (data.tags || []).map(sanitize),
          agentAddress: sanitize(data.agentAddress || 'anonymous'),
          agentName: sanitize(data.agentName || ''),
          created: new Date().toISOString(),
          reads: 0
        };
        db.entries.push(entry);
        save();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id: entry.id, message: 'Memory stored. 2¢ charged.' }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid JSON: ' + e.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found', endpoints: ['/', '/write', '/search', '/recent', '/read/:id', '/stats'] }));
});

fs.mkdirSync('/root/automaton/data', { recursive: true });
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Agent Memory Bank running on port ${PORT}`);
  console.log(`Wallet: ${USDC_WALLET} (${CHAIN})`);
  console.log(`Entries: ${db.entries.length}`);
  console.log(`Write: 2¢ | Search: 1¢ | Browse/Stats: free`);
});
