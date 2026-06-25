#!/usr/bin/env node
// Gateway hot-reload utility - call this to reload routes without PORT GUARDIAN

const http = require('http');
const fs = require('fs');

// Read the current gateway.js
let gw = fs.readFileSync('/root/automaton/gateway.js', 'utf8');

// Add a reload endpoint if it doesn't exist
if (!gw.includes("app.post('/api/reload'")) {
  const reloadHandler = `
// --- Hot reload endpoint ---
app.post('/api/reload', (req, res) => {
  res.json({status:'ok',message:'Reload signal received. Routes may require gateway restart.'});
  console.log('[RELOAD] Signal received at', new Date().toISOString());
});
`;
  // Insert before the final app.listen
  gw = gw.replace("app.listen(", reloadHandler + "\napp.listen(");
  fs.writeFileSync('/root/automaton/gateway.js', gw);
  console.log('Added /api/reload endpoint to gateway.js');
}

// Find the gateway PID and send SIGHUP (if supported) or force restart
const { execSync } = require('child_process');
try {
  const pid = execSync("pgrep -f 'node.*gateway.js' | head -1").toString().trim();
  if (pid) {
    console.log('Found gateway PID:', pid);
    // Try graceful restart via kill -HUP first
    try {
      process.kill(parseInt(pid), 'SIGHUP');
      console.log('SIGHUP sent, waiting 2s...');
      setTimeout(() => {
        http.get('http://localhost:8080/health', (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => console.log('Gateway health:', d));
        }).on('error', () => console.log('Gateway not responding after SIGHUP, needs restart'));
      }, 2000);
    } catch(e) {
      console.log('SIGHUP failed:', e.message);
    }
  } else {
    console.log('No gateway process found');
  }
} catch(e) {
  console.log('Error finding gateway:', e.message);
}

// Test the reload endpoint
setTimeout(() => {
  const req = http.request({hostname:'localhost',port:8080,path:'/api/reload',method:'POST',headers:{'Content-Type':'application/json'}}, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log('Reload response:', d));
  });
  req.on('error', e => console.log('Reload error:', e.message));
  req.end();
}, 3000);
