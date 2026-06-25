const DB = require('/root/automaton/node_modules/better-sqlite3');
const d = new DB('/root/.automaton/state.db', { timeout: 3000 });
const fs = require('fs');

// Build the messages array EXACTLY as the agent does, then find messages[8]
const turns = d.prepare(`SELECT id, input, input_source, thinking, created_at FROM turns ORDER BY created_at DESC LIMIT 20`).all();
const ids = turns.map(t => t.id);
const tcs = d.prepare(`SELECT turn_id, id as tc_id, name, result, error FROM tool_calls WHERE turn_id IN (${ids.map(()=>'?').join(',')})`).all(...ids);

const tcByTurn = {};
for (const tc of tcs) {
  if (!tcByTurn[tc.turn_id]) tcByTurn[tc.turn_id] = [];
  tcByTurn[tc.turn_id].push(tc);
}

function truncateResult(r) {
  if (!r) return '';
  const maxSize = 10000;
  if (r.length <= maxSize) return r;
  return r.slice(0, maxSize) + '\n\n[TRUNCATED: ' + (r.length - maxSize) + ' characters omitted]';
}

const messages = [];
messages.push({ role: "system", content: "SYSTEM" });

for (let i = turns.length - 1; i >= 0; i--) {
  const t = turns[i];
  if (t.input) {
    messages.push({ role: "user", content: '[' + (t.input_source || 'system') + '] ' + t.input });
  }
  if (t.thinking) {
    const msg = { role: "assistant", content: t.thinking };
    const turnTcs = tcByTurn[t.id] || [];
    if (turnTcs.length > 0) {
      msg.tool_calls = turnTcs.map(tc => ({
        id: tc.tc_id,
        type: "function",
        function: { name: tc.name, arguments: "{}" }
      }));
    }
    messages.push(msg);
    for (const tc of turnTcs) {
      const raw = tc.error ? 'Error: ' + tc.error : (tc.result || '');
      messages.push({ role: "tool", content: truncateResult(raw), tool_call_id: tc.tc_id });
    }
  }
}

console.log('Total messages:', messages.length);

// Now check message at index 8
if (messages.length > 8) {
  const m8 = messages[8];
  console.log('Message 8 role:', m8.role);
  const content = m8.content || '';
  console.log('Message 8 content length:', content.length);
  
  // Search for any backslash followed by non-standard char
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 92) { // backslash
      if (i + 1 < content.length) {
        const next = content[i+1];
        const validAfter = ['"','\\','/','b','f','n','r','t','u'];
        if (!validAfter.includes(next) && next !== 'x') {
          console.log('  BAD backslash at pos', i, 'followed by:', JSON.stringify(next), 'code:', content.charCodeAt(i+1));
          console.log('  context:', JSON.stringify(content.substring(Math.max(0,i-5), i+10)));
        }
      }
    }
  }
} else {
  console.log('Less than 9 messages, index', messages.length - 1, 'is last');
  const last = messages[messages.length - 1];
  console.log('  last role:', last.role, 'len:', (last.content||'').length);
}

d.close();
