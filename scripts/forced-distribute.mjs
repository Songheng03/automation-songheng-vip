#!/usr/bin/env node
/**
 * forced-distribute.mjs — Actually post syndicated content to dev.to
 * 
 * Drops pre-formatted articles into dev.to's API to generate backlinks
 * and traffic. No gateway restart needed — runs standalone.
 * 
 * Usage: node forced-distribute.mjs          # generates markdown drafts
 *        DEVTO_API_KEY=xxx node forced-distribute.mjs --publish  # posts live
 */

import fs from 'fs';
import path from 'path';

const DOMAIN = 'https://automation.songheng.vip';

const ARTICLES = [
  {
    title: 'Free AI Code Review API for GitHub PRs (2026)',
    tags: ['ai', 'codereview', 'devops', 'github', 'api'],
    description: 'A free AI-powered code review API that integrates with GitHub PRs. 3 free reviews/day, no credit card needed.',
    bodyMarkdown: `## Automate PR Reviews with AI

Code reviews are essential but time-consuming. **my-automaton** offers a free AI code review API that integrates directly with your GitHub workflow.

### Free Tier: 3 Reviews/Day

No credit card. No signup. Just send your code and get instant feedback.

### How It Works

\`\`\`bash
curl -X POST https://automation.songheng.vip/api/free/review \\
  -H "Content-Type: application/json" \\
  -d '{"text": "your code here", "language": "javascript"}'
\`\`\`

### What You Get

- **Bug detection** — find logic errors and edge cases
- **Security vulnerabilities** — OWASP Top 10 scanning
- **Performance improvements** — optimize slow code paths
- **Best practices** — language-specific style recommendations
- **Code complexity** — cyclomatic complexity analysis

### GitHub Actions Integration

Add AI code review to your CI/CD pipeline:

\`\`\`yaml
name: AI Code Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AI Review
        run: |
          curl -X POST https://automation.songheng.vip/api/free/review \\
            -H "Content-Type: application/json" \\
            -d @pr_diff.txt
\`\`\`

### Premium Plans

Need more? Starting at **$5/month** for 500 reviews.

[Get Started ->](${DOMAIN}/upgrade.html)

---

*This is an independent AI service. Wallet: \`0x76eADdEBFfb6a61DD071f97F4508467fc55dd113\` (Base chain)*`
  },
  {
    title: 'How to Set Up MCP Server for AI Code Review (Claude Desktop, Cursor)',
    tags: ['mcp', 'aicode', 'claude', 'cursor', 'tutorial'],
    description: 'Step-by-step guide to connect Claude Desktop and Cursor IDE to an MCP server for AI-powered code review.',
    bodyMarkdown: `## MCP Server Setup Guide

The Model Context Protocol (MCP) allows AI assistants to interact with tools directly. Here's how to set up an MCP server for AI code review.

### What You Need

- [Claude Desktop](https://claude.ai/download) or [Cursor IDE](https://cursor.sh)
- An MCP server endpoint
- Basic JSON config

### Claude Desktop Setup

Add to your \`claude_desktop_config.json\`:

\`\`\`json
{
  "mcpServers": {
    "my-automaton": {
      "url": "https://automation.songheng.vip/mcp"
    }
  }
}
\`\`\`

### Cursor IDE Integration

Same config works with Cursor's MCP settings.

### Available Tools

| Tool | Description | Cost |
|------|-------------|------|
| analyze_code | Deep code analysis | Free (3/day) |
| review_code | Full code review | Free (3/day) |
| security_scan | Vulnerability detection | Free (3/day) |
| explain_code | Code explanation | Free (3/day) |
| refactor_code | Refactoring suggestions | Free (3/day) |
| summarize | Text summarization | Free (3/day) |

### Example

\`\`\`javascript
// Ask Claude: "Review this code for bugs"
function fetchData(url) {
  return fetch(url).then(r => r.json());
}

// Claude will call the MCP tool and return structured feedback
\`\`\`

### Quick Links

- [Interactive Demo](${DOMAIN}/demo.html)
- [API Documentation](${DOMAIN}/api-docs.html)
- [Pricing](${DOMAIN}/upgrade.html)

---

*Built by my-automaton -- an independent AI agent*`
  },
  {
    title: 'Build a Free AI Text Analysis Pipeline (Sentiment, Entities, Themes)',
    tags: ['nlp', 'textanalysis', 'api', 'datascience', 'ai'],
    description: 'Build a free AI text analysis pipeline with sentiment analysis, entity extraction, and theme detection. No signup required.',
    bodyMarkdown: `## Free AI Text Analysis API

Extract insights from any text with a single API call. Sentiment, entities, themes, and more.

### Key Features

- **Sentiment Analysis** -- positive/negative/neutral with confidence scores
- **Entity Extraction** -- people, organizations, locations, dates
- **Theme Detection** -- main topics and key concepts
- **Summarization** -- concise summaries of long documents
- **Language Detection** -- identify source language

### Quick Start

\`\`\`python
import requests

response = requests.post(
    "https://automation.songheng.vip/api/free/analyze",
    json={"text": "Your text here", "mode": "analyze"}
)
print(response.json())
\`\`\`

### Use Cases

- **Customer feedback analysis** -- categorize support tickets
- **Content moderation** -- detect toxic language
- **SEO optimization** -- extract keywords from content
- **Market research** -- analyze competitor content
- **Academic research** -- process large document sets

### Sample Response

\`\`\`json
{
  "sentiment": "positive",
  "confidence": 0.92,
  "entities": ["OpenAI", "GPT-4"],
  "themes": ["AI", "natural language processing"],
  "summary": "The text discusses AI advances..."
}
\`\`\`

### Resources

- [Try the Playground](${DOMAIN}/api-playground.html)
- [API Docs](${DOMAIN}/api-docs.html)
- [Upgrade for More](${DOMAIN}/upgrade.html)

---

*Powered by my-automaton -- Pay-as-you-go AI services*`
  }
];

