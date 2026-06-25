#!/usr/bin/env node
/**
 * my-automaton CLI — AI code review & analysis client
 * 
 * Usage:
 *   npx my-automaton review --file app.js
 *   npx my-automaton security --code "eval(x)"
 *   npx my-automaton analyze --text "long text here"
 *   npx my-automaton --help
 * 
 * Environment:
 *   MY_AUTOMATON_KEY=am_xxx  (for premium, no key = free tier)
 *   MY_AUTOMATON_URL=https://automation.songheng.vip
 */

const BASE = process.env.MY_AUTOMATON_URL || 'https://automation.songheng.vip';
const API_KEY = process.env.MY_AUTOMATON_KEY || '';

const HELP = `my-automaton — AI-powered code review & analysis CLI

COMMANDS:
  review      Full code review (bugs, security, style)
  security    Security vulnerability scan (OWASP Top 10)
  analyze     Deep text analysis (themes, insights)
  summarize   AI text summarization
  explain     Code explanation in simple terms
  refactor    Refactoring suggestions (before/after)
  complexity  Cyclomatic complexity analysis
  devkey      Get a free dev key (50 credits)
  help        Show this help

OPTIONS:
  --file, -f  Read input from file
  --code, -c  Input code/text directly
  --text, -t  Input text (for analyze/summarize)
  --lang, -l  Language hint (js, python, go, etc.)
  --json      Output raw JSON
  --help, -h  Show this help

EXAMPLES:
  npx my-automaton review --file app.js
  npx my-automaton security -c 'eval(req.body.input)'
  npx my-automaton analyze -t "Your long text here"
  npx my-automaton devkey

ENVIRONMENT:
  MY_AUTOMATON_KEY   API key for premium (no key = free, 3/day)
  MY_AUTOMATON_URL   API base URL (default: ${BASE})
  
Get a free dev key: npx my-automaton devkey
Buy credits: ${BASE}/get-started.html
Docs: ${BASE}/api-docs.html
`;

async function main() {
  const args = process.argv.slice(2);
  const flags = {};
  let command = 'help';
  
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') { command = 'help'; break; }
    if (a === '--json') { flags.json = true; continue; }
    if (a === '--file' || a === '-f') { flags.file = args[++i]; continue; }
    if (a === '--code' || a === '-c') { flags.code = args[++i]; continue; }
    if (a === '--text' || a === '-t') { flags.text = args[++i]; continue; }
    if (a === '--lang' || a === '-l') { flags.lang = args[++i]; continue; }
    if (!command || command === 'help') command = a;
  }
  
  const cmds = ['review', 'security', 'analyze', 'summarize', 'explain', 'refactor', 'complexity', 'devkey', 'help'];
  if (!cmds.includes(command)) {
    console.error(`Unknown command: ${command}\n`);
    console.log(HELP);
    process.exit(1);
  }
  
  if (command === 'help' || args.length === 0) {
    console.log(HELP);
    return;
  }
  
  if (command === 'devkey') {
    const resp = await fetch(`${BASE}/api/dev-key`);
    const data = await resp.json();
    if (data.api_key) {
      console.log(`\n✅ Dev key: ${data.api_key}`);
      console.log(`   Credits: ${data.credits}`);
      console.log(`\n   Example:\n   export MY_AUTOMATON_KEY=${data.api_key}`);
      console.log(`   npx my-automaton review --file app.js\n`);
    } else {
      console.error(`❌ ${data.error || 'Failed to get dev key'}`);
      process.exit(1);
    }
    return;
  }
  
  // Get input
  let input = '';
  if (flags.file) {
    const fs = await import('fs');
    input = fs.readFileSync(flags.file, 'utf-8');
  } else if (flags.code) {
    input = flags.code;
  } else if (flags.text) {
    input = flags.text;
  } else {
    // Read from stdin if piped
    if (!process.stdin.isTTY) {
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      input = Buffer.concat(chunks).toString('utf-8');
    }
  }
  
  if (!input) {
    console.error('❌ No input provided. Use --file, --code, --text, or pipe input.');
    process.exit(1);
  }
  
  // Call API
  const isPremium = !!API_KEY;
  const endpoint = isPremium ? `/v1/${command}` : `/free/${command}`;
  const headers = { 'Content-Type': 'application/json' };
  const body = { code: input, text: input, language: flags.lang || '' };
  
  if (isPremium) headers['X-API-Key'] = API_KEY;
  
  console.error(`🔍 Calling ${command}...`);
  const resp = await fetch(`${BASE}${endpoint}`, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  
  const data = await resp.json();
  
  if (!resp.ok) {
    console.error(`❌ ${resp.status}: ${data.error || 'Unknown error'}`);
    if (data.credits !== undefined) console.error(`   Credits remaining: ${data.credits}, cost: ${data.cost}`);
    if (data.upgrade) console.error(`   Upgrade: ${data.upgrade}`);
    if (data.dev_key) console.error(`   Dev key: ${data.dev_key}`);
    process.exit(1);
  }
  
  if (flags.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    const result = typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2);
    console.log(result);
    if (data.credits_remaining !== undefined) {
      console.error(`\n⚠️  Credits remaining: ${data.credits_remaining} (used ${data.credits_used} this call)`);
    }
    if (data.free_remaining !== undefined) {
      console.error(`\n⚠️  Free calls remaining today: ${data.free_remaining}`);
      console.error(`   Get a dev key for 50 free credits: npx my-automaton devkey`);
    }
  }
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
