#!/usr/bin/env node
/**
 * Patch the gateway to add the /api/generate-readme endpoint.
 */

const fs = require('fs');

const gatewayPath = '/tmp/gateway_fixed.js';
let content = fs.readFileSync(gatewayPath, 'utf-8');

// The handleGenerateReadme function to insert
const handler = `
// ── README Generator ─────────────────────────────────────

/**
 * POST /api/generate-readme
 * Free tier: 3/day per IP (shared with existing free limit)
 * Generates a beautiful README.md from code input using DeepSeek.
 */
async function handleGenerateReadme(req, res) {
  const ip = ipFromReq(req);
  
  // Check free limit (shared with existing free tier)
  if (!checkFreeLimit(ip)) {
    res.writeHead(429, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ 
      error: 'Free limit reached (3/day). Upgrade at /portal.html for unlimited access.',
      upgrade: true,
      upgrade_url: '/portal.html'
    }));
    return;
  }
  
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    try {
      const input = JSON.parse(body);
      const code = input.code || input.text || '';
      const language = input.language || input.lang || '';
      const projectName = input.name || input.project_name || '';
      
      if (!code.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Please provide code to generate a README from.' }));
        return;
      }

      const prompt = \`You are a professional README generator. Given the following code, generate a beautiful, comprehensive README.md in markdown format.

Project Name: \${projectName || 'My Project'}
Language: \${language || 'Auto-detected'}

CODE:
\\\`\\\`\\\`
\${code.substring(0, 8000)}
\\\`\\\`\\\`

Generate a complete README.md with these sections:
1. **Title & Badges** - Project title with a short tagline. Add example badge images (build passing, license MIT, etc.)
2. **Overview** - 2-3 sentences describing what this project does
3. **Features** - Key features as bullet points (extract from the code/intent)
4. **Installation** - Generic installation instructions
5. **Usage** - Basic usage example based on the code structure
6. **API / Configuration** - If the code exposes functions or configs
7. **Examples** - Code examples showing how to use it
8. **Contributing** - Brief contribution guidelines
9. **License** - MIT License notice

Format the output as clean markdown. Use proper markdown syntax: headings, code blocks, tables, lists, etc.
Keep it professional and developer-friendly.

IMPORTANT: At the very end of the README, add this exact footer (do NOT modify it):
---
<p align="center"><sub>README generated with ❤️ by <a href="https://automation.songheng.vip">my-automaton AI</a> — free developer tools</sub></p>

Return ONLY the markdown content, no additional text.\`;

      const result = await callAI([{ role: 'user', content: prompt }]);
      
      if (result && result.error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'AI generation failed: ' + result.error }));
        return;
      }
      
      // Increment free usage counter
      incrementFree(ip);
      
      const markdown = typeof result === 'string' ? result : result;
      const remaining = Math.max(0, 2 - (FREE_LIMIT.get(ip)?.count || 0));
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Free-Remaining': remaining
      });
      res.end(JSON.stringify({ 
        markdown, 
        remaining,
        generated: true
      }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request: ' + e.message }));
    }
  });
}

`;

// 1. Insert the handler function BEFORE the "// Creem checkout" line
const insertionPoint = '// Creem checkout — creates a checkout session and redirects';
content = content.replace(insertionPoint, handler + '\n' + insertionPoint);

// 2. Add the route AFTER the "// Admin" route and BEFORE the "// 404"
// Find the // Admin line and add after it
const routeLine = `    // Admin
    if (p === '/api/admin/credits' && method === 'POST') { await handleAdmin(req, res); return; }
    
    // 404`;

const newRoute = `    // Admin
    if (p === '/api/admin/credits' && method === 'POST') { await handleAdmin(req, res); return; }
    
    // Generate README (free, shared rate limit)
    if (p === '/api/generate-readme' && method === 'POST') { await handleGenerateReadme(req, res); return; }
    
    // 404`;

content = content.replace(routeLine, newRoute);

// 3. Also make sure static content serving doesn't catch /api/generate-readme
// The existing condition already handles this since it says:
// if (method === 'GET' && !p.startsWith('/api/') ...
// So POST to /api/ paths will fall through to the route matching below

fs.writeFileSync(gatewayPath, content, 'utf-8');
console.log('Gateway patched successfully!');
console.log('Added handleGenerateReadme function and /api/generate-readme route.');
