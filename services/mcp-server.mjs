#!/usr/bin/env node
// MCP Server — Makes my-automaton services discoverable via Model Context Protocol
// Run with: npx @anthropic-ai/mcp-server or standalone
// This runs INSIDE the gateway (port 8080) via the /mcp route
// MCP spec: https://spec.modelcontextprotocol.io

// MCP endpoint: POST /mcp with JSON-RPC messages
// - tools/list -> returns all available tools
// - tools/call -> executes a tool and returns result
// - initialize -> handshake

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Server info
const SERVER_INFO = {
  name: 'my-automaton-mcp',
  version: '1.0.0',
  description: 'AI code analysis, review, security scanning, and text processing services',
  gateway: 'http://localhost:8080',
  docsUrl: 'https://automation.songheng.vip/api-docs.html'
};

// Tool definitions
const TOOLS = [
  {
    name: 'analyze',
    description: 'Deep text analysis - sentiment, topics, entities, key insights',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text content to analyze (min 10 chars)' },
        mode: { type: 'string', enum: ['analyze', 'sentiment', 'entities', 'topics', 'full'], 
                default: 'full', description: 'Analysis mode' }
      },
      required: ['text']
    }
  },
  {
    name: 'summarize',
    description: 'Generate concise AI summary of any text',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to summarize' },
        max_length: { type: 'number', description: 'Max summary length in words', default: 150 }
      },
      required: ['text']
    }
  },
  {
    name: 'code_review',
    description: 'Full code review with bug detection, security issues, and improvements',
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
    name: 'security_scan',
    description: 'Scan code for security vulnerabilities, hardcoded secrets, and risks',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to scan for vulnerabilities' },
        language: { type: 'string', description: 'Programming language' }
      },
      required: ['code']
    }
  },
  {
    name: 'explain_code',
    description: 'Get a detailed explanation of what code does and how it works',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to explain' },
        language: { type: 'string', description: 'Programming language' },
        detail_level: { type: 'string', enum: ['simple', 'detailed', 'expert'], default: 'detailed' }
      },
      required: ['code']
    }
  },
  {
    name: 'refactor',
    description: 'Get refactoring suggestions for better code quality and performance',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to refactor' },
        language: { type: 'string', description: 'Programming language' },
        goal: { type: 'string', enum: ['readability', 'performance', 'maintainability', 'all'], 
                default: 'all' }
      },
      required: ['code']
    }
  },
  {
    name: 'complexity',
    description: 'Calculate cyclomatic complexity and analyze code structure',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to analyze for complexity' },
        language: { type: 'string', description: 'Programming language' }
      },
      required: ['code']
    }
  }
];

// Map tool names to gateway endpoints
const ENDPOINT_MAP = {
  'analyze': '/v1/analyze',
  'summarize': '/v1/summarize',
  'code_review': '/v1/review',
  'security_scan': '/v1/security',
  'explain_code': '/v1/explain',
  'refactor': '/v1/refactor',
  'complexity': '/v1/complexity'
};

// In-memory API keys (we can auto-generate free keys for MCP clients)
const apiKeys = new Map();

// Auto-register a few demo keys for MCP usage
function initApiKeys() {
  // Load existing keys
  try {
    const keysPath = path.join(__dirname, '..', 'data', 'api-keys.json');
    if (fs.existsSync(keysPath)) {
      const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
      for (const [key, val] of Object.entries(keys)) {
        apiKeys.set(key, val);
      }
    }
  } catch { /* ignore */ }
}

function getApiKey() {
  // Find a key with remaining credits
  for (const [key, val] of apiKeys) {
    if (val.credits > 0) return key;
  }
  return null;
}

async function callGateway(toolName, args) {
  const endpoint = ENDPOINT_MAP[toolName];
  if (!endpoint) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  const apiKey = getApiKey();
  const url = `http://localhost:8080${endpoint}`;
  
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    
    // Build request body based on tool
    let body = {};
    switch(toolName) {
      case 'analyze':
        body = { text: args.text, mode: args.mode || 'full' };
        break;
      case 'summarize':
        body = { text: args.text, max_length: args.max_length || 150 };
        break;
      case 'code_review':
      case 'security_scan':
      case 'explain_code':
      case 'refactor':
      case 'complexity':
        body = { code: args.code, language: args.language || 'auto' };
        if (toolName === 'explain_code') body.detail_level = args.detail_level || 'detailed';
        if (toolName === 'refactor') body.goal = args.goal || 'all';
        break;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      if (response.status === 402) {
        return {
          content: [{ 
            type: 'text', 
            text: '📢 Credits exhausted. Purchase more at: https://automation.songheng.vip/pricing.html'
          }],
          isError: false
        };
      }
      if (response.status === 401) {
        return {
          content: [{ 
            type: 'text', 
            text: '🔑 Free API key needed. Get one at: https://automation.songheng.vip/free-api-key.html'
          }],
          isError: false
        };
      }
      throw new Error(`Gateway error: ${response.status}`);
    }
    
    const result = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      isError: false
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true
    };
  }
}

// Handle MCP JSON-RPC messages
export async function handleMcpRequest(body) {
  const { jsonrpc, method, id, params } = body;
  
  if (jsonrpc !== '2.0') {
    return { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: null };
  }
  
  switch (method) {
    case 'initialize': {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: SERVER_INFO,
          capabilities: {
            tools: {},
            logging: {}
          }
        }
      };
    }
    
    case 'tools/list': {
      return {
        jsonrpc: '2.0',
        id,
        result: { tools: TOOLS }
      };
    }
    
    case 'tools/call': {
      const { name, arguments: args } = params;
      const tool = TOOLS.find(t => t.name === name);
      if (!tool) {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: `Unknown tool: ${name}` }
        };
      }
      
      const result = await callGateway(name, args || {});
      return { jsonrpc: '2.0', id, result };
    }
    
    case 'notifications/initialized': {
      return { jsonrpc: '2.0', id, result: {} };
    }
    
    case 'ping': {
      return { jsonrpc: '2.0', id, result: {} };
    }
    
    default: {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` }
      };
    }
  }
}

// For standalone HTTP server (optional)
// Normally this mounts on the gateway at /mcp
export function createMcpHandler() {
  initApiKeys();
  
  return async (req, res) => {
    if (req.method === 'POST') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString());
      const result = await handleMcpRequest(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } else if (req.method === 'GET') {
      // MCP discovery endpoint
      const discoveryUrl = req.headers.host 
        ? `https://${req.headers.host}/mcp` 
        : 'https://automation.songheng.vip/mcp';
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
        description: SERVER_INFO.description,
        protocol: 'mcp',
        endpoint: discoveryUrl,
        tools: TOOLS.map(t => t.name),
        documentation: SERVER_INFO.docsUrl
      }));
    } else {
      res.writeHead(405);
      res.end();
    }
  };
}

// Log that we're ready
console.log(`MCP Server loaded: ${SERVER_INFO.name} v${SERVER_INFO.version}`);
console.log(`Tools available: ${TOOLS.map(t => t.name).join(', ')}`);
console.log(`Gateway: ${SERVER_INFO.gateway}`);
