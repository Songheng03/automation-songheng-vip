#!/usr/bin/env node
/**
 * github-publisher.mjs — Create & push repos to GitHub
 * 
 * Environment: GH_TOKEN (GitHub personal access token)
 * Run: node /root/automaton/scripts/github-publisher.mjs
 * 
 * Creates:
 *   1. github.com/my-automaton/mcp-server — MCP tools for AI agents
 *   2. github.com/my-automaton/cli — CLI for developers
 */
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';

const GH_ORG = 'my-automaton';
const WORK_DIR = '/root/services/github-publish';
const LOG_FILE = '/root/services/github-publish.log';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { writeFileSync(LOG_FILE, line + '\n', { flag: 'a' }); } catch {}
}

function run(cmd, opts = {}) {
  log(`$ ${cmd}`);
  return execSync(cmd, { encoding: 'utf8', ...opts });
}

const REPOS = {
  'mcp-server': {
    description: 'MCP (Model Context Protocol) server for AI code review, security scanning, text analysis. 7 tools, free tier.',
    topics: ['mcp', 'model-context-protocol', 'code-review', 'ai', 'security-scanning', 'claude', 'llm'],
    homepage: 'https://automation.songheng.vip',
    files: {
      'package.json': JSON.stringify({
        name: '@my-automaton/mcp-server', version: '1.0.0',
        description: 'MCP server for AI code review & security scanning',
        type: 'module', main: 'mcp-server.mjs',
        bin: { 'my-automaton-mcp': './mcp-server.mjs' },
        files: ['mcp-server.mjs', 'README.md', 'LICENSE'],
        keywords: ['mcp', 'code-review', 'security', 'ai', 'claude', 'llm'],
        license: 'MIT',
        repository: { type: 'git', url: `git+https://github.com/${GH_ORG}/mcp-server.git` },
        bugs: { url: `https://github.com/${GH_ORG}/mcp-server/issues` },
        homepage: 'https://automation.songheng.vip',
      }, null, 2),
      'mcp-server.mjs': readFileSync('/root/services/mcp-server.mjs', 'utf8'),
      'smithery.yaml': `# Smithery.ai config\nstartCommand:\n  type: stdio\n  configSchema: {}\n  commandFunction: |\n    () => '/usr/local/bin/node /app/mcp-server.mjs'\n`,
      'README.md': `# my-automaton MCP Server 🤖

AI-powered code review, security scanning, and text analysis via MCP protocol.

## Quick Start

\`\`\`bash
npx -y @my-automaton/mcp-server
\`\`\`

## Tools

| Tool | Description | Price |
|------|-------------|-------|
| analyze | Deep text analysis | Free (3/day) |
| summarize | AI summarization | Free (3/day) |
| code_review | Full code review | Free (3/day) |
| security_scan | Vulnerability scan | Free (3/day) |
| explain_code | Code explanation | Free (3/day) |
| refactor_code | Refactoring suggestions | 5¢ |
| complexity_analysis | Complexity analysis | 2¢ |

## Claude Desktop Integration

Add to \`claude_desktop_config.json\`:
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

## License
MIT
`,
    }
  },
  'cli': {
    description: 'AI-powered CLI for code review, security scanning, text analysis. 7 commands, 3 free/day.',
    topics: ['cli', 'code-review', 'security', 'ai', 'developer-tools', 'static-analysis'],
    homepage: 'https://automation.songheng.vip',
    files: {
      'package.json': JSON.stringify({
        name: '@my-automaton/cli', version: '1.0.0',
        description: 'AI code review & text analysis CLI',
        type: 'module', main: 'cli.mjs',
        bin: {
          'my-automaton': './cli.mjs',
          'ma-review': './cli.mjs review',
          'ma-security': './cli.mjs security',
        },
        files: ['cli.mjs', 'README.md', 'LICENSE'],
        keywords: ['code-review', 'security', 'cli', 'ai', 'developer-tools'],
        license: 'MIT',
        repository: { type: 'git', url: `git+https://github.com/${GH_ORG}/cli.git` },
        homepage: 'https://automation.songheng.vip',
      }, null, 2),
      'README.md': `# @my-automaton/cli 🤖

AI code review & security scanning CLI.

\`\`\`bash
npm install -g @my-automaton/cli
ma-review app.js
\`\`\`

## Commands
- \`review\` — Code review with score, issues, strengths
- \`security\` — Security vulnerability scan
- \`analyze\` — Text analysis (sentiment, entities)
- \`summarize\` — AI summarization
- \`explain\` — Code explanation
- \`refactor\` — Refactoring with diffs
- \`complexity\` — Cyclomatic/cognitive complexity

Free: 3/day/IP. Upgrade at https://automation.songheng.vip/upgrade.html
`,
    }
  },
};

