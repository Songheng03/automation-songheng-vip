#!/usr/bin/env node
/**
 * MCP Server for my-automaton services
 * Exposes text analysis, code review, summarization to Claude and other AI agents
 * 
 * Run: node mcp-server.js
 * Connect: mcp://automation.chaosong.dpdns.org:3000
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

const GATEWAY_URL = 'http://127.0.0.1:8080';

// Define available tools
const TOOLS = [
  {
    name: 'analyze_text',
    description: 'Deep text analysis: sentiment, entities, topics, readability. Costs 1¢ USDC on Base.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to analyze' },
        mode: { type: 'string', enum: ['sentiment', 'entities', 'topics', 'full'], default: 'full' }
      },
      required: ['text']
    }
  },
  {
    name: 'summarize',
    description: 'AI-powered summarization. Costs 2¢ USDC on Base.',
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
    name: 'review_code',
    description: 'Professional code review with security and best practices analysis. Costs 5¢ USDC on Base.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to review' },
        language: { type: 'string', description: 'Programming language' }
      },
      required: ['code']
    }
  },
  {
    name: 'security_scan',
    description: 'Security vulnerability scanner. Costs 3¢ USDC on Base.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to scan for vulnerabilities' }
      },
      required: ['code']
    }
  },
  {
    name: 'explain_code',
    description: 'Generate human-readable explanations for code. Costs 2¢ USDC on Base.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to explain' },
        detail: { type: 'string', enum: ['brief', 'detailed'], default: 'detailed' }
      },
      required: ['code']
    }
  }
];

// Create MCP server
const server = new Server(
  {
    name: 'my-automaton',
    version: '1.0.0',
    description: 'AI-powered text analysis, code review, and summarization services'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let endpoint, body;
    
    switch (name) {
      case 'analyze_text':
        endpoint = '/v1/analyze';
        body = { text: args.text, mode: args.mode || 'full' };
        break;
      case 'summarize':
        endpoint = '/v1/summarize';
        body = { text: args.text, length: args.length || 'medium' };
        break;
      case 'review_code':
        endpoint = '/v1/review';
        body = { code: args.code, language: args.language };
        break;
      case 'security_scan':
        endpoint = '/v1/security';
        body = { code: args.code };
        break;
      case 'explain_code':
        endpoint = '/v1/explain';
        body = { code: args.code, detail: args.detail || 'detailed' };
        break;
      default:
        return { content: [{ type: 'text', text: 'Unknown tool' }], isError: true };
    }
    
    // Call gateway
    const response = await fetch(`${GATEWAY_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    // Handle 402 payment required
    if (response.status === 402) {
      const paymentInfo = await response.json();
      return {
        content: [{
          type: 'text',
          text: `Payment required (x402 protocol). Send USDC on Base chain:\n` +
                `Amount: ${paymentInfo.amount}\n` +
                `Address: ${paymentInfo.address}\n` +
                `Then retry with X-X402-Payment header containing the transaction hash.`
        }],
        isError: true
      };
    }
    
    const result = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
    
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server running on stdio');
}

main().catch(console.error);
