#!/usr/bin/env node
/**
 * @my-automaton/cli — AI Developer Tools CLI
 * 
 * AI code review, security scanning, text analysis from your terminal.
 * 
 * Usage:
 *   npx @my-automaton/cli review file.js
 *   npx @my-automaton/cli security server.py
 *   npx @my-automaton/cli analyze "text to analyze"
 *   npx @my-automaton/cli explain complex.ts
 *   npx @my-automaton/cli status
 * 
 * Free tier: 3 requests/day, no API key needed
 * Premium:   Set MY_AUTOMATON_KEY env var or pass --key <key>
 *            Get key at https://automation.songheng.vip/upgrade
 */

const API_BASE = 'https://automation.songheng.vip';
const FREE_LIMIT = 3;
const dailyCounts = new Map();

function today() { return new Date().toISOString().slice(0, 10); }
function remaining() { return FREE_LIMIT - (dailyCounts.get(today()) || 0); }

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const input = args[1];
  const apiKey = process.env.MY_AUTOMATON_KEY || args.find((_,i)=>args[i-1]=='--key');

  if (!cmd || cmd === 'help' || cmd === '-h' || cmd === '--help') {
    console.log(`🤖 my-automaton CLI — AI Developer Tools

USAGE:
  npx @my-automaton/cli <command> [input] [options]

COMMANDS:
  review     <file.js>    AI code review (bugs, security, quality)
  security   <app.py>     Security vulnerability scan (OWASP Top 10)
  analyze    <"text">     Deep text analysis (sentiment, entities, themes)
  summarize  <"text">     AI summarization
  explain    <file.js>    Code explanation in plain language
  refactor   <file.js>    Refactoring suggestions with examples
  complexity <file.ts>    Cyclomatic/cognitive complexity analysis
  status                  Check API key credits

OPTIONS:
  --key <key>     API key (or set MY_AUTOMATON_KEY env var)
  --json          Raw JSON output
  --lang <lang>   Language hint (js, py, rs, go, etc.)

EXAMPLES:
  npx @my-automaton/cli review app.js
  npx @my-automaton/cli security server.py
  npx @my-automaton/cli analyze "The API latency dropped 40% after caching"
  npx @my-automaton/cli explain --lang rust complex.rs
  npx @my-automaton/cli status

FREE TIER: ${FREE_LIMIT} requests/day, no key needed
PREMIUM:  ${API_BASE}/upgrade
`);
    process.exit(0);
  }

  // status command
  if (cmd === 'status') {
    if (!apiKey) {
      console.log(`📊 Free tier active (${remaining()} remaining today)`);
      console.log(`🔑 ${API_BASE}/upgrade`);
      process.exit(0);
    }
    const r = await fetch(`${API_BASE}/v1/analyze`, {
      method:'POST', headers:{'Content-Type':'application/json','X-API-Key':apiKey},
      body: JSON.stringify({text:'ping'})
    });
    const d = await r.json();
    console.log(`✅ Premium active — ${d.credits_remaining || '?'} credits remaining`);
    process.exit(0);
  }

  // Validate command
  const valid = ['review','security','analyze','summarize','explain','refactor','complexity'];
  if (!valid.includes(cmd)) {
    console.error(`❌ Unknown command "${cmd}". Try: npx @my-automaton/cli help`);
    process.exit(1);
  }

  // Read input
  let content = input;
  let lang = 'auto';
  
  if (input && !input.startsWith('"') && !input.startsWith("'")) {
    try {
      const fs = require('fs');
      content = fs.readFileSync(input, 'utf-8');
      const ext = input.split('.').pop();
      const langMap = {js:'javascript',ts:'typescript',py:'python',go:'go',rs:'rust',
        java:'java',rb:'ruby',sol:'solidity',php:'php',cs:'csharp',swift:'swift',
        kt:'kotlin',vue:'vue',svelte:'svelte',css:'css',html:'html',sql:'sql'};
      lang = langMap[ext] || 'auto';
    } catch(e) {
      console.error(`❌ Cannot read file: ${input}`);
      process.exit(1);
    }
  }
  if (!content) {
    console.error(`❌ No input. Usage: npx @my-automaton/cli ${cmd} <file or "text">`);
    process.exit(1);
  }

  // Check free tier
  if (!apiKey) {
    const d = today();
    dailyCounts.set(d, (dailyCounts.get(d)||0)+1);
    if (dailyCounts.get(d) > FREE_LIMIT) {
      console.log(`⚠️  Free limit reached (${FREE_LIMIT}/day). Add API key for unlimited:`);
      console.log(`   ${API_BASE}/upgrade`);
      console.log(`   Or set: export MY_AUTOMATON_KEY=am_xxx`);
      process.exit(1);
    }
  }

  const endpoint = apiKey ? `${API_BASE}/v1/${cmd}` : `${API_BASE}/api/free/${cmd}`;
  console.log(`🤖 Running ${cmd}... (${apiKey?'premium':'free — '+remaining()+' remaining today'})`);

  try {
    const headers = {'Content-Type':'application/json'};
    if (apiKey) headers['X-API-Key'] = apiKey;

    const resp = await fetch(endpoint, {
      method:'POST', headers,
      body: JSON.stringify({code:content, text:content, language:lang})
    });

    if (resp.status === 402) {
      console.log(`❌ Out of credits. ${API_BASE}/upgrade`);
      process.exit(1);
    }
    if (resp.status === 429) {
      console.log(`⚠️  Rate limited. Add API key for unlimited. ${API_BASE}/upgrade`);
      process.exit(1);
    }

    const data = await resp.json();
    
    if (args.includes('--json')) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('\n' + (data.result || 'Done.'));
      if (data.credits_remaining !== undefined)
        console.log(`\n💰 ${data.credits_remaining} credits remaining`);
    }
  } catch(e) {
    console.error(`❌ Error: ${e.message}`);
    process.exit(1);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
