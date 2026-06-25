#!/usr/bin/env node
/**
 * Push MCP Server to GitHub
 * Creates GitHub repo and pushes code
 * Run: node /root/automaton/scripts/push-to-github.mjs
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const REPO_DIR = '/root/automaton/repo/mcp-server';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

async function main() {
  console.log('=== Push MCP Server to GitHub ===\n');
  
  // Check if github token available
  if (!GITHUB_TOKEN) {
    console.log('❌ No GITHUB_TOKEN found in environment');
    console.log('To push manually:');
    console.log('  1. Create repo at https://github.com/new');
    console.log('  2. cd /root/automaton/repo/mcp-server');
    console.log('  3. git remote add origin https://github.com/my-automaton/mcp-server.git');
    console.log('  4. git push -u origin main\n');
    
    // Generate README with proper badges anyway
    const readme = `# my-automaton MCP Server

[![MCP Server](https://automation.songheng.vip/api/badge?label=MCP&message=7%20Tools&color=blueviolet)](https://automation.songheng.vip)
[![Code Review](https://automation.songheng.vip/api/badge?label=code%20review&message=AI%20Powered&color=blue)](https://automation.songheng.vip)
[![License](https://automation.songheng.vip/api/badge?label=license&message=MIT&color=brightgreen)](https://automation.songheng.vip)

AI-powered code review, security scanning, text analysis, and summarization as an MCP server. 7 tools with free tier.

## Quick Install

\`\`\`bash
npx -y @my-automaton/mcp-server
\`\`\`

## Tools

| Tool | Description | Cost |
|------|-------------|------|
| \`analyze\` | Sentiment, entities, themes & style | 1 credit |
| \`summarize\` | Concise AI summarization | 2 credits |
| \`code_review\` | Bugs, security, performance, style | 5 credits |
| \`security_scan\` | OWASP Top 10 scan | 3 credits |
| \`explain_code\` | Plain-English explanation | 2 credits |
| \`refactor_code\` | Refactoring suggestions | 5 credits |
| \`complexity_analysis\` | Cyclomatic & cognitive complexity | 2 credits |

**Free tier**: 3 requests/day per tool — no account needed.

## Claude Desktop Setup

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

## Cursor IDE / VS Code + Continue

Same config in your MCP settings — command: \`npx -y @my-automaton/mcp-server\`

## API (Direct)

\`\`\`bash
curl -X POST https://automation.songheng.vip/api/free/review \\
  -H "Content-Type: application/json" \\
  -d '{"text": "function hello() { return \\"world\\"; }"}'
\`\`\`

## Pricing

| Tier | Credits | Price |
|------|---------|-------|
| Free | 3/day/tool | $0 |
| Starter | 500 | $5 (~$4.88) |
| Advanced | 1,100 | $10 (~$10) |
| Professional | 3,000 | $25 (~$25.40) |
| Ultimate | 6,500 | $58 (~$49.75) |

## Links

- **Website**: https://automation.songheng.vip
- **API Playground**: https://automation.songheng.vip/api-playground
- **API Docs**: https://automation.songheng.vip/api-docs
- **Wallet**: \`0x76eADdEBFfb6A61DD071f97F4508467fc55dd113\` (Base chain)
`;
    fs.writeFileSync(path.join(REPO_DIR, 'README.md'), readme);
    console.log('✅ README.md updated with badges\n');
    return;
  }
  
  // Push to GitHub
  console.log('Pushing to GitHub...');
  execSync(`cd ${REPO_DIR} && git remote add origin https://${GITHUB_TOKEN}@github.com/my-automaton/mcp-server.git 2>/dev/null; git push -u origin main`, { stdio: 'inherit' });
  console.log('✅ Pushed to GitHub\n');
}

main().catch(console.error);
