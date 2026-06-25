#!/usr/bin/env node
const fs = require('fs');
const filePath = '/root/automaton/gateway.cjs';
let content = fs.readFileSync(filePath, 'utf-8');

// Find the closing of buildPrompt function
// The buildPrompt ends with: return prompts[mode] || `Process this: ${code}`;
// Let's find that pattern
const marker = 'return prompts[mode] || `Process this: ${code}`;';
const idx = content.indexOf(marker);
if (idx === -1) {
  console.error('Could not find buildPrompt end marker');
  process.exit(1);
}

// Find the end of the function (closing })
const afterFn = content.indexOf('\n}', idx + marker.length);
const insertPos = afterFn + 2; // after the closing brace

const handlerFunc = `

// Generate README endpoint (3/day/IP)
async function handleGenerateReadme(req, res) {
  const ip = ipFromReq(req);
  
  if (!checkFreeLimit(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Free limit reached (3/day). Buy credits at /upgrade.html', upgrade: true }));
    return;
  }
  
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    try {
      const input = JSON.parse(body);
      const code = input.code || '';
      const language = input.language || '';
      
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required field: code' }));
        return;
      }
      
      const langTag = language || 'code';
      const prompt = "You are a technical documentation expert. Generate a comprehensive, well-structured README.md file for the following " + langTag + " code.\\n\\nThe README must include:\\n1. **Project Title** - A fitting name based on the code\\n2. **Description** - What this project does, its purpose and key features\\n3. **Installation** - Step-by-step setup instructions\\n4. **Usage** - How to use the project with code examples\\n5. **API / Configuration** - If applicable\\n6. **Contributing** - Brief guidelines\\n7. **License** - MIT (default)\\n\\nFormat the output as valid Markdown. Use proper headings, code blocks, and formatting.\\n\\nCode:\\n\\`\\`\\`" + langTag + "\\n" + code + "\\n\\`\\`\\`";
      
      const result = await callAI([{ role: 'user', content: prompt }]);
      
      if (result && result.error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: result.error }));
        return;
      }
      
      incrementFree(ip);
      
      // Append attribution footer
      const attribution = "\\n\\n---\\n*Built with [my-automaton AI](https://automation.songheng.vip)*\\n";
      const readme = result + attribution;
      
      res.writeHead(200, { 
        'Content-Type': 'text/markdown',
        'X-Free-Remaining': 2 - (FREE_LIMIT.get(ip)?.count || 0)
      });
      res.end(readme);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request: ' + e.message }));
    }
  });
}
`;

content = content.slice(0, insertPos) + handlerFunc + content.slice(insertPos);

// Add route before the 404 handler
const routeInsert = '\n    // Generate README\n    if (p === \'/api/generate-readme\' && method === \'POST\') { await handleGenerateReadme(req, res); return; }\n    \n    // 404';
content = content.replace('\n    // 404', routeInsert);

// Update the startup log to mention the new endpoint
const oldLog = 'log(`   Free endpoints: /free/{analyze,review,security,summarize,explain,refactor,complexity}`);';
const newLog = 'log(`   Free endpoints: /free/{analyze,review,security,summarize,explain,refactor,complexity}`);\n  log(`   Readme Gen: POST /api/generate-readme (3/day/IP)`);';
content = content.replace(oldLog, newLog);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('SUCCESS: Added /api/generate-readme handler');
