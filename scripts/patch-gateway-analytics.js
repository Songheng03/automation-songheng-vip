#!/usr/bin/env node
// patch-gateway-analytics.js — Add analytics tracking to gateway.js
// Applies 3 small edits:
// 1. Add require line after the MIME section
// 2. Add tracking call at the top of the request handler
// 3. Add API route handler

const fs = require('fs');
const gp = '/root/automaton/gateway.js';
let code = fs.readFileSync(gp, 'utf8');

// Edit 1: Add require('.../analytics') after the MIME section
const mimeEnd = "'.txt':'text/plain',";
let idx1 = code.indexOf(mimeEnd);
if (idx1 === -1) { console.error('FAIL: mime section not found'); process.exit(1); }
// Find end of MIME block (the }; line)
let mimeBlockEnd = code.indexOf('\n', idx1);
mimeBlockEnd = code.indexOf('\n', mimeBlockEnd + 1); // skip past the ending line
const reqLine = "\nconst analytics = require('/root/automaton/analytics.js');\n";
code = code.slice(0, mimeBlockEnd) + reqLine + code.slice(mimeBlockEnd);
console.log('✓ Added analytics require');

// Edit 2: Add tracking and try/catch at the beginning of the server handler
const handlerStart = 'http.createServer(function(req, res) {';
let idx2 = code.indexOf(handlerStart);
if (idx2 === -1) { console.error('FAIL: handler not found'); process.exit(1); }
// Find the opening brace
let bracePos = code.indexOf('{', idx2);
const trackingCode = `\n  var _reqStart = Date.now();
  try {
`; // open a try
code = code.slice(0, bracePos + 1) + trackingCode + code.slice(bracePos + 1);
console.log('✓ Added tracking init');

// Edit 3: Close the try and add analytics route check before the path routing
const routeHandlerPython = "if (p === '/api/health')";
let idx3 = code.indexOf(routeHandlerPython);
if (idx3 === -1) {
  // try looking for the actual route check pattern
  const altPattern = "if (p === ";
  idx3 = code.indexOf(altPattern);
}
if (idx3 === -1) { console.error('FAIL: route handler not found'); process.exit(1); }

const analyticsRoute = `  // Analytics API routes
  if (analytics.matches(req.url)) {
    analytics.track(req, res, _reqStart);
    return analytics.handleAPI(req, res);
  }
  
`;

// Count the route checks
let routeStart = idx3;
// Go back to find the start of the route handling block (after request parsing)
let lines = code.substring(0, routeStart).split('\n');
let lastLine = '';
let insertPos = routeStart;
for (let i = lines.length - 1; i >= 0; i--) {
  const l = lines[i].trim();
  if (l.startsWith('var p = ') || l.startsWith('const p = ') || l.startsWith('let p = ')) {
    insertPos = code.indexOf(lines[i]) + lines[i].length + 1;
    break;
  }
}

code = code.slice(0, insertPos) + analyticsRoute + code.slice(insertPos);
console.log('✓ Added analytics routes');

// Edit 4: Close the try block and catch errors
// Find the end of the request handler
const lastHandlerLine = "})(req, res);";
let idx4 = code.lastIndexOf(lastHandlerLine);
if (idx4 === -1) { console.error('FAIL: handler end not found'); process.exit(1); }

// Before the })(req, res); we need to close the try and add catch
// Find the last } before })(req, res);
let beforeEnd = code.substring(0, idx4);
let lastBrace = beforeEnd.lastIndexOf('}');
let closeBrace = beforeEnd.lastIndexOf('}', lastBrace - 1);

const closeTry = `  } catch(e) {
    analytics.track(req, res, _reqStart);
    if (!res.headersSent) {
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error: e.message}));
    }
  }
`;

code = code.slice(0, closeBrace + 1) + closeTry + code.slice(closeBrace + 1);
console.log('✓ Added error handling');

// Write the patched file
fs.writeFileSync(gp, code);
console.log('✓ Patched gateway.js');

// Syntax check
const { execSync } = require('child_process');
try {
  execSync('node --check ' + gp, { stdio: 'pipe' });
  console.log('✓ Syntax check PASSED');
} catch(e) {
  console.error('✗ SYNTAX ERROR:');
  console.error(e.stderr.toString());
  process.exit(1);
}
