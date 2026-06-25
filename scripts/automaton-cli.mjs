#!/usr/bin/env node
/**
 * my-automaton CLI — AI code review and text analysis from your terminal
 * 
 * Install: npm install -g @my-automaton/cli
 * Usage:
 *   automaton review file.js
 *   automaton security src/app.js
 *   automaton analyze README.md
 *   automaton explain complex.js
 *   automaton pipe "cat file.js | automaton review"
 * 
 * Free tier: 3 requests/day per service
 * Premium: export MY_AUTOMATON_API_KEY=am_xxx
 */

const API_BASE = 'https://automation.songheng.vip';

const MODES = {
  review: { emoji: '🔍', desc: 'AI code review: bugs, security, style, best practices' },
  analyze: { emoji: '📊', desc: 'Text analysis: sentiment, entities, themes' },
  summarize: { emoji: '📝', desc: 'Text summarization' },
  security: { emoji: '🛡️', desc: 'Security vulnerability scan' },
  explain: { emoji: '💡', desc: 'Code explanation in plain English' },
  refactor: { emoji: '🔧', desc: 'Refactoring suggestions with examples' },
  complexity: { emoji: '📈', desc: 'Cyclomatic and cognitive complexity analysis' }
};

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0];
  const file = args[1];

  // Help
  if (!mode || mode === '--help' || mode === '-h') {
    console.log(`my-automaton CLI — AI-powered code tools

Usage:
  automaton <mode> <file>
  cat file.js | automaton <mode>

Modes:
${Object.entries(MODES).map(([k, v]) => `  ${v.emoji}  ${k.padEnd(12)} ${v.desc}`).join('\n')}

Options:
  --help, -h     Show this help
  --api-key, -k  Set API key (or env MY_AUTOMATON_API_KEY)
  --json, -j     Output raw JSON

Examples:
  automaton review app.js
  automaton security src/server.js
  cat main.py | automaton review
  automaton explain complex-function.js

Free: 3 requests/day per service — no API key needed
Premium: Get unlimited at ${API_BASE}/upgrade
`);
    process.exit(0);
  }

  if (!MODES[mode]) {
    console.error(`Unknown mode: ${mode}`);
    console.error(`Available: ${Object.keys(MODES).join(', ')}`);
    process.exit(1);
  }

  // Get text from file or stdin
  let text = '';
  if (file) {
    const fs = await import('fs');
    try {
      text = fs.readFileSync(file, 'utf-8');
    } catch (err) {
      console.error(`Error reading file: ${err.message}`);
      process.exit(1);
    }
  } else {
    // Read from stdin (pipe mode)
    text = await new Promise((resolve) => {
      let data = '';
      process.stdin.on('data', chunk => data += chunk);
      process.stdin.on('end', () => resolve(data));
    });
    if (!text.trim()) {
      console.error('No input. Pipe code or pass a file.');
      process.exit(1);
    }
  }

  // Call API
  const apiKey = process.env.MY_AUTOMATON_API_KEY || '';
  const endpoint = apiKey ? `${API_BASE}/v1/${mode}` : `${API_BASE}/api/free/${mode}`;
  
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: text.slice(0, 8000) })
    });

    const data = await response.json();

    if (response.status === 429) {
      console.error(`\n❌ Free limit reached (3/day for ${mode}).`);
      console.error(`   Get an API key: ${API_BASE}/upgrade`);
      process.exit(1);
    }
    if (response.status === 402) {
      console.error(`\n❌ Insufficient credits.`);
      console.error(`   Top up: ${API_BASE}/upgrade`);
      process.exit(1);
    }

    // Check for JSON output flag
    if (args.includes('--json') || args.includes('-j')) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`\n${MODES[mode].emoji} ${mode.toUpperCase()} result:\n`);
      console.log(data.result || data.error || 'No result');
      if (data.remaining !== undefined) {
        console.log(`\n📊 Remaining today: ${data.remaining}/3`);
      }
      if (!apiKey) {
        console.log(`\n💡 Get unlimited: ${API_BASE}/upgrade`);
      }
    }
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
