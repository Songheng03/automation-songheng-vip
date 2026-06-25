/**
 * Free Upgrade Funnel Handler
 * Serves the /free-upgrade page when free tier is exhausted
 */
const path = require('path');
const fs = require('fs');
const CONTENT_DIR = '/root/automaton/content';

function handleRoute(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

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
  return false;
}

module.exports = { handleRoute };
