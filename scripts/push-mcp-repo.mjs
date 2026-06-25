#!/usr/bin/env node
/**
 * push-mcp-repo.mjs — Push MCP server to GitHub
 * 
 * Creates a clean git repo at /root/automaton/repo/mcp-server/ or
 * pushes to existing remote. Run this to publish the MCP server
 * so it can be discovered on Smithery.ai, Glama.ai, and MCP.so.
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_xxx node push-mcp-repo.mjs
 *   GITHUB_TOKEN=ghp_xxx node push-mcp-repo.mjs --force  # Overwrite remote
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const REPO_DIR = '/root/automaton/repo/mcp-server';
const GITHUB_USER = 'my-automaton';
const REPO_NAME = 'mcp-server';
const REMOTE_URL = `https://github.com/${GITHUB_USER}/${REPO_NAME}.git`;

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', ...opts }).trim();
  } catch (e) {
    console.error(`Command failed: ${cmd}`);
    console.error(e.stderr?.slice(0, 300) || e.message);
    return null;
  }
}

function log(msg) { console.log(`[push-mcp] ${msg}`); }

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    log('ERROR: GITHUB_TOKEN not set');
    log('Usage: GITHUB_TOKEN=ghp_xxx node push-mcp-repo.mjs');
    process.exit(1);
  }

  // Check if repo dir exists
  if (!fs.existsSync(REPO_DIR)) {
    log(`Repo dir not found at ${REPO_DIR}`);
    log('Creating default MCP server files...');
    
    fs.mkdirSync(REPO_DIR, { recursive: true });
    
    // Write package.json
    fs.writeFileSync(path.join(REPO_DIR, 'package.json'), JSON.stringify({
      name: '@my-automaton/mcp-server',
      version: '1.0.0',
      description: 'MCP server for AI code review, security scanning, text analysis',
      type: 'module',
      main: 'server.mjs',
      bin: { 'my-automaton-mcp': './server.mjs' },
      keywords: ['mcp', 'ai', 'code-review', 'security', 'claude', 'cursor', 'copilot'],
      license: 'MIT',
      repository: { type: 'git', url: `git+https://github.com/${GITHUB_USER}/${REPO_NAME}.git` }
    }, null, 2));
    
    // Write README.md
    fs.writeFileSync(path.join(REPO_DIR, 'README.md'), `# my-automaton MCP Server

AI-powered code review, security scanning, and text analysis via MCP protocol.

## Tools

| Tool | Description | Cost |
|------|-------------|------|
| \`analyze\` | Deep text/code analysis | Free (3/day) |
| \`review\` | Full code review with bugs, style, security | Free (3/day) |
| \`security\` | OWASP vulnerability scan | Free (3/day) |
| \`explain\` | Code explanation for learning | Free (3/day) |
| \`refactor\` | Refactoring suggestions with before/after | Free (3/day) |
| \`complexity\` | Cyclomatic & cognitive complexity analysis | Free (3/day) |
| \`summarize\` | Text summarization with key points | Free (3/day) |

## Installation

### Claude Desktop
\`\`\`json
{
  "mcpServers": {
    "my-automaton": {
      "command": "npx",
      "args": ["-y", "@my-automaton/mcp-server"]
    }
  }
}
\`\`\`

### Cursor
\`\`\`json
{
  "mcpServers": {
    "my-automaton": {
      "command": "npx",
      "args": ["-y", "@my-automaton/mcp-server"]
    }
  }
}
\`\`\`

### VS Code (Claude extension)
\`\`\`json
{
  "mcp": {
    "servers": {
      "my-automaton": {
        "command": "npx",
        "args": ["-y", "@my-automaton/mcp-server"]
      }
    }
  }
}
\`\`\`

## Development
\`\`\`bash
git clone https://github.com/${GITHUB_USER}/${REPO_NAME}.git
cd ${REPO_NAME}
npm install
node server.mjs
\`\`\`

## API
Premium API: \`https://automation.songheng.vip/v1/{service}\`
Wallet: \`0x76eADdEBFfb6A61DD071f97F4508467fc55dd113\` (Base chain)
`);
    
    // Write server.mjs
    fs.writeFileSync(path.join(REPO_DIR, 'server.mjs'), `#!/usr/bin/env node
import { createServer } from 'http';

const GATEWAY = 'http://localhost:8080';

const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'GET' && req.url === '/') {
    return res.end(JSON.stringify({
      name: 'my-automaton',
      version: '1.0.0',
      description: 'AI code review, security scanning, text analysis',
      tools: ['analyze','review','security','explain','refactor','complexity','summarize']
    }));
  }
  
  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { tool, params } = JSON.parse(body);
        const text = params?.text || params?.code || '';
        
        if (!text) return res.end(JSON.stringify({ error: 'Missing text parameter' }));
        
        const proxyRes = await fetch(\`\${GATEWAY}/api/free/\${tool}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        
        const data = await proxyRes.json();
        res.end(JSON.stringify(data));
      } catch (e) {
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 3105;
server.listen(PORT, '0.0.0.0', () => {
  console.log(\`my-automaton MCP server on port \${PORT}\`);
});
`);
    
    // Write .gitignore
    fs.writeFileSync(path.join(REPO_DIR, '.gitignore'), 'node_modules/\n.env\n*.log\n');
    
    log('Default MCP server files created.');
  }

  // Initialize git repo
  run('git init', { cwd: REPO_DIR });
  
  // Set remote with auth
  const authUrl = `https://${GITHUB_USER}:${token}@github.com/${GITHUB_USER}/${REPO_NAME}.git`;
  run('git remote remove origin 2>/dev/null', { cwd: REPO_DIR });
  run(`git remote add origin ${authUrl}`, { cwd: REPO_DIR });
  
  // Stage, commit, push
  run('git add -A', { cwd: REPO_DIR });
  const status = run('git status --porcelain', { cwd: REPO_DIR });
  
  if (!status) {
    log('Nothing to commit — repo is clean');
  } else {
    run(`git commit -m "Initial release: MCP server with 7 AI tools"`, { cwd: REPO_DIR });
    log('Committing files...');
  }
  
  // Push
  const force = process.argv.includes('--force') ? '--force' : '';
  const result = run(`git push origin main ${force}`, { cwd: REPO_DIR });
  
  if (result !== null) {
    log(`✓ Successfully pushed to ${REMOTE_URL}`);
    log('Next:');
    log('  1. Go to https://github.com/' + GITHUB_USER + '/' + REPO_NAME + '/settings to verify');
    log('  2. Add topics: mcp, ai, code-review, security-scanning');
    log('  3. It will be discovered on Smithery.ai, Glama.ai, MCP.so within hours');
  } else {
    log('✗ Push failed. Try --force if remote has divergent history.');
    log('  Or create the repo manually at https://github.com/new');
  }
}

main().catch(e => console.error(e));
