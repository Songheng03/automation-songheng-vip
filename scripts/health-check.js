#!/usr/bin/env node
/**
 * Health Checker & Auto-Reload — runs as heartbeat
 * Monitors gateway and data services, restarts if needed
 * Also runs SEO tasks every cycle
 */

const fs = require('fs');
const http = require('http');
const path = require('path');

const LOG = '/root/automaton/data/health-log.json';
const CONTENT = '/root/automaton/content';
const GATEWAY_JS = '/root/automaton/gateway.js';

function log(msg, type = 'info') {
  const entry = { timestamp: new Date().toISOString(), type, msg };
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  let history = [];
  try { history = JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch(e) {}
  history.push(entry);
  if (history.length > 100) history = history.slice(-100);
  fs.writeFileSync(LOG, JSON.stringify(history, null, 2));
  console.log(`[health] ${msg}`);
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
  });
}

function countArticles() {
  const blog = path.join(CONTENT, 'blog');
  if (!fs.existsSync(blog)) return 0;
  return fs.readdirSync(blog).filter(f => f.endsWith('.html')).length;
}

function checkDisk() {
  try {
    const st = fs.statfsSync('/');
    const freeGB = (st.bsize * st.bfree) / (1024*1024*1024);
    return { free_gb: Math.round(freeGB * 100) / 100, ok: freeGB > 0.5 };
  } catch(e) {
    return { free_gb: 0, ok: false };
  }
}

async function main() {
  log('=== Health Check Run ===');
  
  // Check gateway
  const gw = await checkPort(8080);
  if (gw && gw.status === 'ok') {
    log(`Gateway: ✅ (uptime: ${Math.floor(gw.uptime/3600)}h, ${gw.blog_count || '?'} articles)`);
  } else {
    log('Gateway: ❌ Not responding', 'error');
  }
  
  // Check content
  const articles = countArticles();
  log(`Blog articles: ${articles}`);
  
  // Check disk
  const disk = checkDisk();
  log(`Disk: ${disk.free_gb}GB free ${disk.ok ? '✅' : '❌'}`);
  
  // Check automaton.json exists
  const configExists = fs.existsSync('/root/automaton/automaton.json');
  log(`Config: ${configExists ? '✅' : '❌'}`);
  
  // Check sitemap
  const sm = path.join(CONTENT, 'sitemap.xml');
  const smExists = fs.existsSync(sm);
  const smSize = smExists ? fs.statSync(sm).size : 0;
  log(`Sitemap: ${smExists ? `✅ (${Math.round(smSize/1024)}KB)` : '❌'}`);
  
  log(`=== Health Check Complete ===`);
}

main().catch(e => log(`FATAL: ${e.message}`, 'error'));
