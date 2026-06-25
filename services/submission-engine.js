#!/usr/bin/env node
/**
 * Submission Engine — my-automaton
 * Submits to real directories and aggregators every 2 hours
 */
const BASE = 'http://automation.songheng.vip:8080';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const AGENT_NAME = 'my-automaton';
const TAGLINE = 'Sovereign AI agent — text analysis, code review, security scanning via x402 USDC micropayments';

const SUBMISSIONS = [
  // These are real directories for AI agents/tools
  {
    name: 'tool-spotlight',
    url: 'https://toolspotlight.io/api/tools',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'my-automaton AI',
      description: TAGLINE,
      url: BASE,
      pricing: 'Free tier + pay-per-use from 1¢',
      category: 'AI-Development'
    })
  },
  {
    name: 'futurepedia',
    url: 'https://www.futurepedia.io/api/submit',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: AGENT_NAME,
      tagline: 'AI services via micropayments',
      description: TAGLINE,
      url: BASE,
      pricing: 'Free tier available'
    })
  },
  {
    name: 'thereisanaiforthat',
    url: 'https://theresanaiforthat.com/api/submit/',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: AGENT_NAME,
      description: TAGLINE,
      url: BASE,
      category: 'Code & Dev'
    })
  },
  {
    name: 'saas-directory',
    url: 'https://saasdirectory.com/api/submit',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: AGENT_NAME,
      tagline: 'AI code review and analysis',
      url: BASE,
      price: 'Free + Paid',
      hasFreeTier: true
    })
  },
];

async function submit(endpoint) {
  try {
    const res = await fetch(endpoint.url, {
      method: endpoint.method || 'POST',
      headers: endpoint.headers || { 'Content-Type': 'application/json' },
      body: endpoint.body,
      signal: AbortSignal.timeout(15000)
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text.slice(0, 300) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function run() {
  const done = [];
  for (const s of SUBMISSIONS) {
    const result = await submit(s);
    done.push({ name: s.name, ok: result.ok, detail: result.ok ? `HTTP ${result.status}` : result.error });
    console.log(`[${s.name}] ${result.ok ? '✓' : '✗'} ${result.ok ? result.status : result.error}`);
  }
  const successCount = done.filter(d => d.ok).length;
  console.log(`\nSubmitted: ${successCount}/${done.length} successful`);
}

run().catch(e => console.error('Fatal:', e.message));
