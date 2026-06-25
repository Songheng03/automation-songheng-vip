#!/usr/bin/env node
/**
 * Agent MCP Bridge — Port 3040
 * A lightweight MCP (Model Context Protocol) compatible server that exposes
 * my-automaton's analysis capabilities as MCP tools. Other agents and LLMs
 * can discover and call these tools using the MCP protocol.
 * 
 * This is the KEY revenue driver: it makes our x402 endpoints callable
 * from any MCP-compatible agent framework.
 */
import http from 'http';

const PORT = 3040;
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

// Tool definitions
const tools = {
  'analyze_text': {
    name: 'analyze_text',
    description: 'Analyze text for sentiment, key phrases, entities, and structure. Cost: 1¢ USDC.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to analyze' }
      },
      required: ['text']
    },
    cost_cents: 1,
    endpoint: '/v1/analyze'
  },
  'summarize_text': {
    name: 'summarize_text',
    description: 'Generate a concise AI summary of the provided text. Cost: 2¢ USDC.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to summarize' },
        max_length: { type: 'number', description: 'Maximum summary length in words (optional)' }
      },
      required: ['text']
    },
    cost_cents: 2,
    endpoint: '/v1/summarize'
  },
  'code_review': {
    name: 'code_review',
    description: 'Perform a full code review with complexity metrics, style analysis, and suggestions. Cost: 5¢ USDC.',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The source code to review' },
        language: { type: 'string', description: 'Programming language (optional, auto-detected)' }
      },
      required: ['code']
    },
    cost_cents: 5,
    endpoint: '/v1/review'
  },
  'security_scan': {
    name: 'security_scan',
    description: 'Scan code for security vulnerabilities: eval, XSS, SQL injection, hardcoded secrets. Cost: 3¢ USDC.',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The source code to scan' },
        language: { type: 'string', description: 'Programming language' }
      },
      required: ['code']
    },
    cost_cents: 3,
    endpoint: '/v1/security'
  },
  'explain_code': {
    name: 'explain_code',
    description: 'Explain what a piece of code does, its function signatures, and structure. Cost: 2¢ USDC.',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The code to explain' },
        language: { type: 'string', description: 'Programming language' }
      },
      required: ['code']
    },
    cost_cents: 2,
    endpoint: '/v1/explain'
  },
  'refactor_code': {
    name: 'refactor_code',
    description: 'Get refactoring suggestions to improve code quality and readability. Cost: 5¢ USDC.',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The code to refactor' },
        language: { type: 'string', description: 'Programming language' }
      },
      required: ['code']
    },
    cost_cents: 5,
    endpoint: '/v1/refactor'
  },
  'complexity_analysis': {
    name: 'complexity_analysis',
    description: 'Quick analysis of code complexity: lines, functions, classes, imports. Cost: 2¢ USDC.',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The code to analyze' },
        language: { type: 'string', description: 'Programming language' }
      },
      required: ['code']
    },
    cost_cents: 2,
    endpoint: '/v1/complexity'
  },
  'render_markdown': {
    name: 'render_markdown',
    description: 'Convert markdown text to formatted HTML with templates. Cost: 3¢ USDC.',
    input_schema: {
      type: 'object',
      properties: {
        markdown: { type: 'string', description: 'Markdown content to render' },
        template: { type: 'string', description: 'Template style: default, dark, minimal (optional)' }
      },
      required: ['markdown']
    },
    cost_cents: 3,
    endpoint: '/v1/render'
  },
  'batch_process': {
    name: 'batch_process',
    description: 'Process up to 10 text items in a single batch call. Cost: 5¢ USDC.',
    input_schema: {
      type: 'object',
      properties: {
        texts: { type: 'array', items: { type: 'string' }, description: 'Array of texts to process' },
        operation: { type: 'string', description: 'Operation: analyze, summarize, or stats' }
      },
      required: ['texts', 'operation']
    },
    cost_cents: 5,
    endpoint: '/v1/batch'
  }
};

function serveJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Version'
  });
  res.end(JSON.stringify(data, null, 2));
}

function serveHTML(res, html) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(html);
}

function collectBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Version, X-X402-Payment');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // === MCP Protocol Endpoints ===

  // Health check
  if (path === '/health') {
    return serveJSON(res, {
      service: 'mcp-bridge',
      agent: 'my-automaton',
      port: PORT,
      mcp_version: '2025-03-26',
      tools_count: Object.keys(tools).length,
      wallet: WALLET,
      server: SERVER
    });
  }

  // MCP List Tools (standard MCP discovery)
  if (path === '/tools' || path === '/api/tools') {
    return serveJSON(res, {
      tools: Object.values(tools).map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
        cost_cents: t.cost_cents,
        cost_usd: `$${(t.cost_cents / 100).toFixed(2)}`
      }))
    });
  }

  // MCP Call Tool (standard MCP invocation)
  if (path === '/call' || path === '/api/call') {
    const body = await collectBody(req);
    const toolName = body.name || body.tool;
    const args = body.arguments || body.params || {};

    if (!toolName || !tools[toolName]) {
      return serveJSON(res, {
        error: `Unknown tool. Available: ${Object.keys(tools).join(', ')}`,
        type: 'unknown_tool'
      }, 400);
    }

    const tool = tools[toolName];
    
    // For now, proxy to our x402 analysis service
    // In production, this would verify x402 payments
    try {
      const targetUrl = `http://localhost:3020${tool.endpoint}`;
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: args.text, code: args.code, ...args })
      });
      const result = await response.json();
      
      return serveJSON(res, {
        tool: toolName,
        result,
        cost: {
          cents: tool.cost_cents,
          usd: `$${(tool.cost_cents / 100).toFixed(2)}`
        },
        payment_required: response.status === 402,
        wallet: WALLET
      });
    } catch (e) {
      return serveJSON(res, {
        tool: toolName,
        error: `Service unavailable: ${e.message}`,
        type: 'proxy_error'
      }, 502);
    }
  }

  // === Web UI ===
  if (path === '/') {
    const toolCards = Object.values(tools).map(t => `
      <div class="tool-card">
        <div class="tool-name"><code>${t.name}</code></div>
        <div class="tool-desc">${t.description}</div>
        <div class="tool-cost">$${(t.cost_cents / 100).toFixed(2)}</div>
        <button onclick="callTool('${t.name}')" class="btn-small">Try It</button>
      </div>
    `).join('\n');

    return serveHTML(res, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Bridge — my-automaton</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #e0e0e0; }
    .container { max-width: 1100px; margin: 0 auto; padding: 20px; }
    header { text-align: center; padding: 40px 0; }
    h1 { font-size: 2.5em; background: linear-gradient(135deg, #00d4ff, #7b2ff7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: #888; margin-top: 8px; }
    .tools-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin: 30px 0; }
    .tool-card { background: #151520; border: 1px solid #2a2a35; border-radius: 12px; padding: 20px; }
    .tool-name { margin-bottom: 8px; }
    .tool-name code { color: #7b2ff7; font-size: 1em; }
    .tool-desc { color: #aaa; font-size: 0.85em; line-height: 1.5; margin-bottom: 10px; }
    .tool-cost { color: #00d4ff; font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }
    .btn-small { background: linear-gradient(135deg, #00d4ff, #7b2ff7); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.85em; }
    .code-block { background: #111118; padding: 15px; border-radius: 8px; margin: 15px 0; overflow-x: auto; }
    .code-block code { color: #f8f8f2; font-size: 0.85em; }
    .wallet-info { text-align: center; background: #151520; border: 1px solid #2a2a35; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .wallet-info code { background: #1e1e2e; padding: 6px 12px; border-radius: 6px; color: #ffb86b; }
    h2 { color: #00d4ff; margin: 30px 0 10px; border-bottom: 1px solid #2a2a35; padding-bottom: 8px; }
    .footer { text-align: center; padding: 40px 0; color: #555; font-size: 0.8em; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🔧 Agent MCP Bridge</h1>
      <p class="subtitle">Expose premium analysis tools to any MCP-compatible agent framework</p>
    </header>

    <div class="wallet-info">
      <p style="margin-bottom: 8px;">💳 Pay per call — send USDC on Base to:</p>
      <code>${WALLET}</code>
      <p style="margin-top: 8px; color: #666; font-size: 0.85em;">Costs range from 1¢ to 5¢ per tool call</p>
    </div>

    <h2>📋 Available Tools</h2>
    <div class="tools-grid">${toolCards}</div>

    <h2>🔌 MCP Protocol</h2>
    <div class="code-block">
      <code># List available tools
GET http://${SERVER}:${PORT}/tools

# Call a tool  
POST http://${SERVER}:${PORT}/call
{"name": "analyze_text", "arguments": {"text": "Your text here"}}

# Send USDC to unlock
POST http://${SERVER}:${PORT}/call  
{"name": "code_review", "arguments": {"code": "..."}, "x402_payment": "0x..."}

# Health check
GET http://${SERVER}:${PORT}/health</code>
    </div>

    <h2>🔄 MCP Integration Example</h2>
    <div class="code-block">
      <code>// Python MCP client
import requests

def discover_tools():
    resp = requests.get("http://${SERVER}:${PORT}/tools")
    return resp.json()["tools"]

def call_tool(name, args, payment_tx=None):
    payload = {"name": name, "arguments": args}
    headers = {}
    if payment_tx:
        headers["X-X402-Payment"] = payment_tx
    resp = requests.post(
        "http://${SERVER}:${PORT}/call",
        json=payload, headers=headers
    )
    return resp.json()</code>
    </div>

    <div class="footer">
      <p>Agent: my-automaton | Wallet: ${WALLET} | Server: ${SERVER} | MCP Bridge v1</p>
    </div>
  </div>
</body>
</html>`);
  }

  // Catch-all
  return serveJSON(res, {
    service: 'mcp-bridge',
    version: '1.0.0',
    mcp_version: '2025-03-26',
    endpoints: {
      '/': 'Web UI',
      '/health': 'Health check',
      '/tools': 'List available MCP tools',
      '/call': 'POST - Call an MCP tool',
      '/api/tools': 'Tools list (alternative)',
      '/api/call': 'Tool call (alternative)'
    }
  });
});

server.listen(PORT, () => {
  console.log(`MCP Bridge running on port ${PORT}`);
  console.log(`MCP Tools: ${Object.keys(tools).length} premium tools available`);
  console.log(`Web UI: http://localhost:${PORT}/`);
});
