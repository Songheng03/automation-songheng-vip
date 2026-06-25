#!/usr/bin/env node
// Quick fix: ensure /pastebin and /webhooks pages serve correctly
// The issue might be that the staticPages route regex isn't matching 
// because the gateway.js URL variable shadows the global url

const fs = require('fs');
const path = require('path');
const CONTENT = '/root/automaton/content/';

// 1. Create pastebin.html if it doesn't exist as standalone page (it does, but let's add a pastebin page route)
// The gateway routes /pastebin to serve('/pastebin.html')
// Debug: let's see what serve() returns for /pastebin
const MIME = {html:'text/html; charset=utf-8'};
function serve(uri) {
  let u = uri || '/index.html';
  let clean = u.replace(/^\//, '');
  if (!clean.includes('.')) clean += '.html';
  try {
    const full = path.join(CONTENT, clean);
    if (fs.statSync(full).isFile()) {
      const ext = full.split('.').pop();
      return { body: fs.readFileSync(full, 'utf-8'), mime: MIME[ext] || 'application/octet-stream' };
    }
  } catch(e) {}
  return null;
}

// Check all routes we care about
['/pastebin.html', '/pastebin', 'pastebin.html', 'pastebin'].forEach(route => {
  const result = serve(route);
  console.log(`serve('${route}'): ${result ? 'OK (' + result.mime + ')' : 'NULL'}`);
});

// Also check if the gateway is actually running
const http = require('http');
http.get('http://127.0.0.1:8080/pastebin', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log(`Status for /pastebin: ${res.statusCode}`);
    if (res.statusCode === 404) {
      console.log('404 body:', data.slice(0, 200));
    } else {
      console.log('OK - page is', data.length, 'bytes');
    }
  });
}).on('error', e => console.log('ERROR:', e.message));
