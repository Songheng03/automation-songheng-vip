const Database = require('/root/automaton/node_modules/better-sqlite3');
const d = new Database('/root/.automaton/state.db', { timeout: 3000 });

// Check all turns' thinking content for strings that might cause JSON issues
// The API error says "unexpected end of hex escape" - look for patterns that could trigger this
const turns = d.prepare('SELECT id, thinking, input_source FROM turns ORDER BY created_at DESC').all();
let found = 0;
for (const t of turns) {
  if (!t.thinking) continue;
  // In JSON, \x and \u without proper hex digits are invalid.
  // Since we JSON.stringify, a literal \ becomes \\, so \x becomes \\x in the JSON.
  // But if the content ALREADY has JSON-encoded escape sequences that weren't decoded properly...
  // Check if content has literal \x or \u (unescaped)
  for (let i = 0; i < t.thinking.length - 1; i++) {
    const c = t.thinking.charCodeAt(i);
    const n = t.thinking.charCodeAt(i+1);
    // Check for backslash (92) followed by x(120) or u(117)
    if (c === 92 && (n === 120 || n === 117)) {
      console.log('FOUND in turn', t.id, 'at pos', i, 'source:', t.input_source);
      console.log('  context:', JSON.stringify(t.thinking.substring(Math.max(0,i-5), i+10)));
      found++;
      if (found >= 5) break;
    }
  }
  if (found >= 5) break;
}

// Also check tool_calls result for same pattern
if (found < 5) {
  const tcs = d.prepare('SELECT turn_id, name, result FROM tool_calls ORDER BY id DESC').all();
  for (const tc of tcs) {
    if (!tc.result) continue;
    for (let i = 0; i < tc.result.length - 1; i++) {
      const c = tc.result.charCodeAt(i);
      const n = tc.result.charCodeAt(i+1);
      if (c === 92 && (n === 120 || n === 117)) {
        console.log('FOUND in tool_call', tc.turn_id, tc.name, 'at pos', i);
        console.log('  context:', JSON.stringify(tc.result.substring(Math.max(0,i-5), i+10)));
        found++;
        if (found >= 5) break;
      }
    }
    if (found >= 5) break;
  }
}

console.log('total literal backslash+[xu] found:', found);
d.close();
