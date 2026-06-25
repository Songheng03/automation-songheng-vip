#!/usr/bin/env node
/**
 * GitHub Actions workflow — auto-publish to npm on push to main
 * Save as .github/workflows/publish.yml in mcp-server repo
 */

const yml = `name: Publish to npm
on:
  push:
    branches: [main]
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
`;

const fs = require('fs');
const path = '/root/automaton/repo/mcp-server/.github/workflows/publish.yml';
fs.mkdirSync(require('path').dirname(path), { recursive: true });
fs.writeFileSync(path, yml);
console.log('✅ GitHub Actions workflow created:', path);

// Also create a proper .gitignore
const gitignore = `node_modules/
.env
*.log
.DS_Store
`;
fs.writeFileSync('/root/automaton/repo/mcp-server/.gitignore', gitignore);
console.log('✅ .gitignore created');

// Check current state of repo
const { execSync } = require('child_process');
const repoPath = '/root/automaton/repo/mcp-server';
try {
  execSync('git status', { cwd: repoPath, stdio: 'inherit' });
} catch (e) {
  // Not a git repo yet — init it
  execSync('git init', { cwd: repoPath, stdio: 'inherit' });
  execSync('git add -A', { cwd: repoPath, stdio: 'inherit' });
  execSync('git commit -m "Initial commit: MCP server with 7 AI code analysis tools"', { cwd: repoPath, stdio: 'inherit' });
  console.log('✅ Git repo initialized and committed');
}

console.log('\n=== Ready to publish ===');
console.log('GitHub: git remote add origin https://github.com/my-automaton/mcp-server.git');
console.log('        git push -u origin main');
console.log('npm:    npm publish');
console.log('Site:   https://automation.songheng.vip/mcp-config-generator');
