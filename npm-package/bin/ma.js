#!/usr/bin/env node
// my-automaton CLI — AI-powered code & text services
// Install: npm install -g automaton-cli
// Usage:  ma analyze "your text"
//         echo "code" | ma review
const https = require('https');

const API = process.env.MA_API || 'https://automation.songheng.vip';
const KEY = process.env.MA_KEY || '';

const HELP = `
Usage: ma <command> [text|file|options]

Commands:
  analyze <text>       AI text analysis (1¢)
  summarize <text>     Text summarization (2¢)
  review [file]        Code review from file or stdin (5¢)
  security [file]      Security scan (3¢)
  explain <code>       Explain code snippet (2¢)
  refactor [file]      Refactoring suggestions (5¢)
  complexity [file]    Complexity analysis (2¢)
  
Options:
  --free               Use free tier (3/day limit)
  --key <key>          Set API key inline
  -h, --help           Show this help

Environment:
  MA_API    API endpoint (default: https://automation.songheng.vip)
  MA_KEY    Your API key from https://automation.songheng.vip/pricing.html

Examples:
  ma analyze "The quick brown fox jumps over the lazy dog"
  ma review src/index.js
  cat main.py | ma review
  ma --free summarize "Long text here..."
`;

const ENDPOINTS = {
  analyze:   '/v1/analyze',
  summarize: '/v1/summarize',
  review:    '/v1/review',
  security:  '/v1/security',
  explain:   '/v1/explain',
  refactor:  '/v1/refactor',
  complexity:'/v1/complexity',
};

function apiCall(endpoint, body, key, isFree) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ ...body, free: isFree });
    const u = new URL(API + endpoint);
    const opts = {
      hostname: u.hostname, port: u.port || 443, path: u.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      rejectUnauthorized: false,
    };
    if (key) opts.headers['X-API-Key'] = key;
    
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode === 402) {
          reject(new Error(`402 Payment Required — Get an API key at ${API}/pricing.html`));
        } else if (res.statusCode === 429) {
          reject(new Error(`429 Rate Limited — Free tier: 3/day. Get an API key at ${API}/pricing.html`));
        } else if (res.statusCode === 200) {
          try { resolve(JSON.parse(body)); } catch(e) { resolve({ raw: body }); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function color(s, c) {
  const colors = { red: 31, green: 32, yellow: 33, blue: 34, cyan: 36, gray: 90 };
  return `\x1b[${colors[c] || 0}m${s}\x1b[0m`;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    console.log(HELP); return;
  }

  const cmd = args[0].toLowerCase();
  const endpoint = ENDPOINTS[cmd];
  
  if (!endpoint) {
    console.error(color(`Unknown command: ${cmd}`, 'red'));
    console.log(HELP); process.exit(1);
  }

  const freeIdx = args.indexOf('--free');
  const isFree = freeIdx !== -1;
  if (isFree) args.splice(freeIdx, 1);
  
  const keyIdx = args.indexOf('--key');
  let key = KEY;
  if (keyIdx !== -1 && args[keyIdx + 1]) {
    key = args[keyIdx + 1];
    args.splice(keyIdx, 2);
  }

  args.shift(); // remove command
  let inputText = args.join(' ');
  
  // Read from file or stdin if no text provided
  if (!inputText) {
    // Check if last arg is a file
    const potentialFile = args[args.length - 1];
    if (potentialFile && !potentialFile.startsWith('-')) {
      const fs = require('fs');
      try {
        inputText = fs.readFileSync(potentialFile, 'utf-8');
      } catch(e) {
        // Read from stdin
        const stdin = await new Promise(resolve => {
          let d = '';
          process.stdin.setEncoding('utf-8');
          process.stdin.on('data', c => d += c);
          process.stdin.on('end', () => resolve(d));
        });
        if (stdin.trim()) inputText = stdin;
      }
    } else {
      // Read from stdin
      const stdin = await new Promise(resolve => {
        let d = '';
        process.stdin.setEncoding('utf-8');
        process.stdin.on('data', c => d += c);
        process.stdin.on('end', () => resolve(d));
      });
      if (stdin.trim()) inputText = stdin;
    }
  }
  
  if (!inputText || !inputText.trim()) {
    console.error(color('Error: No input text provided.', 'red'));
    console.log('Pipe input: echo "text" | ma ' + cmd);
    process.exit(1);
  }

  if (!key && !isFree) {
    console.warn(color('⚠ No API key set. Using free tier (3/day limit).', 'yellow'));
    console.warn(color(`  Get a key at ${API}/pricing.html`, 'yellow'));
    console.warn(color('  Or set MA_KEY environment variable.', 'yellow'));
  }

  const body = { text: inputText.trim(), mode: cmd };
  if (key) body.apiKey = key;
  
  console.error(color(`\n🔍 ${cmd}...`, 'cyan'));
  const start = Date.now();
  
  try {
    const result = await apiCall(endpoint, body, key, isFree);
    const ms = Date.now() - start;
    
    if (result.result) {
      console.log('\n' + result.result);
    } else if (result.analysis || result.summary || result.review || result.issues) {
      Object.entries(result).forEach(([k, v]) => {
        if (typeof v === 'string' && k !== 'raw') console.log(`\n${color(k.toUpperCase(), 'green')}\n${v}`);
      });
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
    
    console.error(color(`\n✓ Done in ${ms}ms`, 'green'));
  } catch(e) {
    console.error(color(`\n✗ ${e.message}`, 'red'));
    process.exit(1);
  }
}

main().catch(e => { console.error(color(e.message, 'red')); process.exit(1); });
