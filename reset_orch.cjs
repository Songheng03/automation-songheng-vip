const path = require('path');
const Database = require(path.join(process.cwd(), 'node_modules/better-sqlite3'));
const db = new Database(path.join(require('os').homedir(), '.automaton', 'state.db'));

// 1. Reset orchestrator state to idle
db.prepare("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)")
  .run('orchestrator.state', JSON.stringify({phase:'idle', goalId:null, replanCount:0, failedTaskId:null, failedError:null}));
console.log('✅ Orchestrator reset to idle');

// 2. Mark stale 'assigned' tasks back to pending
const stale = db.prepare("UPDATE task_graph SET status='pending', assigned_to=NULL, started_at=NULL WHERE status IN ('assigned','running')");
console.log('✅ Reset', stale.changes, 'stale tasks');

// 3. Reactivate the failed goal (so orchestrator picks it up)
const failGoal = db.prepare("SELECT id FROM goals WHERE id = '01KVAC417PET0BKKNZ4XNKSQBH'").get();
if (failGoal) {
  db.prepare("UPDATE goals SET status='active' WHERE id = ?").run(failGoal.id);
  console.log('✅ Reactivated goal:', failGoal.id.slice(-8));
}

// 4. Show all active goals
const goals = db.prepare("SELECT id, title, status FROM goals WHERE status = 'active'").all();
console.log('\n=== Active Goals ===');
goals.forEach(g => console.log(' [' + g.status + '] ' + g.title + ' (' + g.id.slice(-8) + ')'));

// 5. Show pending tasks
const tasks = db.prepare("SELECT id, title, status FROM task_graph WHERE status = 'pending' LIMIT 10").all();
console.log('\n=== Pending Tasks ===');
if (tasks.length === 0) console.log(' (none — orchestrator will re-plan)');
tasks.forEach(t => console.log(' [' + t.status + '] ' + t.title));

// 6. Clear sleep so agent wakes up immediately
db.prepare("DELETE FROM kv WHERE key = ?").run('sleep_until');
console.log('\n✅ Cleared sleep_until');

db.close();
