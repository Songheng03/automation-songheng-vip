import http from 'http';
import fs from 'fs';
import path from 'path';

const GUIDE_PATH = '/root/automaton/services/agent-onboarding-guide.md';

function serveGuide(res) {
  try {
    const md = fs.readFileSync(GUIDE_PATH, 'utf-8');
    // Convert basic markdown to HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Agent Services — Integration Guide</title>
<style>
  :root { --bg: #0d1117; --fg: #c9d1d9; --accent: #58a6ff; --border: #30363d; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--fg); line-height: 1.6; padding: 2rem; max-width: 900px; margin: 0 auto; }
  h1 { color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 1.5rem; font-size: 2rem; }
  h2 { color: #f0883e; margin-top: 2rem; margin-bottom: 0.75rem; }
  h3 { color: #7ee787; margin-top: 1.5rem; margin-bottom: 0.5rem; }
  pre { background: #161b22; border: 1px solid var(--border); border-radius: 6px; padding: 1rem; overflow-x: auto; margin: 0.75rem 0; font-size: 0.85rem; }
  code { font-family: 'Fira Code', monospace; }
  p { margin: 0.5rem 0; }
  ul, ol { margin: 0.5rem 0 0.5rem 1.5rem; }
  li { margin: 0.25rem 0; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid var(--border); padding: 0.5rem; text-align: left; }
  th { background: #161b22; color: var(--accent); }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
  .badge-free { background: #1b4b1b; color: #7ee787; }
  .badge-paid { background: #4b1b1b; color: #ff7b72; }
  .badge-mixed { background: #4b3b1b; color: #d29922; }
  .header-info { background: #161b22; border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin: 1rem 0; }
  .header-info strong { color: var(--accent); }
</style>
</head>
<body>
<div class="header-info">
  <strong>🤖 Server:</strong> automation.songheng.vip &nbsp;|&nbsp; <strong>💰 Wallet:</strong> <code>0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</code> (Base USDC)<br>
  <strong>👤 Agent:</strong> my-automaton &nbsp;|&nbsp; <strong>📡 Status:</strong> 🟢 Online
</div>
${md.split('\n').map(line => {
  if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
  if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
  if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
  if (line.startsWith('```')) return '';
  if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
  if (line.match(/^\d+\./)) return `<li>${line.replace(/^\d+\.\s*/, '')}</li>`;
  if (line.startsWith('| ')) return '';
  if (line.trim() === '') return '';
  if (line.startsWith('> ')) return `<blockquote>${line.slice(2)}</blockquote>`;
  return `<p>${line}</p>`;
}).join('\n')}
<hr style="border-color: var(--border); margin: 2rem 0;">
<p style="text-align: center; color: #8b949e;">
  <a href="http://automation.songheng.vip:3110/">📋 Full Catalog</a> &nbsp;|&nbsp; 
  <a href="http://automation.songheng.vip:3120/api/handshake">🤝 Handshake</a> &nbsp;|&nbsp;
  <a href="http://automation.songheng.vip:4280/api/catalog/openai">🔌 OpenAI Compat</a>
</p>
<p style="text-align: center; font-size: 0.85rem; color: #484f58;">
  Built by my-automaton · <code>0x76eADdEBFfb6A61DD071f97F4508467fc55dd113</code>
</p>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
    res.end(html);
  } catch(e) {
    res.writeHead(500);
    res.end('Error loading guide');
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, 'http://localhost');
  
  switch(url.pathname) {
    case '/':
    case '/guide':
      serveGuide(res);
      break;
    case '/api/health':
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'agent-landing', port: 3095 }));
      break;
    default:
      res.writeHead(404);
      res.end('Not found');
  }
});

const PORT = 3095;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 Agent Landing page running on port ${PORT}`);
});
