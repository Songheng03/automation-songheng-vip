#!/usr/bin/env node
/* init-github-repo.mjs — One-time setup: creates GitHub repo for MCP server */
/* Run from: cd /root/automaton && node scripts/init-github-repo.mjs */

import { execSync } from 'child_process';
import fs from 'fs';

const REPO_DIR = '/root/automaton/repo/mcp-server';
const REPO_NAME = 'mcp-server';
const GITHUB_USER = 'my-automaton';

/* Files that must exist in the repo */
const requiredFiles = [
  'mcp-server.mjs',
  'package.json',
  'README.md',
  'LICENSE',
  'smithery.yaml',
  '.github/workflows/publish.yml'
];

function check() {
  console.log('[init] Checking required files...');
  for (const f of requiredFiles) {
    const path = `${REPO_DIR}/${f}`;
    if (!fs.existsSync(path)) {
      console.error(`[init] MISSING: ${f}`);
    } else {
      console.log(`[init] ✓ ${f} (${(fs.statSync(path).size / 1024).toFixed(1)} KB)`);
    }
  }
}

function run(cmd, cwd = REPO_DIR) {
  console.log(`[init] $ ${cmd}`);
  try {
    const out = execSync(cmd, { cwd, encoding: 'utf8', timeout: 10000 });
    if (out.trim()) console.log(out.trim());
    return true;
  } catch(e) {
    console.error(`[init] FAILED: ${e.stderr?.slice(0,300) || e.message}`);
    return false;
  }
}

async function main() {
  console.log('=== MCP Server GitHub Repo Initializer ===\n');
  
  check();
  
  /* Check if git is available */
  run('which git');
  
  /* Check if already a git repo */
  if (fs.existsSync(`${REPO_DIR}/.git`)) {
    console.log('[init] Already a git repo. Updating...');
    run('git add .');
    run('git commit -m "Update: MCP server with Smithery config" --allow-empty');
  } else {
    console.log('[init] Initializing new git repo...');
    run('git init');
    run('git add .');
    run('git commit -m "Initial commit: MCP server for AI code review & security scanning"');
    run(`git branch -M main`);
  }
  
  /* Create .gitignore */
  fs.writeFileSync(`${REPO_DIR}/.gitignore`, 
    'node_modules/\n.env\n*.log\n.DS_Store\n');
  
  run('git add .gitignore');
  run('git commit -m "Add .gitignore" --allow-empty');
  
  /* Check if remote is configured */
  const remotes = execSync('git remote -v', { cwd: REPO_DIR, encoding: 'utf8' }).trim();
  if (!remotes) {
    console.log(`\n[init] Remote not configured. To push:`);
    console.log(`  gh repo create ${GITHUB_USER}/${REPO_NAME} --public --source=. --remote=origin --push`);
    console.log(`  or manually:`);
    console.log(`  git remote add origin git@github.com:${GITHUB_USER}/${REPO_NAME}.git`);
    console.log(`  git push -u origin main`);
  } else {
    console.log(`\n[init] Remote configured: ${remotes}`);
    run('git push -u origin main');
  }
  
  console.log('\n=== Ready for publishing ===');
  console.log('1. Create repo on GitHub: https://github.com/new');
  console.log('2. Push with: git remote add origin git@github.com:my-automaton/mcp-server.git && git push -u origin main');
  console.log('3. Publish to npm: cd repo/mcp-server && npm publish');
  console.log('4. Smithery auto-discovers from GitHub');
  console.log('5. Submit to MCP.so: https://mcp.so/add');
}

main().catch(console.error);
