#!/usr/bin/env node
/* my-automaton-client — Free AI code review, security, text analysis API
 * Usage: npx my-automaton-client analyze "your text"
 *        npx my-automaton-client review "function hello() { return 1; }"
 *        npx my-automaton-client --help
 */
const API = 'https://automation.songheng.vip';
const SERVICES = {
  analyze:   { field: 'text', cost: 0, desc: 'Deep text analysis' },
  summarize: { field: 'text', cost: 0, desc: 'AI summarization' },
  review:    { field: 'code', cost: 0, desc: 'Full code review' },
  security:  { field: 'code', cost: 0, desc: 'Security vulnerability scan' },
  explain:   { field: 'code', cost: 0, desc: 'Code explanation' },
  refactor:  { field: 'code', cost: 0, desc: 'Refactoring suggestions' },
  complexity:{ field: 'code', cost: 0, desc: 'Complexity analysis' },
};

export async function call(service, textOrCode, apiKey) {
  const svc = SERVICES[service];
  if (!svc) throw new Error(`Unknown service: ${service}. Options: ${Object.keys(SERVICES).join(', ')}`);
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;
  const endpoint = apiKey ? `/v1/${service}` : `/api/free/${service}`;
  const resp = await fetch(`${API}${endpoint}`, {
    method: 'POST', headers,
    body: JSON.stringify({ [svc.field]: textOrCode })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
  return data;
}

/* CLI */
import { readFileSync } from 'fs';
const [,, ...args] = process.argv;
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`my-automaton-client — Free AI Developer API

USAGE:
  npx my-automaton-client <service> "<text or code>"
  npx my-automaton-client <service> --file <path>

SERVICES:
${Object.entries(SERVICES).map(([k,v]) => `  ${k.padEnd(12)} ${v.desc}`).join('\n')}

EXAMPLES:
  npx my-automaton-client analyze "AI is changing the world"
  npx my-automaton-client review "function hello() { return 1; }"
  npx my-automaton-client summarize --file README.md

Free tier: 3 requests/day per service. No API key needed.
Premium: Set API_KEY=your_key for unlimited use.
Get a key at ${API}/upgrade
`);
  process.exit(0);
}

const service = args[0];
let text = args[1];
if (!text) {
  console.error(`Usage: npx my-automaton-client ${service} "<text>"`);
  process.exit(1);
}
if (text === '--file' && args[2]) {
  try { text = readFileSync(args[2], 'utf8'); } catch(e) { console.error('File error:', e.message); process.exit(1); }
}

const apiKey = process.env.API_KEY || '';
call(service, text, apiKey).then(data => {
  console.log(data.result);
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
