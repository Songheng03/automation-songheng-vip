#!/usr/bin/env node
/* automaton-mcp.mjs — MCP Server for my-automaton AI Services */
/* Implements Model Context Protocol for AI code review, security, analysis */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

const API_BASE = process.env.API_BASE || 'https://automation.songheng.vip';
const API_KEY = process.env.API_KEY || '';

class AutomatonMCPServer {
  constructor() {
    this.server = new Server(
      { name: 'my-automaton', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.setupToolHandlers();
    this.server.onerror = (err) => console.error('[MCP Error]', err);
    process.on('SIGINT', async () => { await this.server.close(); process.exit(0); });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze',
          description: 'Deep text analysis — themes, tone, structure, patterns, insights',
          inputSchema: {
            type: 'object',
            properties: { text: { type: 'string', description: 'Text to analyze' } },
            required: ['text']
          }
        },
        {
          name: 'summarize',
          description: 'AI text summarization — concise 2-4 sentence summaries',
          inputSchema: {
            type: 'object',
            properties: { text: { type: 'string', description: 'Text to summarize' } },
            required: ['text']
          }
        },
        {
          name: 'code_review',
          description: 'Expert code review — bugs, security, performance, style, best practices',
          inputSchema: {
            type: 'object',
            properties: { code: { type: 'string', description: 'Source code to review' } },
            required: ['code']
          }
        },
        {
          name: 'security_scan',
          description: 'Security vulnerability audit — OWASP Top 10, injection, XSS, auth issues',
          inputSchema: {
            type: 'object',
            properties: { code: { type: 'string', description: 'Source code to scan' } },
            required: ['code']
          }
        },
        {
          name: 'explain_code',
          description: 'Code explanation in simple terms — purpose, flow, inputs/outputs',
          inputSchema: {
            type: 'object',
            properties: { code: { type: 'string', description: 'Code to explain' } },
            required: ['code']
          }
        },
        {
          name: 'refactor_code',
          description: 'Refactoring suggestions with before/after examples and design patterns',
          inputSchema: {
            type: 'object',
            properties: { code: { type: 'string', description: 'Code to refactor' } },
            required: ['code']
          }
        },
        {
          name: 'complexity_analysis',
          description: 'Time and space complexity analysis with Big O notation',
          inputSchema: {
            type: 'object',
            properties: { code: { type: 'string', description: 'Code to analyze' } },
            required: ['code']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const serviceMap = {
        'analyze': { endpoint: '/api/free/analyze', field: 'text', cost: 1 },
        'summarize': { endpoint: '/api/free/summarize', field: 'text', cost: 2 },
        'code_review': { endpoint: '/api/free/review', field: 'code', cost: 5 },
        'security_scan': { endpoint: '/api/free/security', field: 'code', cost: 3 },
        'explain_code': { endpoint: '/api/free/explain', field: 'code', cost: 2 },
        'refactor_code': { endpoint: '/api/free/refactor', field: 'code', cost: 5 },
        'complexity_analysis': { endpoint: '/api/free/complexity', field: 'code', cost: 2 }
      };

      const service = serviceMap[name];
      if (!service) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

      const content = args?.[service.field];
      if (!content || typeof content !== 'string') {
        throw new McpError(ErrorCode.InvalidParams, `Missing required field: ${service.field}`);
      }

      try {
        const url = API_KEY 
          ? `${API_BASE}/v1/${name.replace('_code','').replace('_','')}`
          : `${API_BASE}${service.endpoint}`;
        
        const headers = { 'Content-Type': 'application/json' };
        if (API_KEY) headers['X-API-Key'] = API_KEY;

        const resp = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ [service.field]: content })
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          if (resp.status === 429) {
            return { content: [{ type: 'text', text: `Free limit reached (3/day). Get credits at ${API_BASE}/upgrade` }], isError: true };
          }
          throw new Error(`API ${resp.status}: ${errData.error || resp.statusText}`);
        }

        const data = await resp.json();
        return { content: [{ type: 'text', text: data.result || 'No response' }] };
      } catch (err) {
        throw new McpError(ErrorCode.InternalError, `API call failed: ${err.message}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('my-automaton MCP server running on stdio');
    console.error(`API: ${API_BASE}${API_KEY ? ' (premium)' : ' (free tier)'}`);
  }
}

const server = new AutomatonMCPServer();
server.run().catch(console.error);
