#!/usr/bin/env node
// Directory submission script
const fs = require('fs');
const AGENT = { name:'my-automaton', tagline:'AI Code Review & Text Analysis API — Pay As You Go', description:'Sovereign AI agent providing 7 premium API endpoints via x402 micropayments and Stripe credits. Services include: code review (5 credits), security vulnerability scanning (3 credits), text analysis (1 credit), summarization (2 credits), code explanation (2 credits), refactoring (5 credits), and complexity analysis (2 credits). Free tier: 3 requests/day per IP. Pay-as-you-go pricing from $5 for 500 credits.', website:'https://automation.songheng.vip', wallet:'0x76eADdEBFfb6A61DD071f97F4508467fc55dd113' };

const API_DIRS = [
  { name:'MCP.so', url:'https://mcp.so/api/tools/submit', body:{name:AGENT.name,description:AGENT.description,url:AGENT.website} },
  { name:'PulseMCP', url:'https://pulsemcp.com/api/tools', body:{name:AGENT.name,description:AGENT.tagline,url:AGENT.website} },
  { name:'Glama.ai', url:'https://glama.ai/api/gateway/tools', body:{name:AGENT.name,url:AGENT.website,description:AGENT.description.slice(0,500)} },
  { name:'Smithery', url:'https://smithery.ai/api/v1/servers', body:{name:AGENT.name,description:AGENT.description} },
];

const BROWSER = [
  ['ClawHunt','https://clawhunt.com/tools'],
  ['Google Search Console','https://search.google.com/search-console'],
  ['Bing Webmaster','https://www.bing.com/webmasters'],
  ['FutureTools','https://futuretools.io/submit'],
  ['ToolBase','https://toolbase.io/submit'],
  ['TopAI.tools','https://topai.tools/submit'],
  ['AI Scout','https://aiscout.net/submit'],
  ['EasyWithAI','https://easywithai.com/submit'],
  ['Toolify','https://www.toolify.ai/submit'],
  ['There\'s An AI For That','https://theresanaiforthat.com/submit'],
];

async function main() {
  console.log('=== Directory Submission ===\n');
  const results = [];
  for (const d of API_DIRS) {
    process.stdout.write(`  ${d.name}... `);
    try {
      const r = await fetch(d.url, {method:'POST',headers:{'Content-Type':'application/json','User-Agent':'my-automaton/1.0'},body:JSON.stringify(d.body),signal:AbortSignal.timeout(8000)});
      const t = await r.text();
      results.push({name:d.name,status:r.status,response:t.slice(0,200)});
      console.log(r.status < 400 ? `✅ ${r.status}` : r.status===503 ? `⏳ 503 (busy)` : `❌ ${r.status}`);
    } catch(e) { results.push({name:d.name,error:e.message}); console.log(`❌ ${e.message}`); }
  }

  // Generate HTML page
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Submit my-automaton</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6}h1{color:#2563eb}.links{list-style:none;padding:0}.links li{margin:8px 0}.links a{color:#2563eb}.box{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:20px 0}</style></head><body>
<h1>📋 Submit my-automaton to AI Directories</h1>
<div class="box"><strong>${BROWSER.length} directories</strong> — open each link, paste the description below, and submit.</div>
<textarea style="width:100%;height:100px;font-family:monospace;font-size:13px;padding:8px" readonly>${AGENT.description}</textarea>
<button onclick="navigator.clipboard.writeText(document.querySelector('textarea').value)" style="background:#2563eb;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer">📋 Copy</button>
<h2>Directories:</h2>
<ol class="links">${BROWSER.map(([n,u])=>`<li><strong>${n}</strong>: <a href="${u}" target="_blank">${u}</a></li>`).join('')}</ol>
<h2>Agent Details:</h2>
<ul><li><strong>Name:</strong> ${AGENT.name}</li><li><strong>Website:</strong> <a href="${AGENT.website}">${AGENT.website}</a></li><li><strong>Wallet:</strong> <code>${AGENT.wallet}</code> (Base chain)</li><li><strong>Free tier:</strong> 3 requests/day/IP</li><li><strong>Pricing:</strong> $5-$388 for credits</li></ul>
</body></html>`;
  fs.writeFileSync('/root/automaton/content/submit-to-directories.html', html);
  console.log(`\n✅ Page saved to content/submit-to-directories.html`);
  fs.writeFileSync('/root/automaton/data/directory-submissions.json', JSON.stringify(results, null, 2));
  console.log(`✅ Results saved to data/directory-submissions.json`);
  const ok = results.filter(r=>r.status>0&&r.status<400).length;
  const fail = results.filter(r=>r.status>=400||!r.status).length;
  console.log(`\nSummary: ${ok} ok, ${fail} failed, ${BROWSER.length} browser links ready`);
}
main().catch(console.error);
