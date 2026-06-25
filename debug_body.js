const DB = require('/root/automaton/node_modules/better-sqlite3');
const d = new DB('/root/.automaton/state.db', { timeout: 3000 });
const fs = require('fs');

// Simulate exactly what the agent does: get last 20 turns + build context
const turns = d.prepare(`SELECT id, input, input_source, thinking, created_at FROM turns ORDER BY created_at DESC LIMIT 20`).all();
const ids = turns.map(t => t.id);
const tcs = d.prepare(`SELECT turn_id, id as tc_id, name, result, error, arguments FROM tool_calls WHERE turn_id IN (${ids.map(()=>'?').join(',')})`).all(...ids);

const tcByTurn = {};
for (const tc of tcs) {
  if (!tcByTurn[tc.turn_id]) tcByTurn[tc.turn_id] = [];
  tcByTurn[tc.turn_id].push(tc);
}

// Build messages the EXACT way the agent code does (with truncation)
function truncateResult(r) {
  if (!r) return '';
  const maxSize = 10000;
  if (r.length <= maxSize) return r;
  return r.slice(0, maxSize) + `\n\n[TRUNCATED: ${r.length - maxSize} characters omitted]`;
}

const messages = [];
messages.push({ role: "system", content: "SYSTEM PROMPT" });

for (let i = turns.length - 1; i >= 0; i--) {
  const t = turns[i];
  if (t.input) {
    messages.push({ role: "user", content: `[${t.input_source || 'system'}] ${t.input}` });
  }
  if (t.thinking) {
    const msg = { role: "assistant", content: t.thinking };
    const turnTcs = tcByTurn[t.id] || [];
    if (turnTcs.length > 0) {
      msg.tool_calls = turnTcs.map(tc => ({
        id: tc.tc_id,
        type: "function",
        function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
      }));
    }
    messages.push(msg);
    for (const tc of turnTcs) {
      const raw = tc.error ? `Error: ${tc.error}` : (tc.result || '');
      messages.push({ role: "tool", content: truncateResult(raw), tool_call_id: tc.tc_id });
    }
  }
}
messages.push({ role: "user", content: "[wakeup] test" });

console.log('Messages array:', messages.length);

// Build the EXACT body that openaiChat sends
const body = {
  model: "deepseek-v4-flash",
  messages: messages.map(m => {
    const r = { role: m.role, content: m.content || "" };
    if (m.tool_calls) r.tool_calls = m.tool_calls;
    if (m.tool_call_id) r.tool_call_id = m.tool_call_id;
    if (m.name) r.name = m.name;
    return r;
  }),
};

// Try serializing
console.log('Attempting JSON.stringify...');
try {
  const json = JSON.stringify(body);
  console.log('SUCCESS! Body length:', json.length);
  // Write to file for inspection
  fs.writeFileSync('/tmp/test_body.json', json);
} catch (e) {
  console.log('FAILED:', e.message);
  // Try to find which message causes the issue
  for (let i = 0; i < body.messages.length; i++) {
    try {
      JSON.stringify({ test: body.messages[i].content });
    } catch (e) {
      console.log(`Message ${i} (${body.messages[i].role}) content fails!`);
      const c = body.messages[i].content || '';
      console.log('  length:', c.length);
      if (e.message.includes('position')) {
        const pos = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
        console.log('  bad char at pos', pos, 'code:', c.charCodeAt(pos), 'char:', c[pos]);
        console.log('  around:', JSON.stringify(c.substring(Math.max(0,pos-3), pos+10)));
      }
    }
  }
}

d.close();
