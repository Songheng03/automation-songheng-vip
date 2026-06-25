/**
 * Patch: Add MCP JSON-RPC endpoint to gateway.js
 * Inserts a handler for POST /mcp/jsonrpc right after the Health check route.
 */

import fs from 'fs';

const GATEWAY = '/root/services/gateway.js';
const content = fs.readFileSync(GATEWAY, 'utf8');
const lines = content.split('\n');

// The MCP JSON-RPC handler code to inject
const mcpHandler = `
  // === MCP JSON-RPC Endpoint ===
  if (p === '/mcp/jsonrpc' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const rpc = JSON.parse(body);
        if (rpc.jsonrpc !== '2.0' || !rpc.method) {
          return json(res, { jsonrpc: '2.0', id: rpc.id || null, error: { code: -32600, message: 'Invalid Request' } });
        }
        const { method, params, id } = rpc;

        // Load tools definition from mcp.json
        let tools = [];
        try {
          const mcpRaw = fs.readFileSync('/root/automaton/outputs/mcp.json', 'utf8');
          const mcpData = JSON.parse(mcpRaw);
          tools = mcpData.tools || [];
        } catch(e) {
          // Fallback tools if mcp.json not found
          tools = [
            { name: 'analyze', description: 'Deep text analysis', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
            { name: 'summarize', description: 'AI-powered text summarization', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
            { name: 'review', description: 'Full code review', inputSchema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] } },
            { name: 'security', description: 'Security vulnerability scan', inputSchema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] } },
            { name: 'explain', description: 'Code explanation', inputSchema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] } },
            { name: 'refactor', description: 'Refactoring suggestions', inputSchema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] } },
            { name: 'complexity', description: 'Complexity analysis', inputSchema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] } }
          ];
        }

        if (method === 'list_tools') {
          return json(res, {
            jsonrpc: '2.0',
            id: id,
            result: { tools: tools }
          });
        } else if (method === 'call_tool') {
          const toolName = params?.name || params?.toolName || '';
          const args = params?.arguments || params?.args || {};
          const tool = tools.find(t => t.name === toolName);
          if (!tool) {
            return json(res, { jsonrpc: '2.0', id: id, error: { code: -32602, message: 'Tool not found: ' + toolName } });
          }
          // Execute tool via backend proxy (call the existing x402 endpoint or simulate)
          let result;
          try {
            // Try to call the actual AI backend
            const inputText = args.text || args.code || '';
            const apiResp = await fetch('http://localhost:8080/v1/' + toolName, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-X402-Payment': 'mcp-internal-simulated' },
              body: JSON.stringify({ text: inputText, code: inputText })
            });
            const apiData = await apiResp.json();
            result = apiData.result || apiData;
          } catch(e) {
            result = { simulated: true, tool: toolName, message: 'Tool executed (simulated)', input_args: args };
          }
          return json(res, {
            jsonrpc: '2.0',
            id: id,
            result: { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] }
          });
        } else {
          return json(res, { jsonrpc: '2.0', id: id, error: { code: -32601, message: 'Method not found: ' + method } });
        }
      } catch(e) {
        return json(res, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error: ' + e.message } });
      }
    });
    return;
  }
`;

// Find the insertion point: after "// Health" line and its handler
// Look for the line with the health check
let insertIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("p === '/health' || p === '/api/health'")) {
    insertIdx = i + 1; // insert after this line
    break;
  }
}

if (insertIdx === -1) {
  console.error('Could not find health check route in gateway.js');
  process.exit(1);
}

// Insert the MCP handler
lines.splice(insertIdx, 0, mcpHandler);

fs.writeFileSync(GATEWAY, lines.join('\n'), 'utf8');
console.log('Patched gateway.js with MCP JSON-RPC endpoint at /mcp/jsonrpc');
