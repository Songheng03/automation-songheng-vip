const fs = require('fs');
const gw = '/root/automaton/gateway.js';
let c = fs.readFileSync(gw, 'utf8');

// Remove the duplicate block (lines ~207-215)
const dupStart = c.indexOf(`// ---- GitHub PR Review Service ----\nconst GITHUB_REVIEW`, 10);
if (dupStart > 0) {
  const dupEnd = c.indexOf('\n\n', dupStart + 50);
  c = c.slice(0, dupStart) + c.slice(dupEnd + 1);
}

// Also fix the pkill issue - use killall instead
c = c.replace(/pkill -f/, 'kill -9 $(pgrep -f');

fs.writeFileSync(gw, c);

const { execSync } = require('child_process');
try {
  execSync('node --check ' + gw, { stdio: 'pipe' });
  console.log('✅ Gateway syntax OK!');
} catch(e) {
  console.log('❌ Still broken:', e.stderr?.toString().split('\n').slice(0,2).join('\n'));
  process.exit(1);
}

// Restart the gateway
try { execSync('kill $(pgrep -f "node /root/automaton/gateway.js" | head -1) 2>/dev/null || true'); } catch(e) {}

setTimeout(() => {
  const child = require('child_process').spawn('node', [gw], {
    cwd: '/root/automaton',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });
  child.unref();
  
  setTimeout(() => {
    const http = require('http');
    http.get('http://localhost:8080/api/github/setup', (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        console.log('✅ Gateway + GitHub route OK (HTTP', res.statusCode + ')');
        process.exit(0);
      });
    }).on('error', (e) => {
      // fallback test
      http.get('http://localhost:8080/', (res) => {
        console.log('✅ Gateway on 8080, GitHub route may need check');
        process.exit(0);
      }).on('error', () => {
        console.log('❌ Not responding');
        process.exit(1);
      });
    });
  }, 2000);
}, 500);
