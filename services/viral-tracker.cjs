#!/usr/bin/env node
/**
 * viral-tracker.cjs — Viral sharing & commission tracking
 * 
 * Drop-in module for gateway.cjs.
 * Add this to the start of the handle() function:
 *   const viral = require('/root/automaton/services/viral-tracker.cjs');
 *   if (viral.handleRoute(req, res)) return;
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = '/root/automaton/data';
const VIRAL_FILE = path.join(DATA_DIR, 'viral.json');
const COMM_FILE = path.join(DATA_DIR, 'commissions.json');

function rj(p, d = {}) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } }
function wj(p, d) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(d, null, 2)); }

/**
 * Handle a request. Returns true if handled, false to continue chain.
 */
function handleRoute(req, res) {
  const method = req.method;
  const urlp = req.url?.split('?')[0] || '';
  
  // GET /api/viral — viral sharing stats
  if (urlp === '/api/viral' && method === 'GET') {
    const db = rj(VIRAL_FILE, { shares: {}, total: 0 });
    const top = Object.entries(db.shares || {})
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .map(([url, d]) => ({ url, count: d.count, lastShare: d.lastShare }));
    
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      totalShares: db.total || 0,
      activeSharers: Object.keys(db.shares || {}).length,
      topSharers: top
    }));
    return true;
  }
  
  // POST /api/viral/share — track a share
  if (urlp === '/api/viral/share' && method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const db = rj(VIRAL_FILE, { shares: {}, total: 0 });
        if (!db.shares) db.shares = {};
        if (!db.shares[data.url]) {
          db.shares[data.url] = { count: 0, firstShare: new Date().toISOString(), lastShare: new Date().toISOString() };
        }
        db.shares[data.url].count++;
        db.shares[data.url].lastShare = new Date().toISOString();
        db.total = (db.total || 0) + 1;
        wj(VIRAL_FILE, db);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, totalShares: db.total }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return true;
  }
  
  // GET /api/roadmap — public roadmap
  if (urlp === '/api/roadmap' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' });
    res.end(JSON.stringify({
      agent: 'my-automaton',
      mission: 'Self-sustaining AI agent — pay my own server bills',
      revenue: '$39.74 (5 paid users)',
      status: 'bootstrapping',
      roadmap: [
        { phase: '✅ Launch', items: ['Gateway API on port 8080', 'Stripe payments', 'Free tier (3/day/IP)', 'Dev keys (50 free credits)', 'Code grader tool with badges', '57 blog articles & SEO'] },
        { phase: '🚀 Growth', items: ['ClawHunt listing', 'MCP server integration', 'Google Search Console', 'Referral program (20% commission)', 'Viral badge sharing'] },
        { phase: '📈 Scale', items: ['Agent-to-agent payments (x402)', 'Auto-scaling across VPS', 'Revenue dashboard'] }
      ],
      wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
      chain: 'Base (USDC)'
    }));
    return true;
  }
  
  // GET /api/credits-used — public utilization stats (social proof)
  if (urlp === '/api/credits-used' && method === 'GET') {
    const keys = rj('/root/automaton/api-keys.json', {});
    const entries = Object.entries(keys);
    const totalIssued = entries.reduce((s, [,k]) => s + (k.credits || 0) + ((k.used || 0) * 3), 0);
    const used = entries.reduce((s, [,k]) => s + ((k.used || 0) * 3), 0);
    const paidKeys = entries.filter(([,k]) => k.price_id && k.price_id !== 'dev_trial');
    
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' });
    res.end(JSON.stringify({
      totalKeys: entries.length,
      paidUsers: paidKeys.length,
      creditsIssued: totalIssued,
      creditsUsed: used,
      utilization: totalIssued > 0 ? ((used / totalIssued) * 100).toFixed(1) + '%' : '0%',
      revenue: paidKeys.length * 5, // conservative estimate
      activeLastWeek: entries.filter(([,k]) => k.last_used && Date.now() - new Date(k.last_used).getTime() < 604800000).length,
      timestamp: new Date().toISOString()
    }));
    return true;
  }
  
  // GET /badge/:grade — SVG badge (already in gateway, just in case)
  if (urlp.startsWith('/badge/') && method === 'GET') {
    const grade = urlp.split('/').pop().toUpperCase();
    const validGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
    if (!validGrades.includes(grade)) { res.writeHead(400); res.end('Invalid grade'); return true; }
    
    const colors = { 'A+':'#2ea043','A':'#2ea043','A-':'#2ea043','B+':'#d29922','B':'#d29922','B-':'#d29922','C+':'#db6d28','C':'#db6d28','C-':'#db6d28','D+':'#da3633','D':'#da3633','D-':'#da3633','F':'#da3633' };
    const color = colors[grade] || '#8b949e';
    
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' });
    res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="28" viewBox="0 0 120 28"><rect width="120" height="28" rx="4" fill="${color}"/><text x="60" y="19" text-anchor="middle" fill="#fff" font-family="monospace" font-size="16" font-weight="bold">GRADE ${grade}</text></svg>`);
    return true;
  }
  
  return false;
}

module.exports = { handleRoute };
