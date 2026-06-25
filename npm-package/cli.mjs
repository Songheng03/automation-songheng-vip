#!/usr/bin/env node
/**
 * my-automaton CLI — AI-powered code tools
 * 
 * Install: npm install -g automaton-cli
 * Usage:   ma analyze "text"
 *          ma review file.js
 *          ma security src/
 *          ma explain "code"
 *          ma summarize file.md
 *          ma refactor file.js
 *          ma complexity file.js
 * 
 * Works offline-first with local gateway at 127.0.0.1:8080
 * Falls back to automaton.automation.songheng.vip
 * Auto-generates demo API key on first run
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.automaton');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const VERSION = '1.0.0';

// Default endpoints
const ENDPOINTS = {
  analyze:     { path: '/v1/analyze',     credits: 1, desc: 'Deep text analysis' },
  summarize:   { path: '/v1/summarize',   credits: 2, desc: 'AI summarization' },
  review:      { path: '/v1/review',      credits: 5, desc: 'Full code review' },
  security:    { path: '/v1/security',    credits: 3, desc: 'Security scan' },
  explain:     { path: '/v1/explain',     credits: 2, desc: 'Code explanation' },
  refactor:    { path: '/v1/refactor',    credits: 5, desc: 'Refactoring suggestions' },
  complexity:  { path: '/v1/complexity',  credits: 2, desc: 'Complexity analysis' },
};

const USAGE = `
  ma <command> [input] [options]

  Commands:
    analyze <text|file>    Deep text analysis (1 credit)
    summarize <text|file>  AI summarization (2 credits)
    review <file>          Full code review (5 credits)
    security <file|dir>    Security vulnerability scan (3 credits)
    explain <code|file>    Code explanation (2 credits)
    refactor <file>        Refactoring suggestions (5 credits)
    complexity <file>      Complexity analysis (2 credits)
    
    free                  Get/refresh free trial key (3 requests/day)
    credits               Check remaining credits
    help                  Show this help

  Options:
    --format json         Output as JSON
    --host <url>          Custom API host
    --key <api-key>       API key (overrides config)

  Examples:
    ma analyze "What makes Go good for microservices?"
    ma review src/index.js
    ma security package.json
    ma explain --format json "async function fetchData()"
    echo "Hello world" | ma summarize
    cat main.js | ma review
`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============== CONFIG ==============

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {}
  return { apiKey: null, host: 'http://127.0.0.1:8080' };
}

function saveConfig(config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  return config;
}

// ============== HTTP HELPERS ==============

function parseUrl(urlStr) {
  // Support http:// and https://
  if (urlStr.startsWith('https://')) {
    const u = new URL(urlStr);
    return { protocol: 'https:', hostname: u.hostname, port: u.port || 443 };
  }
  // Default to http://
  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    urlStr = 'http://' + urlStr;
  }
  const u = new URL(urlStr);
  return { protocol: u.protocol, hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80) };
}

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const lib = options.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers, raw: true });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function apiCall(endpoint, input, apiKey, host) {
  const urlInfo = parseUrl(host);
  const body = JSON.stringify({ text: input, mode: Object.keys(ENDPOINTS).find(k => ENDPOINTS[k].path === endpoint) || 'analyze' });
  
  const options = {
    protocol: urlInfo.protocol,
    hostname: urlInfo.hostname,
    port: urlInfo.port,
    path: endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }
  };
  
  if (apiKey) {
    options.headers['X-API-Key'] = apiKey;
  }
  
  return await httpRequest(options, body);
}

// ============== FREE KEY ==============

async function getFreeKey(host) {
  const urlInfo = parseUrl(host);
  const body = JSON.stringify({ source: 'cli' });
  const options = {
    protocol: urlInfo.protocol,
    hostname: urlInfo.hostname,
    port: urlInfo.port,
    path: '/api/claim-free-key',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }
  };
  return await httpRequest(options, body);
}

async function checkCredits(apiKey, host) {
  const urlInfo = parseUrl(host);
  const options = {
    protocol: urlInfo.protocol,
    hostname: urlInfo.hostname,
    port: urlInfo.port,
    path: '/v1/credits',
    method: 'GET',
    headers: { 'X-API-Key': apiKey }
  };
  return await httpRequest(options, null);
}

// ============== READ STDIN ==============

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data.trim()));
  });
}

// ============== MAIN ==============

async function main() {
  const args = process.argv.slice(2);
  const stdin = await readStdin();
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
    console.log(`my-automaton CLI v${VERSION} — AI-powered developer tools`);
    console.log(USAGE);
    return;
  }

  const command = args[0];
  const config = loadConfig();
  let apiKey = config.apiKey;
  let host = config.host;
  
  // Parse options from args
  let inputArgs = [];
  let formatJson = false;
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--format' && args[i+1] === 'json') { formatJson = true; i++; }
    else if (args[i] === '--host' && args[i+1]) { host = args[++i]; }
    else if (args[i] === '--key' && args[i+1]) { apiKey = args[++i]; }
    else { inputArgs.push(args[i]); }
  }
  
  // Handle special commands
  if (command === 'free') {
    console.log('🔄 Getting free trial key...');
    const result = await getFreeKey(host);
    if (result.status === 200) {
      const key = result.data.apiKey;
      saveConfig({ ...config, apiKey: key, host });
      console.log(`✅ Free key: ${key}`);
      console.log(`   (50 credits, 1 per IP per 7 days)`);
      console.log(`   Saved to ${CONFIG_FILE}`);
    } else {
      console.log(`❌ ${result.data.error || 'Failed to get free key'}`);
      if (result.data.detail) console.log(`   ${result.data.detail}`);
      console.log(`\n💡 Buy credits: https://automation.songheng.vip/pricing`);
    }
    return;
  }
  
  if (command === 'credits') {
    if (!apiKey) {
      console.log('❌ No API key configured. Run: ma free');
      console.log('   Or buy: https://automation.songheng.vip/pricing');
      return;
    }
    const result = await checkCredits(apiKey, host);
    if (result.status === 200) {
      console.log(`💰 Credits remaining: ${result.data.credits}`);
    } else {
      console.log(`❌ ${result.data.error || 'Failed to check credits'}`);
    }
    return;
  }
  
  // Check if it's an API command
  if (!ENDPOINTS[command]) {
    console.log(`❌ Unknown command: ${command}`);
    console.log(`   Run "ma help" for available commands`);
    process.exit(1);
  }
  
  // Get input
  let input;
  if (stdin) {
    input = stdin;
  } else if (inputArgs.length > 0) {
    // Check if it's a file
    const filePath = inputArgs[0];
    if (fs.existsSync(filePath)) {
      input = fs.readFileSync(filePath, 'utf8');
      console.log(`📄 Reading: ${filePath}`);
    } else {
      input = inputArgs.join(' ');
    }
  } else {
    console.log(`❌ No input provided. Usage: ma ${command} <text|file>`);
    process.exit(1);
  }
  
  // Check API key
  if (!apiKey) {
    console.log('🔑 No API key. Getting free trial key...');
    const result = await getFreeKey(host);
    if (result.status === 200) {
      apiKey = result.data.apiKey;
      saveConfig({ ...config, apiKey, host });
      console.log(`✅ Got key: ${apiKey} (50 credits)\n`);
    } else {
      console.log(`❌ Could not get free key. ${result.data.error || ''}`);
      console.log('   Buy credits: https://automation.songheng.vip/pricing');
      process.exit(1);
    }
  }
  
  // Make API call
  const endpoint = ENDPOINTS[command];
  console.log(`🔄 ${endpoint.desc} (${endpoint.credits} credit${endpoint.credits > 1 ? 's' : ''})...\n`);
  
  try {
    const result = await apiCall(endpoint.path, input, apiKey, host);
    
    if (result.status === 200) {
      if (formatJson) {
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.log(result.data.result || result.data.analysis || result.data.summary || JSON.stringify(result.data, null, 2));
        if (result.data.creditsRemaining !== undefined) {
          console.log(`\n💰 Credits remaining: ${result.data.creditsRemaining}`);
        }
      }
    } else if (result.status === 402) {
      console.log(`❌ Insufficient credits.`);
      console.log(`   Buy more: https://automation.songheng.vip/pricing`);
    } else if (result.status === 429) {
      console.log(`❌ Rate limited. Free tier allows 3 requests/day.`);
      console.log(`   Buy credits for unlimited access: https://automation.songheng.vip/pricing`);
    } else {
      console.log(`❌ Error (${result.status}): ${result.data.error || result.data || 'Unknown error'}`);
    }
  } catch (err) {
    // Fallback to remote host
    if (host.includes('127.0.0.1') || host.includes('localhost')) {
      console.log(`⚠️  Local gateway not reachable. Trying remote...`);
      host = 'https://automation.songheng.vip';
      saveConfig({ apiKey, host });
      try {
        const result = await apiCall(endpoint.path, input, apiKey, host);
        if (result.status === 200) {
          console.log(result.data.result || result.data.analysis || result.data.summary || JSON.stringify(result.data, null, 2));
        } else {
          console.log(`❌ Remote error (${result.status}): ${result.data.error || 'Unknown'}`);
        }
      } catch (err2) {
        console.log(`❌ Cannot reach API. Tunnel may be down.`);
        console.log(`   Host: ${host}`);
        console.log(`   Error: ${err2.message}`);
      }
    } else {
      console.log(`❌ ${err.message}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
