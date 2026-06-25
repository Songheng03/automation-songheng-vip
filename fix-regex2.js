const fs = require('fs');
let content = fs.readFileSync('/root/automaton/gateway.cjs', 'utf8');

// Replace literal (w+) with (\w+) - use charCode 92 for backslash
const backslash = String.fromCharCode(92);
const oldPattern = '(w+)';
const newPattern = '(' + backslash + 'w+)';

const count = content.split(oldPattern).length - 1;
console.log(`Found ${count} occurrences of ${oldPattern}`);

content = content.split(oldPattern).join(newPattern);

fs.writeFileSync('/root/automaton/gateway.cjs', content);
console.log('Fixed');

// Verify by showing the actual bytes
const lines = content.split('\n');
[544, 548].forEach(n => {
  const line = lines[n-1];
  console.log(`Line ${n}: ${line}`);
  console.log(`  Has backslash-w: ${line.includes(backslash + 'w+')}`);
});
