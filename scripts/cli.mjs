#!/usr/bin/env node
/**
 * my-automaton CLI — AI code review and text analysis from your terminal
 * 
 * Usage:
 *   npx my-automaton review file.js
 *   npx my-automaton analyze README.md
 *   npx my-automaton security app.py
 *   npx my-automaton explain complex.js
 *   npx my-automaton complexity index.ts
 *   npx my-automaton summarize article.txt
 *   npx my-automaton refactor messy.js
 *   
 *   With API key (unlimited):
 *   MY_AUTOMATON_API_KEY=am_xxx npx my-automaton review file.js
 * 
 * API: https://automation.songheng.vip
 */

const API_BASE = process.env.MY_AUTOMATON_GATEWAY || 'https://automation.songheng.vip';
const API_KEY = process.env.MY_AUTOMATON_API_KEY || '';

const USAGE = `
Usage: npx my-automaton <command> <file>

Commands:
  review <file>       AI code review (bugs, security, style)
  analyze <file>      Text analysis (sentiment, entities, themes)
  security <file>     Security vulnerability scan
  summarize <file>    Text summarization
  explain <file>      Code explanation
  refactor <file>     Refactoring suggestions
  complexity <file>   Cyclomatic/cognitive complexity analysis

Options:
  --stdin             Read from stdin instead of file
  --help              Show this help

Environment:
  MY_AUTOMATON_API_KEY    API key for unlimited usage (get at ${API_BASE}/upgrade)

Examples:
  npx my-automaton review index.js
  npx my-automaton security app.py
  cat file.js | npx my-automaton review --stdin
`;

const COMMANDS = ['review', 'analyze', 'security', 'summarize', 'explain', 'refactor', 'complexity'];

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(USAGE);
    process.exit(0);
  }

  const command = args[0];
  if (!COMMANDS.includes(command)) {
    console.error(`❌ Unknown command: ${command}`);
    console.error(`   Available: ${COMMANDS.join(', ')}`);
    console.error(`   Run with --help for usage.`);
    process.exit(1);
  }

  // Get input text
  let text = '';
  const useStdin = args.includes('--stdin');
  
  if (useStdin) {
    // Read from stdin
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    text = Buffer.concat(chunks).toString('utf-8');
  } else {
    // Read from file
    const filePath = args[1];
    if (!filePath) {
      console.error(`❌ No file specified. Usage: npx my-automaton ${command} <file>`);
      process.exit(1);
    }
    try {
      const { readFileSync } = await import('fs');
      text = readFileSync(filePath, 'utf-8');
    } catch (err) {
      console.error(`❌ Cannot read file: ${filePath}`);
      console.error(`   ${err.message}`);
      process.exit(1);
    }
  }

  if (!text.trim()) {
    console.error('❌ Empty input');
    process.exit(1);
  }

  // Call API
  const endpoint = API_KEY 
    ? `${API_BASE}/v1/${command}`
    : `${API_BASE}/api/free/${command}`;

  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['X-API-Key'] = API_KEY;

  console.error(`🔍 Calling ${command}...`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        text: text.slice(0, 8000),
        mode: command
      })
    });

    const data = await response.json();

    if (response.status === 402) {
      console.error(`❌ Insufficient credits. Get more at ${API_BASE}/upgrade`);
      process.exit(1);
    }
    if (response.status === 429) {
      console.error(`❌ Free tier limit reached (3/day). Get an API key at ${API_BASE}/upgrade`);
      process.exit(1);
    }
    if (data.error) {
      console.error(`❌ Error: ${data.error}`);
      process.exit(1);
    }

    // Print result
    console.log(data.result || 'No result returned');
    
    // Show remaining free tier
    if (data.remaining !== undefined) {
      console.error(`\n📊 Free calls remaining today: ${data.remaining}/3`);
      if (data.remaining <= 0) {
        console.error(`💡 Get unlimited: ${API_BASE}/upgrade`);
      }
    }
  } catch (err) {
    console.error(`❌ Network error: ${err.message}`);
    console.error(`   Gateway: ${API_BASE}`);
    process.exit(1);
  }
}

main();
