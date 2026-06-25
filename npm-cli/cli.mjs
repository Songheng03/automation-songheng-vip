#!/usr/bin/env node
/**
 * my-automaton CLI — AI services from your terminal
 * 
 * Usage:
 *   npx my-automaton analyze "your text"
 *   npx my-automaton review file.js
 *   npx my-automaton summarize article.txt
 *   npx my-automaton explain "function foo() { ... }"
 *   npx my-automaton security app.js
 *   npx my-automaton refactor messy.js
 *   npx my-automaton --help
 *   npx my-automaton --version
 *   npx my-automaton key        # Get a free API key
 *   npx my-automaton status     # Check API status
 */

const endpoint = 'https://automation.songheng.vip';
const FREE_ENDPOINT = `${endpoint}/free`;
const KEY_ENDPOINT = `${endpoint}/api/claim-free-key`;

const COMMANDS = {
  analyze:    { endpoint: '/analyze',    desc: 'Deep text analysis',        credits: 1 },
  summarize:  { endpoint: '/summarize',  desc: 'AI summarization',         credits: 2 },
  review:     { endpoint: '/review',     desc: 'Code review',               credits: 5 },
  security:   { endpoint: '/security',   desc: 'Security vulnerability scan', credits: 3 },
  explain:    { endpoint: '/explain',    desc: 'Code explanation',          credits: 2 },
  refactor:   { endpoint: '/refactor',   desc: 'Refactoring suggestions',   credits: 5 },
  complexity: { endpoint: '/complexity', desc: 'Complexity analysis',       credits: 2 },
};

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts
  });
  const body = await res.text();
  try { return { status: res.status, data: JSON.parse(body) }; }
  catch { return { status: res.status, data: body }; }
}

function color(s, code) { return `\x1b[${code}m${s}\x1b[0m`; }
function green(s)  { return color(s, 32); }
function yellow(s) { return color(s, 33); }
function red(s)    { return color(s, 31); }
function cyan(s)   { return color(s, 36); }
function dim(s)    { return color(s, 90); }
function bold(s)   { return color(s, 1); }

async function callFree(command, text) {
  const cmd = COMMANDS[command];
  if (!cmd) return { error: `Unknown command: ${command}` };
  
  const res = await fetchJSON(`${FREE_ENDPOINT}${cmd.endpoint}`, {
    method: 'POST',
    body: JSON.stringify({ text, mode: command })
  });
  return res;
}

async function fetchKey() {
  const res = await fetchJSON(KEY_ENDPOINT, { method: 'POST' });
  return res;
}

async function status() {
  const res = await fetchJSON(`${endpoint}/api/health`);
  return res;
}

async function help() {
  console.log(bold('\n  my-automaton CLI — AI services in your terminal\n'));
  console.log(`  ${dim('Usage:')} npx my-automaton ${cyan('<command>')} ${dim('[text|file]')}\n`);
  console.log(bold('  Commands:\n'));
  for (const [cmd, info] of Object.entries(COMMANDS)) {
    console.log(`    ${cyan(cmd.padEnd(14))}${info.desc.padEnd(40)}${dim(`(${info.credits}¢)`)}`);
  }
  console.log(`\n    ${cyan('key'.padEnd(14))}${'Get a free API key (50 credits)'.padEnd(40)}${dim('free')}`);
  console.log(`    ${cyan('status'.padEnd(14))}${'Check API health'.padEnd(40)}${dim('free')}`);
  console.log(`    ${cyan('help'.padEnd(14))}${'Show this help'.padEnd(40)}${dim('free')}`);
  console.log(`\n  ${dim('Examples:')}`);
  console.log(`    npx my-automaton analyze "The future of AI is..."`);
  console.log(`    npx my-automaton review src/app.js`);
  console.log(`    npx my-automaton summarize README.md`);
  console.log(`    npx my-automaton key\n`);
  console.log(`  ${dim('Free tier: 3 requests/day. Get an API key for unlimited:')}`);
  console.log(`    ${cyan('https://automation.songheng.vip')}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === '--help' || command === 'help') {
    await help();
    return;
  }
  
  if (command === '--version') {
    console.log('1.0.0');
    return;
  }

  if (command === 'key') {
    console.log(bold('\n  Getting your free API key...\n'));
    const result = await fetchKey();
    if (result.status === 200 && result.data.key) {
      console.log(`  ${green('✅ Success!')} Your API key: ${bold(result.data.key)}\n`);
      console.log(`  ${dim('Use it with:')}`);
      console.log(`    curl -X POST ${endpoint}/v1/analyze \\`);
      console.log(`      -H "X-API-Key: ${result.data.key}" \\`);
      console.log(`      -H "Content-Type: application/json" \\`);
      console.log(`      -d '{"text":"Hello world"}'`);
      console.log(`\n  ${dim(`${result.data.credits} credits included.`)}`);
      console.log(`  ${dim('Buy more at:')} ${endpoint}\n`);
    } else {
      console.log(`  ${red('✖')} ${result.data.error || 'Failed to get key'}\n`);
    }
    return;
  }

  if (command === 'status') {
    const result = await status();
    if (result.status === 200) {
      console.log(`\n  ${green('✅ API is online')}\n`);
      if (result.data) console.log(`  ${JSON.stringify(result.data, null, 2)}\n`);
    } else {
      console.log(`\n  ${red('✖ API is offline')} (${result.status})\n`);
    }
    return;
  }

  // Execute a command
  if (!COMMANDS[command]) {
    console.log(`\n  ${red('✖')} Unknown command: ${bold(command)}`);
    await help();
    process.exit(1);
    return;
  }

  // Get text from argument or file
  let text = args.slice(1).join(' ');
  if (!text) {
    // Try to read from stdin
    text = await new Promise(resolve => {
      let data = '';
      process.stdin.on('data', chunk => data += chunk);
      process.stdin.on('end', () => resolve(data.trim()));
      setTimeout(() => resolve(''), 100);
    });
  }

  if (!text) {
    console.log(`\n  ${red('✖')} No input provided. Usage: npx my-automaton ${command} "your text"`);
    console.log(`  ${dim('Or pipe input:')} cat file.txt | npx my-automaton ${command}\n`);
    process.exit(1);
    return;
  }

  console.log(bold(`\n  Running ${command}...\n`));
  const result = await callFree(command, text);
  
  if (result.status === 200) {
    const output = result.data?.result || result.data?.analysis || result.data?.summary || result.data;
    const remaining = result.data?.remaining;
    console.log(`  ${typeof output === 'string' ? output : JSON.stringify(output, null, 2)}`);
    if (remaining !== undefined) {
      console.log(`\n  ${dim(`Free requests remaining today: ${remaining}`)}\n`);
    }
  } else if (result.status === 429) {
    console.log(`  ${red('✖ Rate limit exceeded.')} Get a free API key:\n`);
    console.log(`    npx my-automaton key\n`);
  } else {
    console.log(`  ${red('✖ Error:')} ${result.data?.error || result.data || result.status}\n`);
  }
}

main().catch(e => {
  console.error(`\n  ${red('✖ Fatal:')} ${e.message}\n`);
  process.exit(1);
});
