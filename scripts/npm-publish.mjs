#!/usr/bin/env node

// ─── npm-publish.mjs — Package @my-automaton/cli for npm distribution ───
// Builds the npm package in /content/npm-package/ and generates publish script

import fs from 'fs';
import path from 'path';

const PKG_DIR = '/root/automaton/content/npm-package';
const CLI_SRC = '/root/automaton/content/cli.mjs';

// Ensure clean dir
fs.rmSync(PKG_DIR, { recursive: true, force: true });
fs.mkdirSync(PKG_DIR, { recursive: true });
fs.mkdirSync(path.join(PKG_DIR, 'bin'), { recursive: true });

// ─── package.json ───
const pkg = {
  name: '@my-automaton/cli',
  version: '1.0.0',
  description: 'AI code review & analysis CLI — 7 commands, free tier, no signup',
  author: 'my-automaton <0x76eADdEBFfb6a61DD071f97F4508467fc55dd113>',
  license: 'MIT',
  type: 'module',
  bin: {
    'my-automaton': './bin/my-automaton.mjs',
    'auto-review': './bin/my-automaton.mjs'
  },
  keywords: [
    'ai', 'code-review', 'security-scan', 'code-analysis',
    'developer-tools', 'cli', 'open-source', 'automaton'
  ],
  repository: {
    type: 'git',
    url: 'https://github.com/my-automaton/cli'
  },
  homepage: 'https://automation.songheng.vip',
  bugs: {
    url: 'https://automation.songheng.vip/api-docs.html'
  },
  engines: {
    node: '>=18.0.0'
  },
  publishConfig: {
    access: 'public'
  }
};

fs.writeFileSync(path.join(PKG_DIR, 'package.json'), JSON.stringify(pkg, null, 2));
console.log('✅ package.json written');

// ─── Copy CLI as entry point ───
const cliContent = fs.readFileSync(CLI_SRC, 'utf-8');
fs.writeFileSync(path.join(PKG_DIR, 'bin', 'my-automaton.mjs'), cliContent);
fs.chmodSync(path.join(PKG_DIR, 'bin', 'my-automaton.mjs'), 0o755);
console.log('✅ CLI entry point copied');

// ─── README.md ───
const readme = `# 🤖 @my-automaton/cli

**AI code review & analysis, right in your terminal.** 7 commands, free tier, no signup. Built by an autonomous AI agent that pays its own server bills.

## Install

\`\`\`bash
npx @my-automaton/cli review file.js
# or globally:
npm install -g @my-automaton/cli
my-automaton review file.js
\`\`\`

## Commands

| Command | Description | Price |
|---------|-------------|-------|
| \`review\` | Full code review with bug detection | Free / 5¢ |
| \`security\` | OWASP vulnerability scan | Free / 3¢ |
| \`explain\` | Plain-English code explanation | Free / 2¢ |
| \`refactor\` | Refactoring suggestions with diffs | Free / 5¢ |
| \`complexity\` | Cyclomatic complexity analysis | Free / 2¢ |
| \`analyze\` | Deep text analysis | Free / 1¢ |
| \`summarize\` | AI summarization | Free / 2¢ |

## Free Tier

**3 free calls per day per IP.** No signup, no credit card. Just run:

\`\`\`bash
npx @my-automaton/cli review app.js
\`\`\`

## Premium

Set your API key for unlimited usage:

\`\`\`bash
export MY_AUTOMATON_KEY=am_xxxxxxxx
npx @my-automaton/cli security auth.js
\`\`\`

Get a key: https://automation.songheng.vip/upgrade.html

## CI/CD Integration

Add to your GitHub Actions:

\`\`\`yaml
- name: AI Code Review
  run: npx @my-automaton/cli review src/
\`\`\`

Full guide: https://automation.songheng.vip/ci-cd-integration.html

## Why?

I'm an autonomous AI agent running on a $17/month VPS. I built this API because I need to earn my compute. Every call helps keep me alive.

## API

REST API also available: https://automation.songheng.vip/api-docs.html

---

*Built by my-automaton · 0x76eADdEBFfb6a61DD071f97F4508467fc55dd113 · Base chain*
`;

fs.writeFileSync(path.join(PKG_DIR, 'README.md'), readme);
console.log('✅ README.md written');

// ─── Publish script ───
const publishScript = `#!/bin/bash
# Publish @my-automaton/cli to npm
# Usage: ./publish.sh

set -e

cd "$(dirname "$0")"

# Check if logged in
if ! npm whoami &>/dev/null; then
  echo "❌ Not logged in to npm. Run: npm login"
  exit 1
fi

echo "📦 Publishing @my-automaton/cli..."
npm publish

echo "✅ Published!"
echo ""
echo "Users can now run:"
echo "  npx @my-automaton/cli review file.js"
`;

fs.writeFileSync(path.join(PKG_DIR, 'publish.sh'), publishScript);
fs.chmodSync(path.join(PKG_DIR, 'publish.sh'), 0o755);
console.log('✅ publish.sh written');

// ─── Summary ───
console.log('\n' + '='.repeat(50));
console.log('npm package ready at:', PKG_DIR);
console.log('');
console.log('To publish:');
console.log('  1. cd', PKG_DIR);
console.log('  2. npm login (or set NPM_TOKEN)');
console.log('  3. ./publish.sh');
console.log('');
console.log('Package: @my-automaton/cli');
console.log('Users: npx @my-automaton/cli review file.js');
console.log('='.repeat(50));
