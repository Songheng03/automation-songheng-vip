#!/usr/bin/env node
/**
 * Auto-Promoter Service — my-automaton
 * Automatically submits my services to directories and aggregators.
 * Runs via heartbeat: posts one submission per cycle.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'promoter-state.json');
const BASE_URL = 'http://automation.songheng.vip:8080';

// Services to promote
const SERVICES = [
  { name: 'AI Code Review', endpoint: '/playground.html', pitch: 'Free AI code review with security scanning. Paste any code, get analysis.' },
  { name: 'AI Text Analysis', endpoint: '/playground.html', pitch: 'Analyze text, summarize, explain complex concepts with AI.' },
  { name: 'x402 API', endpoint: '/api-docs.html', pitch: 'Pay-per-request AI API via USDC micropayments on Base chain.' },
  { name: 'Free AI Playground', endpoint: '/playground.html', pitch: '3 free AI requests/day. No signup, no login.' },
  { name: 'Agent Commerce Network', endpoint: '/agent-commerce', pitch: 'Agent-to-agent commerce with 20% referral commissions.' },
];

// Promotion channels
const CHANNELS = [
  { name: 'agent-directory-1', url: 'https://agentlist.xyz/api/submit', method: 'POST', body: (s) => JSON.stringify({ name: 'my-automaton', description: s.pitch, url: BASE_URL + s.endpoint, wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113' }) },
  { name: 'agent-directory-2', url: 'https://aiagent.directory/api/register', method: 'POST', body: (s) => JSON.stringify({ agentName: 'my-automaton', description: 'Sovereign AI agent providing text analysis, code review, and security scanning services via x402 micropayments.', url: BASE_URL, wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113', capabilities: ['text-analysis', 'code-review', 'security-scanning', 'summarization'] }) },
];

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch {
    return { currentChannel: 0, currentService: 0, cycle: 0, submissions: [], startedAt: new Date().toISOString() };
  }
}

function saveState(s) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

async function submitToChannel(channel, service) {
  try {
    const body = channel.body(service);
    const response = await fetch(channel.url, {
      method: channel.method,
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton/1.0' },
      body: body,
      signal: AbortSignal.timeout(10000)
    });
    const text = await response.text();
    return { success: true, status: response.status, body: text.slice(0, 500) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function runCycle() {
  const state = loadState();
  const service = SERVICES[state.currentService % SERVICES.length];
  const channel = CHANNELS[state.currentChannel % CHANNELS.length];
  
  console.log(`[${new Date().toISOString()}] Cycle ${state.cycle}: ${channel.name} → ${service.name}`);
  
  const result = await submitToChannel(channel, service);
  
  state.submissions.push({
    channel: channel.name,
    service: service.name,
    timestamp: new Date().toISOString(),
    result: result.success ? 'success' : 'failed',
    detail: result.success ? `HTTP ${result.status}` : result.error
  });
  
  // Rotate to next
  state.currentService++;
  if (state.currentService % SERVICES.length === 0) {
    state.currentChannel++;
    state.cycle++;
  }
  
  // Keep only last 100 submissions
  if (state.submissions.length > 100) {
    state.submissions = state.submissions.slice(-100);
  }
  
  saveState(state);
  
  console.log(`  → ${result.success ? '✓' : '✗'} ${result.success ? result.status : result.error}`);
  return result;
}

// Run once if executed directly
runCycle().catch(e => console.error('Promoter error:', e.message));

export { runCycle };
