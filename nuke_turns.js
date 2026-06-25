const DB = require('/root/automaton/node_modules/better-sqlite3');
const d = new DB('/root/.automaton/state.db', { timeout: 3000 });

// Get total counts before
const before = {
  turns: d.prepare('SELECT COUNT(*) as c FROM turns').get().c,
  toolCalls: d.prepare('SELECT COUNT(*) as c FROM tool_calls').get().c,
};

// Delete ALL tool_calls and turns - the agent will rebuild context from scratch
const tcDel = d.prepare('DELETE FROM tool_calls').run();
const tDel = d.prepare('DELETE FROM turns').run();
const memDel = d.prepare('DELETE FROM episodic_memory').run();
const mem2Del = d.prepare('DELETE FROM semantic_memory').run();
const mem3Del = d.prepare('DELETE FROM working_memory').run();
const infDel = d.prepare('DELETE FROM inference_costs').run();
const evDel = d.prepare('DELETE FROM event_stream').run();

// Also clear inbox and wake events
d.prepare('DELETE FROM inbox_messages').run();
d.prepare('DELETE FROM wake_events').run();

// Reset state
d.prepare("DELETE FROM kv WHERE key='sleep_until'").run();
d.prepare("UPDATE kv SET value=? WHERE key='agent_state'").run('idle');

console.log('Cleaned:', JSON.stringify(before));
console.log('turns deleted:', tDel.changes);
console.log('tool_calls deleted:', tcDel.changes);
console.log('memories deleted:', memDel.changes + mem2Del.changes + mem3Del.changes);
console.log('inference costs deleted:', infDel.changes);
console.log('events deleted:', evDel.changes);
console.log('ALL CLEAR - agent will start fresh');

d.close();