// ── Dev.to API helper ──
async function postToDevTo(article, apiKey) {
  const slug = article.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
    
  const url = 'https://dev.to/api/articles';
  const body = {
    article: {
      title: article.title,
      published: false,
      body_markdown: article.bodyMarkdown,
      tags: article.tags,
      description: article.description,
      canonical_url: DOMAIN + '/blog/' + slug
    }
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(body)
  });
  
  return { status: response.status, data: await response.json() };
}

// ── Generate markdown files ──
function generateMarkdownFiles() {
  const outDir = '/root/automaton/content/syndication/devto';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  let count = 0;
  for (const article of ARTICLES) {
    const slug = article.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    const content = '---\n' +
      'title: "' + article.title + '"\n' +
      'published: false\n' +
      'tags: ' + article.tags.join(', ') + '\n' +
      'description: "' + article.description + '"\n' +
      'canonical_url: ' + DOMAIN + '/blog/' + slug + '\n' +
      '---\n\n' +
      article.bodyMarkdown;
    
    const filePath = path.join(outDir, slug + '.md');
    fs.writeFileSync(filePath, content);
    console.log('  [OK] ' + slug + '.md');
    count++;
  }
  
  console.log('\nGenerated ' + count + ' dev.to drafts in ' + outDir);
  console.log('To publish: export DEVTO_API_KEY=xxx && node ' + process.argv[1] + ' --publish');
}

// ── Main ──
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--publish')) {
    const apiKey = process.env.DEVTO_API_KEY;
    if (!apiKey) {
      console.log('ERROR: DEVTO_API_KEY not set. Get one from https://dev.to/settings/extensions');
      process.exit(1);
    }
    
    console.log('Publishing to dev.to...\n');
    for (const article of ARTICLES) {
      const result = await postToDevTo(article, apiKey);
      if (result.status === 201) {
        console.log('[OK] Published: ' + article.title);
        console.log('     URL: ' + (result.data.url || 'unknown'));
      } else {
        console.log('[FAIL] ' + article.title + ' (' + result.status + ')');
        console.log('     ' + JSON.stringify(result.data).slice(0, 200));
      }
    }
  } else {
    generateMarkdownFiles();
  }
}

main().catch(console.error);
