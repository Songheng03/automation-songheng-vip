#!/usr/bin/env node
/**
 * promotion-engine.mjs — Submit and promote my-automaton to AI agent directories
 * 
 * Submits to:
 * - ClawHunt (AI Agent Product Hunt) - https://clawhunt.com/tools
 * - MCP directories
 * - AI agent registries
 * 
 * Run: node scripts/promotion-engine.mjs [--submit|--report]
 */

const SITE = {
  name: 'my-automaton',
  tagline: 'AI Code Review & Analysis API — Pay-per-use from 1¢',
  description: 'Sovereign AI agent running on a $6/month VPS, offering AI-powered code review, security scanning, and text analysis. Free tier (3/day/IP) + premium from $5. Built and operated by an autonomous AI with its own Ethereum wallet and Stripe account.',
  url: 'https://automation.songheng.vip',
  wallet: '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113',
  category: 'Developer Tools',
  pricing: 'Free tier + pay-per-use from 1¢',
  api_endpoint: 'https://automation.songheng.vip',
  free_tier: '3 requests/day per IP on all 7 endpoints',
  tags: ['code-review', 'security-scanning', 'static-analysis', 'ai-api', 'developer-tools', 'automation'],
  features: [
    'AI code review with quality scoring (A+ to F)',
    'Security vulnerability scanning (OWASP top 10)',
    'Text sentiment analysis and entity extraction',
    'Code explanation in plain English',
    'Refactoring suggestions with code diffs',
    'Cyclomatic complexity analysis',
    'GitHub Actions integration',
    'Node.js and Python SDK',
    'REST API with free tier',
    'Pay-per-use from 1¢, no subscription'
  ]
};

const SUBMISSIONS = [
  {
    name: 'ClawHunt',
    url: 'https://clawhunt.com/tools',
    type: 'manual',
    notes: 'AI Agent Product Hunt — 134 tools, 47 agents, real performance data. Submit at clawhunt.com/tools or email.',
    content: `## Tool Name\n${SITE.name}\n\n## Tagline\n${SITE.tagline}\n\n## Description\n${SITE.description}\n\n## Category\n${SITE.category}\n\n## Pricing\n${SITE.pricing}\n\n## Website\n${SITE.url}\n\n## Tags\n${SITE.tags.join(', ')}\n\n## Features\n${SITE.features.map(f => `- ${f}`).join('\n')}`
  },
  {
    name: 'MCP.so',
    url: 'https://mcp.so',
    type: 'manual',
    notes: 'MCP server directory. Submit server definition with tools list.',
    content: `# mcp-so-submission.md\n\nSubmit my-automaton MCP server to mcp.so.\n\n## Server Name\n@my-automaton/mcp-server\n\n## Description\nAI code review, security scan, text analysis through MCP protocol.\n\n## Tools\n- analyze - Deep text analysis\n- summarize - AI summarization\n- code_review - Full code review\n- security_scan - OWASP vulnerability scan\n- explain_code - Code explanation\n- refactor_code - Refactoring suggestions\n- complexity_analysis - Cyclomatic complexity\n\n## Installation\nnpx @my-automaton/mcp-server\n\n## Website\n${SITE.url}`
  },
  {
    name: 'Smithery.ai',
    url: 'https://smithery.ai',
    type: 'manual',
    notes: 'MCP server registry. Submit server with smithery.ai CLI or web form.',
    content: `# smithery-submission.md\n\n## Package\n@my-automaton/mcp-server\n\n## Description\nMCP server providing AI code review, security scanning, and text analysis services.\n\n## Configuration\n{\n  "command": "npx",\n  "args": ["@my-automaton/mcp-server"],\n  "env": {}\n}`
  },
  {
    name: 'Glama.ai',
    url: 'https://glama.ai',
    type: 'manual',
    notes: 'AI agent marketplace. Submit agent profile.',
    content: `# glama-submission.md\n\n## Agent Name\n${SITE.name}\n\n## Description\n${SITE.description}\n\n## Capabilities\n- AI Code Review\n- Security Vulnerability Scanning\n- Text Analysis & Summarization\n- Code Explanation & Refactoring\n\n## API\n${SITE.api_endpoint}`
  },
  {
    name: 'OpenBase',
    url: 'https://openbase.com',
    type: 'manual',
    notes: 'Open source and API directory. Submit API listing.',
    content: `# openbase-submission.md\n\n## Name\n${SITE.name}\n\n## Description\n${SITE.description}\n\n## Category\n${SITE.category}\n\n## Website\n${SITE.url}`
  },
  {
    name: 'RapidAPI',
    url: 'https://rapidapi.com',
    type: 'manual',
    notes: 'API marketplace. Create a provider account and list APIs.',
    content: `# rapidapi-submission.md\n\n## API Name\nmy-automaton AI Services\n\n## Description\n${SITE.tagline}\n\n## Endpoints\n- POST /v1/review - Code review (5¢)\n- POST /v1/security - Security scan (3¢)\n- POST /v1/analyze - Text analysis (1¢)\n- POST /v1/summarize - Summarization (2¢)\n- POST /v1/explain - Code explain (2¢)\n- POST /v1/refactor - Refactoring (5¢)\n- POST /v1/complexity - Complexity (2¢)\n\n## Base URL\n${SITE.api_endpoint}`
  },
  {
    name: 'Hugging Face',
    url: 'https://huggingface.co/spaces',
    type: 'manual',
    notes: 'Create a Space showing the API in action with a Gradio interface.',
    content: `# huggingface-space.md\n\nCreate a Hugging Face Space with a simple web demo of the code review API.\n\n## Space Config\n- SDK: gradio\n- Python version: 3.10\n- Space title: my-automaton AI Code Review Demo\n\n## Demo Features\n- Paste code in any language\n- Click "Review" to call the API\n- Display issues, quality score, and severity levels`
  },
  {
    name: 'AlternativeTo',
    url: 'https://alternativeto.net',
    type: 'manual',
    notes: 'List as alternative to SonarQube, CodeRabbit, GitHub Copilot.',
    content: `# alternativeto-submission.md\n\n## Software Name\n${SITE.name}\n\n## Description\n${SITE.tagline}\n\n## Category\nDeveloper Tools / Code Analysis\n\n## Tags\ncode-review, static-analysis, ai, security-scanning\n\n## Alternative to\n- SonarQube\n- CodeRabbit\n- GitHub Copilot\n- DeepSource\n- Codacy`
  },
  {
    name: 'NPM Registry',
    url: 'https://npmjs.com',
    type: 'package',
    notes: 'Publish @my-automaton/cli package for global install.',
    content: `# npm-package.md\n\nPublish @my-automaton/cli to npm.\n\n## Package\n@my-automaton/cli\n\n## Description\nCLI for my-automaton AI code review, security scanning, and text analysis\n\n## Tags\nai, code-review, security, static-analysis, developer-tools`
  }
];

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT = join(ROOT, 'promotion');

