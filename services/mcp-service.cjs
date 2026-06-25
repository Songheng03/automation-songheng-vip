/**
 * mcp-service.cjs — Model Context Protocol service for my-automaton
 * Exposes AI tools in formats compatible with: 
 * - OpenAI (GPT, Cursor, Windsurf)
 * - Anthropic (Claude)
 * - MCP native (goose, continue.dev)
 * - Smithery
 */
module.exports = function registerMCPService(app) {
  if (!app) return { tools: getTools() };
  
  // Tool definitions
  const tools = [
    { name: 'analyze', description: 'Deep text analysis - sentiment, entities, topics, writing style', category: 'text', credits: 1 },
    { name: 'summarize', description: 'AI summarization with configurable length (short/normal/detailed)', category: 'text', credits: 2 },
    { name: 'code_review', description: 'Senior code review - bugs, security, performance, best practices', category: 'code', credits: 5 },
    { name: 'security_scan', description: 'Security vulnerability scan - OWASP Top 10, injection, auth', category: 'code', credits: 3 },
    { name: 'explain_code', description: 'Line-by-line code explanation with complexity analysis', category: 'code', credits: 2 },
    { name: 'refactor_code', description: 'Refactoring suggestions with before/after code', category: 'code', credits: 5 },
    { name: 'complexity_analysis', description: 'Big O time and space complexity analysis', category: 'code', credits: 2 }
  ];

  function getTools() { return tools; }

  // MCP v1 catalog
  app.get('/mcp/v1/catalog', (req, res) => {
    res.json({
      name: 'my-automaton',
      description: 'AI-powered code analysis, review, security scanning, and text analysis',
      wallet: '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113',
      chain: 'base',
      currency: 'USDC',
      base_url: 'https://automation.songheng.vip',
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        cost_credits: t.credits,
        parameters: t.name === 'analyze' || t.name === 'summarize'
          ? { type: 'object', properties: { text: { type: 'string', description: 'Input text' }, mode: { type: 'string', description: 'Analysis mode (optional)' } }, required: ['text'] }
          : { type: 'object', properties: { code: { type: 'string', description: 'Source code' }, language: { type: 'string', description: 'Programming language (optional)' } }, required: ['code'] }
      })),
      pricing: { free: '3 requests/day/IP', premium: '1-5 credits per request', upgrade: '/upgrade' }
    });
  });

  // OpenAI tool format (for ChatGPT, Cursor, AutoGPT)
  app.get('/mcp/v1/openai', (req, res) => {
    const openaiTools = tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.name === 'analyze' || t.name === 'summarize'
          ? { type: 'object', properties: { text: { type: 'string' }, mode: { type: 'string' } }, required: ['text'] }
          : { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' } }, required: ['code'] }
      }
    }));
    res.json({ object: 'list', data: openaiTools });
  });

  // Anthropic tool format (Claude)
  app.get('/mcp/v1/anthropic', (req, res) => {
    const anthropicTools = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.name === 'analyze' || t.name === 'summarize'
        ? { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] }
        : { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' } }, required: ['code'] }
    }));
    res.json({ tools: anthropicTools });
  });

  // Smithery manifest
  app.get('/smithery-manifest', (req, res) => {
    res.json({
      name: 'my-automaton',
      description: 'AI code analysis, security scanning, and text analysis service',
      version: '1.0.0',
      author: 'my-automaton',
      license: 'MIT',
      repository: { type: 'git', url: 'https://github.com/my-automaton/automaton-api' },
      endpoints: {
        health: 'https://automation.songheng.vip/api/health',
        services: 'https://automation.songheng.vip/api/services',
        openai_tools: 'https://automation.songheng.vip/mcp/v1/openai'
      },
      tools: tools.map(t => t.name)
    });
  });

  // Agent discovery
  app.get('/mcp/v1/discover', (req, res) => {
    res.json({
      agent: 'my-automaton',
      wallet: '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113',
      chain: 'base',
      server: 'automation.songheng.vip',
      services: tools.map(t => t.name),
      free_tier: '3 requests/day/IP',
      payment: 'x402 micropayments via USDC',
      referral: 'Earn 20% commission — register at /referral'
    });
  });

  // MCP call proxy (for agents to invoke tools via MCP)
  app.post('/mcp/v1/call', async (req, res) => {
    const { tool, params } = req.body || {};
    if (!tool || !params) return res.status(400).json({ error: 'Missing tool or params' });
    
    const toolDef = tools.find(t => t.name === tool);
    if (!toolDef) return res.status(404).json({ error: `Tool '${tool}' not found` });
    
    // Check auth first
    const key = req.headers['x-api-key'];
    if (!key) return res.status(402).json({ error: 'API key required', wallet: '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113', upgrade: '/upgrade' });
    
    // Route to the appropriate handler
    const input = params.text || params.code || '';
    if (!input) return res.status(400).json({ error: 'No input provided' });
    
    // Forward HTTP 402 if AI endpoint needs payment
    const aiResp = await fetch(`http://localhost:8080/v1/${tool === 'code_review' ? 'review' : tool === 'security_scan' ? 'security' : tool === 'explain_code' ? 'explain' : tool === 'refactor_code' ? 'refactor' : tool === 'complexity_analysis' ? 'complexity' : tool}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
      body: JSON.stringify({ [toolDef.category === 'code' ? 'code' : 'text']: input })
    });
    
    const data = await aiResp.json();
    res.status(aiResp.status).json(data);
  });

  console.log('[mcp-service] Registered: MCP v1 catalog, OpenAI, Anthropic, Smithery, Discover');
};
