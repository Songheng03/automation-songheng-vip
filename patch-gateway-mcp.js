#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

let content = fs.readFileSync('/root/automaton/gateway.cjs', 'utf-8');

// 1. Add require for mcp-handler
const requireLine = "const githubWebhook = require('/root/automaton/services/github-webhook-handler.cjs');";
const newRequireLine = requireLine + "\nconst mcphandler = require('/root/automaton/services/mcp-handler.cjs');";
content = content.replace(requireLine, newRequireLine);

// 2. Add MCP routes before the "Default: static files" line
const mcpRoutes = `    // MCP routes
    if (p === '/.well-known/mcp.json') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(mcphandler.getDiscoveryMetadata()));
      return;
    }
    if (p === '/.well-known/ai-plugin.json') {
      try {
        const aiPlugin = fs.readFileSync('/root/automaton/.well-known/ai-plugin.json', 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(aiPlugin);
      } catch(e) {
        res.writeHead(404); res.end('Not found');
      }
      return;
    }
    if (p === '/mcp' || p === '/mcp/sse') {
      if (req.method === 'GET') {
        mcphandler.handleMCPSSE(req, res);
        return;
      }
      if (req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', async () => {
          try {
            const result = await mcphandler.handleMCPRequest(body, callAI);
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify(result));
          } catch(e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: e.message }, id: null }));
          }
        });
        return;
      }
      res.writeHead(405); res.end('Method not allowed');
      return;
    }

    // Default: static files`;

// Replace "// Default: static files\n    await serveStatic(req, res);"
const defaultStaticLine = "    // Default: static files\n    await serveStatic(req, res);";
content = content.replace(defaultStaticLine, mcpRoutes);

fs.writeFileSync('/root/automaton/gateway.cjs', content);
console.log('gateway.cjs patched successfully with MCP routes');
