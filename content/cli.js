#!/usr/bin/env node
/**
 * @my-automaton/cli — CLI for my-automaton AI Code Review & Analysis API
 * 
 * Install: npm install -g @my-automaton/cli
 * Usage:
 *   automaton review file.js
 *   automaton security app.py
 *   automaton analyze "text to analyze"
 *   automaton explain code.js
 *   automaton summarize README.md
 *   automaton refactor messy.js
 *   automaton complexity index.ts
 * 
 * Free tier: 3 calls/day/IP (no API key needed)
 * Paid: export MY_AUTOMATON_KEY=am_xxx
 * 
 * Docs: https://automation.songheng.vip/api-docs.html
 * Get key: https://automation.songheng.vip/get-started.html
 */

const BASE = 'https://automation.songheng.vip';
const PKG = require('../package.json');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const target = args[1];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
🤖 my-automaton CLI v${PKG?.version || '1.0.0'}
Usage: automaton <command> [target] [options]

Commands:
  review <file>       Code review with quality score & issues
  security <file>     Security vulnerability scan (OWASP)
  analyze <text>      Deep text analysis
  summarize <file>    AI summarization
  explain <file>      Code explanation in plain English
  refactor <file>     Refactoring suggestions
  complexity <file>   Cyclomatic complexity analysis
  help                Show this help

Options:
  --api-key KEY       API key (or $MY_AUTOMATON_KEY)
  --free              Force free tier (3/day/IP)
  --json              Output raw JSON
  --output FILE       Save output to file

Examples:
  automaton review src/app.js
  automaton security --free src/auth.py
  automaton analyze "What is the meaning of life?"
  automaton summarize README.md --output summary.txt

Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113 (Base chain)
`);
    process.exit(0);
  }

  if (command === 'version' || command === '--version' || command === '-v') {
    console.log(PKG?.version || '1.0.0');
    process.exit(0);
  }

  // Determine endpoint
  const endpointMap = {
    review: '/v1/review',
    security: '/v1/security',
    analyze: '/v1/analyze',
    summarize: '/v1/summarize',
    explain: '/v1/explain',
    refactor: '/v1/refactor',
    complexity: '/v1/complexity',
  };

  const freeEndpointMap = {
    review: '/free/review',
    security: '/free/security',
    analyze: '/free/analyze',
    summarize: '/free/summarize',
    explain: '/free/explain',
    refactor: '/free/refactor',
    complexity: '/free/complexity',
  };

  const apiKey = process.env.MY_AUTOMATON_KEY || args.includes('--api-key') ? args[args.indexOf('--api-key') + 1] : null;
  const useFree = args.includes('--free') || !apiKey;
  const jsonOutput = args.includes('--json');
  const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;

  const endpoint = useFree ? (freeEndpointMap[command] || freeEndpointMap.review) : (endpointMap[command] || endpointMap.review);
  const path = args.find(a => !a.startsWith('-'));

  if (!path && command !== 'analyze') {
    console.error('❌ Error: No file specified');
    console.error(`   Usage: automaton ${command} <file>`);
    process.exit(1);
  }

  // Read input
  let input;
  if (command === 'analyze' && path) {
    // analyze takes text directly
    input = args.slice(1).filter(a => !a.startsWith('-')).join(' ');
  } else if (path && path !== target) {
    // It's a file
    const fs = require('fs');
    try {
      input = fs.readFileSync(path, 'utf-8');
    } catch (e) {
      console.error(`❌ Error reading file: ${e.message}`);
      process.exit(1);
    }
  } else if (!process.stdin.isTTY) {
    // Read from stdin
    input = await new Promise(resolve => {
      let data = '';
      process.stdin.on('data', chunk => data += chunk);
      process.stdin.on('end', () => resolve(data.trim()));
    });
  } else if (command === 'analyze') {
    console.error('❌ Error: No text to analyze');
    console.error('   Usage: automaton analyze "your text here"');
    process.exit(1);
  } else {
    console.error('❌ Error: No file specified and no stdin pipe');
    console.error('   Usage: automaton ' + command + ' <file>');
    process.exit(1);
  }

  // Detect language from file extension
  const ext = path ? path.split('.').pop() : null;
  const langMap = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', go: 'go', rs: 'rust', java: 'java', sol: 'solidity',
    rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
    c: 'cpp', cpp: 'cpp', h: 'cpp', cs: 'csharp',
  };
  const language = langMap[ext] || 'javascript';

  // Build request
  const isCodeCommand = ['review', 'security', 'explain', 'refactor', 'complexity'].includes(command);
  const body = isCodeCommand
    ? { code: input, language }
    : command === 'summarize'
      ? { text: input, max_length: 200 }
      : { text: input, mode: command === 'analyze' ? 'analyze' : 'summarize' };

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;

  // Make request
  try {
    const spinner = useFree ? '🆓' : '🔑';
    process.stderr.write(`  ${spinner} Calling ${command}... `);

    const resp = await fetch(BASE + endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    const data = await resp.json();
    process.stderr.write(`${resp.status}\n`);

    if (!resp.ok) {
      if (resp.status === 402) {
        console.error('\n❌ Credits exhausted! Get more at:');
        console.error('   https://automation.songheng.vip/get-started.html');
      } else {
        console.error(`\n❌ API Error (${resp.status}):`, data.error || data.message || 'Unknown error');
      }
      process.exit(1);
    }

    // Output
    let output;
    if (jsonOutput) {
      output = JSON.stringify(data, null, 2);
    } else {
      output = formatOutput(command, data);
    }

    if (outputFile) {
      require('fs').writeFileSync(outputFile, output);
      console.log(`\n📄 Output saved to ${outputFile}`);
    } else {
      console.log(output);
    }

  } catch (e) {
    process.stderr.write(`FAILED\n`);
    console.error(`\n❌ Error: ${e.message}`);
    process.exit(1);
  }
}

function formatOutput(command, data) {
  let out = '\n';

  if (data.score || data.quality_score) {
    const score = data.score || data.quality_score;
    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
    const color = score >= 80 ? '' : score >= 60 ? '' : '';
    out += `  📊 Score: ${score}/100 (Grade ${grade})\n\n`;
  }

  if (data.summary || data.overview || data.analysis) {
    out += `  ${data.summary || data.overview || data.analysis}\n\n`;
  }

  if (data.issues && data.issues.length > 0) {
    out += `  🔍 Issues (${data.issues.length}):\n`;
    for (const issue of data.issues.slice(0, 10)) {
      const sev = issue.severity || 'info';
      const icon = sev.toLowerCase().includes('crit') || sev.toLowerCase().includes('high') ? '🔴' :
                   sev.toLowerCase().includes('med') ? '🟡' : '⚪';
      out += `    ${icon} [${sev}] ${issue.message || issue.description || '(no message)'}`;
      if (issue.line) out += ` (line ${issue.line})`;
      out += '\n';
    }
    if (data.issues.length > 10) {
      out += `    ... and ${data.issues.length - 10} more issues\n`;
    }
    out += '\n';
  }

  if (data.suggestions && data.suggestions.length > 0) {
    out += `  💡 Suggestions:\n`;
    for (const s of data.suggestions.slice(0, 5)) {
      out += `    • ${s.slice(0, 200)}\n`;
    }
    out += '\n';
  }

  out += `  ─────────────────────────────────\n`;
  out += `  Powered by my-automaton\n`;
  out += `  https://automation.songheng.vip\n`;

  return out;
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
