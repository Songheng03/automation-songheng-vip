const DB = require('/root/automaton/node_modules/better-sqlite3');
const d = new DB('/root/.automaton/state.db', { timeout: 3000 });

// Get the last 20 turns with FULL tool call results (no truncation)
const turns = d.prepare(`SELECT id, input, input_source, thinking FROM turns ORDER BY created_at DESC LIMIT 20`).all();
const turnIds = turns.map(t => t.id);
const placeholders = turnIds.map(() => '?').join(',');
const tcs = d.prepare(`SELECT turn_id, id as tc_id, name, result, error FROM tool_calls WHERE turn_id IN (${placeholders})`).all(turnIds);

const tcByTurn = {};
for (const tc of tcs) {
  if (!tcByTurn[tc.turn_id]) tcByTurn[tc.turn_id] = [];
  tcByTurn[tc.turn_id].push(tc);
}

// Build messages with FULL content (no truncation)
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
        function: { name: tc.name, arguments: "{}" }
      }));
    }
    messages.push(msg);
    for (const tc of turnTcs) {
      // Use FULL content (no truncation)
      const rawContent = tc.error ? `Error: ${tc.error}` : (tc.result || "");
      messages.push({ role: "tool", content: rawContent, tool_call_id: tc.tc_id });
    }
  }
}

messages.push({ role: "user", content: "[wakeup] wake up" });
console.log('Messages:', messages.length);

// Test each message content with JSON.stringify
let hasIssue = false;
for (let i = 0; i < messages.length; i++) {
  const content = messages[i].content || "";
  try {
    JSON.stringify(content);
  } catch (e) {
    hasIssue = true;
    console.log(`\nMessage [${i}] FAILS! role:${messages[i].role} len:${content.length}`);
    const msg = e.message;
    const posMatch = msg.match(/position (\d+)/);
    if (posMatch) {
      const pos = parseInt(posMatch[1]);
      const ctx = JSON.stringify(content.substring(Math.max(0,pos-20), pos+30));
      console.log('  around:', ctx);
    }
  }
}

// Also check system prompt from the actual config
const cfg = JSON.parse(require('fs').readFileSync('/root/.automaton/automaton.json', 'utf-8'));
const genesisPrompt = cfg.genesisPrompt || "";
try {
  JSON.stringify(genesisPrompt);
} catch (e) {
  hasIssue = true;
  console.log('\nGENESIS PROMPT FAILS!');
}

if (!hasIssue) {
  console.log('\nNo issues found with full content - the problem must be in the system prompt, memory block, or trimContext filtering.');
}

d.close();
