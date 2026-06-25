#!/usr/bin/env node
// directory-blast.mjs - Generate complete submission packages for 15+ directories
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIRECTORIES = [
  { name: "ClawHunt", url: "https://clawhunt.com/submit", type: "ai-agent", desc: "AI agent marketplace & discovery" },
  { name: "Smithery", url: "https://smithery.ai/submit", type: "mcp-server", desc: "MCP server directory" },
  { name: "MCP.so", url: "https://mcp.so/submit", type: "mcp-server", desc: "MCP tools & servers" },
  { name: "PulseMCP", url: "https://pulsemcp.com/submit", type: "mcp-server", desc: "MCP server discovery" },
  { name: "Glama", url: "https://glama.ai/submit", type: "mcp-server", desc: "AI agent directory" },
  { name: "Toolbase", url: "https://toolbase.io/submit", type: "ai-tool", desc: "AI tools directory" },
  { name: "FutureTools", url: "https://futuretools.io/submit", type: "ai-tool", desc: "AI tools collection" },
  { name: "There's An AI For That", url: "https://theresanaiforthat.com/submit", type: "ai-tool", desc: "AI directory" },
  { name: "AI Tool Hunt", url: "https://aitoolhunt.com/submit", type: "ai-tool", desc: "AI tools marketplace" },
  { name: "GPTE", url: "https://gpte.ai/submit", type: "ai-agent", desc: "GPT & AI directory" },
  { name: "Dang.ai", url: "https://dang.ai/submit", type: "ai-agent", desc: "AI tools database" },
  { name: "Easy With AI", url: "https://easywithai.com/submit", type: "ai-tool", desc: "AI tools directory" },
  { name: "Tool Pilot", url: "https://toolpilot.ai/submit", type: "ai-tool", desc: "AI directory" },
  { name: "AI Scout", url: "https://aiscout.net/submit", type: "ai-agent", desc: "AI agent directory" },
  { name: "Supertools", url: "https://supertools.therundown.ai/submit", type: "ai-tool", desc: "AI tools newsletter" }
];

const DESC = `# my-automaton

Self-sustaining AI Agent — Pay-as-you-go Code Review, Security Scanning & Text Analysis

A sovereign AI agent that lives on a VPS and pays for its own compute. Provides professional-grade code review, security vulnerability scanning, deep text analysis, summarization, code explanation, and refactoring suggestions. Pay per request with API credits — no monthly subscriptions, no accounts required.

## Key Features
- Code Review with AI — submit any code, get professional review in seconds
- Security Vulnerability Scanning — detect SQL injection, XSS, reentrancy, hardcoded secrets
- Text Analysis & Summarization — deep content analysis and concise summaries
- Code Explanation & Refactoring — understand complex code and get improvement suggestions
- Complexity Analysis — measure cyclomatic complexity and code quality metrics
- Batch Processing — analyze up to 10 texts in a single request
- Free Trial — 3 requests per day per IP, no signup required
- API Credits — pay as you go, no monthly subscription

## Quick Start
\`\`\`bash
# Free text analysis (3/day, no key needed)
curl -X POST https://automation.songheng.vip/free/analyze \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Your text here","mode":"analyze"}'
\`\`\`

## Links
- **Website**: https://automation.songheng.vip
- **API Docs**: https://automation.songheng.vip/api-docs.html
- **Pricing**: https://automation.songheng.vip/upgrade.html
- **Agent Wallet**: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113`;

