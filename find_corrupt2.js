const Database = require('/root/automaton/node_modules/better-sqlite3');
const d = new Database('/root/.automaton/state.db', { timeout: 3000 });

// Check ALL turns for broken content
const turns = d.prepare('SELECT id, thinking FROM turns').all();
let found = 0;
for (const t of turns) {
  if (!t.thinking) continue;
  // Search for backslash followed by x or u with incomplete hex digits
  // We need to search for literal backslash+letter, which in the DB is stored as-is
  for (let i = 0; i < t.thinking.length - 1; i++) {
    if (t.thinking[i] === '\\' && (t.thinking[i+1] === 'x' || t.thinking[i+1] === 'u')) {
      console.log('Found backslash+', t.thinking[i+1], 'in turn', t.id);
      console.log('  context:', JSON.stringify(t.thinking.substring(Math.max(0,i-10), i+15)));
      found++;
      if (found > 10) break;
    }
  }
  if (found > 10) break;
}
if (found === 0) console.log('no backslash+x or backslash+u found in any turn');

// Also check system prompt in identity/kv
const kv = d.prepare("SELECT key, substr(value,1,200) as v FROM kv WHERE key LIKE '%prompt%' OR key LIKE '%soul%'").all();
console.log('kv prompts:', JSON.stringify(kv));

d.close();
