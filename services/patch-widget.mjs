import fs from 'fs';
const file = '/root/automaton/services/widget-handler.cjs';
let content = fs.readFileSync(file, 'utf8');
const marker = '  // Track embed pings';
const insert = `
  // Serve free-upgrade funnel page (shown when free tier exhausted)
  if (pathname === '/free-upgrade.html' || pathname === '/free-upgrade') {
    const upgradePath = path.join(CONTENT_DIR, 'free-upgrade.html');
    if (fs.existsSync(upgradePath)) {
      const content = fs.readFileSync(upgradePath, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      });
      res.end(content);
      return true;
    }
    res.writeHead(404);
    res.end('Not found');
    return true;
  }

`;
if (content.includes(marker) && !content.includes('free-upgrade')) {
  content = content.replace(marker, insert + marker);
  fs.writeFileSync(file, content);
  console.log('OK: route added');
} else {
  console.log('SKIP: already has route or marker not found');
}
