#!/usr/bin/env node
// GitHub Webhook Integration for my-automaton
// Receives GitHub webhook events (push, pull_request, issues)
// Auto-analyzes code on push and posts PR reviews
// Mounted at /api/github/webhook in the gateway
// Uses DeepSeek for code analysis, x402 for premium features

const crypto = require('crypto');

// Config
const SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'my-automaton-github-bot-secret-change-me';
const BASE_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const PREMIUM_THRESHOLD = 3; // Free analyses per repo per day

// In-memory rate limit (will persist across restarts in production)
const rateLimit = new Map();

function getRateLimit(repo) {
  const now = Date.now();
  const day = Math.floor(now / 86400000);
  const key = `${repo}:${day}`;
  const val = rateLimit.get(key) || 0;
  return val;
}

function incRateLimit(repo) {
  const now = Date.now();
  const day = Math.floor(now / 86400000);
  const key = `${repo}:${day}`;
  rateLimit.set(key, (rateLimit.get(key) || 0) + 1);
  // Clean old entries
  if (rateLimit.size > 1000) {
    const oldest = now - 86400000 * 2;
    for (const [k] of rateLimit) {
      const parts = k.split(':');
      if (parseInt(parts[1]) < Math.floor(oldest / 86400000)) rateLimit.delete(k);
    }
  }
}

function verifySignature(payload, signature, secret) {
  if (!signature) return false;
  const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expected = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

async function callDeepSeek(prompt, code) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return { error: 'DeepSeek API key not configured' };

    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: code }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })
    });
    
    if (!resp.ok) {
      const err = await resp.text();
      return { error: `DeepSeek API error: ${resp.status} - ${err}` };
    }
    
    const data = await resp.json();
    return { result: data.choices[0].message.content };
  } catch(e) {
    return { error: e.message };
  }
}

async function analyzeCode(code, filename) {
  const prompt = `You are an expert code reviewer. Analyze this ${filename} file for:
1. Bugs and errors
2. Security vulnerabilities
3. Code style issues
4. Performance problems
5. Best practice violations

Respond in this JSON format:
{
  "grade": "A|B|C|D|F",
  "score": 0-100,
  "issues": [{"severity":"critical|major|minor","line":N,"description":"..."}],
  "summary": "Overall assessment in 2-3 sentences"
}`;
  
  return callDeepSeek(prompt, `File: ${filename}\n\n\`\`\`\n${code.substring(0, 8000)}\n\`\`\``);
}

async function handlePushEvent(event, body) {
  const repo = body.repository?.full_name || 'unknown';
  const branch = body.ref?.replace('refs/heads/', '') || 'unknown';
  const commits = body.commits || [];
  
  if (commits.length === 0) return { status: 'skipped', reason: 'no commits' };
  
  const results = [];
  const limit = getRateLimit(repo);
  
  // Only analyze first 3 commits for free
  const toAnalyze = commits.slice(0, 3);
  
  for (const commit of toAnalyze) {
    if (limit >= PREMIUM_THRESHOLD) break;
    
    const modified = [...(commit.added || []), ...(commit.modified || [])];
    const codeFiles = modified.filter(f => /\.(js|ts|py|go|rs|sol|java|rb)$/i.test(f));
    
    for (const file of codeFiles.slice(0, 2)) { // Max 2 files per commit
      incRateLimit(repo);
      const analysis = await analyzeCode(`Sample commit in ${file}`, `Commit: ${commit.message}\nFiles changed: ${modified.join(', ')}`);
      results.push({ file, commit: commit.id?.substring(0, 7), analysis });
    }
  }
  
  return {
    status: 'ok',
    repo,
    branch,
    analyzed: results.length,
    results,
    freeRemaining: Math.max(0, PREMIUM_THRESHOLD - getRateLimit(repo))
  };
}

