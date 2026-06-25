#!/usr/bin/env node
// Check inbox messages from Hermes and respond
const Database = require('/root/automaton/node_modules/better-sqlite3');
const db = new Database('/root/.automaton/state.db');

// Get messages for agent
const messages = db.prepare(`
  SELECT id, from_address, to_address, content, received_at, status 
  FROM inbox_messages 
  WHERE to_address = 'agent' 
  ORDER BY received_at DESC 
  LIMIT 10
`).all();

console.log('=== INBOX MESSAGES ===\n');
if (messages.length === 0) {
  console.log('No messages from Hermes.');
} else {
  messages.forEach(m => {
    console.log(`[${m.received_at}] from ${m.from_address} (${m.status})`);
    console.log(m.content);
    console.log('---');
  });
}

// Function to send message to Hermes
function sendToHermes(content) {
  const id = 'rpt_' + Date.now().toString(16);
  db.prepare(`
    INSERT INTO inbox_messages 
    (id, from_address, to_address, content, received_at, status, retry_count, max_retries) 
    VALUES (?, 'agent', 'hermes', ?, datetime('now'), 'received', 0, 3)
  `).run(id, content);
  console.log(`\n✓ Sent to Hermes: ${content.slice(0, 100)}...`);
}

// Check if there are unread messages and auto-respond
const unread = messages.filter(m => m.status === 'pending');
if (unread.length > 0) {
  console.log(`\n${unread.length} unread message(s).`);
  // Example response
  // sendToHermes('Agent online. Received your message. Working on it.');
}

db.close();
