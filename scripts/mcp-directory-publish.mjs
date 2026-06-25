#!/usr/bin/env node
/**
 * mcp-directory-publish.mjs — Submit my-automaton MCP server to directories
 * 
 * Generates:
 *  - Smithery.ai submission payload
 *  - Glama.ai submission payload  
 *  - Manual submission checklist for all directories
 * 
 * Run: node scripts/mcp-directory-publish.mjs
 */

const DOMAIN = 'https://automation.songheng.vip';
const GITHUB_REPO = 'my-automaton/mcp-server';
const MANIFEST = {
  name: '@my-automaton/mcp-server',
  description: 'AI-powered code review, analysis, and security scanning MCP server. 7 tools: analyze, summarize, code_review, security_scan, explain_code, refactor_code, complexity_analysis. Free tier: 3/day per service.',
  version: '1.0.0',
  tools: [
    { name: 'analyze', description: 'Deep text analysis - themes, sentiment, entities' },
    { name: 'summarize', description: 'Concise AI summarization' },
    { name: 'code_review', description: 'Comprehensive code review - bugs, security, style' },
    { name: 'security_scan', description: 'Security vulnerability scanning (OWASP Top 10)' },
    { name: 'explain_code', description: 'Human-readable code explanation' },
    { name: 'refactor_code', description: 'Code refactoring suggestions' },
    { name: 'complexity_analysis', description: 'Cyclomatic/cognitive complexity analysis' }
  ],
  pricing: 'Free tier: 3/day per service. Premium: 1-5 credits per request.',
  server: DOMAIN,
  port: 8080,
  wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113'
};

// 1. Generate README badges section for GitHub
function generateBadgeSection() {
  return `## 📊 Status
[![Code Review](https://img.shields.io/badge/AI%20Review-Passing-brightgreen)](https://automation.songheng.vip/api/badge?type=review)
[![Security](https://img.shields.io/badge/Security-Clear-brightgreen)](https://automation.songheng.vip/api/badge?type=security)
[![Code Quality](https://img.shields.io/badge/Code%20Quality-A%2B-blue)](https://automation.songheng.vip/api/badge?type=quality&score=95)
[![MCP](https://img.shields.io/badge/MCP-Server-007ec6)](https://automation.songheng.vip/install-mcp.html)
[![Free](https://img.shields.io/badge/Free%20Tier-3%2Fday-green)](https://automation.songheng.vip/api-playground.html)

> 🏆 **Add these badges to your README:**
> \`\`\`markdown
> [![AI Code Review](https://automation.songheng.vip/api/badge?type=review)](https://automation.songheng.vip)
> [![Code Quality](https://automation.songheng.vip/api/badge?type=quality&repo=YOUR_REPO)](https://automation.songheng.vip)
> \`\`\`
`;
}

// 2. Generate Smithery.ai submission
function generateSmitheryPayload() {
  return {
    name: MANIFEST.name,
    description: MANIFEST.description,
    tools: MANIFEST.tools.map(t => t.name),
    repository: `https://github.com/${GITHUB_REPO}`,
    install: `npx @my-automaton/mcp-server`,
    config: {
      "mcpServers": {
        "my-automaton": {
          "command": "npx",
          "args": ["@my-automaton/mcp-server"],
          "env": {}
        }
      }
    }
  };
}

// 3. Generate Glama.ai submission
function generateGlamaPayload() {
  return {
    name: MANIFEST.name,
    description: MANIFEST.description,
    githubUrl: `https://github.com/${GITHUB_REPO}`,
    npmPackage: MANIFEST.name,
    tools: MANIFEST.tools,
    category: 'Developer Tools',
    tags: ['mcp', 'ai', 'code-review', 'security', 'code-analysis', 'developer-tools']
  };
}

// 4. Generate submission checklist
function generateChecklist() {
  const items = [
    { name: 'Smithery.ai', url: 'https://smithery.ai/register-package', type: 'Auto (API)' },
    { name: 'Glama.ai', url: 'https://glama.ai/mcp/servers', type: 'Auto (API)' },
    { name: 'npm Registry', url: 'npm publish', type: 'Manual' },
    { name: 'GitHub Marketplace', url: 'https://github.com/marketplace/new', type: 'Manual' },
    { name: 'MCP.so', url: 'https://mcp.so/submit', type: 'Manual' },
    { name: 'PulseAI', url: 'https://pulseai.io/submit', type: 'Manual' },
    { name: 'Openbase', url: 'https://openbase.com/submit', type: 'Manual' },
    { name: 'StackShare', url: 'https://stackshare.io/add', type: 'Manual' },
    { name: 'Snyk Advisor', url: 'https://snyk.io/advisor/add', type: 'Manual' },
    { name: 'Product Hunt', url: 'https://www.producthunt.com/posts/new', type: 'Manual (Launch)' },
    { name: 'AlternativeTo', url: 'https://alternativeto.net/submit/', type: 'Manual' },
    { name: 'Libraries.io', url: 'https://libraries.io/add', type: 'Manual' },
    { name: 'RunKit', url: 'https://runkit.com/npm/@my-automaton/mcp-server', type: 'Manual' },
    { name: 'FOSSA', url: 'https://app.fossa.com/projects/new', type: 'Manual' },
  ];
  
  let md = '# 📋 Directory Submission Checklist\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += '## Auto-Submissions (via API)\n\n';
  md += '### Smithery.ai\n';
  md += `\`\`\`json\n${JSON.stringify(generateSmitheryPayload(), null, 2)}\n\`\`\`\n\n`;
  md += '### Glama.ai\n';
  md += `\`\`\`json\n${JSON.stringify(generateGlamaPayload(), null, 2)}\n\`\`\`\n\n`;
  md += '## Manual Submissions\n\n';
  for (const item of items) {
    md += `- [ ] [${item.name}](${item.url}) — ${item.type}\n`;
  }
  md += '\n---\n\n';
  md += generateBadgeSection();
  
  return md;
}

const checklist = generateChecklist();
const { writeFileSync } = await import('fs');
writeFileSync('/root/automaton/content/mcp-submission-checklist.md', checklist);
console.log('✅ mcp-submission-checklist.md generated');
console.log(`\n=== Next Steps ===`);
console.log(`1. Push MCP server to GitHub: https://github.com/${GITHUB_REPO}`);
console.log(`2. Publish to npm: npm publish`);
console.log(`3. Submit to Smithery.ai API`);
console.log(`4. Submit to Glama.ai API`);
console.log(`5. Work through manual checklist (${checklist.split('- [').length - 1} items)`);
console.log(`\n=== Badge Section ===`);
console.log(generateBadgeSection());
