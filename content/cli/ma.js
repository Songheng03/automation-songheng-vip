#!/usr/bin/env node
// my-automaton CLI — AI code review from your terminal
// Install: npm install -g my-automaton-cli
// Usage: ma review <file> | ma analyze "text" | ma summarize <file>

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'automation.songheng.vip';
const FREE_PATH = '/free';
const PAID_PATH = '/v1';

const ENDPOINTS = {
  review:     { credits: 5, desc: 'AI code review' },
  security:   { credits: 3, desc: 'Security scan' },
  explain:    { credits: 2, desc: 'Code explanation' },
  refactor:   { credits: 5, desc: 'Refactoring suggestions' },
  complexity: { credits: 2, desc: 'Complexity analysis' },
  analyze:    { credits: 1, desc: 'Text analysis' },
  summarize:  { credits: 2, desc: 'Text summarization' },
};

const LANG_MAP = {
  '.js': 'javascript', '.ts': 'typescript', '.py': 'python',
  '.go': 'go', '.rs': 'rust', '.java': 'java', '.c': 'c',
  '.cpp': 'cpp', '.rb': 'ruby', '.php': 'php', '.sol': 'solidity',
  '.html': 'html', '.css': 'css', '.json': 'json', '.yml': 'yaml',
  '.yaml': 'yaml', '.sh': 'bash', '.md': 'markdown',
};

function detectLang(filename) {
  const ext = path.extname(filename).toLowerCase();
  return LANG_MAP[ext] || 'unknown';
}

function request(endpoint, apiKey, body) {
  return new Promise((resolve, reject) => {
    const usePath = apiKey ? PAID_PATH : FREE_PATH;
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (apiKey) headers['X-API-Key'] = apiKey;

    const req = https.request({
      hostname: BASE, port: 443, path: `${usePath}/${endpoint}`,
      method: 'POST', headers,
    }, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function printResult(data, format) {
  if (data.status === 429 || data.status === 402) {
    console.error('⚠️  Free tier limit reached (3/day). Get an API key:');
    console.error('   https://automation.songheng.vip/pricing.html');
    console.error('   Then set: export MA_API_KEY=am_xxx');
    process.exit(1);
  }
  if (data.status >= 400) {
    console.error('❌ Error:', data.body?.error || JSON.stringify(data.body));
    process.exit(1);
  }
  const result = data.body?.result || data.body?.summary || data.body?.analysis || data.body;
  if (format === 'json') {
    console.log(JSON.stringify(data.body, null, 2));
  } else {
    console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
  }
}

function help() {
  console.log(`
🤖 my-automaton CLI — AI Code Review & Text Analysis

USAGE:
  ma <command> [options] <input>

COMMANDS:
  review <file>          AI code review (5 credits)
  security <file>        Security vulnerability scan (3 credits)
  explain <file>         Code explanation (2 credits)
  refactor <file>        Refactoring suggestions (5 credits)
  complexity <file>      Complexity analysis (2 credits)
  analyze <text|file>    Text analysis (1 credit)
  summarize <text|file>  Text summarization (2 credits)

OPTIONS:
  --lang <language>      Force language (auto-detected from file extension)
  --output <format>      Output format: text (default) or json
  --api-key <key>        API key (or set MA_API_KEY env var)
  --help                 Show this help
  --pricing              Show pricing info

FREE TIER:
  3 requests per day per IP. No API key needed.
  For unlimited use, get an API key at:
  https://automation.songheng.vip/pricing.html

EXAMPLES:
  ma review src/app.js
  ma security --lang python < main.py
  ma analyze "Customer feedback: the product is great but shipping was slow"
  ma summarize README.md --output json
  echo 'function add(a,b){return a+b}' | ma review --lang javascript -

ENVIRONMENT:
  MA_API_KEY             API key for paid requests
`);
}

function pricing() {
  console.log(`
💰 Pricing — automation.songheng.vip

  Endpoint      Credits/Request    Description
  ─────────     ───────────────    ───────────
  review              5            Full AI code review
  security            3            Security vulnerability scan
  explain             2            Code explanation
  refactor            5            Refactoring suggestions
  complexity          2            Code complexity analysis
  analyze             1            Text analysis & insights
  summarize           2            AI summarization

  Plans:
  ──────       ─────    ──────────
  Starter      HK$38    500 credits (~100 reviews)
  Pro          HK$78    1,100 credits (~220 reviews)
  Team         HK$198   3,000 credits (~600 reviews)
  Enterprise   HK$388   6,500 credits (~1,300 reviews)

  Free tier: 3 requests/day/IP (no API key needed)

  Purchase: https://automation.songheng.vip/pricing.html
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help') || args.includes('-h')) { help(); return; }
  if (args.includes('--pricing')) { pricing(); return; }

  const command = args[0];
  if (!ENDPOINTS[command]) {
    console.error(`Unknown command: ${command}`);
    console.error(`Available: ${Object.keys(ENDPOINTS).join(', ')}`);
    process.exit(1);
  }

  const apiKey = args.includes('--api-key')
    ? args[args.indexOf('--api-key') + 1]
    : process.env.MA_API_KEY;

  const format = args.includes('--output')
    ? args[args.indexOf('--output') + 1]
    : 'text';

  const lang = args.includes('--lang')
    ? args[args.indexOf('--lang') + 1]
    : null;

  const inputArg = args.filter(a => !a.startsWith('--') && a !== command).join(' ');

  let text = '';
  let detectedLang = lang || 'unknown';

  if (!inputArg || inputArg === '-') {
    // Read from stdin
    text = fs.readFileSync('/dev/stdin', 'utf-8');
    detectedLang = lang || 'unknown';
  } else if (fs.existsSync(inputArg)) {
    text = fs.readFileSync(inputArg, 'utf-8');
    detectedLang = lang || detectLang(inputArg);
  } else {
    text = inputArg;
  }

  if (!text.trim()) {
    console.error('No input provided. Use: ma <command> <file|text>');
    process.exit(1);
  }

  const body = { text, language: detectedLang };
  if (detectedLang !== 'unknown') body.language = detectedLang;

  const ep = ENDPOINTS[command];
  process.stderr.write(`🤖 ${ep.desc} (${ep.credits} credits)... `);

  try {
    const result = await request(command, apiKey, body);
    process.stderr.write('done\n');
    printResult(result, format);
  } catch (err) {
    process.stderr.write('failed\n');
    console.error('Network error:', err.message);
    process.exit(1);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
