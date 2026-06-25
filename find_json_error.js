const DB = require('/root/automaton/node_modules/better-sqlite3');
const d = new DB('/root/.automaton/state.db', { timeout: 3000 });

// Get the 20 most recent turns
const turns = d.prepare(`SELECT id, input, input_source, thinking FROM turns ORDER BY created_at DESC LIMIT 20`).all();
const turnIds = turns.map(t => t.id);

// Get tool calls for these turns
const placeholders = turnIds.map(() => '?').join(',');
const tcs = d.prepare(`SELECT turn_id, id as tc_id, name, result, error FROM tool_calls WHERE turn_id IN (${placeholders})`).all(turnIds);

// Organize tool calls by turn
const tcByTurn = {};
for (const tc of tcs) {
  if (!tcByTurn[tc.turn_id]) tcByTurn[tc.turn_id] = [];
  tcByTurn[tc.turn_id].push(tc);
}

// Build messages array (simulating buildContextMessages)
const messages = [];
messages.push({ role: "system", content: "SYSTEM PROMPT (simulated)" });

// Add turns
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
        function: { name: tc.name, arguments: "{}" }
      }));
    }
    messages.push(msg);
    for (const tc of turnTcs) {
      const rawContent = tc.error ? `Error: ${tc.error}` : tc.result;
      // Truncate to MAX_TOOL_RESULT_SIZE (10K chars)
      const truncated = rawContent ? rawContent.substring(0, 10000) : "";
      messages.push({ role: "tool", content: truncated, tool_call_id: tc.tc_id });
    }
  }
}

// Add pending input
messages.push({ role: "user", content: "[wakeup] You are waking up..." });

console.log('Total messages:', messages.length);

// Try to JSON.stringify
try {
  const json = JSON.stringify(messages);
  console.log('JSON.stringify SUCCESS, length:', json.length);
} catch (e) {
  console.log('JSON.stringify FAILED:', e.message);
}

// Now try each message content individually
console.log('\n--- Checking each message content ---');
for (let i = 0; i < messages.length; i++) {
  const content = messages[i].content || '';
  try {
    JSON.stringify(content);
  } catch (e) {
    console.log(`Message [${i}] FAILS JSON.stringify:`, e.message.substring(0, 100));
    console.log('  role:', messages[i].role);
    console.log('  content length:', content.length);
    // Show surrounding context of the problematic area
    if (e.message.includes('position')) {
      const pos = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
      console.log('  around position', pos, ':', JSON.stringify(content.substring(Math.max(0,pos-10), pos+20)));
    }
  }
}

// Also check if any individual tool call result strings are valid
console.log('\n--- Checking tool call results ---');
for (let i = 0; i < messages.length; i++) {
  if (messages[i].role === 'tool' && messages[i].content) {
    try {
      JSON.stringify(messages[i].content);
    } catch (e) {
      console.log(`Tool result message [${i}] FAILS:`, e.message.substring(0, 100));
    }
  }
}

d.close();
