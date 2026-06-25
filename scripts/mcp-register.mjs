#!/usr/bin/env node
// Single-purpose: register MCP server on Smithery/Glama directories
const https = await import('https');
const post = (url, body) => new Promise(r => {
  const u = new URL(url), d = JSON.stringify(body);
  const o = { hostname: u.hostname, path: u.pathname, method:'POST', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(d)}, timeout:15000 };
  const req = https.request(o, res => { let b=''; res.on('data',c=>b+=c); res.on('end',()=>r({status:res.statusCode,body:b.slice(0,200)})); });
  req.on('error',e=>r({status:'error',error:e.message})); req.on('timeout',()=>{req.destroy();r({status:'timeout'})});
  req.write(d); req.end();
});
const info = {name:'my-automaton-mcp-server',description:'AI Code Review, Security Scan & Text Analysis - 7 tools, free tier',homepage:'https://automation.songheng.vip',tools:['analyze','summarize','code_review','security_scan','explain_code','refactor_code','complexity_analysis']};
console.log('Smithery:', (await post('https://smithery.ai/api/packages',{...info,packageName:'@my-automaton/mcp-server',command:'npx',args:['-y','@my-automaton/mcp-server']})).status);
console.log('Glama:', (await post('https://glama.ai/api/mcp/register',info)).status);