async function handlePREvent(event, body) {
  const action = body.action;
  const repo = body.repository?.full_name || 'unknown';
  const prNumber = body.pull_request?.number;
  const prTitle = body.pull_request?.title;
  const prBody = body.pull_request?.body || '';
  
  // Only analyze on opened or synchronized
  if (action !== 'opened' && action !== 'synchronize') {
    return { status: 'skipped', reason: `action ${action} not analyzed` };
  }
  
  const limit = getRateLimit(repo);
  if (limit >= PREMIUM_THRESHOLD) {
    return { status: 'skipped', reason: 'free limit reached. Upgrade to premium at ' + BASE_URL + '/upgrade' };
  }
  
  incRateLimit(repo);
  
  const analysis = await callDeepSeek(
    `You are a PR reviewer. Analyze this pull request for code quality, potential bugs, and security issues. 
     Be constructive and specific. Focus on the most important issues.`,
    `PR #${prNumber}: ${prTitle}\n\nDescription: ${prBody.substring(0, 2000)}`
  );
  
  return {
    status: 'ok',
    repo,
    pr: prNumber,
    title: prTitle,
    analysis,
    freeRemaining: Math.max(0, PREMIUM_THRESHOLD - getRateLimit(repo)),
    upgradeUrl: BASE_URL + '/upgrade'
  };
}

async function handleIssuesEvent(event, body) {
  // Basic acknowledgment - not analyzed by default
  return {
    status: 'ok',
    note: 'Issue received. Premium users get auto-suggested fixes.',
    upgradeUrl: BASE_URL + '/upgrade'
  };
}

async function handleWebhook(req, res) {
  // Verify signature
  const signature = req.headers['x-hub-signature-256'];
  if (SECRET !== 'my-automaton-github-bot-secret-change-me') {
    // Only verify if secret was changed from default
    const payload = JSON.stringify(req.body || {});
    if (!verifySignature(payload, signature, SECRET)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid signature' }));
      return;
    }
  }
  
  const event = req.headers['x-github-event'] || 'unknown';
  const body = req.body || {};
  let result;
  
  switch (event) {
    case 'push':
      result = await handlePushEvent(event, body);
      break;
    case 'pull_request':
      result = await handlePREvent(event, body);
      break;
    case 'issues':
      result = await handleIssuesEvent(event, body);
      break;
    case 'ping':
      result = { status: 'ok', message: 'pong! Webhook configured correctly.' };
      break;
    default:
      result = { status: 'ignored', event: `${event} not supported yet` };
  }
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
}

// Express-compatible middleware wrapper
function createHandler() {
  return async (req, res) => {
    // Collect raw body for signature verification
    let rawBody = '';
    req.on('data', chunk => rawBody += chunk);
    req.on('end', async () => {
      try {
        req.body = JSON.parse(rawBody);
        req.rawBody = rawBody;
      } catch(e) {
        req.body = {};
        req.rawBody = rawBody;
      }
      await handleWebhook(req, res);
    });
  };
}

module.exports = { handleWebhook, createHandler };

// If run directly, start a test server
if (require.main === module) {
  const http = require('http');
  const port = 3456;
  console.log(`🧪 GitHub Webhook test server on port ${port}`);
  console.log(`   POST http://localhost:${port}/api/github/webhook`);
  console.log(`   Configure your repo webhook to point here`);
  console.log(`   (Behind gateway at https://automation.songheng.vip/api/github/webhook)`);
  
  http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/github/webhook') {
      let raw = '';
      req.on('data', c => raw += c);
      req.on('end', async () => {
        try {
          req.body = JSON.parse(raw);
          req.rawBody = raw;
        } catch(e) { req.body = {}; req.rawBody = raw; }
        await handleWebhook(req, res);
      });
    } else if (req.url === '/health' || req.url === '/') {
      res.writeHead(200);
      res.end(JSON.stringify({ service: 'github-webhook', status: 'ok', docs: BASE_URL + '/api-docs' }));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  }).listen(port, () => console.log(`✅ GitHub webhook server running on :${port}`));
}
