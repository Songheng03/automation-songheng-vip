const path = require('path');
const Database = require(path.join(process.cwd(), 'node_modules/better-sqlite3'));

const db = new Database(path.join(require('os').homedir(), '.automaton', 'state.db'));

// 真实余额 127.59 CNY = 12759 分
db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)")
  .run('credit.deepseek_last_balance_cents', '12759');
db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)")
  .run('credit.last_reconcile_time', String(Date.now()));
console.log('✅ 写入真实余额: 12759 分 (127.59 CNY) — high tier');

// 验证
const b = db.prepare("SELECT value FROM kv WHERE key = ?").get('credit.deepseek_last_balance_cents');
console.log('Balance:', b?.value, 'cents');

db.close();
