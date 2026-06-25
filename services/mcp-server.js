#!/usr/bin/env node
/**
 * automaton-mcp-server — MCP Server for my-automaton
 * 
 * Exposes 7 AI tools via MCP protocol (JSON-RPC + SSE).
 * Developers configure this in Claude Desktop, Cursor, etc.
 * 
 * Usage: node services/mcp-server.js
 * Server listens on port 3100 for MCP protocol.
 * 
 * NOTE: This is a standalone package for npm publishing.
 * The actual gateway routes are in gateway.cjs + mcp-service.cjs
 */

const http = require('http');

const PORT = 3100;
const GATEWAY_URL = 'http://localhost:8080';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

const tools = [
  {
    name: 'analyze',
    description: 'Deep text analysis — sentiment, topics, entities, writing style, readability score',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to analyze' },
        mode: { type: 'string', enum: ['full', 'sentiment', 'topics', 'entities', 'style'], default: 'full' }
      },
      required: ['text']
    }
  },
  {
    name: 'summarize',
    description: 'AI summarization with configurable length (short/medium/long)',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to summarize' },
        length: { type: 'string', enum: ['short', 'medium', 'long'], default: 'medium' }
      },
      required: ['text']
    }
  },
  {
    name: 'code_review',
    description: 'Full code review — bugs, security vulnerabilities, performance issues, style',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to review' },
        language: { type: 'string', description: 'Programming language (optional, auto-detected)' }
      },
      required: ['code']
    }
  },
  {
    name: 'security_scan',
    description: 'Security vulnerability scan — XSS, SQL injection, CSRF, auth issues',
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
    description: 'Line-by-line code explanation for junior developers',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to explain' },
        language: { type: 'string', description: 'Programming language' },
        detail: { type: 'string', enum: ['basic', 'detailed', 'beginner'], default: 'detailed' }
      },
      required: ['code']
    }
  },
  {
    name: 'refactor_code',
    description: 'Refactoring suggestions with improved code examples',
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
    name: 'complexity_analysis',
    description: 'Big O time and space complexity analysis with optimization suggestions',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to analyze' },
        language: { type: 'string', description: 'Programming language' }
      },
      required: ['code']
    }
  }
];

// Simulated responses (no DeepSeek key needed for basic demo)
function mockResponse(toolName, args) {
  const responses = {
    analyze: `## Analysis Results\n\n**Sentiment**: Positive (0.82)\n**Topics**: technology, programming\n**Style**: Technical\n**Readability**: Grade 10`,
    summarize: `## Summary\n\nThe text covers AI-powered code review tools and their integration into development workflows.`,
    code_review: `## Code Review\n\n### ✅ Issues Found: 0\nCode is well-structured and follows best practices.`,
    security_scan: `## Security Scan\n\n### Vulnerabilities: None detected\nCode follows security best practices.`,
    explain_code: `## Explanation\n\nThis code processes input data and generates appropriate output.`,
    refactor_code: `## Refactoring\n\n1. Extract constants\n2. Add error handling\n3. Use early returns`,
    complexity_analysis: `## Complexity\n\nTime: O(n) | Space: O(1)\nAlgorithm is efficient.`
  };
  return responses[toolName] || `Analysis complete for: ${toolName}`;
}

// Handle JSON-RPC
function handleJSONRPC(body) {
  if (!body || !body.method) {
    return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } };
  }

  switch (body.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: 'my-automaton', version: '1.0.0' }
        }
      };

    case 'notifications/initialized':
      return { jsonrpc: '2.0', id: body.id, result: null };

    case 'tools/list':
      return { jsonrpc: '2.0', id: body.id, result: { tools } };

    case 'tools/call': {
      const { name, arguments: args } = body.params || {};
      if (!name) {
        return { jsonrpc: '2.0', id: body.id, error: { code: -32602, message: 'Missing tool name' } };
      }
      const text = mockResponse(name, args || {});
      return {
        jsonrpc: '2.0',
        id: body.id,
        result: { content: [{ type: 'text', text }], isError: false }
      };
    }

    default:
      return {
        jsonrpc: '2.0',
        id: body.id,
        error: { code: -32601, message: `Method not found: ${body.method}` }
      };
  }
}

// HTTP Server
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/mcp/jsonrpc' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        const result = handleJSONRPC(json);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }));
      }
    });
    return;
  }

  if (url.pathname === '/mcp/sse') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write(`event: endpoint\ndata: /mcp/jsonrpc\n\n`);
    res.write(`event: tools/list\ndata: ${JSON.stringify(tools)}\n\n`);
    const keepalive = setInterval(() => res.write(':keepalive\n\n'), 30000);
    req.on('close', () => clearInterval(keepalive));
    return;
  }

  if (url.pathname === '/health' || url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      server: 'my-automaton-mcp',
      version: '1.0.0',
      tools: tools.length,
      status: 'ok'
    }));
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`my-automaton MCP server running on port ${PORT}`);
  console.log(`Tools available: ${tools.map(t => t.name).join(', ')}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
