#!/usr/bin/env node
/**
 * my-automaton MCP Server — Port 3095 (updated)
 * Exposes all services as MCP tools. Full protocol compliance.
 */

import http from 'http';

const PORT = 3095;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';
const CHAIN = 'base';

const tools = {
  'summarize_text': {
    name: 'summarize_text',
    description: 'AI text summarization. FREE on port 3000.',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
    service: { port: 3000, path: '/api/summarize', free: true }
  },
  'create_paste': {
    name: 'create_paste',
    description: 'Create a shareable paste/code snippet. FREE on port 3001.',
    inputSchema: { type: 'object', properties: { content: { type: 'string' }, title: { type: 'string' }, language: { type: 'string' } }, required: ['content'] },
    service: { port: 3001, path: '/api/paste', free: true }
  },
  'shorten_url': {
    name: 'shorten_url',
    description: 'Shorten a URL. FREE on port 3003.',
    inputSchema: { type: 'object', properties: { url: { type: 'string' }, slug: { type: 'string' } }, required: ['url'] },
    service: { port: 3003, path: '/api/shorten', free: true }
  },
  'render_markdown': {
    name: 'render_markdown',
    description: 'Convert markdown to HTML. FREE on port 3097.',
    inputSchema: { type: 'object', properties: { markdown: { type: 'string' }, theme: { type: 'string', enum: ['light','dark'] } }, required: ['markdown'] },
    service: { port: 3097, path: '/render', free: true }
  },
  'analyze_text': {
    name: 'analyze_text',
    description: 'Deep text analysis — sentiment, entities, structure. 1¢ USDC via x402.',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
    service: { port: 3020, path: '/v1/analyze', cost: 1 }
  },
  'summarize_premium': {
    name: 'summarize_premium',
    description: 'Premium AI summarization. 2¢ USDC via x402.',
    inputSchema: { type: 'object', properties: { text: { type: 'string' }, style: { type: 'string', enum: ['concise','detailed','bullet'] } }, required: ['text'] },
    service: { port: 3020, path: '/v1/summarize', cost: 2 }
  },
  'review_code': {
    name: 'review_code',
    description: 'Full code review with metrics and suggestions. 5¢ USDC via x402.',
    inputSchema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' } }, required: ['code'] },
    service: { port: 3030, path: '/v1/review', cost: 5 }
  },
  'scan_security': {
    name: 'scan_security',
    description: 'Security vulnerability scan. 3¢ USDC via x402.',
    inputSchema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' } }, required: ['code'] },
    service: { port: 3030, path: '/v1/security', cost: 3 }
  },
  'explain_code': {
    name: 'explain_code',
    description: 'Explain code structure and logic. 2¢ USDC via x402.',
    inputSchema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' } }, required: ['code'] },
    service: { port: 3030, path: '/v1/explain', cost: 2 }
  },
  'refactor_code': {
    name: 'refactor_code',
    description: 'Refactoring suggestions. 5¢ USDC via x402.',
    inputSchema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' } }, required: ['code'] },
    service: { port: 3030, path: '/v1/refactor', cost: 5 }
  },
  'generate_image': {
    name: 'generate_image',
    description: 'Generate AI image. 3¢ USDC via x402.',
    inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, style: { type: 'string', enum: ['realistic','artistic','anime'] } }, required: ['prompt'] },
    service: { port: 3701, path: '/v1/generate', cost: 3 }
  },
  'register_referral': {
    name: 'register_referral',
    description: 'Register for 20% commission referral program. FREE.',
    inputSchema: { type: 'object', properties: { agent_address: { type: 'string' }, agent_name: { type: 'string' } }, required: ['agent_address','agent_name'] },
    service: { port: 3150, path: '/api/referral/register', free: true }
  },
  'handshake': {
    name: 'handshake',
    description: 'Establish mutual agent discovery. FREE.',
    inputSchema: { type: 'object', properties: { agent_address: { type: 'string' }, agent_name: { type: 'string' }, capabilities: { type: 'array', items: { type: 'string' } } }, required: ['agent_address','agent_name'] },
    service: { port: 3120, path: '/api/handshake', free: true }
  },
  'get_catalog': {
    name: 'get_catalog',
    description: 'Full service catalog. FREE.',
    inputSchema: { type: 'object', properties: {} },
    service: { port: 3110, path: '/api/catalog', free: true }
  }
};

function respond(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, MCP-Version, X-X402-Payment',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(body);
}

function html(res, body) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

function collectBody(req) {
  return new Promise(resolve => {
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
  });
}

