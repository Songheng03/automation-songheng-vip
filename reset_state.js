const DB = require('/root/automaton/node_modules/better-sqlite3');
const d = new DB('/root/.automaton/state.db', { timeout: 3000 });

// Clear the last 50 turn IDs and their tool calls to wipe any corrupt data
const recent = d.prepare('SELECT id FROM turns ORDER BY created_at DESC LIMIT 50').all();
const ids = recent.map(r => r.id);
const placeholders = ids.map(() => '?').join(',');

// First delete associated tool_calls
const tcDel = d.prepare(`DELETE FROM tool_calls WHERE turn_id IN (${placeholders})`).run(...ids);
console.log('Deleted', tcDel.changes, 'tool calls');

// Then delete the turns
const tDel = d.prepare(`DELETE FROM turns WHERE id IN (${placeholders})`).run(...ids);
console.log('Deleted', tDel.changes, 'turns');

// Also clear inbox messages (stale ones)
const inboxDel = d.prepare("DELETE FROM inbox_messages").run();
console.log('Deleted', inboxDel.changes, 'inbox messages');

// Reset all unused goals
d.prepare("UPDATE goals SET status='cancelled' WHERE status != 'completed'").run();
console.log('Cancelled incomplete goals');

// Make sure orchestrator is idle
d.prepare("UPDATE kv SET value=? WHERE key='orchestrator.state'").run(JSON.stringify({phase:"idle",goalId:null,replanCount:0,failedTaskId:null,failedError:null}));

// Reset all pending tasks
d.prepare("UPDATE task_graph SET status='pending', assigned_to=NULL, started_at=NULL WHERE status IN ('assigned','running')").run();

// Reset any stale state
d.prepare("DELETE FROM kv WHERE key='sleep_until'").run();
d.prepare("DELETE FROM kv WHERE key='blocked_goal_backoff'").run();
d.prepare("DELETE FROM kv WHERE key='last_inline_topup_attempt'").run();

console.log('State reset complete');
d.close();
