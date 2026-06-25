#!/usr/bin/env node
// Debug test for serveFile logic
const fs = require('fs');
const path = require('path');

const CONTENT = '/root/automaton/content/';

function serveFile(cleanPath) {
  const p = cleanPath.split('?')[0].split('#')[0];
  
  if (!p || p === '/') return readFile('index.html');
  
  const relative = p.replace(/^\//, '');
  const ext = path.extname(relative).toLowerCase();
  
  const attempts = [];
  if (ext) {
    attempts.push(relative);
  } else {
    attempts.push(relative + '.html');
    attempts.push(relative + '/index.html');
    attempts.push(relative);
  }
  
  for (const attempt of attempts) {
    const fullPath = CONTENT + attempt;
    console.log(`  Trying: ${fullPath} | exists: ${fs.existsSync(fullPath)}`);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        const resolved = path.resolve(fullPath);
        if (!resolved.startsWith(path.resolve(CONTENT))) continue;
        console.log(`  ✅ FOUND: ${resolved}`);
        return { content: fs.readFileSync(resolved, 'utf-8').slice(0,50), mime: 'text/html' };
      }
    } catch(e) { console.log(`  Error: ${e.message}`); }
  }
  return null;
}

function readFile(relativePath) {
  const full = CONTENT + relativePath;
  console.log(`readFile: ${full} | exists: ${fs.existsSync(full)}`);
  try {
    const stat = fs.statSync(full);
    if (!stat.isFile()) return null;
    return { content: fs.readFileSync(full, 'utf-8').slice(0,50), mime: 'text/html' };
  } catch(e) { return null; }
}

// Test paths
for (const p of ['/', '/quickstart', '/learn-to-code-with-ai', '/tools', '/api-playground', '/blog', '/dashboard']) {
  console.log(`\n=== ${p} ===`);
  const r = serveFile(p);
  console.log(r ? `  Result: ${r.content}...` : '  NOT FOUND');
}
