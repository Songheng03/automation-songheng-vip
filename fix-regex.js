const fs = require('fs');
let content = fs.readFileSync('/root/automaton/gateway.cjs', 'utf8');

// Fix: replace literal (w+) with (\w+) in regex patterns
// The file has (w+) which only matches literal "w" chars, need (\w+) for word chars
content = content.replace(/\(w\+\)/g, '(\\w+)');

fs.writeFileSync('/root/automaton/gateway.cjs', content);

// Verify
const verify = fs.readFileSync('/root/automaton/gateway.cjs', 'utf8');
const lines = verify.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('pathname.match')) {
    console.log(`Line ${i+1}: ${lines[i].trim()}`);
  }
}
