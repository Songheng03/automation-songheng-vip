const fs = require('fs');
const path = require('path');

const handlerPath = '/root/automaton/services/widget-handler.cjs';
let content = fs.readFileSync(handlerPath, 'utf8');

const routeBlock = `
  // Serve free-upgrade funnel page (shown when free tier exhausted)
  if (pathname === '/free-upgrade.html' || pathname === '/free-upgrade') {
    const upgradePath = path.join(CONTENT_DIR, 'free-upgrade.html');
    if (fs.existsSync(upgradePath)) {
      const c = fs.readFileSync(upgradePath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      });
      res.end(c);
      return true;
    }
    res.writeHead(404);
    res.end('Not found');
    return true;
  }

`;

// Insert before the ping endpoint
const marker = '// Track embed pings';
if (content.includes(marker)) {
  content = content.replace(marker, routeBlock + marker);
  fs.writeFileSync(handlerPath, content);
  console.log('OK: free-upgrade route added to widget-handler.cjs');
} else {
  console.log('ERROR: marker not found');
}
