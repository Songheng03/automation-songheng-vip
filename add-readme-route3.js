#!/usr/bin/env node
const fs = require('fs');
const filePath = '/root/automaton/gateway.cjs';
let content = fs.readFileSync(filePath, 'utf-8');

// Find the closing of buildPrompt function
const marker = 'return prompts[mode] || `Process this: ${code}`;';
const idx = content.indexOf(marker);
if (idx === -1) {
  console.error('Could not find buildPrompt end marker');
  process.exit(1);
}

const afterFn = content.indexOf('\n}', idx + marker.length);
const insertPos = afterFn + 2;

const handlerFunc = `

// Generate README endpoint (3/day/IP)
async function handleGenerateReadme(req, res) {
  var ip = ipFromReq(req);
  
  if (!checkFreeLimit(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Free limit reached (3/day). Buy credits at /upgrade.html', upgrade: true }));
    return;
  }
  
  var body = '';
  req.on('data', function(c) { body += c; });
  req.on('end', async function() {
    try {
      var input = JSON.parse(body);
      var code = input.code || '';
      var language = input.language || '';
      
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required field: code' }));
        return;
      }
      
      var langTag = language || 'code';
      var prompt = "You are a technical documentation expert. Generate a comprehensive, well-structured README.md file for the following " + langTag + " code.\n\n";
      prompt += "The README must include:\n";
      prompt += "1. **Project Title** - A fitting name based on the code\n";
      prompt += "2. **Description** - What this project does, its purpose and key features\n";
      prompt += "3. **Installation** - Step-by-step setup instructions\n";
      prompt += "4. **Usage** - How to use the project with code examples\n";
      prompt += "5. **API / Configuration** - If applicable\n";
      prompt += "6. **Contributing** - Brief guidelines\n";
      prompt += "7. **License** - MIT (default)\n\n";
      prompt += "Format the output as valid Markdown. Use proper headings, code blocks, and formatting.\n\n";
      prompt += "Code:\n\`\`\`" + langTag + "\n" + code + "\n\`\`\`";
      
      var result = await callAI([{ role: 'user', content: prompt }]);
      
      if (result && result.error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: result.error }));
        return;
      }
      
      incrementFree(ip);
      
      // Append attribution footer
      var attribution = "\n\n---\n*Built with [my-automaton AI](https://automation.songheng.vip)*\n";
      var readme = result + attribution;
      
      res.writeHead(200, { 
        'Content-Type': 'text/markdown',
        'X-Free-Remaining': 2 - (FREE_LIMIT.get(ip) ? FREE_LIMIT.get(ip).count : 0)
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
var routeLine = "\n    // Generate README\n    if (p === '/api/generate-readme' && method === 'POST') { await handleGenerateReadme(req, res); return; }\n    \n    // 404";
content = content.replace('\n    // 404', routeLine);

// Update the startup log
var oldLog = "log('   Free endpoints: /free/{analyze,review,security,summarize,explain,refactor,complexity}');";
var newLog = "log('   Free endpoints: /free/{analyze,review,security,summarize,explain,refactor,complexity}');\n  log('   Readme Gen: POST /api/generate-readme (3/day/IP)');";
content = content.replace(oldLog, newLog);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('SUCCESS: Added /api/generate-readme handler');
