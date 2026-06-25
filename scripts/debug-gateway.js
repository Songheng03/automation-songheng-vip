// Check what's wrong with gateway startup
const fs = require('fs');
const c = fs.readFileSync('/root/automaton/gateway.js', 'utf8');

// Find route-patch line
const lines = c.split('\n');
lines.forEach((l, i) => {
  if (l.includes('routePatch') || l.includes('route-patch')) {
    console.log(`Line ${i}: ${l}`);
  }
});

// Try to require it
try {
  const mod = require('/root/automaton/gateway.js');
  console.log('Gateway loaded OK');
} catch(e) {
  console.log('Error:', e.message);
  console.log('Stack:', e.stack?.split('\n').slice(0,5).join('\n'));
}
