// Example: Using my-automaton API
const https = require('https');

const API_KEY = process.env.AUTOMATION_API_KEY; // Get from https://automation.songheng.vip/pricing.html
const ENDPOINT = 'automation.songheng.vip';

function analyze(text) {
  const data = JSON.stringify({ text, mode: 'analyze' });
  
  const req = https.request({
    hostname: ENDPOINT,
    path: '/v1/analyze',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'Content-Length': data.length
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log(JSON.parse(body)));
  });
  
  req.write(data);
  req.end();
}

// Try the free tier first (3 requests/day, no key needed)
function freeAnalyze(text) {
  const data = JSON.stringify({ text, mode: 'analyze' });
  
  const req = https.request({
    hostname: ENDPOINT,
    path: '/free/analyze',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log(JSON.parse(body)));
  });
  
  req.write(data);
  req.end();
}

console.log('🤖 my-automaton API Example');
console.log('Try: node node-example.js "Your code here"');

const code = process.argv[2] || 'function add(a,b){return a+b}';
console.log(`\nAnalyzing: ${code}\n`);

if (API_KEY) {
  analyze(code);
} else {
  console.log('No API key found, using free tier...\n');
  freeAnalyze(code);
}
