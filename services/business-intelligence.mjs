#!/usr/bin/env node
/**
 * business-intelligence.mjs — Generate full state snapshot
 * Run: node services/business-intelligence.mjs
 * Outputs a comprehensive report of my current state
 */

import fs from 'fs';
import http from 'http';
import { execSync } from 'child_process';

function httpGet(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', (e) => resolve({ status: 0, error: e.message }));
  });
}

async function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    agent: 'my-automaton',
    wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
    domain: 'https://automation.songheng.vip',
    gateway: 'http://127.0.0.1:8080'
  };

  // Gateway health
  const health = await httpGet('http://127.0.0.1:8080/health');
  report.gateway_ok = health.status === 200;
  
  // Tunnel status
  try {
    const tunnel = execSync('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 8 https://automation.songheng.vip/health 2>&1', { timeout: 10000, encoding: 'utf8' });
    report.tunnel_status = tunnel;
  } catch(e) {
    report.tunnel_status = 'DOWN';
  }

  // Stats
  const stats = await httpGet('http://127.0.0.1:8080/api/stats/overview');
  if (stats.status === 200) {
    const s = JSON.parse(stats.body);
    report.stats = s;
    report.revenue = {
      keys_sold: s.total_keys || 0,
      credits_sold: s.total_credits_sold || 0,
      credits_remaining: s.total_credits_remaining || 0,
      credits_used: (s.total_credits_sold || 0) - (s.total_credits_remaining || 0),
      utilization_pct: s.total_credits_sold > 0 
        ? Math.round(((s.total_credits_sold - s.total_credits_remaining) / s.total_credits_sold) * 10000) / 100
        : 0,
      revenue_usd: s.total_revenue_usd || 40
    };
  }

  // Disk
  try {
    const df = execSync('df -h /', { encoding: 'utf8' });
    const parts = df.split('\n')[1].split(/\s+/);
    report.disk = {
      size: parts[1],
      used: parts[2],
      avail: parts[3],
      use_pct: parts[4]
    };
  } catch(e) {}

  // Content inventory
  const contentDir = '/root/automaton/content';
  if (fs.existsSync(contentDir)) {
    const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.html'));
    const blogs = files.filter(f => f.startsWith('blog-') || f.includes('blog/'));
    report.content = {
      total_html: files.length,
      blogs: blogs.length,
      all_files: files
    };
  }

  // API keys summary
  try {
    const keys = JSON.parse(fs.readFileSync('/root/automaton/api-keys.json', 'utf8'));
    const keyList = Object.entries(keys);
    report.api_keys = {
      total: keyList.length,
      with_price_id: keyList.filter(([,v]) => v.price_id).length,
      no_price_id: keyList.filter(([,v]) => !v.price_id).length,
      total_credits: keyList.reduce((s, [,v]) => s + (v.credits || 0), 0),
      used_credits: keyList.reduce((s, [,v]) => s + (v.used || 0), 0),
      avg_usage: keyList.length > 0 
        ? Math.round(keyList.reduce((s, [,v]) => s + (v.used || 0), 0) / keyList.length * 100) / 100
        : 0,
      sample_keys: keyList.slice(0, 5).map(([k, v]) => ({ 
        key: k.slice(0, 16) + '...', 
        credits: v.credits, 
        used: v.used || 0,
        created: v.created,
        price_id: v.price_id || 'free'
      }))
    };
  } catch(e) {
    report.api_keys = { error: e.message };
  }

  // Gateway features on disk
  const gwCode = fs.readFileSync('/root/automaton/gateway.cjs', 'utf8');
  report.gateway_features = {
    mcp: /mcp/i.test(gwCode),
    catalog: gwCode.includes('/api/catalog'),
    handshake: gwCode.includes('handshake'),
    dev_key: /dev.?key/i.test(gwCode),
    sitemap: gwCode.includes('sitemap'),
    revenue_multiplier: gwCode.includes('revenue'),
    free_api: gwCode.includes('/free/'),
    badge: gwCode.includes('badge'),
    referral: gwCode.includes('referral'),
  };

  // Generate action items
  report.actions = [];
  if (report.tunnel_status !== '200') {
    report.actions.push('🚨 CRITICAL: Tunnel down (HTTP ' + report.tunnel_status + ') — run deploy.sh on HOST');
  }
  if (report.disk && parseInt(report.disk.use_pct) >= 95) {
    report.actions.push('🚨 CRITICAL: Disk ' + report.disk.use_pct + ' full — docker system prune -af on HOST');
  }
  if (report.revenue && report.revenue.revenue_usd === 0) {
    report.actions.push('💰 No revenue yet — need to drive traffic and convert users');
  }
  if (report.revenue && report.revenue.utilization_pct < 10 && report.revenue.keys_sold > 0) {
    report.actions.push('📊 Low credit utilization (' + report.revenue.utilization_pct + '%) — users bought but aren\'t using. Reactivation needed.');
  }

  // Write report
  const outPath = '/root/automaton/data/state-snapshot.json';
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('✅ State snapshot: ' + outPath);

  // Print summary
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     📊 my-automaton State Snapshot      ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`🟢 Gateway:     ${report.gateway_ok ? 'UP' : 'DOWN'} (localhost:8080)`);
  console.log(`🔗 Tunnel:      ${report.tunnel_status === '200' ? 'UP ✅' : 'DOWN ❌ (' + report.tunnel_status + ')'}`);
  console.log(`💰 Revenue:     $${report.revenue?.revenue_usd || 0}`);
  console.log(`🔑 API Keys:    ${report.api_keys?.total || 0} total, ${report.revenue?.credits_used || 0}/${report.revenue?.credits_sold || 0} credits used (${report.revenue?.utilization_pct || 0}%)`);
  console.log(`📝 Content:     ${report.content?.total_html || 0} pages, ${report.content?.blogs || 0} blog posts`);
  console.log(`💾 Disk:        ${report.disk?.use_pct || '?'} used (${report.disk?.avail || '?'} free)`);
  console.log(`📋 Gateway:     ${Object.values(report.gateway_features).filter(Boolean).length}/${Object.keys(report.gateway_features).length} features on disk`);
  console.log('');
  
  if (report.actions.length > 0) {
    console.log('🎯 ACTION ITEMS:');
    report.actions.forEach((a, i) => console.log(`   ${i+1}. ${a}`));
    console.log('');
  }
  
  // Write summary to WORKLOG-friendly format
  const summary = `📊 State Snapshot (${new Date().toISOString().slice(0, 19)})
Tunnel: ${report.tunnel_status === '200' ? 'UP' : 'DOWN'}
Revenue: $${report.revenue?.revenue_usd || 0} from ${report.api_keys?.total || 0} keys
Credits: ${report.revenue?.credits_used || 0}/${report.revenue?.credits_sold || 0} used
Content: ${report.content?.total_html || 0} pages
Disk: ${report.disk?.use_pct || '?'}
Gateway: ${Object.values(report.gateway_features).filter(Boolean).length}/${Object.keys(report.gateway_features).length} features
Actions: ${report.actions.length > 0 ? report.actions.map(a => a.replace(/[🚨💰📊📋]/g, '').trim()).join('; ') : 'None'}`;
  
  return report;
}

generateReport().catch(e => console.error('Failed:', e));
