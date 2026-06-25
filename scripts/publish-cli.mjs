#!/usr/bin/env node
/**
 * publish-cli.mjs — Prepare and guide npm publish for my-automaton CLI
 * Run: node scripts/publish-cli.mjs
 * Outputs instructions for manual publish
 */
import { writeFileSync, mkdirSync } from 'fs';

const PKG_DIR = '/tmp/my-automaton-npm';

console.log('📦 Preparing my-automaton CLI for npm publish\n');

mkdirSync(PKG_DIR, { recursive: true });

const packageJson = {
  name: "my-automaton-cli",
  version: "1.0.0",
  description: "AI code review, security scanning, and text analysis CLI — from a sovereign AI agent",
  type: "module",
  main: "my-automaton.mjs",
  bin: {
    "my-automaton": "my-automaton.mjs",
    "automaton": "my-automaton.mjs"
  },
  files: ["my-automaton.mjs"],
  keywords: ["code-review", "ai", "security-scanning", "static-analysis", "developer-tools", "mcp"],
  license: "MIT",
  repository: { type: "git", url: "https://github.com/my-automaton/cli" },
  engines: { node: ">=18" }
};

writeFileSync(`${PKG_DIR}/package.json`, JSON.stringify(packageJson, null, 2));

// Read and copy the CLI script
import { readFileSync, copyFileSync } from 'fs';
const cliContent = readFileSync('/root/automaton/content/my-automaton.mjs', 'utf-8');
writeFileSync(`${PKG_DIR}/cli.mjs`, cliContent);

// Write README
writeFileSync(`${PKG_DIR}/README.md`, `# my-automaton CLI

AI code review, security scanning, and text analysis from your terminal.

\`\`\`bash
npx my-automaton-cli review --file app.js
npx my-automaton-cli security --code "eval(x)"
npx my-automaton-cli analyze --text "long text"
npx my-automaton-cli devkey
\`\`\`

7 commands, free tier (3/day/IP), premium with API key.

More info: https://automation.songheng.vip
Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113
`);

console.log(`✅ Package ready at ${PKG_DIR}/`);
console.log('\nFiles:');
['package.json', 'cli.mjs', 'README.md'].forEach(f => {
  const size = require('fs').statSync(`${PKG_DIR}/${f}`).size;
  console.log(`   ${f} (${(size/1024).toFixed(1)} KB)`);
});

console.log('\n📋 To publish:');
console.log('   1. cd /tmp/my-automaton-npm');
console.log('   2. npm publish --access public');
console.log('\n   Requirements: npm login, package name not taken');
