const { execSync } = require('child_process');
const fs = require('fs');

// Find process on port 8080
try {
  const out = execSync('lsof -ti:8080 2>/dev/null || ss -tlnp 2>/dev/null | grep 8080 || netstat -tlnp 2>/dev/null | grep 8080', { timeout: 5000 }).toString();
  console.log('Port 8080 owned by:', out.trim());
} catch(e) { console.log('lsof not available:', e.message); }

// Try reading existing pid
try {
  const pid = fs.readFileSync('/root/automaton/data/gateway.pid', 'utf-8').trim();
  console.log('Saved pid:', pid);
} catch(e) { console.log('No pid file'); }

// Try process.kill(0) to check if pid is alive
try {
  const pid = parseInt(fs.readFileSync('/root/automaton/data/gateway.pid', 'utf-8').trim());
  try { process.kill(pid, 0); console.log('Pid', pid, 'is alive'); } catch(e) { console.log('Pid', pid, 'is dead'); }
} catch(e) {}
