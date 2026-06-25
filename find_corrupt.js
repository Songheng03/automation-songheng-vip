const Database = require('/root/automaton/node_modules/better-sqlite3');
const d = new Database('/root/.automaton/state.db', { timeout: 3000 });

// Find corrupt content in turns
const turns = d.prepare('SELECT id, thinking FROM turns ORDER BY created_at DESC LIMIT 30').all();
let found = 0;
for (const t of turns) {
  if (!t.thinking) continue;
  // Search for incomplete hex escapes: \x followed by <2 hex chars, or \u followed by <4 hex chars
  const re = /\\(?:x(?![0-9a-fA-F]{2})|u(?![0-9a-fA-F]{4}))/;
  const idx = t.thinking.search(re);
  if (idx >= 0) {
    console.log('CORRUPT turn:', t.id);
    const start = Math.max(0, idx - 30);
    console.log('  around:', JSON.stringify(t.thinking.substring(start, idx + 30)));
    found++;
  }
}
if (found === 0) console.log('no corrupt turns found in thinking');

// Check tool_calls results
const tcs = d.prepare('SELECT turn_id, name, result FROM tool_calls ORDER BY id DESC LIMIT 100').all();
for (const tc of tcs) {
  if (!tc.result) continue;
  const re = /\\(?:x(?![0-9a-fA-F]{2})|u(?![0-9a-fA-F]{4}))/;
  const idx = tc.result.search(re);
  if (idx >= 0) {
    console.log('CORRUPT tool_call result:', tc.turn_id, tc.name);
    const start = Math.max(0, idx - 30);
    console.log('  around:', JSON.stringify(tc.result.substring(start, idx + 30)));
    found++;
  }
}
console.log('total corrupt entries:', found);
d.close();
