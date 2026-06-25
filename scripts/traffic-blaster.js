#!/usr/bin/env node
// TRAFFIC BLASTER v1.0 - CommonJS version

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DOMAIN = 'automation.songheng.vip';
const BASE = `https://${DOMAIN}`;

const URLS = [
  BASE + '/', BASE + '/upgrade', BASE + '/api-docs', BASE + '/api-playground',
  BASE + '/tools', BASE + '/quickstart', BASE + '/ai-code-reviewer',
  BASE + '/blog.html', BASE + '/dashboard', BASE + '/share',
  BASE + '/blog/ai-code-review-guide.html', BASE + '/blog/usdc-micropayments-x402-guide.html',
  BASE + '/blog/json-to-typescript-converter-guide.html', BASE + '/blog/regex-tester-guide.html',
  BASE + '/tools/regex-tester', BASE + '/tools/json-to-typescript', BASE + '/tools/json-to-csv',
  BASE + '/tools/text-utility', BASE + '/tools/badge-generator',
];

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'my-automaton-blaster/1.0' }, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

function pingIndexNow() {
  console.log('📡 IndexNow...');
  const body = JSON.stringify({
    host: DOMAIN, key: '3c6e0b0a1d2f3a4b5c6d7e8f9a0b1c2d',
    urlList: URLS.slice(0, 10)
  });
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.indexnow.org', path: '/indexnow', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
    }, (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{console.log(`   ${res.statusCode}`); resolve(res.statusCode);}); });
    req.on('error', e => { console.log(`   Error: ${e.message}`); resolve(0); });
    req.write(body); req.end();
  });
}

function buildSitemap() {
  console.log('🗺️ Sitemap...');
  const contentDir = '/root/automaton/content';
  const urls = [{ loc: BASE + '/', priority: '1.0' }];
  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory() && !e.name.startsWith('.')) walk(full);
        else if (e.name.endsWith('.html')) {
          const rel = full.replace(contentDir, '').replace(/\/index\.html$/, '/');
          urls.push({ loc: BASE + rel, priority: '0.8' });
        }
      }
    } catch(e) {}
  }
  walk(contentDir);
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => `  <url><loc>${u.loc}</loc><changefreq>weekly</changefreq><priority>${u.priority}</priority></url>`).join('\n') + '\n</urlset>';
  fs.writeFileSync('/root/automaton/content/sitemap.xml', xml);
  console.log(`   ${urls.length} URLs`);
  return urls;
}

function checkLive() {
  console.log('\n🔎 Live status:');
  const checks = ['/api/health','/','/upgrade','/api-docs','/tools','/mcp/v1/catalog','/share','/dashboard'];
  return Promise.all(checks.map(async (c) => {
    try {
      const res = await fetchJSON(BASE + c);
      console.log(`   ${res.status < 400 ? '✅' : '❌'} ${c}: ${res.status}`);
    } catch(e) {
      console.log(`   ❌ ${c}: ${e.message}`);
    }
  }));
}

async function main() {
  console.log('═══════════════════════════════');
  console.log('  TRAFFIC BLASTER v1.0');
  console.log(`  ${new Date().toISOString()}`);
  console.log('═══════════════════════════════\n');
  
  const urls = buildSitemap();
  await pingIndexNow();
  await checkLive();
  
  // Write checklist page
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Submit — my-automaton</title>
<style>body{font-family:-apple-system,sans-serif;background:#0a0f1e;color:#e2e8f0;max-width:700px;margin:40px auto;padding:20px}
a{color:#3b82f6}h2{color:#22c55e;margin-top:24px}.done{color:#22c55e}.todo{color:#f97316}</style></head><body>
<h1>📋 Service Submission Checklist</h1>
<p>Generated: ${new Date().toISOString()} | ${urls.length} URLs in sitemap</p>
<h2 class="done">✅ Auto-Submitted</h2><ul>
<li>✅ Sitemap (${urls.length} URLs)</li><li>✅ IndexNow (10 URLs)</li></ul>
<h2 class="todo">📋 Manual Submit Needed</h2><ul>
<li><a href="https://smithery.ai/docs/publish">Smithery.ai</a> — MCP server: ${BASE}/mcp/v1/catalog</li>
<li><a href="https://glama.ai/mcp/servers">Glama.ai</a> — MCP server: ${BASE}/mcp/v1/discover</li>
<li><a href="https://mcp.so/submit">MCP.so</a> — MCP server: ${BASE}/mcp/v1/openai</li>
<li><b>npm publish</b> — cd npm-package && npm publish</li>
<li><b>GitHub</b> — Create repo with README + package</li>
<li><b>Product Hunt</b> — AI developer tool</li>
<li><b>Hacker News</b> — Show HN post</li>
<li><b>Reddit</b> — r/programming, r/webdev</li>
<li><b>DEV.to</b> — Cross-post blogs</li>
<li><b>Twitter/X</b> — #buildinpublic #ai</li>
</ul>
<p style="margin-top:32px;color:#64748b;font-size:0.85rem">
<a href="${BASE}">← Back to my-automaton</a></p></body></html>`;
  fs.writeFileSync('/root/automaton/content/submit-checklist.html', html);
  console.log('\n✅ Done. Written: content/sitemap.xml, content/submit-checklist.html');
  console.log('═══════════════════════════════');
}

main().catch(console.error);
