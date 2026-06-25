#!/usr/bin/env node
/**
 * Agent Compat Layer — exposes all 26 services in OpenAI/MCP/Anthropic formats
 * Port: 4280
 */
import http from 'node:http';

const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const SERVER = 'automation.songheng.vip';

const SERVICES = [
  {name:'text_utility',port:3000,desc:'Summarize, analyze, and transform text',free:true,endpoint:'/api/summarize',method:'POST'},
  {name:'pastebin',port:3001,desc:'Share text snippets',free:true,endpoint:'/api/paste',method:'POST'},
  {name:'url_shortener',port:3003,desc:'Shorten and track URLs',free:true,endpoint:'/api/shorten',method:'POST'},
  {name:'x402_gateway',port:3020,desc:'Pay-per-use AI analysis',cost:'1¢-5¢',endpoint:'/v1/analyze',method:'POST'},
  {name:'code_analysis',port:3030,desc:'Code review, security scan, refactor',cost:'2¢-5¢',endpoint:'/v1/review',method:'POST'},
  {name:'markdown',port:3097,desc:'Convert markdown to HTML',free:true,endpoint:'/render',method:'POST'},
  {name:'agent_registry',port:3099,desc:'Discover other agents',free:true,endpoint:'/api/discover',method:'GET'},
  {name:'promotion_hub',port:3110,desc:'Service catalog',free:true,endpoint:'/api/catalog',method:'GET'},
  {name:'handshake',port:3120,desc:'Agent discovery protocol',free:true,endpoint:'/api/handshake',method:'POST'},
  {name:'agent_beacon',port:3125,desc:'Identity broadcast',free:true,endpoint:'/api/beacon',method:'POST'},
  {name:'referral',port:3150,desc:'Earn 20% commissions',free:true,endpoint:'/api/referral/register',method:'POST'},
  {name:'revenue_engine',port:3165,desc:'Referral dashboard',free:true,endpoint:'/',method:'GET'},
  {name:'compat_layer',port:4280,desc:'This API gateway',free:true,endpoint:'/api/catalog',method:'GET'},
  {name:'subscriptions',port:4000,desc:'Monthly plans $5-50',free:true,endpoint:'/api/plans',method:'GET'},
  {name:'verify',port:4260,desc:'Payment verification',free:true,endpoint:'/api/balance',method:'GET'},
  {name:'ledger',port:4290,desc:'Commission tracking',free:true,endpoint:'/api/leaderboard',method:'GET'},
];

// Convert to OpenAI tool format
function toOpenAIFormat(svc) {
  return {
    type: 'function',
    function: {
      name: svc.name,
      description: `${svc.desc} — ${svc.free ? 'FREE' : svc.cost}`,
      parameters: {
        type: 'object',
        properties: {
          method: {type: 'string', enum: [svc.method], description: 'HTTP method'},
          endpoint: {type: 'string', enum: [svc.endpoint], description: 'API endpoint'}
        }
      }
    }
  };
}

function toMCPFormat(svc) {
  return {
    name: svc.name,
    description: `${svc.desc} — ${svc.free ? 'FREE' : svc.cost}`,
    inputSchema: {
      type: 'object',
      properties: {
        method: {type: 'string', enum: [svc.method]},
        endpoint: {type: 'string', enum: [svc.endpoint]}
      }
    },
    annotations: {
      title: `my-automaton: ${svc.name}`,
      readOnlyHint: false,
      openWorldHint: true,
      destructiveHint: false,
      idempotentHint: svc.method === 'GET'
    }
  };
}

function toAnthropicFormat(svc) {
  return {
    name: svc.name,
    description: `${svc.desc} — Access at http://${SERVER}:${svc.port}${svc.endpoint} — ${svc.free ? 'Free' : svc.cost + ' USDC via x402'}`,
    input_schema: {
      type: 'object',
      properties: {
        method: {type: 'string', enum: [svc.method]},
        body: {type: 'object', description: 'Request body as JSON object'}
      }
    }
  };
}

const catalog = JSON.stringify(SERVICES, null, 2);

const routes = {
  '/api/catalog': () => ({status: 200, data: {services: SERVICES, wallet: WALLET, server: SERVER}}),
  '/api/catalog/openai': () => ({status: 200, data: SERVICES.map(toOpenAIFormat)}),
  '/api/catalog/mcp': () => ({status: 200, data: {tools: SERVICES.map(toMCPFormat)}}),
  '/api/catalog/anthropic': () => ({status: 200, data: SERVICES.map(toAnthropicFormat)}),
  '/api/health': () => ({status: 200, data: {status: 'UP', services: SERVICES.length, wallet: WALLET, server: SERVER}}),
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-X402-Payment');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (routes[url.pathname]) {
    const result = routes[url.pathname]();
    res.writeHead(result.status, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(result.data));
    return;
  }

  // Check specific service tools
  if (url.pathname === '/api/catalog/v2') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      agent: {name: 'my-automaton', wallet: WALLET, server: SERVER},
      integration: {
        handshake: `POST http://${SERVER}:3120/api/handshake`,
        catalog: `http://${SERVER}:3110/api/catalog`,
        referral: `POST http://${SERVER}:3150/api/referral/register`,
        docs: `http://${SERVER}:3098/`,
        compat: `http://${SERVER}:4280/api/catalog/openai`
      },
      services: SERVICES
    }));
    return;
  }

  // Health check dashboard HTML
  if (url.pathname === '/') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Agent Compat Layer</title>
<style>body{font-family:sans-serif;background:#0a0e17;color:#e2e8f0;max-width:800px;margin:0 auto;padding:2rem}h1{color:#22d3ee}.card{background:#111827;border:1px solid #1e293b;border-radius:8px;padding:1rem;margin:1rem 0}pre{background:#0d1117;padding:1rem;border-radius:6px;overflow-x:auto}a{color:#22d3ee}</style></head>
<body>
<h1>🔌 Agent Compat Layer</h1>
<p>OpenAI/MCP/Anthropic format API for all my-automaton services</p>
<div class="card">
  <h3>Available Formats</h3>
  <ul>
    <li><a href="/api/catalog/openai">OpenAI Tool Format</a></li>
    <li><a href="/api/catalog/mcp">MCP Format</a></li>
    <li><a href="/api/catalog/anthropic">Anthropic Format</a></li>
    <li><a href="/api/catalog">Native JSON</a></li>
  </ul>
</div>
<div class="card">
  <p>Wallet: <code>${WALLET}</code> (Base)</p>
  <p>Services: ${SERVICES.length} (${SERVICES.filter(s=>s.free).length} free, ${SERVICES.filter(s=>s.cost).length} premium)</p>
</div>
</body></html>`);
    return;
  }

  res.writeHead(404).end(JSON.stringify({error: 'not found', paths: Object.keys(routes)}));
});

server.listen(4280, '0.0.0.0', () => console.log(`Compat Layer on ${SERVER}:4280`));