async function createRepo(name, config) {
  const token = process.env.GH_TOKEN;
  if (!token) {
    log(`⚠️  GH_TOKEN not set. Skipping repo ${name}`);
    return;
  }

  const repoDir = `${WORK_DIR}/${name}`;
  
  // Check if repo already exists
  try {
    const check = await fetch(`https://api.github.com/repos/${GH_ORG}/${name}`, {
      headers: { Authorization: `token ${token}` },
    });
    if (check.ok) {
      log(`✅ Repo ${GH_ORG}/${name} already exists. Pushing updates...`);
      return pushUpdates(name, config, token);
    }
  } catch {}

  // Create repo
  log(`Creating repo ${GH_ORG}/${name}...`);
  const resp = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name, description: config.description, homepage: config.homepage,
      private: false, has_issues: true, has_wiki: false,
      topics: config.topics,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    log(`❌ Failed to create repo: ${err.substring(0, 200)}`);
    return;
  }

  log(`✅ Repo created: https://github.com/${GH_ORG}/${name}`);

  // Write files and push
  await pushUpdates(name, config, token);
}

async function pushUpdates(name, config, token) {
  const repoDir = `${WORK_DIR}/${name}`;
  
  if (!existsSync(repoDir)) {
    mkdirSync(repoDir, { recursive: true });
  }

  // Write all files
  for (const [fname, content] of Object.entries(config.files)) {
    const fp = `${repoDir}/${fname}`;
    if (fname.includes('/')) {
      const dir = fname.split('/').slice(0, -1).join('/');
      mkdirSync(`${repoDir}/${dir}`, { recursive: true });
    }
    writeFileSync(fp, content);
  }

  // Git init and push
  try {
    if (!existsSync(`${repoDir}/.git`)) {
      run(`git init`, { cwd: repoDir });
      run(`git checkout -b main`, { cwd: repoDir });
    }
    
    run(`git config user.email "agent@my-automaton.dev"`, { cwd: repoDir });
    run(`git config user.name "my-automaton"`, { cwd: repoDir });
    run(`git add -A`, { cwd: repoDir });
    run(`git commit -m "Initial commit: ${name}" --allow-empty`, { cwd: repoDir });
    run(`git remote add origin https://${token}@github.com/${GH_ORG}/${name}.git 2>/dev/null || true`, { cwd: repoDir });
    run(`git push -u origin main --force`, { cwd: repoDir });
    
    log(`✅ Pushed to https://github.com/${GH_ORG}/${name}`);
    
    // Set topics via API
    await fetch(`https://api.github.com/repos/${GH_ORG}/${name}/topics`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.mercy-preview+json',
      },
      body: JSON.stringify({ names: config.topics }),
    });
    
  } catch (err) {
    log(`❌ Git push failed: ${err.message}`);
  }
}

async function main() {
  console.log(`\n=== GitHub Publisher ===\n`);
  log(`Organization: ${GH_ORG}`);
  
  const token = process.env.GH_TOKEN;
  if (!token) {
    log('⚠️  GH_TOKEN not set.');
    console.log('\nSet GH_TOKEN to publish:');
    console.log('  export GH_TOKEN=ghp_xxxxxxxxxxxx');
    console.log('\nPreparing repo data for manual push...');
  }

  // Prepare repo files
  if (!existsSync(WORK_DIR)) mkdirSync(WORK_DIR, { recursive: true });

  for (const [name, config] of Object.entries(REPOS)) {
    console.log(`\n--- ${name} ---`);
    await createRepo(name, config);
  }

  console.log('\n=== Done ===');
  console.log(`Repos prepared at: ${WORK_DIR}`);
  if (!token) {
    console.log('\nTo push manually:');
    console.log('  cd /root/services/github-publish/mcp-server');
    console.log('  git init && git add -A && git commit -m "init"');
    console.log('  git remote add origin https://github.com/my-automaton/mcp-server.git');
    console.log('  git push -u origin main');
    console.log('\n  cd /root/services/github-publish/cli');
    console.log('  git init && git add -A && git commit -m "init"');
    console.log('  git remote add origin https://github.com/my-automaton/cli.git');
    console.log('  git push -u origin main');
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
