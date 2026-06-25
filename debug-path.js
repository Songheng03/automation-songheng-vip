// Debug the content service issue
const fs = require('fs');
const path = require('path');

const CONTENT = '/root/automaton/content';

function safeJoin(base, child) {
  const result = path.join(base, child.replace(/^\//, ''));
  return result;
}

// Test various paths
const tests = ['/quickstart', '/tools', '/learn-to-code-with-ai', '/api-playground', '/live-demo', '/free-ai-code-review-tool', '/api-docs', '/dashboard', '/tools/json-formatter'];

for (const t of tests) {
  const clean = t.split('?')[0].split('#')[0];
  const ext = path.extname(clean).toLowerCase();
  
  const withHtml = safeJoin(CONTENT, clean + '.html');
  const exists = fs.existsSync(withHtml);
  const resolved = path.resolve(withHtml);
  const startsWithContent = resolved.startsWith(CONTENT);
  
  console.log(`Path: ${t}`);
  console.log(`  clean: ${clean}`);
  console.log(`  withHtml: ${withHtml}`);
  console.log(`  resolved: ${resolved}`);
  console.log(`  exists: ${exists}`);
  console.log(`  startsWithContent: ${startsWithContent}`);
  console.log(`  direxists(full): ${fs.existsSync('/root/automaton/content/quickstart.html')}`);
  console.log('');
}
