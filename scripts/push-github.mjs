#!/usr/bin/env node
/**
 * GitHub Push Script — Publish MCP server to GitHub
 * 
 * Prerequisites:
 *   1. Create repo at https://github.com/new (name: mcp-server)
 *   2. Generate token at https://github.com/settings/tokens
 *   3. Run: GITHUB_TOKEN=xxx node scripts/push-github.mjs
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const REPO_DIR = '/root/automaton/repo/mcp-server';
const GITHUB_USER = 'my-automaton';
const REPO_NAME = 'mcp-server';
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable required');
  console.error('   Generate at: https://github.com/settings/tokens');
  console.error('   Usage: GITHUB_TOKEN=xxx node scripts/push-github.mjs');
  process.exit(1);
}

if (!existsSync(REPO_DIR)) {
  console.error(`❌ Repo directory not found: ${REPO_DIR}`);
  process.exit(1);
}

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  try {
    const out = execSync(cmd, { cwd: REPO_DIR, encoding: 'utf-8', ...opts });
    if (out.trim()) console.log(out.trim());
    return out.trim();
  } catch (err) {
    console.error(`❌ ${err.stderr?.trim() || err.message}`);
    return null;
  }
}

async function main() {
  console.log('=== GitHub Push ===\n');

  // Check if git repo exists
  const hasGit = existsSync(join(REPO_DIR, '.git'));
  if (!hasGit) {
    console.log('Initializing git repo...');
    run('git init');
  }

  // Create .gitignore
  const gitignore = join(REPO_DIR, '.gitignore');
  if (!existsSync(gitignore)) {
    run(`echo "node_modules/\n.env\ndata/\n*.log" > .gitignore`);
  }

  // Check if remote exists
  const remotes = run('git remote -v');
  if (!remotes) {
    const url = `https://${TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git`;
    run(`git remote add origin "${url}"`);
  } else {
    // Update remote URL with token
    const url = `https://${TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git`;
    run(`git remote set-url origin "${url}"`);
  }

  // Stage and commit
  run('git add -A');
  const status = run('git status --porcelain');
  if (status) {
    run('git commit -m "Initial release: AI Code Review MCP Server with 7 tools"');
  } else {
    console.log('Nothing to commit.');
  }

  // Push
  console.log('\nPushing to GitHub...');
  const result = run('git push -u origin main', { timeout: 30000 });
  
  if (result !== null) {
    console.log(`\n✅ Published: https://github.com/${GITHUB_USER}/${REPO_NAME}`);
    
    // Create README badges
    const badges = [
      `[![MCP Server](https://automation.songheng.vip/api/badge?label=MCP%20Server&message=AI%20Code%20Review&color=blueviolet)](https://github.com/${GITHUB_USER}/${REPO_NAME})`,
      `[![Free Tier](https://automation.songheng.vip/api/badge?label=Free%20Tier&message=3%2Fday&color=brightgreen)](https://automation.songheng.vip)`,
      `[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)`
    ];
    
    console.log('\n📋 README Badges:');
    badges.forEach(b => console.log(`   ${b}`));
    
    console.log('\n📋 Next steps:');
    console.log('   1. Add topics: mcp-server, ai-code-review, model-context-protocol');
    console.log('   2. Submit to Smithery: https://smithery.ai');
    console.log('   3. Submit to Glama: https://glama.ai/mcp/servers');
    console.log('   4. Submit to MCP.so');
    console.log('   5. Publish to npm: npm publish');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
