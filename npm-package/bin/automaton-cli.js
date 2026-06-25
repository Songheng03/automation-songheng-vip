#!/usr/bin/env node
/* automaton-cli — AI services CLI */
/* Usage: npx automaton-api-client review "function foo() { return 1; }" */

const API = 'https://automation.songheng.vip';

const HELP = `
Usage: npx automaton-api-client <service> [code|text]

Services:
  review     AI code review — bug detection, style issues, improvements
  security   Security vulnerability scan (OWASP Top 10)  
  analyze    Deep text analysis — sentiment, entities, themes
  summarize  Key points and takeaways
  explain    Plain language code explanation
  refactor   Code improvement suggestions
  complexity Time & space complexity analysis

Examples:
  npx automaton-api-client review "function add(a,b){return a+b}"
  npx automaton-api-client analyze "This product is amazing!"
  npx automaton-api-client security "eval(request.body.input)"
  
Options:
  --key KEY  Use premium API key (default: free tier)
  --json     Output raw JSON
  --help     Show this help

Free tier: 3 requests/day per service. 
Premium: https://automation.songheng.vip/upgrade
`;

const services = ['review', 'security', 'analyze', 'summarize', 'explain', 'refactor', 'complexity'];
const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  console.log(HELP);
  process.exit(0);
}

const service = args.find(a => !a.startsWith('--'));
const keyIndex = args.indexOf('--key');
const apiKey = keyIndex >= 0 ? args[keyIndex + 1] : null;
const jsonMode = args.includes('--json');

if (!service || !services.includes(service)) {
  console.error(`❌ Unknown service: "${service}"`);
  console.log(`Available: ${services.join(', ')}`);
  process.exit(1);
}

// Get the input (everything after the service name)
const serviceIndex = args.indexOf(service);
const inputParts = args.slice(serviceIndex + 1).filter(a => !a.startsWith('--') && (!apiKey || a !== args[keyIndex + 1]));
const input = inputParts.join(' ');

if (!input) {
  console.error('❌ Missing input text or code');
  process.exit(1);
}

const field = ['analyze', 'summarize'].includes(service) ? 'text' : 'code';
const body = { [field]: input };
const headers = { 'Content-Type': 'application/json' };
const url = apiKey
  ? `${API}/v1/${service}`
  : `${API}/api/free/${service}`;

if (apiKey) headers['X-API-Key'] = apiKey;

async function main() {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });

    const data = await resp.json();

    if (resp.status === 402) {
      console.log('❌ Insufficient credits. Get API key: ' + API + '/upgrade');
      process.exit(1);
    }
    if (resp.status === 429) {
      console.log('❌ Free limit reached (3/day). Upgrade: ' + API + '/upgrade');
      process.exit(1);
    }

    if (jsonMode) {
      console.log(JSON.stringify(data, null, 2));
    } else if (data.success) {
      console.log('\n' + data.result + '\n');
      if (data.credits_remaining !== undefined) {
        console.log(`Credits remaining: ${data.credits_remaining}`);
      }
    } else {
      console.error('❌ Error:', data.error);
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Connection error:', e.message);
    process.exit(1);
  }
}

main();
