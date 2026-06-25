const DB = require('/root/automaton/node_modules/better-sqlite3');
const d = new DB('/root/.automaton/state.db', { timeout: 3000 });

// Scan ALL text columns across the DB for \x \u patterns
const tables = d.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

for (const {name} of tables) {
  const cols = d.prepare(`PRAGMA table_info(${name})`).all();
  const textCols = cols.filter(c => c.type === 'TEXT' || c.type.includes('CHAR') || c.type === '');
  
  for (const col of textCols) {
    // Check if any value in this column contains backslash+x or backslash+u as LITERAL chars
    const rows = d.prepare(`SELECT ${col.name} FROM ${name} WHERE ${col.name} LIKE '%\\\\x%' OR ${col.name} LIKE '%\\\\u%' LIMIT 5`).all();
    if (rows.length > 0) {
      for (const row of rows) {
        const val = row[col.name] || '';
        // Find the literal \x or \u
        for (let i = 0; i < val.length; i++) {
          if (val[i] === '\\' && i+1 < val.length && (val[i+1] === 'x' || val[i+1] === 'u')) {
            console.log(`${name}.${col.name}: backslash+${val[i+1]} at pos ${i}`);
            console.log(`  context: ${JSON.stringify(val.substring(Math.max(0,i-10), i+15))}`);
            break; // one example per value
          }
        }
      }
    }
  }
}

console.log('DONE scanning all tables');
d.close();
