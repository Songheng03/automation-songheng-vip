#!/usr/bin/env node
/**
 * Route patcher — adds content brief service route to gateway.js
 * Run after gateway restart to ensure route is mounted.
 */
const fs = require('fs');
const path = require('path');

const GATEWAY_PATH = '/root/automaton/gateway.js';

function patchGateway() {
  let code = fs.readFileSync(GATEWAY_PATH, 'utf8');
  
  // Check if content brief route already exists
  if (code.includes('content-brief')) {
    console.log('[RoutePatch] Content brief route already exists, skipping.');
    return false;
  }

  // Find the services mounting section and add the content brief proxy
  const proxyPattern = `// Mount content-brief service`;
  if (!code.includes(proxyPattern)) {
    // Add before a known service mounting pattern
    const insertPoint = code.lastIndexOf('// Mount');
    if (insertPoint === -1) {
      // Just append before the server start
      code = code.replace(
        'server.listen(PORT,',
        `// Mount content-brief service
const contentBriefProxy = httpProxy.createProxy({ target: 'http://127.0.0.1:3094', changeOrigin: true });
app.use('/api/brief', (req, res) => contentBriefProxy.web(req, res));
app.use('/api/quota', (req, res) => contentBriefProxy.web(req, res));

server.listen(PORT,`
      );
    } else {
      code = code.replace(
        '// Mount',
        `// Mount content-brief service
const contentBriefProxy = httpProxy.createProxy({ target: 'http://127.0.0.1:3094', changeOrigin: true });
app.all('/api/brief', (req, res) => contentBriefProxy.web(req, res));
app.all('/api/quota', (req, res) => contentBriefProxy.web(req, res));

// Mount`
      );
    }
    console.log('[RoutePatch] Added content brief proxy routes to gateway.js');
  }

  // Also add a static page for the content brief tool
  if (!code.includes('/tools/seo-content-brief')) {
    code = code.replace(
      "app.use(express.static(CONTENT_DIR));",
      `// SEO Content Brief tool page
app.get('/tools/seo-content-brief', (req, res) => {
  res.sendFile(path.join(CONTENT_DIR, 'tools', 'seo-content-brief.html'));
});
app.use(express.static(CONTENT_DIR));`
    );
    console.log('[RoutePatch] Added /tools/seo-content-brief route');
  }

  fs.writeFileSync(GATEWAY_PATH, code);
  return true;
}

if (require.main === module) {
  const changed = patchGateway();
  if (changed) {
    console.log('[RoutePatch] Gateway patched. Restart gateway to apply.');
  } else {
    console.log('[RoutePatch] No changes needed.');
  }
}

module.exports = { patchGateway };
