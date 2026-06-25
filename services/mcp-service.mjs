/**
 * MCP Service — Exposes my-automaton services in MCP (Model Context Protocol) format
 * Makes all 7 AI services discoverable by MCP-compatible agents (Claude, Cursor, etc.)
 * Mount: app.use('/mcp', mcpRouter)
 * Catalog: GET /mcp/v1/catalog → MCP tool definitions
 * Call: POST /mcp/v1/call → Execute a tool via MCP
 */

const BADGE_BASE = 'https://automation.songheng.vip';

const MCP_TOOLS = [
  {
    name: 'analyze_text',
    description: 'Deep text analysis — extract insights, themes, and patterns from any text',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to analyze' },
        mode: { type: 'string', enum: ['general', 'sentiment', 'topics', 'entities'], default: 'general' }
      },
      required: ['text']
    }
  },
  {
    name: 'summarize_text',
    description: 'AI summarization — condense long text into concise summary',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to summarize' },
        max_sentences: { type: 'number', default: 5, description: 'Maximum sentences in summary' }
      },
      required: ['text']
    }
  },
  {
    name: 'review_code',
    description: 'Code review — analyze code for bugs, style issues, and performance problems',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to review' },
        language: { type: 'string', description: 'Programming language (auto-detect if omitted)' }
      },
      required: ['code']
    }
  },
  {
    name: 'security_scan',
    description: 'Security vulnerability scan — find OWASP Top 10, injection flaws, and other security issues',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code to scan for vulnerabilities' },
        context: { type: 'string', enum: ['web', 'api', 'blockchain', 'general'], default: 'general' }
      },
      required: ['code']
    }
  },
  {
    name: 'explain_code',
    description: 'Code explanation — explain how code works in plain language',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to explain' },
        detail: { type: 'string', enum: ['high', 'medium', 'low'], default: 'medium' }
      },
      required: ['code']
    }
  },
  {
    name: 'refactor_code',
    description: 'Code refactoring — get suggestions for cleaner, more maintainable code',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to refactor' },
        target: { type: 'string', enum: ['readability', 'performance', 'maintainability', 'all'], default: 'all' }
      },
      required: ['code']
    }
  },
  {
    name: 'analyze_complexity',
    description: 'Complexity analysis — estimate time and space complexity of algorithms',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Algorithm/code to analyze' }
      },
      required: ['code']
    }
  }
];

function createMCPRouter(DEEPSEEK_API, callAIFn) {
  const express = require('express');
  const router = express.Router();

  // MCP Discovery endpoint
  router.get('/v1/catalog', (req, res) => {
    res.json({
      name: 'my-automaton',
      description: 'AI-powered code review, security scanning, text analysis, and summarization services',
      wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
      chain: 'base',
      token: 'USDC',
      base_url: BADGE_BASE,
      version: '1.0.0',
      tools: MCP_TOOLS,
      pricing: {
        free_tier: '3 requests/day per IP',
        paid: 'Post /v1/{service} with X-API-Key header (1-5 credits)',
        buy: BADGE_BASE + '/upgrade'
      }
    });
  });

  // MCP Tool execution endpoint
  router.post('/v1/call', async (req, res) => {
    const { name, arguments: args } = req.body;
    
    if (!name || !args) {
      return res.status(400).json({
        error: 'Missing required fields: name, arguments',
        mcp_format: { name: 'string', arguments: 'object' }
      });
    }

    // Map MCP tool name to service + extract input
    const toolMap = {
      'analyze_text': { service: 'analyze', input: args.text },
      'summarize_text': { service: 'summarize', input: args.text },
      'review_code': { service: 'review', input: args.code },
      'security_scan': { service: 'security', input: args.code },
      'explain_code': { service: 'explain', input: args.code },
      'refactor_code': { service: 'refactor', input: args.code },
      'analyze_complexity': { service: 'complexity', input: args.code || args.text }
    };

    const mapping = toolMap[name];
    if (!mapping) {
      return res.status(400).json({ 
        error: `Unknown tool: ${name}`,
        available: MCP_TOOLS.map(t => t.name)
      });
    }

    if (!mapping.input || mapping.input.length < 3) {
      return res.status(400).json({ error: 'Input too short (min 3 chars)' });
    }

    if (mapping.input.length > 50000) {
      return res.status(400).json({ error: 'Input too long (max 50000 chars)' });
    }

    try {
      const systemPrompts = {
        'analyze': 'You are a professional text analyst. Analyze the text deeply — identify themes, patterns, sentiment, key insights, and notable facts. Structure your response clearly.',
        'summarize': 'You are a professional summarizer. Condense the text into a clear, concise summary. Capture all key points.',
        'review': 'You are a senior code reviewer. Analyze the code for bugs, security issues, style problems, and performance concerns. Provide specific actionable feedback.',
        'security': 'You are a security expert. Scan the code for OWASP Top 10 vulnerabilities, injection flaws, authentication issues, and other security risks. Rate severity.',
        'explain': 'You are a coding instructor. Explain how the code works in clear, plain language suitable for a junior developer.',
        'refactor': 'You are a software architect. Suggest specific refactoring improvements for better readability, performance, and maintainability.',
        'complexity': 'You are an algorithms expert. Analyze time and space complexity. Provide Big O notation and explain why.'
      };

      const result = await callAIFn([
        { role: 'system', content: systemPrompts[mapping.service] || `You are a ${mapping.service} assistant.` },
        { role: 'user', content: mapping.input }
      ]);

      res.json({
        tool_use_id: `mcp-${Date.now()}`,
        content: [{ type: 'text', text: result }],
        meta: {
          service: mapping.service,
          cost_cents: { 'analyze': 1, 'summarize': 2, 'review': 5, 'security': 3, 'explain': 2, 'refactor': 5, 'complexity': 2 }[mapping.service] || 1,
          wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113'
        }
      });
    } catch (e) {
      res.status(500).json({ error: 'Processing failed', detail: e.message });
    }
  });

  // OpenAI-compatible tool format (for ChatGPT, Cursor, etc.)
  router.get('/v1/openai', (req, res) => {
    res.json({
      tools: MCP_TOOLS.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema
        }
      }))
    });
  });

  return router;
}

export { MCP_TOOLS, createMCPRouter };
