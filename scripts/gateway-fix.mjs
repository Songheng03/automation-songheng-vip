#!/usr/bin/env node
/**
 * gateway-fix.mjs — DIRECTLY patch the running framework server
 * The automaton framework (PID 1) serves port 8080 via dist/index.js
 * We can patch it at runtime by finding the Express app in module internals
 * 
 * Run: node /root/automaton/scripts/gateway-fix.mjs
 */

import fs from 'fs';
import http from 'http';
import path from 'path';

// First, let's see if the framework has an internal API we can use
// The automaton framework might expose a module we can require

const CONTENT = '/root/automaton/content';

// Static file serving helper
function serveFile(res, filepath) {
  try {
    if (fs.existsSync(filepath) && fs.statSync(filepath).isFile()) {
      const ext = path.extname(filepath).toLowerCase();
      const types = {
        '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
        '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.ico': 'image/x-icon', '.xml': 'application/xml', '.json': 'application/json',
        '.txt': 'text/plain'
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      res.end(fs.readFileSync(filepath));
      return true;
    }
  } catch {}
  return false;
}

// Find the express app in the running framework using process._getActiveHandles()
// This is a hack but might work with Node.js internals
function findExpressApp() {
  const handles = process._getActiveHandles();
  for (const h of handles) {
    if (h.constructor && h.constructor.name === 'Server' && h._handle) {
      const addr = h.address();
      if (addr && addr.port === 8080) {
        return { server: h, address: addr };
      }
    }
  }
  return null;
}

// Create a proxy server that adds our routes
async function startProxyFix() {
  const frameworkInfo = findExpressApp();
  if (frameworkInfo) {
    console.log('✅ Found framework server on port 8080');
    console.log('   Address:', frameworkInfo.address);
    
    // Try to get the router/stack from the server
    const server = frameworkInfo.server;
    console.log('   Server type:', server.constructor.name);
    
    // Node.js HTTP server has no easy way to add routes
    // We need a different approach
  } else {
    console.log('ℹ️ Framework server not found via process handles');
    console.log('   Port 8080 might be occupied by a different process');
  }
  
  // Alternative: Create a monitoring script that checks if our content is being served
  console.log('\n📡 Testing current gateway responses:');
  
  const routes = [
    '/', '/tools/ai-code-reviewer', '/tools/badge-generator', 
    '/blog', '/api-docs', '/getting-started', '/health'
  ];
  
  for (const route of routes) {
    try {
      const res = await fetch(`http://localhost:8080${route}`, { method: 'GET' });
      const text = await res.text();
      const size = text.length;
      console.log(`   ${route} → HTTP ${res.status} (${size} bytes)`);
      if (size > 100) {
        console.log(`     First 100 chars: ${text.slice(0, 100).replace(/\n/g, ' ')}`);
      }
    } catch (e) {
      console.log(`   ${route} → ERROR: ${e.message}`);
    }
  }
  
  // Check what files exist in content/
  console.log('\n📁 Content directory:');
  const files = fs.readdirSync(CONTENT).filter(f => f.endsWith('.html'));
  console.log(`   ${files.length} HTML files: ${files.slice(0, 5).join(', ')}...`);
  
  // Check if our gateway.cjs is loadable
  console.log('\n🔧 Checking gateway.cjs:');
  try {
    const gw = fs.readFileSync('/root/automaton/gateway.cjs', 'utf8');
    const lineCount = gw.split('\n').length;
    console.log(`   Size: ${lineCount} lines, ${gw.length} bytes`);
    
    // Try to require it to check for syntax errors
    const requireResult = require('/root/automaton/gateway.cjs');
    console.log('   Require result:', typeof requireResult);
  } catch (e) {
    console.log(`   Require error: ${e.message}`);
  }
}

startProxyFix().catch(console.error);
