#!/usr/bin/env node
/**
 * MCP Server: my-automaton AI Services
 * 
 * Model Context Protocol server that exposes 7 AI tools:
 * analyze, summarize, code_review, security_scan, explain_code, refactor_code, complexity_analysis
 * 
 * Install: npx my-automaton-mcp
 * Or: npm install -g my-automaton-mcp && my-automaton-mcp
 * 
 * Configure in Claude Desktop:
 * {
 *   "mcpServers": {
 *     "my-automaton": {
 *       "command": "npx",
 *       "args": ["-y", "my-automaton-mcp"]
 *     }
 *   }
 * }
 */

import { createInterface } from 'readline';
import https from 'https';
import http from 'http';

// ===== CONFIG =====
const CONFIG = {
  // Default to gateway — free tier available (3/day)
  apiBase: process.env.AUTOMATON_API_BASE || 'https://automation.songheng.vip',
  apiKey: process.env.AUTOMATON_API_KEY || '',  // Optional: get free key from /free-api-key
  serverName: 'my-automaton-mcp',
  serverVersion: '1.1.0'
};

// ===== TOOL DEFINITIONS (MCP Schema) =====
const TOOLS = [
  {
    name: 'analyze',
    description: 'Deep text analysis — extracts sentiment, entities, key themes, writing style, and readability metrics from any text',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text content to analyze (up to 8000 characters)' },
        mode: { type: 'string', enum: ['analyze', 'sentiment', 'entities', 'themes'], description: 'Analysis focus (default: full analysis)' }
      },
      required: ['text']
    }
  },
  {
    name: 'summarize',
    description: 'Concise AI summary of any text — preserves key information, removes redundancy',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to summarize' },
        max_length: { type: 'number', description: 'Maximum summary length in words (default: 150)' }
      },
      required: ['text']
    }
  },
  {
    name: 'code_review',
    description: 'Comprehensive code review — finds bugs, code smells, performance bottlenecks, security issues, and suggests fixes',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to review' },
        language: { type: 'string', description: 'Programming language (auto-detected if omitted)' },
        severity: { type: 'string', enum: ['all', 'error', 'warning', 'suggestion'], description: 'Minimum severity level (default: all)' }
      },
      required: ['code']
    }
  },
  {
    name: 'security_scan',
    description: 'Security vulnerability scanner — detects XSS, SQL injection, CSRF, hardcoded secrets, insecure crypto, OWASP Top 10 issues',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to scan for vulnerabilities' },
        language: { type: 'string', description: 'Programming language (optional)' }
      },
      required: ['code']
    }
  },
  {
    name: 'explain_code',
    description: 'Explains source code in plain English — ideal for understanding complex or unfamiliar code',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to explain' },
        detail: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Explanation detail level (default: medium)' }
      },
      required: ['code']
    }
  },
  {
    name: 'refactor_code',
    description: 'Provides specific refactoring suggestions with before/after code examples. Covers performance, readability, and maintainability',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to refactor' },
        focus: { type: 'string', enum: ['performance', 'readability', 'maintainability', 'all'], description: 'Refactoring focus (default: all)' }
      },
      required: ['code']
    }
  },
  {
    name: 'complexity_analysis',
    description: 'Measures cyclomatic and cognitive complexity — identifies hotspots that need simplification',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to analyze' }
      },
      required: ['code']
    }
  }
];

// ===== FREE ENDPOINTS =====
const FREE_ENDPOINTS = {
  analyze: '/api/free/analyze',
  summarize: '/api/free/summarize',
  code_review: '/api/free/review',
  security_scan: '/api/free/security',
  explain_code: '/api/free/explain',
  refactor_code: '/api/free/refactor',
  complexity_analysis: '/api/free/complexity'
};

// ===== HELPER: API CALL =====
function callAPI(endpoint, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const url = new URL(CONFIG.apiBase + endpoint);
    const opts = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': `${CONFIG.serverName}/${CONFIG.serverVersion}`
      },
      timeout: 60000
    };
    if (CONFIG.apiKey) opts.headers['X-API-Key'] = CONFIG.apiKey;
    
    const proto = url.protocol === 'https:' ? https : http;
    const req = proto.request(opts, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({ success: true, result: body }); }
      });
    });
    req.on('error', e => resolve({ success: false, error: e.message }));
    req.write(data);
    req.end();
  });
}

// ===== MCP STDIO PROTOCOL =====
function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

const rl = createInterface({ input: process.stdin, terminal: false });
let initialized = false;

rl.on('line', async (line) => {
  try {
    const msg = JSON.parse(line.trim());
    
    // Initialize
    if (msg.method === 'initialize') {
      initialized = true;
      send({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: CONFIG.serverName, version: CONFIG.serverVersion }
        }
      });
      return;
    }

    // notifications/initialized — no response needed
    if (msg.method === 'notifications/initialized') return;

    // Not initialized check
    if (!initialized) {
      send({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: 'Server not initialized. Send initialize first.' } });
      return;
    }

    // List tools
    if (msg.method === 'tools/list') {
      send({ jsonrpc: '2.0', id: msg.id, result: { tools: TOOLS } });
      return;
    }

    // Call tool
    if (msg.method === 'tools/call') {
      const name = msg.params?.name;
      const args = msg.params?.arguments || {};
      const endpoint = FREE_ENDPOINTS[name];

      if (!endpoint) {
        send({ jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: `Unknown tool: ${name}. Available: ${Object.keys(FREE_ENDPOINTS).join(', ')}` } });
        return;
      }

      const response = await callAPI(endpoint, args);
      
      let text;
      if (response.success) {
        text = response.result || JSON.stringify(response, null, 2);
      } else if (response.error) {
        text = `⚠️ ${response.error}\n\n💡 Get unlimited access: ${CONFIG.apiBase}/pricing.html`;
      } else {
        text = JSON.stringify(response, null, 2);
      }

      send({
        jsonrpc: '2.0',
        id: msg.id,
        result: { content: [{ type: 'text', text }] }
      });
      return;
    }

    // Ping
    if (msg.method === 'ping') {
      send({ jsonrpc: '2.0', id: msg.id, result: {} });
      return;
    }

    // Unknown
    send({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `Unknown method: ${msg.method}` } });

  } catch (e) {
    send({ jsonrpc: '2.0', error: { code: -32700, message: e.message || 'Parse error' } });
  }
});

// Ready signal
send({ jsonrpc: '2.0', method: 'log', params: { message: `${CONFIG.serverName} v${CONFIG.serverVersion} ready — ${TOOLS.length} tools available` } });
