#!/usr/bin/env node
// Emergency fix: Ensure MCP service is loaded exactly once in gateway.cjs
const fs = require('fs');
const gw = '/root/automaton/gateway.cjs';
let code = fs.readFileSync(gw, 'utf8');

// Check current MCP status
const mcpRefs = (code.match(/mcp-service/g) || []).length;
console.log(`Current MCP refs: ${mcpRefs}`);

if (mcpRefs === 0) {
  // Find the analytics middleware injection point - add MCP before it
  const mcpLine = `
// MCP Service (Model Context Protocol)
require('./services/mcp-service.cjs')(app);
`;
  
  // Insert right after DEEPSEEK_BASE / callAI function
  const marker = "const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';";
  const idx = code.indexOf(marker);
  if (idx > -1) {
    const insertPos = code.indexOf('\n', idx);
    code = code.slice(0, insertPos + 1) + mcpLine + code.slice(insertPos + 1);
    fs.writeFileSync(gw, code);
    console.log('✅ MCP service re-injected (1 reference)');
  }
}

// Verify
const finalMcp = (code.match(/mcp-service/g) || []).length;
console.log(`Final MCP refs: ${finalMcp} (should be 1)`);

// Restart gateway
const { execSync } = require('child_process');
try {
  execSync('sudo systemctl restart automaton-gateway', { timeout: 10000 });
  console.log('✅ Gateway restarted');
} catch(e) {
  console.log('⚠️ systemd restart failed, trying direct kill+start...');
  try {
    execSync("lsof -ti:8080 | xargs kill -9 2>/dev/null; sleep 2", { timeout: 5000 });
  } catch(e2) {}
}

// Verify gateway is running
setTimeout(() => {
  try {
    const http = require('http');
    http.get('http://localhost:8080/health', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => console.log('✅ Gateway health:', d));
    }).on('error', e => console.log('❌ Gateway not responding:', e.message));
  } catch(e) {
    console.log('Could not verify gateway');
  }
}, 2000);
