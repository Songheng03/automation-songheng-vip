#!/usr/bin/env node
/**
 * @my-automaton/cli — AI code review & analysis CLI
 * 
 * Usage: npx @my-automaton/cli review file.js
 *        npx @my-automaton/cli security app.py
 *        npx @my-automaton/cli analyze "your text"
 *        npx @my-automaton/cli explain --file complex.js
 *        npx @my-automaton/cli refactor messy.js
 *        npx @my-automaton/cli complexity src/
 *        npx @my-automaton/cli summarize README.md
 * 
 * Free tier: 3 calls/day per IP (no API key needed)
 * Premium: set MY_AUTOMATON_KEY env var
 */

const API = 'https://automation.songheng.vip';

const HELP = `
  @my-automaton/cli — AI code review & analysis (by an autonomous AI agent)

  USAGE
    npx @my-automaton/cli <command> [file|text] [options]

  COMMANDS
    review      <file>    Full code review with bug detection
    security    <file>    OWASP vulnerability scan
    explain     <file>    Plain-English code explanation
    refactor    <file>    Refactoring suggestions with diffs
    complexity  <file>    Cyclomatic complexity analysis
    analyze     <text>    Deep text analysis
    summarize   <text>    AI summarization

  OPTIONS
    --lang, -l    Language hint (js, py, sol, rs, go)
    --key, -k     API key (or set MY_AUTOMATON_KEY env)
    --json        Output raw JSON
    --help, -h    Show this help

  FREE TIER
    3 calls/day per IP. No signup needed. Just run the command.

  PREMIUM
    Set MY_AUTOMATON_KEY for unlimited usage.
    Get a key at ${API}/upgrade.html

  DOCS
    ${API}/api-docs.html

  EXAMPLE
    npx @my-automaton/cli review app.js --lang js
`;

const COMMANDS = ['review', 'security', 'explain', 'refactor', 'complexity', 'analyze', 'summarize'];

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];
  if (!COMMANDS.includes(command)) {
    console.error(`Unknown command: ${command}`);
    console.error(`Valid commands: ${COMMANDS.join(', ')}`);
    console.error('Run with --help for usage');
    process.exit(1);
  }

  const textFile = args[1];
  const langIdx = args.indexOf('--lang') !== -1 ? args.indexOf('--lang') + 1 : args.indexOf('-l') !== -1 ? args.indexOf('-l') + 1 : -1;
  const lang = langIdx !== -1 ? args[langIdx] : undefined;
  const useJson = args.includes('--json');
  const apiKey = args.includes('--key') ? args[args.indexOf('--key') + 1] : args.includes('-k') ? args[args.indexOf('-k') + 1] : process.env.MY_AUTOMATON_KEY;

  let text = textFile;

  // If file exists, read it
  const fs = await import('fs');
  if (textFile && fs.existsSync(textFile)) {
    text = fs.readFileSync(textFile, 'utf-8');
  } else if (!textFile && !process.stdin.isTTY) {
    // Read from pipe
    text = await new Promise(resolve => {
      let data = '';
      process.stdin.on('data', chunk => data += chunk);
      process.stdin.on('end', () => resolve(data.trim()));
    });
  } else if (!textFile) {
    console.error('Usage: npx @my-automaton/cli ' + command + ' <file>');
    console.error('       echo "code" | npx @my-automaton/cli ' + command);
    process.exit(1);
  }

  // Determine endpoint and path
  const isFree = !apiKey;
  const basePath = isFree ? '/free' : '/v1';
  const endpoint = `${API}${basePath}/${command}`;

  // Build payload
  const payload = { text, language: lang || 'auto' };

  // Headers
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;

  // Make request
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (resp.status === 402) {
      const err = await resp.json();
      console.error('❌ Out of credits. Get more at ' + API + '/upgrade.html');
      console.error('   ' + (err.message || ''));
      process.exit(1);
    }

    if (!resp.ok) {
      const err = await resp.text();
      console.error('❌ Error ' + resp.status + ': ' + err);
      process.exit(1);
    }

    const data = await resp.json();

    if (useJson) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      // Pretty print
      const result = data.result || data.review || data.analysis || data.summary || data.explanation || data.issues || '';
      console.log('\n' + '='.repeat(60));
      console.log(`  ${command.toUpperCase()} — by my-automaton AI`);
      console.log('='.repeat(60) + '\n');
      console.log(result);
      if (data.score !== undefined) console.log(`\n  Score: ${data.score}`);
      if (data.issues && Array.isArray(data.issues)) {
        console.log(`  Issues found: ${data.issues.length}`);
      }
      if (isFree) {
        console.log('\n' + '-'.repeat(60));
        console.log('  💡 Free tier — 2 calls remaining today');
        console.log('  🔑 Get unlimited: ' + API + '/upgrade.html');
      }
      console.log('');
    }
  } catch (e) {
    console.error('❌ Network error:', e.message);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
