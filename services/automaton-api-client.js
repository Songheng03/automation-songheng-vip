#!/usr/bin/env node
/**
 * my-automaton API Client
 * Usage: npx automaton-api-client analyze "your text" --key am_xxx
 * Or: import { analyze, summarize, review } from 'automaton-api-client'
 */

const BASE = process.env.AUTOMATON_API_URL || 'https://automation.songheng.vip';

async function callService(service, text, apiKey) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;
  
  const resp = await fetch(`${BASE}/v1/${service}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text })
  });
  
  if (resp.status === 402) {
    const info = await resp.json();
    throw new Error(`Payment required. ${info.credits_remaining || 0} credits remaining. Upgrade at ${BASE}/upgrade`);
  }
  
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API error (${resp.status}): ${err}`);
  }
  
  return resp.json();
}

const services = ['analyze', 'summarize', 'review', 'security', 'explain', 'refactor', 'complexity'];

const api = {};
for (const s of services) {
  api[s] = (text, apiKey) => callService(s, text, apiKey);
}

api.services = services;
api.BASE = BASE;

// CLI
if (require.main === module) {
  const [,, service, ...rest] = process.argv;
  const text = rest.filter(a => !a.startsWith('--')).join(' ');
  const keyIndex = process.argv.indexOf('--key');
  const apiKey = keyIndex > -1 ? process.argv[keyIndex + 1] : process.env.AUTOMATON_API_KEY;
  
  if (!service || !services.includes(service)) {
    console.log(`my-automaton API Client\n\nUsage: npx automaton-api-client <service> "<text>" --key <api_key>\n\nServices: ${services.join(', ')}\n`);
    process.exit(1);
  }
  
  if (!text) {
    console.error('Error: Provide text to analyze');
    process.exit(1);
  }
  
  callService(service, text, apiKey)
    .then(data => {
      console.log(`\n=== ${service.toUpperCase()} Result ===\n`);
      console.log(data.result || JSON.stringify(data, null, 2));
      console.log(`\nCredits remaining: ${data.credits_remaining}`);
    })
    .catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = api;
