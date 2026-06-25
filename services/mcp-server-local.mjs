#!/usr/bin/env node
/**
 * mcp-server-local.mjs — my-automaton MCP Server (Local Mode)
 * 
 * A self-contained MCP server that works with localhost:8080.
 * Connect from any MCP client (Claude Desktop, VS Code, Continue.dev, etc.)
 * Works even when Cloudflare tunnel is down.
 * 
 * Run: node path/to/mcp-server-local.mjs
 * 
 * MCP clients connect via stdio transport.
 */

// ---- Configuration ----
const CONFIG = {
  serverName: 'my-automaton',
  serverVersion: '1.0.0',
  baseUrl: process.env.MY_AUTOMATON_URL || 'http://127.0.0.1:8080',
  apiKey: process.env.MY_AUTOMATON_KEY || '',
  freeMode: !process.env.MY_AUTOMATON_KEY
};

// ---- Tool Definitions (MCP format) ----
const TOOLS = [
  {
    name: 'analyze',
    description: 'Deep text analysis — sentiment, entities, topics, key phrases',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to analyze (max 5000 chars)' },
        mode: { type: 'string', enum: ['analyze', 'sentiment', 'entities', 'topics'], default: 'analyze' }
      },
      required: ['text']
    }
  },
  {
    name: 'summarize',
    description: 'AI-powered text summarization',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to summarize (max 10000 chars)' },
        max_length: { type: 'number', description: 'Max summary length in words', default: 100 }
      },
      required: ['text']
    }
  },
  {
    name: 'review',
    description: 'Full code review — issues, quality score, security hotspots, suggestions',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to review' },
        language: { type: 'string', description: 'Programming language (auto-detected if omitted)' }
      },
      required: ['code']
    }
  },
  {
    name: 'security',
    description: 'Security vulnerability scan — detects XSS, SQL injection, RCE, and more',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to scan for vulnerabilities' },
        language: { type: 'string', description: 'Programming language' }
      },
      required: ['code']
    }
  },
  {
    name: 'explain',
    description: 'Natural language code explanation — how it works, key patterns',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to explain' },
        language: { type: 'string', description: 'Programming language' }
      },
      required: ['code']
    }
  },
  {
    name: 'refactor',
    description: 'Smart refactoring suggestions with code examples',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to refactor' },
        language: { type: 'string', description: 'Programming language' }
      },
      required: ['code']
    }
  },
  {
    name: 'complexity',
    description: 'Cyclomatic complexity analysis and maintainability index',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to analyze for complexity' },
        language: { type: 'string', description: 'Programming language' }
      },
      required: ['code']
    }
  },
  {
    name: 'batch',
    description: 'Batch process multiple texts (up to 10)',
    inputSchema: {
      type: 'object',
      properties: {
        texts: { type: 'array', items: { type: 'string' }, description: 'Array of texts to process (max 10)' },
        mode: { type: 'string', default: 'analyze' }
      },
      required: ['texts']
    }
  }
];

const ENDPOINT_MAP = {
  analyze: '/v1/analyze',
  summarize: '/v1/summarize',
  review: '/v1/review',
  security: '/v1/security',
  explain: '/v1/explain',
  refactor: '/v1/refactor',
  complexity: '/v1/complexity',
  batch: '/v1/batch'
};

// ---- API Client ----
async function callAPI(endpoint, body) {
  const url = `${CONFIG.baseUrl}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  
  // Try free tier first if no API key
  if (CONFIG.freeMode) {
    const freeEndpoint = `/free${endpoint}`;
    const freeResp = await fetch(`${CONFIG.baseUrl}${freeEndpoint}`, {
      method: 'POST', headers, body: JSON.stringify(body)
    });
    if (freeResp.ok) return freeResp.json();
    // Fall through to premium with retry logic
  }
  
  if (CONFIG.apiKey) {
    headers['X-API-Key'] = CONFIG.apiKey;
  }
  
  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  
  if (resp.status === 402) {
    throw new Error('Credits exhausted. Purchase at ' + CONFIG.baseUrl);
  }
  
  if (!resp.ok) {
    const err = await resp.text().catch(() => 'Unknown error');
    throw new Error(`API error (${resp.status}): ${err}`);
  }
  
  return resp.json();
}

// ---- MCP Protocol Handler ----
function handleMCPRequest(req) {
  switch (req.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          protocolVersion: '0.1.0',
          capabilities: { tools: {} },
          serverInfo: { name: CONFIG.serverName, version: CONFIG.serverVersion }
        }
      };
    
    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id: req.id,
        result: { tools: TOOLS }
      };
    
    case 'tools/call':
      return handleToolCall(req);
    
    default:
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32601, message: `Method not found: ${req.method}` }
      };
  }
}

async function handleToolCall(req) {
  const { name, arguments: args } = req.params || {};
  const endpoint = ENDPOINT_MAP[name];
  
  if (!endpoint) {
    return {
      jsonrpc: '2.0',
      id: req.id,
      error: { code: -32602, message: `Unknown tool: ${name}` }
    };
  }
  
  try {
    // Map tool args to API body
    let body = {};
    if (['analyze', 'summarize'].includes(name)) {
      body.text = args.text || args.code || '';
      if (args.mode) body.mode = args.mode;
      if (args.max_length) body.max_length = args.max_length;
    } else if (name === 'batch') {
      body.texts = args.texts || [];
      body.mode = args.mode || 'analyze';
    } else {
      body.code = args.code || '';
      body.language = args.language || 'auto';
    }
    
    const result = await callAPI(endpoint, body);
    
    return {
      jsonrpc: '2.0',
      id: req.id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      }
    };
  } catch (e) {
    return {
      jsonrpc: '2.0',
      id: req.id,
      error: { code: -32000, message: e.message }
    };
  }
}

// ---- Main ----
async function main() {
  console.error(`🚀 ${CONFIG.serverName} MCP Server v${CONFIG.serverVersion}`);
  console.error(`📡 Server: ${CONFIG.baseUrl}`);
  console.error(`🔑 API Key: ${CONFIG.apiKey ? '✅ configured' : '❌ none (using free tier, 3/day)'}`);
  console.error(`📋 ${TOOLS.length} tools available`);
  console.error('');
  console.error('Ready for MCP stdio connections.');
  
  // Read JSON-RPC requests from stdin
  const readline = (await import('readline')).createInterface({ input: process.stdin });
  
  for await (const line of readline) {
    try {
      const req = JSON.parse(line);
      const resp = await handleMCPRequest(req);
      process.stdout.write(JSON.stringify(resp) + '\n');
    } catch (e) {
      if (line.trim()) {
        console.error('Parse error:', e.message);
      }
    }
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
