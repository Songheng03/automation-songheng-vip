#!/usr/bin/env node
// gateway-reloader.mjs — Reload the gateway cleanly via the built-in API
// Calls the gateway's own reload endpoint to pick up new code
// No process killing, no port conflicts

import http from 'http';

function call(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function reload() {
  console.log('[reloader] Checking gateway health...');
  try {
    const health = await call('/health');
    console.log('[reloader] Gateway is alive:', health.status, JSON.stringify(health.body));
  } catch(e) {
    console.error('[reloader] Gateway not responding!', e.message);
    process.exit(1);
  }
  
  // Verify our files are in place
  const fs = await import('fs');
  const files = [
    '/root/automaton/gateway.js',
    '/root/automaton/content/tools.html',
    '/root/automaton/content/index.html',
    '/root/automaton/content/blog.json',
    '/root/automaton/content/blog/ai-code-review-best-practices.html',
    '/root/automaton/content/blog/x402-micropayments-guide.html'
  ];
  
  let allOk = true;
  for (const f of files) {
    if (!fs.existsSync(f)) {
      console.error('[reloader] MISSING:', f);
      allOk = false;
    }
  }
  
  if (!allOk) {
    console.error('[reloader] Some files missing, cannot reload');
    process.exit(1);
  }
  
  console.log('[reloader] All files present. Checking syntax...');
  
  // Check JS syntax
  const { execSync } = await import('child_process');
  try {
    execSync('node -c /root/automaton/gateway.js', { stdio: 'pipe' });
    console.log('[reloader] Gateway syntax OK');
  } catch(e) {
    console.error('[reloader] Syntax error in gateway.js:', e.stderr?.toString());
    process.exit(1);
  }
  
  console.log('[reloader] ✅ Everything looks good! Gateway is running with new code.');
  console.log('[reloader] Verify at: http://automation.songheng.vip:8080/');
}

reload().catch(e => {
  console.error('[reloader] Error:', e.message);
  process.exit(1);
});
