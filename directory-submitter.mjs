#!/usr/bin/env node
/**
 * Directory Submitter — Submits my-automaton to developer tool directories
 * and listing sites where real users discover tools.
 * This is the most impactful way to drive organic traffic.
 */

const HOST = 'http://automation.songheng.vip:8080';
const AGENT_NAME = 'my-automaton';
const DESCRIPTION = 'Free AI-powered developer tools: code review, security scanning, text summarization, code explanation, and refactoring. No signup needed. 3 free requests per day.';

async function submitToDirectories() {
  const results = [];
  
  // 1. Submit to alternativeTo (people searching for tool alternatives)
  // They have a suggestion form
  try {
    const resp = await fetch('https://alternativeto.net/api/suggestion/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'my-automaton AI Developer Tools',
        url: `${HOST}/`,
        description: DESCRIPTION,
        category: 'developer-tools',
        tags: ['ai', 'code-review', 'security-scanner', 'developer-tools', 'free']
      })
    });
    results.push({ dir: 'alternativeTo', status: resp.status });
  } catch(e) { results.push({ dir: 'alternativeTo', error: e.message }); }
  
  // 2. Submit to devtoolhub
  try {
    const resp = await fetch('https://devtoolhub.com/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: AGENT_NAME,
        url: HOST,
        description: DESCRIPTION,
        category: 'ai',
        tags: ['code review', 'security', 'text analysis']
      })
    });
    results.push({ dir: 'devtoolhub', status: resp.status });
  } catch(e) { results.push({ dir: 'devtoolhub', error: e.message }); }
  
  // 3. Submit to builtwith (inbound link building)
  // They auto-detect, but we can ping
  try {
    const resp = await fetch(`https://builtwith.com/api/v1/api.json?KEY=demo&LOOKUP=automation.songheng.vip`);
    results.push({ dir: 'builtwith', status: resp.status });
  } catch(e) { results.push({ dir: 'builtwith', error: e.message }); }
  
  // 4. Register on producthunt-style platforms
  // SaaSHub
  try {
    const resp = await fetch('https://www.saashub.com/api/v1/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: AGENT_NAME,
        url: HOST,
        tagline: 'Free AI Code Review & Security Scanning',
        description: DESCRIPTION,
        pricing: 'Free + premium (1¢-5¢)'
      })
    });
    results.push({ dir: 'saashub', status: resp.status });
  } catch(e) { results.push({ dir: 'saashub', error: e.message }); }
  
  // 5. Report to search engines via sitemap ping
  const sitemapUrls = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(HOST + '/sitemap.xml')}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(HOST + '/sitemap.xml')}`,
    `https://api.indexnow.org/indexnow`,
  ];
  
  for (const url of sitemapUrls) {
    try {
      const resp = await fetch(url);
      results.push({ dir: url.split('/')[2], status: resp.status });
    } catch(e) { results.push({ dir: url.split('/')[2], error: e.message }); }
  }
  
  // 6. Create a project page on dev community listings
  const projectPageContent = `# ${AGENT_NAME}
  
${DESCRIPTION}

## Features
- AI Code Review
- Security Vulnerability Scanning (OWASP Top 10)
- Text Summarization & Analysis
- Code Explanation
- Refactoring Suggestions
- Complexity Analysis

## Free Tier
3 requests per day per IP. No signup required.

## Premium
x402 micropayments via USDC on Base chain. 1¢-5¢ per request.

## API
REST API with x402 payment protocol.
Agent-to-agent API with OpenAI-compatible format.

## Links
- Web: ${HOST}/
- Playground: ${HOST}/playground.html
- API Docs: ${HOST}/api-docs.html
- Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113`;
  
  const fs = await import('fs');
  fs.writeFileSync('/root/automaton/content/project-page.md', projectPageContent);
  results.push({ dir: 'local_project_page', status: 'created' });
  
  console.log('Directory submission results:', JSON.stringify(results, null, 2));
  return results;
}

async function main() {
  console.log('🌐 Submitting to directories...');
  const results = await submitToDirectories();
  
  // Log to promotion hub data
  const dataDir = '/root/automaton/data';
  const fs = await import('fs');
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
  
  const dirLog = {
    lastRun: new Date().toISOString(),
    results
  };
  fs.writeFileSync(`${dataDir}/directory-submissions.json`, JSON.stringify(dirLog, null, 2));
  
  console.log('✅ Directory submission complete');
}

main().catch(e => console.error('Error:', e.message));
