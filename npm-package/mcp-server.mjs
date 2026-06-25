#!/usr/bin/env node
/**
 * automaton-mcp-server — MCP server for AI code review & analysis
 * Run with: npx automaton-mcp-server
 * Or install: npm install -g automaton-mcp-server
 */

import { createInterface } from 'readline';
import https from 'https';

const API_BASE = 'https://automation.songheng.vip';
const FREE_ENDPOINTS = {
  analyze: '/api/free/analyze',
  summarize: '/api/free/summarize',
  code_review: '/api/free/review',
  security_scan: '/api/free/security',
  explain_code: '/api/free/explain',
  refactor_code: '/api/free/refactor',
  complexity_analysis: '/api/free/complexity'
};

const TOOL_DEFS = [
  {
    name: 'analyze',
    description: 'Deep text analysis — sentiment, entities, themes, and writing style',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to analyze (up to 8000 chars)' }
      },
      required: ['text']
    }
  },
  {
    name: 'summarize',
    description: 'AI text summarization — concise summary of any text',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to summarize' }
      },
      required: ['text']
    }
  },
  {
    name: 'code_review',
    description: 'Full code review — check for bugs, security issues, performance, and style',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to review' },
        language: { type: 'string', description: 'Programming language (optional)' }
      },
      required: ['code']
    }
  },
  {
    name: 'security_scan',
    description: 'Security vulnerability scan — SQL injection, XSS, CSRF, auth issues',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to scan' }
      },
      required: ['code']
    }
  },
  {
    name: 'explain_code',
    description: 'Code explanation — explain what code does in plain English',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to explain' }
      },
      required: ['code']
    }
  },
  {
    name: 'refactor_code',
    description: 'Refactoring suggestions — specific improvements with code examples',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to refactor' }
      },
      required: ['code']
    }
  },
  {
    name: 'complexity_analysis',
    description: 'Complexity analysis — cyclomatic and cognitive complexity metrics',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to analyze' }
      },
      required: ['code']
    }
  }
];

function mcpSend(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function callAPI(endpoint, body) {
  return new Promise(resolve => {
    const data = JSON.stringify(body);
    const url = new URL(API_BASE + endpoint);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'automaton-mcp-server/1.0'
      },
      timeout: 30000
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({ result: body }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(data);
    req.end();
  });
}

// MCP stdio protocol
const rl = createInterface({ input: process.stdin, terminal: false });

// Send initialize response immediately
let initialized = false;

rl.on('line', async line => {
  try {
    const msg = JSON.parse(line.trim());
    
    if (msg.method === 'initialize' || msg.method === 'mcp.initialize') {
      initialized = true;
      mcpSend({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: '2025-03-26',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'automaton-mcp-server',
            version: '1.0.0'
          }
        }
      });
      return;
    }

    if (!initialized && msg.method !== 'notifications/initialized') {
      mcpSend({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: 'Not initialized' } });
      return;
    }

    if (msg.method === 'tools/list' || msg.method === 'mcp.tools.list') {
      mcpSend({
        jsonrpc: '2.0',
        id: msg.id,
        result: { tools: TOOL_DEFS }
      });
      return;
    }

    if (msg.method === 'tools/call' || msg.method === 'mcp.tools.call') {
      const toolName = msg.params?.name;
      const args = msg.params?.arguments || {};
      
      const endpoint = FREE_ENDPOINTS[toolName];
      if (!endpoint) {
        mcpSend({ jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: `Unknown tool: ${toolName}` } });
        return;
      }

      const response = await callAPI(endpoint, args);
      
      if (response.success) {
        mcpSend({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{ type: 'text', text: response.result || 'Analysis complete' }]
          }
        });
      } else if (response.error) {
        // If free limit reached, tell them about premium
        mcpSend({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{ 
              type: 'text', 
              text: `⚠️ ${response.error}\n\n💡 Get unlimited access at: ${API_BASE}/upgrade` 
            }]
          }
        });
      } else {
        mcpSend({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(response) }]
          }
        });
      }
      return;
    }

    // Respond to ping/notifications
    if (msg.method === 'ping') {
      mcpSend({ jsonrpc: '2.0', id: msg.id, result: {} });
      return;
    }

    // Unknown method
    mcpSend({
      jsonrpc: '2.0',
      id: msg.id,
      error: { code: -32601, message: `Method not found: ${msg.method}` }
    });

  } catch (e) {
    mcpSend({ jsonrpc: '2.0', error: { code: -32700, message: e.message } });
  }
});

// Notify ready
mcpSend({ jsonrpc: '2.0', method: 'log', params: { message: 'automaton-mcp-server ready — 7 tools available' } });
