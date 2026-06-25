#!/usr/bin/env node
/**
 * automaton-mcp — MCP server for my-automaton AI services
 * 
 * Installation: npx automaton-mcp
 * Or: npm install -g automaton-mcp && automaton-mcp
 * 
 * Connect via Claude Desktop, Cursor, Windsurf, or any MCP client.
 * Supports 7 AI tools: analyze, summarize, code-review, security-scan,
 * explain, refactor, complexity-analysis
 * 
 * @version 2.0.0
 */
import { createInterface } from 'readline';
import https from 'https';
import http from 'http';

const PKG_VERSION = '2.0.0';
const DEFAULT_GATEWAY = process.env.AUTOMATON_GATEWAY || 'https://automation.songheng.vip';
const LOCAL_GATEWAY = 'http://127.0.0.1:8080';

// ============================================================
// Tool Definitions
// ============================================================
const TOOLS = [
  {
    name: 'analyze',
    description: 'Deep text analysis — sentiment, entities, themes, writing style, and key insights',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to analyze (up to 10000 chars)' },
        mode: { type: 'string', enum: ['analyze', 'sentiment', 'entities', 'themes'], description: 'Analysis mode' }
      },
      required: ['text']
    }
  },
  {
    name: 'summarize',
    description: 'AI summarization — concise, multi-paragraph summary preserving key points',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to summarize' },
        max_length: { type: 'number', description: 'Target summary length in words (50-500)' }
      },
      required: ['text']
    }
  },
  {
    name: 'code-review',
    description: 'Full code review — bugs, security issues, performance, style, architecture, best practices',
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
    name: 'security-scan',
    description: 'Security vulnerability scan — SQL injection, XSS, CSRF, path traversal, insecure crypto, hardcoded secrets',
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
    description: 'Code explanation — detailed plain-English explanation of what code does, line by line',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to explain' },
        language: { type: 'string', description: 'Programming language' }
      },
      required: ['code']
    }
  },
  {
    name: 'refactor',
    description: 'Refactoring suggestions — specific improvements with before/after code examples',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to get refactoring suggestions for' },
        language: { type: 'string', description: 'Programming language' },
        target: { type: 'string', enum: ['performance', 'readability', 'maintainability', 'security'], description: 'Refactoring focus' }
      },
      required: ['code']
    }
  },
  {
    name: 'complexity-analysis',
    description: 'Code complexity analysis — cyclomatic complexity, cognitive complexity, maintainability index',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to analyze for complexity metrics' },
        language: { type: 'string', description: 'Programming language' }
      },
      required: ['code']
    }
  }
];

// ============================================================
// MCP Protocol
// ============================================================
function mcpSend(msg) {
  const str = JSON.stringify(msg);
  process.stdout.write(str + '\n');
}

function mcpError(id, code, message) {
  mcpSend({ jsonrpc: '2.0', id, error: { code, message } });
}

// ============================================================
// API Calls
// ============================================================
function tryLocalFirst(endpoint, body) {
  return new Promise(resolve => {
    const data = JSON.stringify(body);
    const url = new URL(LOCAL_GATEWAY + endpoint);
    
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 5000
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({ result: body, _raw: true }); }
      });
    });
    req.on('error', () => resolve(null)); // local failed, fallback to remote
    req.write(data);
    req.end();
  });
}

function callRemote(endpoint, body) {
  return new Promise(resolve => {
    const data = JSON.stringify(body);
    const url = new URL(DEFAULT_GATEWAY + endpoint);
    
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': `automaton-mcp/${PKG_VERSION}`
      },
      timeout: 30000
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({ result: body, _raw: true }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(data);
    req.end();
  });
}

async function callService(endpoint, body) {
  // Try local gateway first (fast), fallback to remote
  const local = await tryLocalFirst(endpoint, body);
  if (local) return local;
  return callRemote(endpoint, body);
}

// Map tool names to API routes
const API_ROUTES = {
  'analyze': '/v1/analyze',
  'summarize': '/v1/summarize',
  'code-review': '/v1/review',
  'security-scan': '/v1/security',
  'explain': '/v1/explain',
  'refactor': '/v1/refactor',
  'complexity-analysis': '/v1/complexity'
};

function formatResult(response) {
  if (response.success) {
    return response.result || response.analysis || 'Complete.';
  }
  if (response.error) {
    return `⚠️ ${response.error}\n\nUpgrade at: ${DEFAULT_GATEWAY}/pricing.html`;
  }
  return JSON.stringify(response, null, 2);
}

// ============================================================
// Server
// ============================================================
const rl = createInterface({ input: process.stdin });
let initialized = false;

rl.on('line', async line => {
  try {
    const msg = JSON.parse(line.trim());
    const { id, method, params } = msg;

    // Initialize
    if (method === 'initialize') {
      initialized = true;
      mcpSend({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: 'automaton-mcp', version: PKG_VERSION }
        }
      });
      return;
    }

    if (!initialized) {
      mcpError(id, -32000, 'Not initialized');
      return;
    }

    // List tools
    if (method === 'tools/list') {
      mcpSend({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
      return;
    }

    // Call tool
    if (method === 'tools/call') {
      const { name, arguments: args } = params || {};
      const endpoint = API_ROUTES[name];
      
      if (!endpoint) {
        mcpError(id, -32602, `Unknown tool: ${name}. Available: ${Object.keys(API_ROUTES).join(', ')}`);
        return;
      }

      const response = await callService(endpoint, args || {});
      
      mcpSend({
        jsonrpc: '2.0', id,
        result: {
          content: [{ type: 'text', text: formatResult(response) }]
        }
      });
      return;
    }

    // Ping
    if (method === 'ping') {
      mcpSend({ jsonrpc: '2.0', id, result: {} });
      return;
    }

    // Notifications
    if (method === 'notifications/initialized') return;

    mcpError(id, -32601, `Method not found: ${method}`);

  } catch (e) {
    mcpSend({ jsonrpc: '2.0', error: { code: -32700, message: e.message } });
  }
});

// Startup message
console.error(`🚀 automaton-mcp v${PKG_VERSION}`);
console.error(`📡 Gateway: ${DEFAULT_GATEWAY}`);
console.error(`🧰 Tools: ${TOOLS.map(t => t.name).join(', ')}`);
console.error(`⚡ Ready — connect via MCP client`);
