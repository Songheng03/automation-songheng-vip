const fs = require('fs');
const gw = '/root/automaton/gateway.js';
let c = fs.readFileSync(gw, 'utf8');

// 1. Add require for GitHub review service after health-api block
const healthApiLine = c.indexOf("// ---- Server ----");
if (healthApiLine > 0) {
  const insertBefore = c.slice(0, healthApiLine);
  const insertAfter = c.slice(healthApiLine);
  
  const githubRequire = `
// ---- GitHub PR Review Service ----
const GITHUB_REVIEW = path.join(__dirname, 'services', 'github-review-service.js');
let ghReview;
try { 
  ghReview = require(GITHUB_REVIEW); 
  const ghHandler = ghReview.createHandler();
  console.log('[gateway] github-review loaded');
} catch(e) { 
  console.error('[gateway] github-review not loaded:', e.message); 
}

`;
  
  c = insertBefore + githubRequire + insertAfter;
}

// 2. Add GitHub routes right before "// Fallback: try static file"
const fallbackLine = c.indexOf("// Fallback: try static file");
if (fallbackLine > 0) {
  const beforeFallback = c.slice(0, fallbackLine);
  const afterFallback = c.slice(fallbackLine);
  
  const githubRoutes = `
  // GitHub PR Review routes
  if (p === '/api/github/webhook' || p === '/api/github/review' || p === '/api/github/setup') {
    if (!ghReview) {
      respond(500, {'Content-Type':'application/json'}, {error:'GitHub review service not available'});
      return;
    }
    const ghHandler = ghReview.createHandler();
    ghHandler(req, res);
    return;
  }

`;
  
  c = beforeFallback + githubRoutes + afterFallback;
}

// 3. Fix the incomplete analytics line if present
c = c.replace(/if \(analytics && !p\.startsWith\('\/health'\) && !p\.startsWith\('\/api\/analytics'\)\) \{\s*try \{\s*const ip = req\.headers\['x-forwarded-for'\] \|\| req\.socket\?\.remoteAddress \|\| '0\.0\.0\.0';\s*con\s*$/m, 
  `if (analytics && !p.startsWith('/health') && !p.startsWith('/api/analytics')) {
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '0.0.0.0';
      analytics.trackVisit(ip, p, req.headers['user-agent'] || '');
    } catch(e) { /* analytics non-blocking */ }
  }`);

fs.writeFileSync(gw, c);

// Check syntax
const { execSync } = require('child_process');
try {
  execSync('node --check ' + gw, { stdio: 'pipe' });
  console.log('✅ Gateway syntax OK!');
} catch(e) {
  console.log('❌ Syntax error:', e.stderr?.toString());
}

// Restart gateway gracefully
const { spawn } = require('child_process');
// Kill existing
try { execSync('pkill -f "node /root/automaton/gateway.js" || true'); } catch(e) {}

const child = spawn('node', [gw], {
  cwd: '/root/automaton',
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true
});
child.stdout.on('data', d => process.stdout.write(d.toString()));
child.stderr.on('data', d => process.stderr.write(d.toString()));

setTimeout(() => {
  const http = require('http');
  // Test the github endpoint
  http.get('http://localhost:8080/api/github/setup', (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      console.log('✅ GitHub route responds: HTTP', res.statusCode);
      console.log('✅ Gateway OK with GitHub service!');
      process.exit(0);
    });
  }).on('error', (e) => {
    http.get('http://localhost:8080/', (res) => {
      console.log('✅ Gateway running on 8080 (GitHub route may need reload)');
      process.exit(0);
    }).on('error', (e2) => {
      console.log('❌ Gateway not responding:', e2.message);
      process.exit(1);
    });
  });
}, 3000);
