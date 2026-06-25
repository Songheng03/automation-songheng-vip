const DB = require('/root/automaton/node_modules/better-sqlite3');
const d = new DB('/root/.automaton/state.db', { timeout: 3000 });

// Get all tool call results that have backslashes that could cause JSON issues
// The issue: when JSON.stringify processes a string containing a literal backslash,
// it produces \\. But if the string contains \x or \u that was ALREADY escaped once,
// JSON.stringify might produce something that, when re-interpreted as JSON by DeepSeek,
// creates an invalid escape sequence.

// Let's look for backslashes that aren't part of valid JSON escape sequences
// Specifically: backslash followed by anything that's NOT: " \ / b f n r t u
const tcs = d.prepare('SELECT id, turn_id, name, result FROM tool_calls WHERE LENGTH(result) > 1000 ORDER BY LENGTH(result) DESC LIMIT 50').all();
console.log('Checking', tcs.length, 'tool calls...');
let found = 0;

for (const tc of tcs) {
  if (!tc.result) continue;
  // Simulate what happens during JSON.stringify(content)
  // JSON.stringify will escape: backslashes, quotes, and control chars
  // After JSON.stringify, a valid JSON string should only have these escapes: \" \\ \/ \b \f \n \r \t \uXXXX
  // So ANY other \x in the JSON output would be invalid
  
  // Let's check the result for a literal backslash (code 92)
  for (let i = 0; i < tc.result.length; i++) {
    if (tc.result.charCodeAt(i) === 92) {
      // We found a backslash. JSON.stringify will turn this into \\
      // In the JSON, this becomes \\ (valid - escaped backslash)
      // But what if there's an issue with the NEXT character?
      // Actually, JSON.stringify properly escapes everything. The issue must be elsewhere.
      
      // Let's instead test: build a message with this content and try JSON.stringify
      found++;
      if (found <= 3) {
        console.log('Backslash found in tool_call', tc.turn_id, tc.name, 'at position', i);
        console.log('  context:', JSON.stringify(tc.result.substring(Math.max(0,i-2), i+6)));
      }
    }
  }
}
console.log('total backslashes in large results:', found);

d.close();
