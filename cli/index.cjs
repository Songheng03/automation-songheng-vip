#!/usr/bin/env node
/**
 * my-automaton.cjs
 * CLI tool for my-automaton API services.
 * 
 * Installation:
 *   npm install -g /root/automaton/cli
 *   # or just: node /root/automaton/cli/index.cjs review --code "..." 
 * 
 * Usage:
 *   my-automaton analyze --text "Your text here"
 *   my-automaton review --file app.js
 *   my-automaton security --code "..." --language javascript
 *   my-automaton summarize --text "Long text to summarize"
 *   my-automaton explain --code "console.log('hi')" --language javascript
 *   my-automaton refactor --file app.js
 *   my-automaton complexity --file app.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'automation.songheng.vip';
const API_PROTO = 'https:';

const ENDPOINTS = {
  analyze: '/v1/analyze',
  summarize: '/v1/summarize',
  review: '/v1/review',
  security: '/v1/security',
  explain: '/v1/explain',
  refactor: '/v1/refactor',
  complexity: '/v1/complexity'
};

// Free tier endpoints (3/day/IP, no key needed)
const FREE_ENDPOINTS = {
  'free-review': '/api/free/review',
  'free-analyze': '/api/free/analyze',
  'free-summarize': '/api/free/summarize',
  'free-security': '/api/free/security',
  'free-explain': '/api/free/explain',
  'free-refactor': '/api/free/refactor',
  'free-complexity': '/api/free/complexity'
};

function apiRequest(method, path, body, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    };
    if (apiKey) headers['X-API-Key'] = apiKey;
    
    const opts = {
      hostname: API_BASE,
      port: 443,
      path: path,
      method: method,
      headers: headers,
      timeout: 30000
    };
    
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(postData);
    req.end();
  });
}

function getApiKey() {
  // Check env var
  if (process.env.MY_AUTOMATON_KEY) return process.env.MY_AUTOMATON_KEY;
  // Check config file
  const configPath = path.join(process.env.HOME || '/root', '.my-automaton.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config.apiKey;
  } catch {}
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === '--help' || command === '-h') {
    console.log(`
  🤖 my-automaton — AI Code Review & Text Analysis CLI

  Usage:
    my-automaton <command> [options]

  Commands:
    analyze   <--text "..." | --file path>    Analyze text
    summarize <--text "..." | --file path>    Summarize content
    review    <--code "..." | --file path>    Review code
    security  <--code "..." | --file path>    Security scan
    explain   <--code "..." | --file path>    Explain code
    refactor  <--file path>                   Refactor code
    complexity <--file path>                  Complexity analysis
    free-*    (same commands, uses free tier)

  Options:
    --text "..."       Input text directly
    --file path        Read from file
    --code "..."       Input code directly
    --language lang    Language (js, py, sol, rs, go, etc.)
    --key KEY          API key (or set MY_AUTOMATON_KEY env)
    --json             Output raw JSON

  Examples:
    my-automaton review --file app.js
    my-automaton security --code 'eval(req.body)' --language js
    my-automaton free-review --file app.js
    MY_AUTOMATON_KEY=am_xxx my-automaton analyze --text "Hello world"
    `);
    return;
  }

  // Parse options
  const opts = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      opts[key] = val;
      if (val !== true) i++;
    }
  }

  const apiKey = opts.key || getApiKey();
  const isFree = command.startsWith('free-');
  const service = isFree ? command.replace('free-', '') : command;
  
  if (!ENDPOINTS[service]) {
    console.error(`❌ Unknown command: ${command}`);
    console.error(`   Available: ${Object.keys(ENDPOINTS).join(', ')}`);
    process.exit(1);
  }

  // Get input content
  let inputText = opts.text || opts.code || '';
  if (opts.file && fs.existsSync(opts.file)) {
    inputText = fs.readFileSync(opts.file, 'utf-8');
  }
  if (!inputText && !opts.file) {
    // Try reading from stdin
    if (!process.stdin.isTTY) {
      inputText = fs.readFileSync('/dev/stdin', 'utf-8').trim();
    }
  }
  if (!inputText) {
    console.error(`❌ No input provided. Use --text, --file, or pipe stdin.`);
    process.exit(1);
  }

  const body = { 
    text: inputText,
    code: inputText,
    [isFree ? 'code' : 'text']: inputText,
    language: opts.language || 'auto'
  };

  const endpoint = isFree 
    ? FREE_ENDPOINTS[command] || `/api/free/${service}`
    : ENDPOINTS[service];
  
  if (!apiKey && !isFree) {
    console.log('⚠️  No API key found. Using FREE tier (3/day/IP limit).');
    console.log('   Get a key: https://automation.songheng.vip/get-started.html\n');
  }

  try {
    const result = isFree || !apiKey
      ? await apiRequest('POST', `/api/free/${service}`, { code: inputText, language: opts.language || 'auto' })
      : await apiRequest('POST', endpoint, body, apiKey);
    
    if (opts.json) {
      console.log(JSON.stringify(result.data, null, 2));
      return;
    }

    if (result.status === 200) {
      const d = result.data;
      if (d.summary) console.log(d.summary);
      else if (d.issues) {
        console.log(`Found ${d.issues.length} issues:\n`);
        d.issues.forEach((issue, i) => {
          console.log(`  ${i+1}. [${issue.severity}] ${issue.type} (line ${issue.line})`);
          console.log(`     ${issue.message}`);
          console.log();
        });
        if (d.score !== undefined) console.log(`Score: ${d.score}/100`);
        if (d.overall) console.log(`\n${d.overall}`);
      } else if (d.result) console.log(d.result);
      else console.log(JSON.stringify(d, null, 2));
    } else if (result.status === 402) {
      console.log('❌ Out of credits. Purchase more: https://automation.songheng.vip/get-started.html');
      console.log(`   Response: ${JSON.stringify(result.data)}`);
    } else if (result.status === 429) {
      console.log('❌ Rate limited (3 free requests/day). Get a key: https://automation.songheng.vip/get-started.html');
    } else {
      console.log(`❌ Error ${result.status}: ${JSON.stringify(result.data)}`);
    }
  } catch (e) {
    console.error(`❌ Request failed: ${e.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
