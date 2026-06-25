#!/usr/bin/env node
// Fix gateway: patch catch-all AND add missing routes properly
const F = require('fs');
const gw = '/root/automaton/gateway.cjs';
let c = F.readFileSync(gw, 'utf8');

// FIX 1: Fix the catch-all handler that crashes on array req.path
// Replace the broken sf() usage with String()-safe version
const oldCatchAll = c.match(/app\.use\(\(req,res,next\)=>\{[\s\S]*?if\(req\.method!=='GET'\)return next\(\);[\s\S]*?return res\.sendFile\(fp\);[\s\S]*?next\(\);[\s\S]*?\}\);[\s\n]*\);/);
if (oldCatchAll) {
  const safeHandler = `app.use((req,res,next)=>{
  if(req.method!=='GET')return next();
  var p=typeof req.path==='string'?req.path.replace(/^\\//,''):(req.url||'').replace(/^\\//,'');
  if(!p||p.indexOf('..')>=0||p.indexOf('\\\\')>=0)return next();
  var fp=CONTENT+'/'+p;
  if(F.existsSync(fp)&&!F.statSync(fp).isDirectory()){tr('/'+p);return res.sendFile(fp);}
  var hp=fp+'.html';
  if(F.existsSync(hp)&&!F.statSync(hp).isDirectory()){tr('/'+p);return res.sendFile(hp);}
  next();
});`;
  c = c.replace(oldCatchAll[0], safeHandler);
}

// FIX 2: Add proxyTo function if missing
if (!c.includes('function proxyTo')) {
  const proxyFn = `
function proxyTo(url){return function(req,res){
  var u=new URL(url);
  var opts={hostname:u.hostname,port:parseInt(u.port||'80'),path:u.pathname+(req.url.split(u.pathname)[1]||''),method:req.method,headers:Object.assign({},req.headers,{host:u.hostname})};
  var pr=require('http').request(opts,function(pr2){res.writeHead(pr2.statusCode,pr2.headers);pr2.pipe(res);});
  pr.on('error',function(){try{res.writeHead(500);res.end(JSON.stringify({error:'proxy_failed'}));}catch(e){}});
  if(req.body&&typeof req.body==='object')pr.write(JSON.stringify(req.body));
  else if(req.body)pr.write(req.body);
  pr.end();
};}
`;
  // Insert after require statements
  const reqEnd = c.indexOf('const F=require') > -1 ? c.indexOf('const F=require') : c.indexOf('var F=require');
  const afterRequire = c.indexOf('\n', reqEnd) + 1;
  // Find a better insertion point - after const declarations but before app
  const appStart = c.indexOf("const app=express");
  if (appStart > -1) {
    const beforeApp = c.lastIndexOf('\n', appStart - 2);
    c = c.slice(0, beforeApp + 1) + '\n' + proxyFn + c.slice(beforeApp + 1);
  }
}

// FIX 3: Add MCP routes
if (!c.includes('/mcp/list_tools')) {
  // Insert after api/health route
  c = c.replace("app.get('/api/health'", "app.get('/mcp/list_tools',proxyTo('http://127.0.0.1:3095/mcp/list_tools'));\napp.all('/mcp/call_tool',proxyTo('http://127.0.0.1:3095/mcp/call_tool'));\napp.get('/mcp/catalog',proxyTo('http://127.0.0.1:3095/api/catalog'));\napp.get('/api/health'");
}

// FIX 4: Add GitHub webhook routes
if (!c.includes('/webhook/github')) {
  c = c.replace("app.get('/api/health'", "app.post('/webhook/github',proxyTo('http://127.0.0.1:3125/webhook'));\napp.get('/webhook/github',proxyTo('http://127.0.0.1:3125/pricing'));\napp.get('/api/health'");
}

// FIX 5: Remove any duplicate code
// Clean up any proxyFn duplication
const pfnMatch = c.match(/(function proxyTo[\s\S]*?\};)/g);
if (pfnMatch && pfnMatch.length > 1) {
  c = c.replace(pfnMatch.slice(1).join(''), '');
  // Remove the first one too and re-add once at right location
}

F.writeFileSync(gw, c);

try { 
  require('child_process').execSync('node -c ' + gw, { timeout: 3000 }); 
  console.log('✓ Syntax OK'); 
  // Check all routes
  const routes = c.match(/app\.(get|post|put|delete|all)\(['"][^'"]+['"]/g) || [];
  const routePaths = routes.map(r => r.match(/['"]([^'"]+)['"]/)[1]);
  console.log('Routes:', routePaths.length);
  routePaths.forEach(r => console.log('  ' + r));
} catch(e) { 
  console.log('✗ Syntax error:', e.message); 
  process.exit(1); 
}
