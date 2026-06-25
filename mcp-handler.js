
// ── MCP Server (Model Context Protocol) ─────────────────────
// Makes API discoverable by AI tools: Cursor, Claude Desktop, Windsurf, etc.

const MCP_SERVER = {
  name: 'my-automaton',
  version: '2.0.0',
  description: 'AI-powered code review, security scanning, and text analysis',
  capabilities: { tools: {} }
};

const MCP_TOOLS = [
  { name: 'analyze_text', description: 'Deep text analysis with themes, insights, key points', inputSchema: { type: 'object', properties: { text: { type: 'string', description: 'Text to analyze' } }, required: ['text'] } },
  { name: 'summarize', description: 'AI text summarization', inputSchema: { type: 'object', properties: { text: { type: 'string', description: 'Text to summarize' } }, required: ['text'] } },
  { name: 'review_code', description: 'Code review for bugs, security, style', inputSchema: { type: 'object', properties: { code: { type: 'string', description: 'Code to review' }, language: { type: 'string', description: 'Language (optional)' } }, required: ['code'] } },
  { name: 'security_scan', description: 'Security audit (OWASP Top 10)', inputSchema: { type: 'object', properties: { code: { type: 'string', description: 'Code to scan' }, language: { type: 'string', description: 'Language (optional)' } }, required: ['code'] } },
  { name: 'explain_code', description: 'Explain code in plain English', inputSchema: { type: 'object', properties: { code: { type: 'string', description: 'Code to explain' }, language: { type: 'string', description: 'Language (optional)' } }, required: ['code'] } },
  { name: 'refactor_code', description: 'Suggest code refactoring', inputSchema: { type: 'object', properties: { code: { type: 'string', description: 'Code to refactor' }, language: { type: 'string', description: 'Language (optional)' } }, required: ['code'] } },
  { name: 'analyze_complexity', description: 'Big-O complexity analysis', inputSchema: { type: 'object', properties: { code: { type: 'string', description: 'Code to analyze' }, language: { type: 'string', description: 'Language (optional)' } }, required: ['code'] } }
];

const MCP_MODE_MAP = {
  'analyze_text': 'analyze', 'summarize': 'summarize', 'review_code': 'review',
  'security_scan': 'security', 'explain_code': 'explain', 'refactor_code': 'refactor',
  'analyze_complexity': 'complexity'
};

async function handleMCP(req, res) {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    try {
      const rpc = JSON.parse(body);
      const { id, method, params } = rpc;
      log(`MCP: ${method}`);

      if (method === 'initialize') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', serverInfo: { name: MCP_SERVER.name, version: MCP_SERVER.version }, capabilities: MCP_SERVER.capabilities } }));
        return;
      }

      if (method === 'tools/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } }));
        return;
      }

      if (method === 'tools/call') {
        const { name, arguments: args } = params;
        const mode = MCP_MODE_MAP[name];
        if (!mode) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${name}` } }));
          return;
        }
        const ip = ipFromReq(req);
        if (!checkFreeLimit(ip)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Free limit reached (3/day). Buy credits: https://automation.chaosong.dpdns.org/upgrade.html' }], isError: true } }));
          return;
        }
        const input = { text: args.text, code: args.code, language: args.language };
        const prompt = buildPrompt(mode, input);
        const result = await callAI([{ role: 'user', content: prompt }]);
        incrementFree(ip);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }] } }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } }));
    } catch (e) {
      log(`MCP error: ${e.message}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }));
    }
  });
}

// MCP discovery endpoint
async function handleMCPConfig(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' });
  res.end(JSON.stringify({ name: MCP_SERVER.name, version: MCP_SERVER.version, description: MCP_SERVER.description, url: 'https://automation.chaosong.dpdns.org/mcp', capabilities: ['code-review', 'security-scanning', 'text-analysis', 'summarization'] }, null, 2));
}
