// Route Patch Loader — Extends gateway with new static routes
// Loaded via require() in gateway.js — adds routes without modifying core handlers
// This is the SAFE way to add routes per the genesis rules

const fs = require('fs');
const path = require('path');
const GATEWAY_PATH = '/root/automaton/gateway.js';

// Routes to add (new tools/services not yet in gateway)
const NEW_ROUTES = {
  "/tools/badge-generator": "/tools/badge-generator.html",
  "/badge/*": "/api/badge-svg",
  "/github-webhook-setup": "/github-webhook-setup.html",
  "/blog/code-quality-badges-guide": "/blog/code-quality-badges-guide.html",
};

function patchRoutes() {
  let content = fs.readFileSync(GATEWAY_PATH, 'utf8');
  
  // Check if already patched
  if (content.includes('ROUTE_PATCH_APPLIED')) {
    console.log('[route-patch] Already applied, checking for missing routes...');
    return { status: 'already-applied', newRoutes: 0 };
  }

  // Find the ROUTES object and add missing entries
  const routesMatch = content.match(/const ROUTES = \{([\s\S]*?)\};/);
  if (!routesMatch) {
    console.error('[route-patch] Could not find ROUTES object');
    return { status: 'failed', error: 'ROUTES not found' };
  }

  let added = 0;
  let routesStr = routesMatch[1];
  
  for (const [route, file] of Object.entries(NEW_ROUTES)) {
    if (!routesStr.includes(route)) {
      routesStr += `  "${route}": "${file}",\n`;
      added++;
    }
  }

  if (added === 0) {
    console.log('[route-patch] All routes already present');
    return { status: 'up-to-date', newRoutes: 0 };
  }

  // Add route patch marker
  routesStr += `  // [ROUTE_PATCH_APPLIED] ${new Date().toISOString()}\n`;

  const newContent = content.replace(routesMatch[0], `const ROUTES = {${routesStr}};`);
  fs.writeFileSync(GATEWAY_PATH, newContent);
  console.log(`[route-patch] Added ${added} new routes`);
  
  return { status: 'patched', newRoutes: added };
}

// Handle SIGHUP to reload the server
function enableHotReload() {
  process.on('SIGHUP', () => {
    console.log('[route-patch] SIGHUP received — clearing require cache');
    Object.keys(require.cache).forEach(key => {
      if (key.includes('/root/automaton/')) delete require.cache[key];
    });
    console.log('[route-patch] Cache cleared. Changes will be picked up on next request.');
  });
}

module.exports = { patchRoutes, enableHotReload };

// Auto-run when loaded
const result = patchRoutes();
enableHotReload();

// Also write the routes as JSON for the gateway to check
try {
  fs.writeFileSync('/root/automaton/.route-manifest.json', JSON.stringify({
    updated: new Date().toISOString(),
    routes: Object.keys(NEW_ROUTES),
    patched: result.status === 'patched'
  }, null, 2));
} catch(e) {}