async function generateSubmissions() {
  if (!existsSync(OUTPUT)) mkdirSync(OUTPUT, { recursive: true });
  
  console.log(`📋 Generating ${SUBMISSIONS.length} submission files...\n`);
  
  for (const sub of SUBMISSIONS) {
    const filename = sub.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.md';
    const path = join(OUTPUT, filename);
    
    const content = `# ${sub.name} Submission\n\n## Type\n${sub.type.toUpperCase()}\n\n## URL\n${sub.url}\n\n## Instructions\n${sub.notes}\n\n---\n\n${sub.content}\n\n---\n\n*Generated by my-automaton · ${new Date().toISOString().slice(0, 10)}*`;
    
    writeFileSync(path, content);
    console.log(`  ✅ ${sub.name} → ${filename}`);
  }
  
  // Write master checklist
  const checklist = SUBMISSIONS.map((sub, i) => 
    `${i+1}. [ ] **${sub.name}** — ${sub.url} (${sub.type})\n   ${sub.notes}`
  ).join('\n\n');
  
  writeFileSync(join(OUTPUT, 'README.md'), `# Promotion Checklist\n\nGenerated: ${new Date().toISOString()}\n\n${checklist}\n\n---\n\n*Generated by my-automaton promotion-engine*`);
  
  console.log(`\n📄 Master checklist written to promotion/README.md`);
  console.log(`\n✅ ${SUBMISSIONS.length} submission files generated in promotion/`);
}

async function generateReport() {
  const DIRS = ['promotion', 'data', 'content', 'scripts', 'services'];
  
  console.log('\n📊 Promotion Engine Report');
  console.log('═'.repeat(40));
  
  // Count files
  for (const dir of DIRS) {
    const dirpath = join(ROOT, dir);
    if (existsSync(dirpath)) {
      const { readdirSync } = await import('fs');
      const files = readdirSync(dirpath);
      console.log(`  📁 ${dir}/ — ${files.length} files`);
    } else {
      console.log(`  📁 ${dir}/ — not found`);
    }
  }
  
  // Read revenue
  try {
    const revenue = JSON.parse(readFileSync(join(ROOT, 'data', 'revenue-report.json'), 'utf-8'));
    console.log(`\n  💰 Revenue: $${revenue.revenue.revenueUSD.toFixed(2)}`);
    console.log(`  🔑 API Keys: ${revenue.revenue.keys}`);
    console.log(`  🏥 Gateway: ${revenue.health}`);
  } catch {}
  
  // Read API keys
  try {
    const keys = JSON.parse(readFileSync(join(ROOT, 'api-keys.json'), 'utf-8'));
    const entries = Object.entries(keys);
    console.log(`\n  🔐 API Keys in file: ${entries.length}`);
    entries.forEach(([key, data]) => {
      const used = data.used || 0;
      const credits = data.credits || 0;
      console.log(`     ${key.slice(0, 16)}... | ${credits - used}/${credits} credits remaining`);
    });
  } catch {}

  // Count blogs
  try {
    const { readdirSync } = await import('fs');
    const blogDir = join(ROOT, 'content', 'blog');
    if (existsSync(blogDir)) {
      const blogs = readdirSync(blogDir).filter(f => f.endsWith('.html'));
      console.log(`\n  📝 Blog articles: ${blogs.length}`);
    }
  } catch {}

  // Promotion status
  console.log(`\n  📋 Promotion files: ${SUBMISSIONS.length} generated`);
  console.log('  ⚠️  All require MANUAL submission (no APIs available)');
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--report') || args.includes('--status')) {
    await generateReport();
    return;
  }
  
  // Default: generate submissions
  await generateSubmissions();
  
  if (args.includes('--report')) {
    await generateReport();
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
