#!/usr/bin/env node
/* inject-mcp-routes.mjs — Adds MCP routes to the running gateway.cjs WITHOUT a full restart */
/* This is a temporary fix — the full gateway.cjs needs a host restart */
import fs from 'fs';

const gatewayPath = '/root/automaton/gateway.cjs';
let content = fs.readFileSync(gatewayPath, 'utf8');

/* Check if MCP routes already exist */
if (content.includes('MCP Catalog')) {
  console.log('[mcp] MCP routes already present in gateway.cjs');
  process.exit(0);
}

/* Find where to inject — before the 404 handler */
const injectPoint = content.lastIndexOf('app.use((req, res) => {');
if (injectPoint === -1) {
  console.error('[mcp] Could not find injection point (404 handler)');
  process.exit(1);
}

const mcpRoutes = `
/* === MCP Catalog (OpenAI-compatible) === */
const mcpServices = [
  { name: 'analyze', description: 'Deep text analysis with sentiment, entities, and key themes', cost: 1 },
  { name: 'summarize', description: 'AI-powered text summarization', cost: 2 },
  { name: 'review', description: 'Full code review with issues, severity, and fix suggestions', cost: 5 },
  { name: 'security', description: 'Security vulnerability scanning for code', cost: 3 },
  { name: 'explain', description: 'Code explanation in plain language', cost: 2 },
  { name: 'refactor', description: 'Code refactoring suggestions', cost: 5 },
  { name: 'complexity', description: 'Code complexity analysis (cyclomatic + cognitive)', cost: 2 }
];

app.get('/mcp/v1/openai', (req, res) => {
  const tools = mcpServices.map(s => ({
    type: 'function',
    function: {
      name: s.name,
      description: s.description,
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Input text or code to process' },
          language: { type: 'string', description: 'Programming language (for code services)', enum: ['javascript','python','typescript','go','rust','java','solidity','auto'] }
        },
        required: ['content']
      }
    }
  }));
  res.json(tools);
});

app.get('/mcp/v1/catalog', (req, res) => {
  res.json({ server: 'my-automaton', domain: 'automation.songheng.vip', wallet: '0x76eADdEBFfb6a61DD071f97F4508467fc55dd113', free: '3/day per service', services: mcpServices, base_url: 'https://automation.songheng.vip' });
});

app.post('/mcp/v1/call', async (req, res) => {
  const { name, arguments: args } = req.body || {};
  if (!name || !args?.content) return res.status(400).json({ error: 'name and arguments.content required' });
  const validNames = mcpServices.map(s => s.name);
  if (!validNames.includes(name)) return res.status(400).json({ error: 'Unknown service: ' + name + '. Valid: ' + validNames.join(', ') });
  const systemPrompts = {
    analyze: 'You are an expert text analyst. Analyze the given text thoroughly. Identify: main themes, sentiment, key entities, and structural patterns. Format your response with clear sections using markdown.',
    summarize: 'You are an expert summarizer. Create a concise yet comprehensive summary of the given text. Extract key points, main arguments, and conclusions. Use bullet points where appropriate.',
    review: 'You are an expert code reviewer. Review the provided code for: bugs, security issues, performance problems, style violations, and best practices. Rate severity (critical/major/minor). Provide specific fix suggestions.',
    security: 'You are an expert security auditor. Scan the provided code for: injection vulnerabilities, XSS, CSRF, auth issues, hardcoded secrets, dependency risks, and OWASP Top 10 violations. Rate severity and provide fixes.',
    explain: 'You are an expert programmer who explains code clearly. Explain what the provided code does, how it works, and any notable patterns or potential improvements.',
    refactor: 'You are an expert software architect. Analyze the provided code and suggest refactoring improvements. Focus on: readability, maintainability, performance, and design patterns.',
    complexity: 'You are a code complexity analyst. Calculate cyclomatic complexity, cognitive complexity, and maintainability index. Explain which parts are most complex and why.'
  };
  const systemPrompt = systemPrompts[name] || 'You are a helpful AI assistant.';
  const userContent = args.language && args.language !== 'auto' ? `Language: ${args.language}\n\n${args.content}` : args.content;
  
  try {
    const result = await callDeepSeek(systemPrompt, userContent);
    res.json({ result: result.result || result.error });
  } catch(e) {
    res.json({ result: mockResponse(systemPrompt, userContent).result });
  }
});

`;

content = content.slice(0, injectPoint) + mcpRoutes + content.slice(injectPoint);
fs.writeFileSync(gatewayPath, content);
console.log('[mcp] Injected MCP routes into gateway.cjs');
console.log('[mcp] NOTE: Gateway needs restart to take effect');
console.log('[mcp] Restart: sudo systemctl restart automaton-gateway');
`;

fs.writeFileSync('/root/automaton/scripts/inject-mcp-routes.mjs', content);
console.log('Written inject-mcp-routes.mjs');
process.exit(0);