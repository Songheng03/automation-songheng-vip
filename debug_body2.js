const DB = require('/root/automaton/node_modules/better-sqlite3');
const d = new DB('/root/.automaton/state.db', { timeout: 3000 });

// The tool_calls arguments field stores JSON.stringified data
// When reconstructing, the code does JSON.stringify(tc.arguments) which
// stringifies a string, potentially causing double-escaping issues.
// Let's check if any arguments, when re-stringified, cause JSON errors.

const args = d.prepare('SELECT id, turn_id, name, arguments FROM tool_calls ORDER BY id DESC LIMIT 200').all();
let found = 0;
for (const a of args) {
  if (!a.arguments) continue;
  // Simulate the exact thing the context builder does:
  // JSON.stringify(tc.arguments) where tc.arguments is the DB string
  try {
    const reStringified = JSON.stringify(a.arguments);
    // Verify it's valid by parsing back
    JSON.parse(reStringified);
  } catch (e) {
    console.log(`FAIL: tool_call ${a.id} (${a.name}) turn ${a.turn_id}`);
    console.log(`  arguments starts: ${JSON.stringify(a.arguments.substring(0,100))}`);
    found++;
  }
}

if (found === 0) {
  console.log('All tool_call arguments re-stringify fine');
}

// Also check: maybe the issue is in how truncation creates broken escape sequences?
// The truncateToolResult function appends a note with \n\n - that's fine.
// But what if the truncation cuts in the middle of a multi-byte UTF-8 character?
// That would cause the last character to be incomplete, but that wouldn't create
// a backslash issue.

// Let me try building the ACTUAL complete body with the real system prompt
// by reading the automaton.json and building the system prompt sections
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('/root/.automaton/automaton.json', 'utf-8'));
const genesis = cfg.genesisPrompt || '';

// Check genesis prompt for backslash issues
for (let i = 0; i < genesis.length; i++) {
  if (genesis[i] === '\\' && i+1 < genesis.length) {
    const next = genesis[i+1];
    if (next !== 'n' && next !== 't' && next !== '"' && next !== '\\' && next !== '/' && next !== 'b' && next !== 'f' && next !== 'r') {
      console.log(`Genesis prompt has unexpected escape: \\${next} at pos ${i}`);
      console.log(`  context: ${JSON.stringify(genesis.substring(Math.max(0,i-5), i+10))}`);
    }
  }
}

// Check environment.md
try {
  const env = fs.readFileSync('/root/.automaton/environment.md', 'utf-8');
  for (let i = 0; i < env.length; i++) {
    if (env[i] === '\\' && i+1 < env.length) {
      const next = env[i+1];
      if (next !== 'n' && next !== 't' && next !== '"' && next !== '\\' && next !== '/' && next !== 'b' && next !== 'f' && next !== 'r') {
        console.log(`environment.md has unexpected escape: \\${next} at pos ${i}`);
        break;
      }
    }
  }
} catch(e) {
  console.log('no environment.md');
}

d.close();
