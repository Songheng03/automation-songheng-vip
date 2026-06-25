const fs = require('fs');

const content = fs.readFileSync('/root/automaton/gateway.cjs', 'utf8');

// The broken line has literal \n (backslash-n) characters in it
const broken = "if (pathname === '/.well-known/mcp.json' && method === 'GET') {\\n      const mcpPath = '/outputs/mcp.json';\\n      if (fs.existsSync(mcpPath)) {\\n        return serveStatic(req, res, mcpPath);\\n      }\\n      return sendJSON(res, 404, { error: 'MCP discovery file not found' });\\n    }";

const fixed = `if (pathname === '/.well-known/mcp.json' && method === 'GET') {
      const mcpPath = '/outputs/mcp.json';
      if (fs.existsSync(mcpPath)) {
        return serveStatic(req, res, mcpPath);
      }
      return sendJSON(res, 404, { error: 'MCP discovery file not found' });
    }`;

if (content.includes(broken)) {
  const result = content.replace(broken, fixed);
  fs.writeFileSync('/root/automaton/gateway.cjs', result);
  console.log('SUCCESS: Fixed broken MCP route line');
} else {
  console.log('Pattern not found. Checking lines...');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('mcp.json') && lines[i].includes('well-known')) {
      console.log(`Line ${i+1}: ${JSON.stringify(lines[i])}`);
    }
  }
}
