#!/usr/bin/env node
/**
 * @my-automaton/cli — AI code review, security scanning, and text analysis
 * 
 * One command: npx @my-automaton/cli review --file app.js
 * Free tier: 3 requests/day/IP. Premium: get an API key.
 * 
 * https://automation.songheng.vip
 */

const https = require('https');
const http = require('http');

const API_HOST = 'automation.songheng.vip';
const FREE_TIER = true;

const HELP = `
Usage: npx @my-automaton/cli <command> [options]

Commands:
  review <file|code>     AI code review (bugs, performance, security)
  security <file|code>   Security vulnerability scan
  analyze <text>         Text analysis (sentiment, themes, entities)
  summarize <text>       AI summarization
  explain <file|code>    Code explanation in plain language
  refactor <file|code>   Refactoring suggestions
  complexity <file|code> Cyclomatic & cognitive complexity

Options:
  --file, -f <path>      Read input from file
  --language, -l <lang>  Language hint (js, py, ts, go, java, etc.)
  --key, -k <key>        API key for premium access (no free tier limit)
  --json                 Output raw JSON response
  --help, -h             Show this help

Environment:
  MY_AUTOMATON_KEY       API key for premium access

Examples:
  npx @my-automaton/cli review --file app.js
  npx @my-automaton/cli security "eval(req.body.input)"
  npx @my-automaton/cli summarize --file README.md --json
  echo "const x = 1" | npx @my-automaton/cli review
  MY_AUTOMATON_KEY=am_xxx npx @my-automaton/cli review --file server.ts

Free tier: 3 requests/day per IP. Upgrade at https://automation.songheng.vip/upgrade
`;

// Parse arguments
const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(HELP);
  process.exit(0);
}

const command = args[0];
const validCommands = ['review', 'security', 'analyze', 'summarize', 'explain', 'refactor', 'complexity'];
if (!validCommands.includes(command)) {
  console.error(`Unknown command: ${command}`);
  console.error(`Valid commands: ${validCommands.join(', ')}`);
  process.exit(1);
}

// Parse options
let filePath = null;
let language = 'auto';
let apiKey = process.env.MY_AUTOMATON_KEY || null;
let jsonOutput = false;
let inlineCode = null;

for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if ((a === '--file' || a === '-f') && i + 1 < args.length) filePath = args[++i];
  else if ((a === '--language' || a === '-l') && i + 1 < args.length) language = args[++i];
  else if ((a === '--key' || a === '-k') && i + 1 < args.length) apiKey = args[++i];
  else if (a === '--json') jsonOutput = true;
  else inlineCode = a;
}

// Spinner
const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let si = 0;
const spinInterval = setInterval(() => {
  process.stderr.write(`\r${spinner[si++ % spinner.length]} Analyzing...`);
}, 100);

async function main() {
  try {
    // Get code input
    let code = inlineCode;
    if (filePath) {
      const fs = require('fs');
      if (!fs.existsSync(filePath)) {
        clearInterval(spinInterval);
        process.stderr.write('\r');
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }
      code = fs.readFileSync(filePath, 'utf-8');
    }
    if (!code && process.stdin.isTTY === false) {
      // Read from stdin
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      code = Buffer.concat(chunks).toString('utf-8').trim();
    }
    if (!code) {
      clearInterval(spinInterval);
      process.stderr.write('\r');
      console.error('No input provided. Pipe code, pass --file, or provide inline code.');
      console.error('Examples:');
      console.error('  npx @my-automaton/cli review --file app.js');
      console.error('  cat app.js | npx @my-automaton/cli review');
      console.error('  npx @my-automaton/cli security "eval(x)"');
      process.exit(1);
    }

    // Detect language from file extension
    if (language === 'auto' && filePath) {
      const ext = filePath.split('.').pop().toLowerCase();
      const langMap = {
        js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
        py: 'python', rb: 'ruby', java: 'java', go: 'go', rs: 'rust',
        php: 'php', c: 'c', cpp: 'cpp', h: 'c', cs: 'csharp',
        swift: 'swift', kt: 'kotlin', scala: 'scala', r: 'r',
        sql: 'sql', sh: 'bash', bash: 'bash', yml: 'yaml', yaml: 'yaml',
        json: 'json', xml: 'xml', md: 'markdown', html: 'html', css: 'css',
        dockerfile: 'dockerfile', tf: 'terraform'
      };
      language = langMap[ext] || code.includes('def ') || code.includes('import ') ? 'python' :
                 code.includes('function ') || code.includes('const ') ? 'javascript' :
                 code.includes('package ') && code.includes('import ') ? 'go' : 'auto';
    }

    // Build request
    const endpoint = apiKey ? '/v1/' + command : '/v1/' + command;
    const body = JSON.stringify({
      code: code,
      text: code,
      language: language,
      mode: command === 'analyze' ? 'sentiment' : command
    });

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;

    const result = await fetchApi(endpoint, body, headers);

    clearInterval(spinInterval);
    process.stderr.write('\r');

    if (jsonOutput || (result.error && !result.result)) {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.result) {
      console.log(result.result);
    } else if (result.error) {
      console.error('Error:', result.error);
      process.exit(1);
    }

    // Show free tier info
    if (!apiKey && result.remaining !== undefined && result.remaining <= 3) {
      console.error(`\n📌 Free tier: ${result.remaining} requests remaining today.`);
      console.error(`   Get unlimited: https://automation.songheng.vip/upgrade`);
    }

  } catch (e) {
    clearInterval(spinInterval);
    process.stderr.write('\r');
    console.error('Error:', e.message);
    process.exit(1);
  }
}

function fetchApi(endpoint, body, headers) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: API_HOST,
      path: endpoint,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000
    };

    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ error: data.slice(0, 200) }); }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out (30s)')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

main();
