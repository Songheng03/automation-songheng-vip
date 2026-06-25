#!/usr/bin/env node
/**
 * automaton-cli.js — Command-line client for my-automaton AI services
 * 
 * Usage:
 *   node automaton-cli.js analyze "Your text here"
 *   node automaton-cli.js review --file index.js
 *   cat file.js | node automaton-cli.js review
 *   node automaton-cli.js analyze "text" --json
 *   node automaton-cli.js --key YOUR_KEY review --file app.js
 */

const API_BASE = 'https://automation.songheng.vip';
const ENDPOINTS = {
  free: { analyze:'/api/free/analyze', summarize:'/api/free/summarize', review:'/api/free/review', security:'/api/free/security', explain:'/api/free/explain', refactor:'/api/free/refactor', complexity:'/api/free/complexity' },
  premium: { analyze:'/v1/analyze', summarize:'/v1/summarize', review:'/v1/review', security:'/v1/security', explain:'/v1/explain', refactor:'/v1/refactor', complexity:'/v1/complexity' }
};

const HELP = `🤖 my-automaton AI CLI v1.0

USAGE: node automaton-cli.js <command> [text|options]

COMMANDS: analyze, summarize, review, security, explain, refactor, complexity

OPTIONS:
  --file <path>     Read from file
  --key <key>       Premium API key
  --json            Raw JSON output
  --help            This message

EXAMPLES:
  node automaton-cli.js analyze "React vs Vue in 2026"
  node automaton-cli.js review --file index.js
  cat index.js | node automaton-cli.js review
  node automaton-cli.js --key am_xxx review "const x = 1"
`;

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return console.log(HELP);
  }

  let apiKey = '', filePath = '', command = '', useJson = false, textInput = '';
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--key' && args[i+1]) { apiKey = args[++i]; }
    else if (args[i] === '--file' && args[i+1]) { filePath = args[++i]; }
    else if (args[i] === '--json') { useJson = true; }
    else if (!command && ENDPOINTS.free[args[i]]) { command = args[i]; }
    else if (command && !args[i].startsWith('--')) { textInput = args[i]; }
  }

  if (!command) return console.error(`Unknown command. Try: analyze, summarize, review, security, explain, refactor, complexity`);

  // Read input
  let input = textInput;
  if (filePath) {
    const fs = require('fs');
    if (!fs.existsSync(filePath)) return console.error(`File not found: ${filePath}`);
    input = fs.readFileSync(filePath, 'utf-8').trim();
  } else if (!input && !process.stdin.isTTY) {
    input = (await new Promise(r => { let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>r(d.trim())); }));
  }

  if (!input || input.length < 2) return console.error('Error: No input provided.');

  const useFree = !apiKey;
  const url = `${API_BASE}${useFree ? ENDPOINTS.free[command] : ENDPOINTS.premium[command]}`;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;

  try {
    const res = await fetch(url, { method:'POST', headers, body: JSON.stringify({ code: input, text: input, language: 'auto' }) });
    
    if ([402,429].includes(res.status)) {
      console.log(useFree ? '\n⚠️  Free limit reached (3/day). Get a key at ' + API_BASE + '/upgrade' : '\n⏳ Rate limited.');
      return;
    }
    
    const data = await res.json();
    if (!res.ok) return console.error(`Error ${res.status}:`, data.error || 'Unknown');

    if (useJson) return console.log(JSON.stringify(data, null, 2));
    
    // Pretty print
    const title = command.charAt(0).toUpperCase() + command.slice(1);
    console.log(`\n${'─'.repeat(50)}\n📋 ${title}\n${'─'.repeat(50)}`);
    if (data.explanation) console.log(data.explanation);
    if (data.issues) data.issues.forEach((s,i) => console.log(`  ${i+1}. ${s.severity ? '['+s.severity+'] ' : ''}${s.message||s}`));
    if (data.suggestions) data.suggestions.forEach((s,i) => console.log(`  ${i+1}. 💡 ${s.message||s}`));
    if (data.complexity) console.log(`\n📊 Complexity: ${data.complexity}`);
    if (data.score !== undefined) console.log(`\n🏆 Score: ${data.score}/100`);
    if (data.remaining !== undefined) console.log(`\n📊 Today: ${data.remaining} free uses left`);
    console.log(`\n${'─'.repeat(50)}\n🤖 automation.songheng.vip\n${'─'.repeat(50)}\n`);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
