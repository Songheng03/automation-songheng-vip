#!/usr/bin/env node
/**
 * Patch gateway.cjs to add POST /api/generate-readme route
 */
const fs = require('fs');
const path = require('path');

const filePath = '/root/automaton/gateway.cjs';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add the handleGenerateReadme function before "// ── HTTP Server ──"
const handlerCode = `
// ── Generate README (3/day/IP) ────────────────────────────

/**
 * POST /api/generate-readme
 * Parses { code, language } from body, calls DeepSeek to generate a README,
 * appends attribution footer, returns markdown as plain text.
 * Rate limited: 3 calls/day per IP (reuses FREE_LIMIT from free endpoints).
 */
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

      const prompt = \`You are a technical documentation expert. Generate a comprehensive, well-structured README.md file for the following \${language || 'source'} code.

The README should include:
1. **Project Title** — A descriptive name based on the code
2. **Description** — What this project does, 2-3 sentences
3. **Features** — Key features as a bullet list
4. **Installation** — How to install and set up
5. **Usage** — How to use it with code examples
6. **API Reference** — If applicable, document the API
7. **Configuration** — Any configuration options
8. **Dependencies** — List of dependencies
9. **License** — MIT License section

Format the output in clean Markdown. Be thorough but concise.

Here is the code:

\`\`\`\${language || ''}
\${code}
\`\`\`

Generate the README.md content now. Do NOT include any introductory or concluding text outside the markdown.`;

      const result = await callAI([{ role: 'user', content: prompt }]);

      if (result.error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: result.error }));
        return;
      }

      incrementFree(ip);

      // Append the attribution footer
      const footer = '\n\n---\n*Built with [my-automaton AI](https://automation.songheng.vip)*\n';
      const readme = result + footer;

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

// Insert the handler before "// ── HTTP Server ──"
content = content.replace('// ── HTTP Server ──', handlerCode + '\n// ── HTTP Server ──');

// 2. Add the route check before the "// Free endpoints" route check
content = content.replace(
  "// Free endpoints\n    if (p.startsWith('/free/') && method === 'POST') { await handleFree(req, res); return; }",
  "// Generate README\n    if (p === '/api/generate-readme' && method === 'POST') { await handleGenerateReadme(req, res); return; }\n    \n    // Free endpoints\n    if (p.startsWith('/free/') && method === 'POST') { await handleFree(req, res); return; }"
);

// 3. Update the startup log to mention the new endpoint
content = content.replace(
  "log(`   Free endpoints: /free/{analyze,review,security,summarize,explain,refactor,complexity}`);",
  "log(`   Free endpoints: /free/{analyze,review,security,summarize,explain,refactor,complexity}`);\n  log(`   Generate README: POST /api/generate-readme (3/day)`);"
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ gateway.cjs patched successfully with /api/generate-readme route');
