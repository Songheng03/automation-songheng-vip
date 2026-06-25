#!/usr/bin/env node
/**
 * my-automaton CLI
 * Usage: node cli.mjs analyze "text"
 * Install: npm install -g my-automaton
 */

const API = {
  host: 'https://automation.songheng.vip',
  commands: {
    analyze:    { path: '/free/analyze',    desc: 'Deep text analysis',        cost: 1 },
    summarize:  { path: '/free/summarize',  desc: 'AI summarization',         cost: 2 },
    review:     { path: '/free/review',     desc: 'Code review',               cost: 5 },
    security:   { path: '/free/security',   desc: 'Security vuln scan',       cost: 3 },
    explain:    { path: '/free/explain',    desc: 'Code explanation',         cost: 2 },
    refactor:   { path: '/free/refactor',   desc: 'Refactoring suggestions',   cost: 5 },
    complexity: { path: '/free/complexity', desc: 'Complexity analysis',      cost: 2 },
    key:        { desc: 'Get a free API key' },
    status:     { desc: 'Check API health' }
  }
};

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m',
  dim: '\x1b[90m', bold: '\x1b[1m'
};

const HELP = `
${C.bold}my-automaton${C.reset} — AI services in your terminal

${C.dim}Usage:${C.reset} npx my-automaton <command> [text|file]

${C.bold}Commands:${C.reset}
${Object.entries(API.commands).map(([cmd, info]) => {
  if (!info.path) return `  ${C.cyan}${cmd.padEnd(14)}${C.reset}${info.desc}`;
  return `  ${C.cyan}${cmd.padEnd(14)}${C.reset}${info.desc.padEnd(40)}${C.dim}(${info.cost}¢)${C.reset}`;
}).join('\n')}

${C.dim}Examples:${C.reset}
  npx my-automaton analyze "The future of AI..."
  npx my-automaton review index.js
  npx my-automaton key

${C.dim}Free tier: 3 requests/day. Get key for unlimited:${C.reset}
  ${C.cyan}https://automation.songheng.vip${C.reset}
`;

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  
  if (!cmd || cmd === 'help' || cmd === '--help') { console.log(HELP); return; }
  if (cmd === '--version') { console.log('1.0.0'); return; }
  
  if (cmd === 'status') {
    try {
      const res = await fetch(`${API.host}/api/health`);
      const data = await res.json();
      console.log(`\n  ${C.green}✓${C.reset} API online — ${JSON.stringify(data)}\n`);
    } catch (e) {
      console.log(`\n  ${C.red}✖${C.reset} API offline — ${e.message}\n`);
    }
    return;
  }
  
  if (cmd === 'key') {
    try {
      const res = await fetch(`${API.host}/api/claim-free-key`, { method: 'POST' });
      const data = await res.json();
      console.log(`\n  ${C.green}✓${C.reset} Your API key: ${C.bold}${data.key}${C.reset}`);
      console.log(`  ${C.dim}${data.credits} credits — Buy more: ${API.host}${C.reset}\n`);
    } catch (e) {
      console.log(`\n  ${C.red}✖${C.reset} ${e.message}\n`);
    }
    return;
  }
  
  const commandDef = API.commands[cmd];
  if (!commandDef) { console.log(`\n  ${C.red}✖${C.reset} Unknown: ${cmd}\n`); console.log(HELP); return; }
  
  let text = args.slice(1).join(' ');
  
  // Check stdin
  if (!text) {
    const stdin = await new Promise(r => {
      const d = []; process.stdin.on('data', c => d.push(c));
      process.stdin.on('end', () => r(Buffer.concat(d).toString().trim()));
      setTimeout(() => r(''), 100);
    });
    text = stdin;
  }
  
  if (!text) { console.log(`\n  ${C.red}✖${C.reset} No input\n`); return; }
  
  try {
    const res = await fetch(`${API.host}${commandDef.path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, mode: cmd })
    });
    const data = await res.json();
    const output = data.result || data.analysis || data.summary || JSON.stringify(data, null, 2);
    console.log(`\n${output}\n`);
  } catch (e) {
    console.log(`\n  ${C.red}✖${C.reset} ${e.message}\n`);
  }
}

main().catch(e => process.exit(1));
