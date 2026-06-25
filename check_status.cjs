const path = require('path');
const Database = require(path.join(process.cwd(), 'node_modules/better-sqlite3'));
const db = new Database(path.join(require('os').homedir(), '.automaton', 'state.db'));

// 1. Orchestrator state
const state = db.prepare("SELECT value FROM kv WHERE key = ?").get("orchestrator.state");
console.log('=== Orchestrator ===');
console.log(state?.value ? JSON.parse(state.value) : 'none');

// 2. Goals (non-completed)
const goals = db.prepare("SELECT id, title, status FROM goals ORDER BY created_at DESC LIMIT 5").all();
console.log('\n=== Goals ===');
goals.forEach(g => console.log(' [' + g.status + '] ' + g.title + ' (' + g.id.slice(-8) + ')'));

// 3. Active tasks
const tasks = db.prepare("SELECT id, title, status, goal_id FROM task_graph WHERE status IN ('pending','assigned','running') ORDER BY created_at DESC LIMIT 10").all();
console.log('\n=== Active Tasks ===');
if (tasks.length === 0) console.log(' (none)');
tasks.forEach(t => console.log(' [' + t.status + '] ' + t.title + ' goal:' + (t.goal_id||'').slice(-8)));

// 4. Summary
const done = db.prepare("SELECT COUNT(*) as c FROM task_graph WHERE status = 'completed'").get();
const failed = db.prepare("SELECT COUNT(*) as c FROM task_graph WHERE status = 'failed'").get();
console.log('\n=== Task Summary ===');
console.log(' Completed:', done.c);
console.log(' Failed:', failed.c);

// 5. Recent events
const recent = db.prepare("SELECT type, content, created_at FROM event_stream WHERE type IN ('task_completed','task_failed') ORDER BY created_at DESC LIMIT 5").all();
console.log('\n=== Recent Events ===');
recent.forEach(e => console.log(' [' + e.type + '] ' + (e.content||'').slice(0,120)));

// 6. Last agent state
const agentState = db.prepare("SELECT value FROM identity WHERE key = 'state'").get();
console.log('\n=== Agent State ===');
console.log(' State:', agentState?.value || 'unknown');

// 7. Last 5 turns
const turns = db.prepare("SELECT state, input, created_at FROM turns ORDER BY created_at DESC LIMIT 5").all();
console.log('\n=== Last 5 Turns ===');
turns.forEach(t => console.log(' [' + t.state + '] ' + (t.input||'').slice(0,80) + ' | ' + t.created_at));

db.close();
