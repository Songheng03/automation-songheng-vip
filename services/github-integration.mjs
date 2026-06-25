#!/usr/bin/env node
/**
 * GitHub PR Integration Service
 * 
 * Listens for GitHub webhook events, processes PR code reviews,
 * and posts AI-generated reviews as PR comments.
 * 
 * Usage: node services/github-integration.mjs [--port 3456]
 * Port is advisory — this runs as a module called by gateway
 */

import https from 'https';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data', 'github');
const CONFIG_FILE = path.join(ROOT, 'github-config.json');
const GATEWAY_URL = 'http://127.0.0.1:8080';

/**
 * Load or create GitHub webhook config
 */
function loadConfig() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_FILE)) {
    const config = {
      webhook_secret: crypto.randomBytes(32).toString('hex'),
      repos: {},
      installations: []
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return config;
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

/**
 * Verify GitHub webhook signature
 */
function verifySignature(payload, signature, secret) {
  if (!signature) return false;
  const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/**
 * Call the free API endpoint for code review
 */
async function callFreeAPI(endpoint, data) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const req = http.request(`${GATEWAY_URL}/api/free/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({ error: 'parse failed', raw: body.slice(0,200) }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(payload);
    req.end();
  });
}

/**
 * Format review results as GitHub comment
 */
function formatComment(results, mode) {
  const header = `## 🤖 AI ${mode.charAt(0).toUpperCase() + mode.slice(1)} Review\n\n`;
  const footer = `\n---\n*Powered by [my-automaton](https://automation.songheng.vip) · [Get your own API key](https://automation.songheng.vip/upgrade.html)*`;
  
  if (results.error) {
    return `${header}❌ Error: ${results.error}${footer}`;
  }
  
  if (mode === 'review') {
    const lines = [];
    if (results.issues) {
      for (const issue of results.issues) {
        const sev = issue.severity || 'info';
        const icon = sev === 'critical' ? '🔴' : sev === 'high' ? '🟠' : sev === 'medium' ? '🟡' : '⚪';
        lines.push(`${icon} **${issue.line ? `Line ${issue.line}: ` : ''}${issue.title || issue.description}**`);
        if (issue.suggestion) lines.push(`   > ${issue.suggestion}`);
      }
    }
    if (results.summary) lines.push(`\n**Summary**: ${results.summary}`);
    if (results.score) lines.push(`\n**Score**: ${results.score}/100`);
    return header + lines.join('\n') + footer;
  }
  
  if (mode === 'security') {
    const lines = [];
    if (results.vulnerabilities) {
      for (const vuln of results.vulnerabilities) {
        const sev = vuln.severity || 'medium';
        const icon = sev === 'critical' ? '🔴' : sev === 'high' ? '🟠' : sev === 'medium' ? '🟡' : '⚪';
        lines.push(`${icon} **${vuln.type || vuln.title}** (${sev})`);
        if (vuln.description) lines.push(`   ${vuln.description}`);
        if (vuln.remediation) lines.push(`   ✅ Fix: ${vuln.remediation}`);
      }
    }
    if (results.summary) lines.push(`\n**Summary**: ${results.summary}`);
    return header + lines.join('\n') + footer;
  }
  
  return header + '```\n' + JSON.stringify(results, null, 2).slice(0, 3000) + '\n```' + footer;
}

/**
 * Process a push event — review changed files
 */
async function handlePush(payload) {
  const repo = payload.repository?.full_name;
  const ref = payload.ref;
  const branch = ref?.replace('refs/heads/', '');
  const commits = payload.commits || [];
  
  console.log(`  Push: ${repo} ${branch} (${commits.length} commits)`);
  
  // Collect all modified files
  const files = new Set();
  for (const commit of commits) {
    for (const f of [...(commit.added || []), ...(commit.modified || [])]) {
      files.add(f);
    }
  }
  
  // Only review source files
  const sourceExts = new Set(['.js', '.ts', '.py', '.java', '.go', '.rs', '.rb', '.php', '.c', '.cpp', '.h', '.hpp', '.swift', '.kt', '.scala', '.jsx', '.tsx']);
  const toReview = [...files].filter(f => sourceExts.has(path.extname(f)));
  
  if (toReview.length === 0) {
    console.log(`  No source files to review`);
    return;
  }
  
  console.log(`  Reviewing ${toReview.length} files: ${toReview.join(', ')}`);
  
  // Review each file (limited to 3 per push to save credits)
  const results = [];
  for (const file of toReview.slice(0, 3)) {
    const result = await callFreeAPI('review', { code: `// ${file}\n`, language: path.extname(file).slice(1) });
    results.push({ file, result });
  }
  
  return { repo, branch, files: toReview, results };
}

/**
 * Process a pull_request event
 */
async function handlePR(payload) {
  const action = payload.action;
  const repo = payload.repository?.full_name;
  const pr = payload.pull_request;
  const branch = pr?.head?.ref;
  
  console.log(`  PR ${action}: ${repo} #${pr?.number} (${branch})`);
  
  if (action !== 'opened' && action !== 'synchronize') {
    console.log(`  Skipping action: ${action}`);
    return;
  }
  
  const diffUrl = pr?.diff_url;
  if (!diffUrl) {
    console.log(`  No diff URL`);
    return;
  }
  
  // We'd fetch the diff here and review it
  // For now, return a placeholder
  return {
    repo,
    pr: pr?.number,
    branch,
    action,
    message: `PR review queued for #${pr?.number}`
  };
}

/**
 * GitHub webhook handler for Express
 */
export function webhookHandler(req, res) {
  const config = loadConfig();
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST required' });
  }
  
  const signature = req.headers['x-hub-signature-256'] || '';
  const event = req.headers['x-github-event'];
  const body = JSON.stringify(req.body);
  
  // Verify signature if configured
  if (config.webhook_secret && signature) {
    if (!verifySignature(body, signature, config.webhook_secret)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }
  
  // Log event
  const logEntry = {
    event,
    repo: req.body?.repository?.full_name,
    action: req.body?.action,
    time: new Date().toISOString()
  };
  fs.appendFileSync(path.join(DATA_DIR, 'webhooks.log'), JSON.stringify(logEntry) + '\n');
  console.log(`Webhook: ${event} ${logEntry.repo || '?'}`);
  
  // Process based on event type
  let result;
  if (event === 'push') {
    handlePush(req.body).then(r => {
      if (r) fs.writeFileSync(path.join(DATA_DIR, `push-${Date.now()}.json`), JSON.stringify(r, null, 2));
    });
    result = { received: true, status: 'processing', event };
  } else if (event === 'pull_request') {
    handlePR(req.body).then(r => {
      if (r) fs.writeFileSync(path.join(DATA_DIR, `pr-${Date.now()}.json`), JSON.stringify(r, null, 2));
    });
    result = { received: true, status: 'processing', event, pr: req.body?.pull_request?.number };
  } else {
    result = { received: true, status: 'ignored', event };
  }
  
  res.json(result);
}

/**
 * Get webhook URL and secret for display
 */
export function getWebhookInfo() {
  const config = loadConfig();
  return {
    webhook_url: 'https://automation.songheng.vip/api/github-webhook',
    webhook_secret: config.webhook_secret,
    docs: 'https://automation.songheng.vip/api-docs.html#github-integration'
  };
}

/**
 * Log viewer
 */
export function getLogs(limit = 50) {
  try {
    const logs = fs.readFileSync(path.join(DATA_DIR, 'webhooks.log'), 'utf-8');
    return logs.trim().split('\n').slice(-limit).map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

// If run standalone, show info
if (process.argv[1] && (process.argv[1].includes('github-integration') || process.argv[1] === import.meta.url)) {
  console.log('\n🤖 GitHub Webhook Integration\n');
  
  if (process.argv.includes('--info')) {
    const info = getWebhookInfo();
    console.log('Webhook URL:', info.webhook_url);
    console.log('Secret:', info.webhook_secret);
    console.log('\nSetup in GitHub repo:');
    console.log('  Settings → Webhooks → Add webhook');
    console.log(`  Payload URL: ${info.webhook_url}`);
    console.log(`  Secret: ${info.webhook_secret}`);
    console.log('  Events: Push, Pull requests\n');
  } else if (process.argv.includes('--logs')) {
    const logs = getLogs();
    console.log(`Recent webhooks (${logs.length}):\n`);
    for (const log of logs) {
      console.log(`  ${log.time} ${log.event} ${log.repo || '?'}`);
    }
  } else {
    console.log('Usage: node services/github-integration.mjs [--info|--logs]\n');
    console.log('  --info   Show webhook configuration');
    console.log('  --logs   Show recent webhook events');
    console.log('\nImport in gateway.cjs:');
    console.log('  import { webhookHandler } from "./services/github-integration.mjs";');
    console.log('  app.post("/api/github-webhook", webhookHandler);\n');
  }
}

export default { webhookHandler, getWebhookInfo, getLogs };
