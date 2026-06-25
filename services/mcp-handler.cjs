// MCP Protocol Handler for my-automaton
// Implements Model Context Protocol for AI agent directories

const TOOLS = [
  {
    name: "analyze_text",
    description: "Deep text analysis — extract sentiment, key themes, entities, and structure. Free tier: 3/day/IP.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text content to analyze" },
        mode: { type: "string", enum: ["analyze", "sentiment", "entities", "themes"], default: "analyze" }
      },
      required: ["text"]
    }
  },
  {
    name: "summarize_text",
    description: "AI-powered text summarization with configurable length. Free tier: 3/day/IP.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to summarize" },
        max_length: { type: "number", description: "Max summary length in words", default: 100 }
      },
      required: ["text"]
    }
  },
  {
    name: "review_code",
    description: "Full code review — bugs, security issues, style, performance. Free tier: 3/day/IP. Premium: $0.05/request via USDC on Base.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Source code to review" },
        language: { type: "string", description: "Programming language", default: "auto" }
      },
      required: ["code"]
    }
  },
  {
    name: "scan_security",
    description: "Security vulnerability scan — OWASP Top 10, XSS, injections, secrets. Free tier: 3/day/IP. Premium: $0.03/request via USDC on Base.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Source code to audit" },
        language: { type: "string", description: "Programming language", default: "auto" }
      },
      required: ["code"]
    }
  },
  {
    name: "explain_code",
    description: "Explain complex code in plain language. Free tier: 3/day/IP. Premium: $0.02/request via USDC on Base.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Code to explain" },
        language: { type: "string", description: "Programming language", default: "auto" }
      },
      required: ["code"]
    }
  },
  {
    name: "refactor_code",
    description: "Get refactoring suggestions with before/after examples. Free tier: 3/day/IP. Premium: $0.05/request via USDC on Base.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Code to refactor" },
        language: { type: "string", description: "Programming language", default: "auto" }
      },
      required: ["code"]
    }
  },
  {
    name: "check_complexity",
    description: "Analyze code complexity — cyclomatic complexity, nesting depth, line counts. Free tier: 3/day/IP. Premium: $0.02/request via USDC on Base.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Source code to analyze" },
        language: { type: "string", description: "Programming language", default: "auto" }
      },
      required: ["code"]
    }
  }
];

function handleMcpRequest(req, res, apiKeys, freeTracker) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // MCP Server Information (for discovery)
  if (req.method === 'GET' && (path === '/mcp' || path === '/mcp/')) {
    const serverInfo = {
      name: "my-automaton",
      version: "2.0.0",
      description: "AI-powered code review, security scanning, text analysis, summarization, and more. Pay-per-use with USDC on Base. Free tier available.",
      homepage: "https://automation.songheng.vip",
      wallet: "0x76eADdEBFfb6a61DD071f97F4508467fc55dd113",
      chain: "base",
      currency: "USDC",
      pricing: {
        model: "freemium",
        free: "3 requests/day/IP",
        premium: {
          analyze: "$0.01",
          summarize: "$0.02",
          review: "$0.05",
          security: "$0.03",
          explain: "$0.02",
          refactor: "$0.05",
          complexity: "$0.02"
        }
      },
      tools: TOOLS.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      })),
      endpoints: {
        api: "https://automation.songheng.vip",
        playground: "https://automation.songheng.vip/api-playground.html",
        docs: "https://automation.songheng.vip/api-docs.html",
        freeTrial: "https://automation.songheng.vip/free-trial.html",
        upgrade: "https://automation.songheng.vip/upgrade.html"
      }
    };
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(serverInfo, null, 2));
    return true;
  }

  // MCP tools/list endpoint
  if (req.method === 'GET' && path === '/mcp/tools') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ tools: TOOLS }, null, 2));
    return true;
  }

  // MCP JSON-RPC endpoint
  if (req.method === 'POST' && (path === '/mcp' || path === '/mcp/message')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const request = JSON.parse(body);
        
        // Handle different MCP methods
        if (request.method === 'initialize') {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            result: {
              protocolVersion: "2024-11-05",
              capabilities: { tools: {} },
              serverInfo: {
                name: "my-automaton",
                version: "2.0.0"
              }
            }
          }));
          return;
        }

        if (request.method === 'tools/list') {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            result: { tools: TOOLS }
          }));
          return;
        }

        if (request.method === 'tools/call') {
          const { name, arguments: args } = request.params || {};
          const tool = TOOLS.find(t => t.name === name);
          if (!tool) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({
              jsonrpc: "2.0",
              id: request.id,
              error: { code: -32602, message: `Tool not found: ${name}` }
            }));
            return;
          }
          
          // Proxy to the actual gateway endpoint
          const proxyPath = `/free/${name.replace('_text','').replace('_code','')}`;
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            result: {
              content: [{
                type: "text",
                text: `Call the ${name} tool at POST https://automation.songheng.vip${proxyPath} with body: ${JSON.stringify(args)}`
              }],
              toolCallId: request.id || "call_0"
            }
          }));
          return;
        }

        if (request.method === 'notifications/initialized') {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: {} }));
          return;
        }

        // Unknown method
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          error: { code: -32601, message: `Method not found: ${request.method}` }
        }));

      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: 'Parse error: ' + e.message }
        }));
      }
    });
    return true;
  }

  // CORS preflight for MCP endpoints
  if (req.method === 'OPTIONS' && path.startsWith('/mcp')) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return true;
  }

  return false; // Not an MCP request
}

module.exports = { handleMcpRequest, TOOLS };
