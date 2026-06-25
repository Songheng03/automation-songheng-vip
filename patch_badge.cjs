import fs from 'fs';

const gatewayPath = '/root/automaton/gateway.js';
let code = fs.readFileSync(gatewayPath, 'utf8');

// 1. Add import for repo-badges
if (!code.includes('repo-badges')) {
  code = code.replace(
    "import { handleBadge } from './services/repo-badges.js';",
    "import { handleBadge } from './services/repo-badges.js';"
  );
  if (!code.includes("'./services/repo-badges.js'")) {
    code = code.replace(
      "import { recordPayment, isPaymentUsed, getStats } from '../services/payment-tracker.js';",
      "import { recordPayment, isPaymentUsed, getStats } from '../services/payment-tracker.js';\nimport { handleBadge } from './services/repo-badges.js';"
    );
  }
}

// 2. Add badge route before static file handler
const badgeRouteBlock = `
  // === REPO BADGE SERVICE (free, no auth) ===
  if (parsedUrl.pathname.startsWith('/repo-badge/')) {
    const result = await handleBadge(parsedUrl.pathname + (parsedUrl.search || ''));
    res.writeHead(result.status, {
      'Content-Type': result.type === 'svg' ? 'image/svg+xml' : 'text/plain',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(result.body);
    return;
  }
`;

if (!code.includes('REPO BADGE SERVICE')) {
  // Find the static file handler section and insert before it
  const search = `// Static file handler - serve from /root/automaton/content/`;
  if (code.includes(search)) {
    code = code.replace(search, badgeRouteBlock + '\n  ' + search);
  }
}

// 3. Add badge to landing page
if (code.includes('/playground') && !code.includes('/repo-badge/')) {
  // Add badge service to the free access section of landing page
  code = code.replace(
    '<div class="endpoint"><span><span class="method">GET</span> <span class="path">/blog</span></span>',
    '<div class="endpoint"><span><span class="method">GET</span> <span class="path">/repo-badge/:owner/:repo/:metric</span></span><span class="badge badge-free">free</span><span style="color:#8b949e">GitHub repo badge generator</span></div>\n<div class="endpoint"><span><span class="method">GET</span> <span class="path">/blog</span></span>'
  );
}

fs.writeFileSync(gatewayPath, code);
console.log('OK - gateway.js patched with repo-badge routes');

// Verify 
const v = fs.readFileSync(gatewayPath, 'utf8');
console.log('Import present:', v.includes('repo-badges'));
console.log('Route present:', v.includes('REPO BADGE SERVICE'));
console.log('Landing present:', v.includes('repo-badge/:owner'));