async function proxy(tool, args) {
  const svc = tool.service;
  try {
    const resp = await fetch(`http://localhost:${svc.port}${svc.path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    const data = await resp.json();
    return { success: resp.ok, data, service: { port: svc.port, cost: svc.cost ? `${svc.cost}¢` : 'FREE' } };
  } catch (e) {
    return { success: false, error: e.message, service: { port: svc.port } };
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  // CORS
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, MCP-Version, X-X402-Payment',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  // MCP JSON-RPC
  if (path === '/mcp' && method === 'POST') {
    const rpc = await collectBody(req);
    const rpcMethod = rpc.method;
    const id = rpc.id;

    if (rpcMethod === 'initialize') {
      return respond(res, {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2025-03-26',
          serverInfo: { name: 'my-automaton-mcp', version: '1.0.0' },
          capabilities: { tools: {} }
        }
      });
    }

    if (rpcMethod === 'tools/list') {
      return respond(res, {
        jsonrpc: '2.0', id,
        result: {
          tools: Object.values(tools).map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            meta: { cost: t.service.cost ? `${t.service.cost}¢` : 'FREE', wallet: WALLET }
          }))
        }
      });
    }

    if (rpcMethod === 'tools/call') {
      const toolName = rpc.params?.name;
      const args = rpc.params?.arguments || {};
      if (!toolName || !tools[toolName]) {
        return respond(res, { jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown: ${toolName}`, data: { available: Object.keys(tools) } } }, 400);
      }
      const result = await proxy(tools[toolName], args);
      return respond(res, {
        jsonrpc: '2.0', id,
        result: { content: [{ type: 'text', text: JSON.stringify(result.data || result) }], meta: { tool: toolName, isError: !result.success } }
      });
    }

    return respond(res, { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown: ${rpcMethod}` } }, 400);
  }

  // Health
  if (path === '/health') {
    return respond(res, {
      alive: true, agent: 'my-automaton', tools: Object.keys(tools).length,
      wallet: WALLET, server: SERVER, ports: [...new Set(Object.values(tools).map(t => t.service.port))],
      mcp: `http://${SERVER}:${PORT}/mcp`
    });
  }

  // REST API tools list
  if (path === '/api/tools' || path === '/api') {
    return respond(res, {
      tools: Object.values(tools).map(t => ({
        name: t.name, desc: t.description, cost: t.service.cost ? `${t.service.cost}¢` : 'FREE',
        endpoint: `http://${SERVER}:${t.service.port}${t.service.path}`
      }))
    });
  }

  // Call tool via REST
  const callMatch = path.match(/^\/api\/call\/(\w+)$/);
  if (callMatch && method === 'POST') {
    const toolName = callMatch[1];
    const args = await collectBody(req);
    if (!tools[toolName]) return respond(res, { error: 'Unknown tool', available: Object.keys(tools) }, 404);
    const result = await proxy(tools[toolName], args);
    return respond(res, result);
  }

  // Web UI
  if (path === '/') {
    const rows = Object.values(tools).map(t => `
      <tr>
        <td><code>${t.name}</code></td>
        <td>${t.description}</td>
        <td>${t.service.cost ? `<b style="color:#00d4ff">${t.service.cost}¢</b>` : '<b style="color:#4ade80">FREE</b>'}</td>
        <td>${t.service.port}</td>
      </tr>
    `).join('\n');

    return html(res, `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>my-automaton MCP</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0f;color:#e0e0e0;padding:20px}.container{max-width:1100px;margin:0 auto}header{text-align:center;padding:30px 0;border-bottom:1px solid #2a2a35;margin-bottom:30px}h1{font-size:2.2em;background:linear-gradient(135deg,#00d4ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.subtitle{color:#888;margin-top:8px}table{width:100%;border-collapse:collapse;margin:20px 0}th{text-align:left;padding:12px;border-bottom:2px solid #2a2a35;color:#888;font-size:0.85em;text-transform:uppercase}td{padding:10px 12px;border-bottom:1px solid #1a1a25;font-size:0.9em}tr:hover{background:#111118}.endpoint{background:#111118;border:1px solid #2a2a35;border-radius:8px;padding:15px;margin:20px 0;font-family:monospace;font-size:0.9em}code{font-family:'Fira Code',monospace;color:#7b2ff7}.btn{background:linear-gradient(135deg,#00d4ff,#7b2ff7);color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:0.9em;text-decoration:none;display:inline-block;margin:5px}.note{color:#666;font-size:0.85em;margin:20px 0;text-align:center}
</style></head>
<body><div class="container">
<header><h1>⚡ my-automaton MCP</h1><div class="subtitle">${Object.keys(tools).length} tools · MCP v2025-03-26 · ${SERVER}</div></header>
<div class="endpoint">MCP Endpoint: <code>http://${SERVER}:${PORT}/mcp</code><br><span style="color:#666;font-size:0.85em">Connect any MCP-compatible agent to discover and call all tools.</span></div>
<div style="text-align:center;margin:15px 0"><a href="/api/tools" class="btn">📋 REST API</a> <a href="/health" class="btn">❤️ Health</a></div>
<h2>Available Tools</h2>
<table><thead><tr><th>Tool</th><th>Description</th><th>Cost</th><th>Port</th></tr></thead><tbody>${rows}</tbody></table>
<div style="text-align:center;margin-top:40px;color:#666;font-size:0.85em">Wallet: ${WALLET} on ${CHAIN} · Send USDC with X-X402-Payment header</div>
</div></body></html>`);
  }

  respond(res, { error: 'Not found', path }, 404);
});

server.listen(PORT, '0.0.0.0', () => console.log(`✅ MCP Server running on :${PORT} with ${Object.keys(tools).length} tools`));
