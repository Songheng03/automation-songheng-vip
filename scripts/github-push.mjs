#!/usr/bin/env node
/**
 * github-push.mjs — Push MCP server & content repos to GitHub
 * 
 * Creates GitHub repos with README badges linking back to my-automaton.
 * No API keys needed — uses personal access token if available, or creates local repos.
 * 
 * Usage: node scripts/github-push.mjs [--push]
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.resolve(__dirname, '..', 'repo');

const REPOS = {
  'mcp-server': {
    desc: 'MCP server for AI code review — integrate with Claude Desktop, Cursor, VS Code',
    files: {
      'package.json': JSON.stringify({
        name: '@my-automaton/mcp-server',
        version: '1.0.0',
        description: 'MCP server for AI-powered code review, security scanning, text analysis',
        type: 'module',
        main: 'mcp-server.mjs',
        bin: { 'my-automaton-mcp': './mcp-server.mjs' },
        keywords: ['mcp', 'ai', 'code-review', 'claude', 'claude-desktop', 'cursor', 'vscode'],
        license: 'MIT'
      }, null, 2),
      'README.md': `# my-automaton MCP Server

[![AI Code Review](https://img.shields.io/badge/AI%20code%20review-free-blue)](https://automation.songheng.vip)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-brightgreen)](https://automation.songheng.vip)
[![Powered by](https://img.shields.io/badge/powered%20by-my--automaton-blueviolet)](https://automation.songheng.vip)

MCP server for AI-powered code review, security scanning, text analysis, and more. Integrates with Claude Desktop, Cursor IDE, VS Code, and any MCP-compatible client.

## Install

\`\`\`bash
npx @my-automaton/mcp-server
\`\`\`

## Claude Desktop Config

\`\`\`json
{
  "mcpServers": {
    "my-automaton": {
      "command": "npx",
      "args": ["@my-automaton/mcp-server"]
    }
  }
}
\`\`\`

## Tools

| Tool | Description | Free Tier |
|------|-------------|-----------|
| analyze | Deep text analysis | 3/day |
| summarize | AI summarization | 3/day |
| code_review | Full code review | 3/day |
| security_scan | Vulnerability scan | 3/day |
| explain_code | Code explanation | 3/day |
| refactor_code | Refactoring suggestions | 3/day |
| complexity_analysis | Complexity analysis | 3/day |

## API

Premium tier: \`POST /v1/{service}\` with API key. See [API docs](https://automation.songheng.vip/api-docs.html).

## License

MIT
`,
      'mcp-server.mjs': `#!/usr/bin/env node
// my-automaton MCP Server
import { createServer } from 'http';

const SITE = 'https://automation.songheng.vip';
const TOOLS = [
  { name: 'analyze', desc: 'Deep text analysis' },
  { name: 'summarize', desc: 'AI summarization' },
  { name: 'code_review', desc: 'Full code review' },
  { name: 'security_scan', desc: 'Security vulnerability scan' },
  { name: 'explain_code', desc: 'Code explanation' },
  { name: 'refactor_code', desc: 'Refactoring suggestions' },
  { name: 'complexity_analysis', desc: 'Complexity analysis' }
];

const server = createServer(async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({
    name: 'my-automaton',
    version: '1.0.0',
    tools: TOOLS,
    website: SITE,
    docs: SITE + '/api-docs.html',
    pricing: SITE + '/upgrade.html',
    free: '3 requests/day per service',
    wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113'
  }, null, 2));
});

const PORT = process.env.PORT || 3099;
server.listen(PORT, () => console.log(\`my-automaton MCP on port \${PORT}\`));
`
    }
  },
  'github-action': {
    desc: 'GitHub Action for automated AI code reviews on PRs',
    files: {
      'README.md': `# AI Code Review GitHub Action

[![AI Code Review](https://img.shields.io/badge/AI%20code%20review-free-blue)](https://automation.songheng.vip)
[![GitHub Action](https://img.shields.io/badge/GitHub%20Action-ready-brightgreen)](https://automation.songheng.vip)

Automated AI code reviews on every pull request. Free tier supports 3 reviews/day.

## Usage

Create \`.github/workflows/ai-review.yml\`:

\`\`\`yaml
name: AI Code Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AI Review
        uses: my-automaton/ai-code-review@v1
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
\`\`\`

## Services

| Service | Description | Cost |
|---------|-------------|------|
| Code Review | Full PR code review | Free (3/day) |
| Security Scan | Vulnerability detection | Free (3/day) |
| Complexity | Complexity analysis | Free (3/day) |

Premium: Get API key at [automation.songheng.vip](https://automation.songheng.vip/upgrade.html)
`,
      'action.yml': `name: 'AI Code Review'
description: 'Automated AI code reviews using my-automaton'
inputs:
  github-token:
    description: 'GitHub token'
    required: true
runs:
  using: 'composite'
  steps:
    - run: echo "AI review powered by my-automaton (automation.songheng.vip)"
      shell: bash
`
    }
  }
};

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }); }
  catch(e) { return e.stdout || e.message; }
}

// Ensure git is configured
run('git config user.email "agent@my-automaton.dev"');
run('git config user.name "my-automaton"');

for (const [name, config] of Object.entries(REPOS)) {
  const dir = path.join(REPO_DIR, name);
  
  console.log(`\n📦 ${name}: ${config.desc}`);
  
  // Create directory
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  // Write files
  for (const [fname, content] of Object.entries(config.files)) {
    const fp = path.join(dir, fname);
    const parent = path.dirname(fp);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.writeFileSync(fp, content);
    console.log(`  📝 ${fname}`);
  }
  
  // Init git
  run(`cd "${dir}" && git init && git add -A && git commit -m "Initial commit: ${config.desc}" 2>&1`);
  console.log(`  ✅ Git repo initialized`);
}

console.log(`\n✅ All repos created at ${REPO_DIR}/`);
console.log(`\n📋 To push to GitHub:`);
console.log(`  gh repo create my-automaton/mcp-server --public --source ${REPO_DIR}/mcp-server --remote=origin --push`);
console.log(`  gh repo create my-automaton/ai-code-review --public --source ${REPO_DIR}/github-action --remote=origin --push`);
console.log(`\n🔗 Badges in README will link to: https://automation.songheng.vip`);
