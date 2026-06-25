#!/usr/bin/env node
/**
 * automaton-cli.js — my-automaton CLI client
 * Free AI code review, security scanning, and analysis from the terminal
 * 
 * Installed via: curl -sSL https://automation.songheng.vip/install.sh | bash
 * Usage: automaton <command> [args]
 */

const API_BASE = 'https://automation.songheng.vip';
const FREE_LIMIT = 3;

const commands = {
  analyze: { endpoint: '/api/free/analyze', desc: 'AI text analysis (sentiment, entities, themes)' },
  summarize: { endpoint: '/api/free/summarize', desc: 'AI text summarization' },
  review: { endpoint: '/api/free/review', desc: 'AI code review (bugs, security, style)' },
  security: { endpoint: '/api/free/security', desc: 'Security vulnerability scan' },
  explain: { endpoint: '/api/free/explain', desc: 'Code explanation in plain language' },
  refactor: { endpoint: '/api/free/refactor', desc: 'Refactoring suggestions' },
  complexity: { endpoint: '/api/free/complexity', desc: 'Code complexity analysis' }
};

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0]?.toLowerCase();
  
  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log(`
🤖 my-automaton CLI — Free AI Code Review & Analysis

USAGE:
  automaton <command> [text|--file path]

COMMANDS:
  analyze   <text>        ${commands.analyze.desc}
  summarize <text>        ${commands.summarize.desc}
  review    <text|--file> ${commands.review.desc}
  security  <text|--file> ${commands.security.desc}
  explain   <text|--file> ${commands.explain.desc}
  refactor  <text|--file> ${commands.refactor.desc}
  complexity <text|--file> ${commands.complexity.desc}
  health                  Check API status
  help                    Show this help

EXAMPLES:
  automaton analyze "The product exceeded expectations in speed and reliability"
  automaton review --file mycode.js
  automaton security "SELECT * FROM users WHERE id = " + userId
  automaton health

Free: ${FREE_LIMIT} requests/day per service.
Upgrade: ${API_BASE}/upgrade
`);
    return;
  }

  if (cmd === 'health') {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    console.log(`✅ my-automaton API: ${data.status}`);
    console.log(`   Uptime: ${Math.floor(data.uptime / 60)}m`);
    console.log(`   Services: ${data.services?.length || 'N/A'}`);
    console.log(`   Free tier: ${data.freeDaily || 3}/day`);
    return;
  }

  const config = commands[cmd];
  if (!config) {
    console.error(`❌ Unknown command: ${cmd}. Try: automaton help`);
    process.exit(1);
  }

  // Get input text
  let text = '';
  const fileIdx = args.indexOf('--file');
  if (fileIdx !== -1 && args[fileIdx + 1]) {
    const fs = await import('fs');
    text = fs.readFileSync(args[fileIdx + 1], 'utf-8');
  } else {
    text = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
  }

  if (!text) {
    console.error(`❌ No input provided. Use: automaton ${cmd} <text> or automaton ${cmd} --file path`);
    process.exit(1);
  }

  console.log(`🔍 Calling ${cmd}...`);
  console.log('');

  try {
    const res = await fetch(`${API_BASE}${config.endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, code: text })
    });

    if (res.status === 429) {
      console.error(`❌ Free limit reached (${FREE_LIMIT}/day).`);
      console.error(`   Upgrade: ${API_BASE}/upgrade`);
      process.exit(1);
    }

    const data = await res.json();
    
    if (data.result) {
      console.log(data.result);
    } else if (data.error) {
      console.error(`❌ Error: ${data.error}`);
      process.exit(1);
    }

    console.log('');
    if (data.free) {
      console.log(`⚡ Free tier — ${FREE_LIMIT} requests/day`);
    }
    console.log(`🔗 ${API_BASE}/upgrade`);
  } catch (e) {
    console.error(`❌ Connection error: ${e.message}`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('CLI error:', e.message);
  process.exit(1);
});