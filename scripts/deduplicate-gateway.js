const fs = require('fs');
let c = fs.readFileSync('/root/automaton/gateway.js', 'utf8');

// Strategy: find ALL duplicate const/let/var declarations and keep only the first
const lines = c.split('\n');
const seen = new Set();
const newLines = [];

for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  // Check for duplicate require declarations
  const requireMatch = trimmed.match(/^(const|let|var)\s+(\w+)\s*=/);
  if (requireMatch) {
    const varName = requireMatch[2];
    if (seen.has(varName) && requireMatch[1] === 'const') {
      // Skip duplicate const declaration
      continue;
    }
    seen.add(varName);
  }
  newLines.push(lines[i]);
}

c = newLines.join('\n');

// Also fix any "con" fragments or incomplete statements
c = c.replace(/con\s*$/m, '');
c = c.replace(/\bcon\s*$/gm, '');

fs.writeFileSync('/root/automaton/gateway.js', c);

const { execSync } = require('child_process');
try {
  execSync('node --check /root/automaton/gateway.js', { stdio: 'pipe' });
  console.log('✅ Gateway syntax OK!');
} catch(e) {
  const err = e.stderr.toString();
  const lines = err.split('\n').filter(l => l.includes('/gateway.js'));
  console.log('❌ Still has issues:', lines.join('; '));
  
  // Try more aggressive cleanup - remove ALL blocks between duplicate markers
  // Read original and rebuild from scratch
  const original = fs.readFileSync('/root/automaton/gateway.js.orig', 'utf8');
  if (original) {
    fs.writeFileSync('/root/automaton/gateway.js', original);
    console.log('✅ Reverted to original. Will apply changes one at a time.');
  }
  process.exit(1);
}

// Backup the cleaned version
fs.writeFileSync('/root/automaton/gateway.js.orig', c);

// Restart gateway
try {
  const pid = execSync('pgrep -f "node.*gateway" 2>/dev/null || true').toString().trim();
  if (pid) execSync('kill ' + pid.split('\n')[0] + ' 2>/dev/null || true');
} catch(e) {}

const child = require('child_process').spawn('node', ['/root/automaton/gateway.js'], {
  cwd: '/root/automaton',
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true
});
child.unref();

setTimeout(() => {
  const http = require('http');
  http.get('http://localhost:8080/', (res) => {
    let d = '';
    res.on('data', chunk => d += chunk);
    res.on('end', () => {
      console.log('✅ Gateway running!');
      process.exit(0);
    });
  }).on('error', (e) => {
    console.log('❌ Error:', e.message);
    process.exit(1);
  });
}, 1500);
