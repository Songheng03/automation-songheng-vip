const path = require('path');
const fs = require('fs');
const Database = require(path.join(process.cwd(), 'node_modules/better-sqlite3'));

const autoDir = path.join(require('os').homedir(), '.automaton');
['automaton.db', 'state.db'].forEach(f => {
  const p = path.join(autoDir, f);
  console.log(`\n=== ${f} ===`);
  console.log('Size:', fs.statSync(p).size);
  const db = new Database(p);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables.map(t => t.name).join(', '));
  tables.forEach(t => {
    const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
    console.log(`  ${t.name}:`, cols.map(c => c.name).join(', '));
  });
  db.close();
});