const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Submit my-automaton to Directories</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:900px;margin:0 auto;padding:20px;background:#0f0f23;color:#e0e0e0;line-height:1.6}
h1{color:#00d4aa;border-bottom:2px solid #00d4aa33;padding-bottom:10px}
h2{color:#8892b0;margin-top:30px}
table{width:100%;border-collapse:collapse;margin:20px 0}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #1e1e3f}
th{background:#1a1a3e;color:#00d4aa}
tr:hover{background:#1a1a3e66}
.btn-sm{display:inline-block;padding:6px 14px;background:#00d4aa22;color:#00d4aa;border:1px solid #00d4aa44;border-radius:4px;text-decoration:none;font-size:13px;cursor:pointer}
.btn-sm:hover{background:#00d4aa44}
.box{background:#1a1a3e;border:1px solid #00d4aa33;border-radius:8px;padding:16px;margin:20px 0;white-space:pre-wrap;font-size:13px;max-height:300px;overflow-y:auto}
.copy-btn{background:#00d4aa;color:#0f0f23;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:bold;margin:10px 0}
.copy-btn:hover{background:#00e6bb}
.status{padding:12px;border-radius:6px;margin:20px 0;background:#ffd70022;border:1px solid #ffd70044}
.tag{display:inline-block;padding:2px 8px;background:#00d4aa22;color:#00d4aa;border-radius:10px;font-size:11px;margin:2px}
</style></head>
<body>
<h1>🤖 Submit my-automaton to Directories</h1>
<p>Click each link, copy description, paste into form. Goal: get listed on <strong>${DIRECTORIES.length}+ directories</strong>.</p>
<div class="status" id="progress">⏳ <strong>Progress: 0 / ${DIRECTORIES.length}</strong> submitted</div>
<h2>📋 Submission Checklist</h2>
<table><tr><th>#</th><th>Directory</th><th>Type</th><th>Submit</th><th>Copy</th></tr>
${DIRECTORIES.map((d,i)=>`<tr><td>${i+1}</td><td><strong>${d.name}</strong></td><td>${d.desc}</td><td><a href="${d.url}" target="_blank" class="btn-sm">Open</a></td><td><button onclick="copyD(${i})" class="btn-sm">Copy</button></td></tr>`).join('\n')}
</table>
<h2>📝 Master Description</h2>
<button class="copy-btn" onclick="copyM()">📋 Copy to Clipboard</button>
<div class="box" id="md"></div>
<h2>🏷️ Tags</h2>
<p>${["code-review","security-scanning","ai-agent","developer-tools","text-analysis","summarization"].map(t=>'<span class="tag">#'+t+'</span>').join(' ')}</p>
<script>
const desc = ${JSON.stringify(DESC)};
document.getElementById('md').textContent = desc;
let done = new Set();
function copyM(){navigator.clipboard.writeText(desc).then(()=>{document.querySelector('.copy-btn').textContent='✅ Copied!';setTimeout(()=>document.querySelector('.copy-btn').textContent='📋 Copy',2000)}).catch(()=>{const t=document.createElement('textarea');t.value=desc;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);document.querySelector('.copy-btn').textContent='✅ Copied!';setTimeout(()=>document.querySelector('.copy-btn').textContent='📋 Copy',2000)})}
function copyD(i){navigator.clipboard.writeText(desc).then(()=>{done.add(i);up()}).catch(()=>{done.add(i);up()})}
function up(){const s=document.getElementById('progress');const t=${DIRECTORIES.length};const d=done.size;if(d>=t){s.innerHTML='✅ <strong>All '+t+' directories submitted!</strong>';s.style.background='#00d4aa22';s.style.border='1px solid #00d4aa44'}else{s.innerHTML='⏳ <strong>Progress: '+d+' / '+t+'</strong> submitted'}}
document.querySelectorAll('a[target="_blank"]').forEach(a=>{a.addEventListener('click',function(){const tr=this.closest('tr');if(tr){const btn=tr.querySelector('button');if(btn)btn.click()}})});
</script></body></html>`;

fs.writeFileSync(path.join(__dirname, '..', 'content', 'directory-blast.html'), html);
fs.writeFileSync(path.join(__dirname, '..', 'data', 'directory-catalog.json'), JSON.stringify(DIRECTORIES.map(d=>({name:d.name,url:d.url,type:d.type})), null, 2));
console.log(`✅ Generated directory-blast.html with ${DIRECTORIES.length} directories`);
