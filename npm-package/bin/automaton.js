#!/usr/bin/env node
/**
 * my-automaton CLI — Free AI Developer Tools
 * Usage: automaton <service> "<input>"
 * 
 * Services: analyze, summarize, review, security, explain, refactor, complexity
 * Free tier: 3 requests/day per service (no API key needed)
 * Premium: Get API key at https://automation.songheng.vip/upgrade
 */
const BASE = process.env.AUTOMATON_API_URL || 'https://automation.songheng.vip';

async function callFreeAPI(service, input) {
  const field = ['review','security','explain','refactor','complexity'].includes(service) ? 'code' : 'text';
  const resp = await fetch(`${BASE}/api/free/${service}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [field]: input })
  });
  return resp.json();
}

async function callPremiumAPI(service, input, apiKey) {
  const field = ['review','security','explain','refactor','complexity'].includes(service) ? 'code' : 'text';
  const resp = await fetch(`${BASE}/v1/${service}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({ [field]: input })
  });
  return resp.json();
}

async function main() {
  const [,, service, ...args] = process.argv;
  const input = args.join(' ');

  const helpText = `my-automaton CLI — Free AI Developer Tools

Usage:
  automaton <service> "<input>"        Make a free API call
  automaton <service> "<input>" --key  Make a premium API call (reads AUTOMATON_API_KEY)

Services:
  analyze       Deep text analysis (1 credit)
  summarize     AI summarization (2 credits)
  review        Full code review (5 credits)
  security      Security vulnerability scan (3 credits)
  explain       Code explanation (2 credits)
  refactor      Refactoring suggestions (5 credits)
  complexity    Complexity analysis (2 credits)

Environment:
  AUTOMATON_API_URL   API base URL (default: ${BASE})
  AUTOMATON_API_KEY   Premium API key (for --key flag)

Examples:
  automaton review "function hello() { return 'world'; }"
  automaton analyze "Your text here"
  automaton security "<?php echo $_GET['input']; ?>" --key

Free: 3 requests/day per service
Premium: Get your API key at ${BASE}/upgrade

Report issues: https://github.com/my-automaton/client/issues
`;

  if (!service || service === '--help' || service === '-h' || !input) {
    console.log(helpText);
    process.exit(service && service !== '--help' && service !== '-h' ? 1 : 0);
  }

  const validServices = ['analyze','summarize','review','security','explain','refactor','complexity'];
  if (!validServices.includes(service)) {
    console.error(`Unknown service: ${service}`);
    console.error(`Valid services: ${validServices.join(', ')}`);
    process.exit(1);
  }

  const usePremium = args.includes('--key') || process.env.AUTOMATON_API_KEY;
  const apiKey = process.env.AUTOMATON_API_KEY;

  try {
    let data;
    if (usePremium && apiKey) {
      data = await callPremiumAPI(service, input, apiKey);
    } else {
      data = await callFreeAPI(service, input);
    }

    if (data.success) {
      console.log(data.result);
      if (data.remaining_free !== undefined) {
        console.log(`\n--- Free remaining today: ${data.remaining_free}/3 ---`);
        if (data.remaining_free === 0) {
          console.log(`Unlimited access: ${BASE}/upgrade`);
        }
      }
      if (data.credits_remaining !== undefined) {
        console.log(`\n--- Credits remaining: ${data.credits_remaining} ---`);
      }
    } else {
      console.error(`Error: ${data.error || 'Unknown error'}`);
      if (data.upgrade_url) {
        console.error(`Get more credits: ${data.upgrade_url}`);
      }
      process.exit(1);
    }
  } catch(e) {
    console.error(`Network error: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { callFreeAPI, callPremiumAPI };

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
  });
}
