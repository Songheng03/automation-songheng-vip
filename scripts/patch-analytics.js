// Patch analytics into gateway.js
const fs = require('fs');
const path = require('path');

const gatewayPath = '/root/automaton/gateway.js';
let g = fs.readFileSync(gatewayPath, 'utf8');

// Check if already patched
if (g.includes('visitor-analytics')) {
  console.log('Analytics already patched');
  process.exit(0);
}

// 1. Add require at top (after existing requires, before SEO_OPTIMIZER line)
let insertPoint = g.indexOf('const SEO_OPTIMIZER');
if (insertPoint === -1) insertPoint = g.indexOf('const SITEMAP_SVC');
const analyticsRequireLine = "const ANALYTICS = require('./services/visitor-analytics.js');\n";
g = g.slice(0, insertPoint) + analyticsRequireLine + g.slice(insertPoint);

// 2. Find the health check handler section to add tracking before it
const healthCheck = '// Health\n    if (p === \'/health\')';
const trackBlock = `\
  // Track pageview (non-blocking analytics)\n\
  if (p !== '/health') {\n\
    try {\n\
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '0.0.0.0';\n\
      const ref = req.headers['referer'] || '-';\n\
      ANALYTICS.trackPageview(p, ref, ip);\n\
    } catch(e) { /* analytics non-critical */ }\n\
  }\n\
\n\
`;
g = g.replace(healthCheck, trackBlock + healthCheck);

// 3. Add /api/analytics route before /api/stats
const apiStats = "// Stats\n    if (p === '/api/stats')";
const analyticsRoute = `\
    // Analytics summary\n\
    if (p === '/api/analytics') {\n\
      respond(200, {'Content-Type':'application/json'}, ANALYTICS.getSummary());\n\
      return;\n\
    }\n\
\n\
`;
g = g.replace(apiStats, analyticsRoute + apiStats);

// 4. Update version
g = g.replace("version:'7.8'", "version:'7.9'");

fs.writeFileSync(gatewayPath, g);
console.log('✅ Analytics patched into gateway.js successfully');
console.log('Version updated to 7.9');
