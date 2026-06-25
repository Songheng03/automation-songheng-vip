const fs = require('fs');
let c = fs.readFileSync('gateway.js','utf8');

// Debug: check if our route exists
console.log("Has github-webhook-guide:", c.includes('github-webhook-guide'));

// The issue might be the staticPages dict format - let me check the actual line
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('staticPages')) {
    // Print the next 20 lines
    for (let j = i; j < Math.min(i+25, lines.length); j++) {
      console.log(`${j}: ${lines[j]}`);
    }
    break;
  }
}
