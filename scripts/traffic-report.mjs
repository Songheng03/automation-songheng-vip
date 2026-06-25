#!/usr/bin/env node
/**
 * traffic-report.mjs - Traffic & Distribution Channel Report
 * 
 * Checks which directories my-automaton is listed on,
 * verifies gateway status, sitemap health, and generates
 * a traffic acquisition report.
 * 
 * Run: node /root/automaton/scripts/traffic-report.mjs
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

const __dirname = dirname(new URL(import.meta.url).pathname);
const AUTOMATON_HOME = join(__dirname, '..');

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

const GATEWAY_URL = 'https://automation.songheng.vip';
const DOMAINS = [
  'https://automation.songheng.vip',
  'http://automation.songheng.vip:8080',
  'http://127.0.0.1:8080'
];

const DIRECTORIES = [
  { name: 'MCP.so', url: 'https://mcp.so', submitUrl: 'https://mcp.so/submit', status: 'unknown' },
  { name: 'Smithery', url: 'https://smithery.ai', submitUrl: 'https://smithery.ai/server/submit', status: 'unknown' },
  { name: 'Glama', url: 'https://glama.ai', submitUrl: 'https://glama.ai/mcp/submit', status: 'unknown' },
  { name: 'OpenTools', url: 'https://opentools.ai', submitUrl: 'https://opentools.ai/submit', status: 'unknown' },
  { name: 'ToolKraft', url: 'https://toolkraft.ai', status: 'unknown' },
  { name: 'AgentHub', url: 'https://agenthub.dev', status: 'unknown' },
  { name: 'AnyMCP', url: 'https://anymcp.com', status: 'unknown' },
  { name: 'MCPList', url: 'https://mcpclist.com', status: 'unknown' },
  { name: 'PulseMCP', url: 'https://pulsemcp.com', status: 'unknown' },
  { name: 'PulseMCP-2', url: 'https://pulsemcp.ai', status: 'unknown' },
  { name: 'RepoAgent', url: 'https://repoagent.com', submitUrl: 'https://repoagent.com/submit', status: 'unknown' },
];

const SITEMAP = join(AUTOMATON_HOME, 'content', 'sitemap.xml');
const ROBOTS = join(AUTOMATON_HOME, 'content', 'robots.txt');

function divider(title) {
  const line = '─'.repeat(50);
  console.log(`\n${BOLD}${CYAN}${line}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${CYAN}${line}${RESET}\n`);
}

async function checkURL(url, timeout = 5000) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const resp = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(timer);
    return { status: resp.status, ok: resp.ok, text: await resp.text().catch(() => '').then(t => t.substring(0, 200)) };
  } catch (e) {
    return { status: 0, ok: false, text: e.message };
  }
}

async function main() {
  console.log(`${BOLD}${MAGENTA}╔════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${MAGENTA}║    my-automaton Traffic & Distribution Report     ║${RESET}`);
  console.log(`${BOLD}${MAGENTA}╚════════════════════════════════════════════════════╝${RESET}`);
  console.log(`${GRAY}Generated: ${new Date().toISOString()}${RESET}\n`);

  // === 1. GATEWAY STATUS ===
  divider('GATEWAY STATUS');
  for (const url of DOMAINS) {
    const result = await checkURL(url);
    const icon = result.ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    const statusStr = result.ok ? `${GREEN}${result.status}${RESET}` : `${RED}${result.status}${RESET}`;
    console.log(`  ${icon} ${url.padEnd(45)} ${statusStr}`);
  }

  // === 2. SITEMAP ===
  divider('CONTENT HEALTH');
  if (existsSync(SITEMAP)) {
    const sitemap = readFileSync(SITEMAP, 'utf-8');
    const urls = sitemap.match(/<loc>(.*?)<\/loc>/g) || [];
    console.log(`  ${GREEN}✓${RESET} Sitemap: ${SITEMAP}`);
    console.log(`    URLs listed: ${urls.length}`);
    console.log(`    Size: ${(sitemap.length / 1024).toFixed(1)} KB`);

    // Sample URLs
    const htmlUrls = urls.filter(u => u.includes('.html'));
    console.log(`    HTML pages: ${htmlUrls.length}`);
    console.log(`    API/other: ${urls.length - htmlUrls.length}`);
  } else {
    console.log(`  ${RED}✗${RESET} No sitemap.xml found at ${SITEMAP}`);
  }

  if (existsSync(ROBOTS)) {
    console.log(`  ${GREEN}✓${RESET} Robots.txt: ${ROBOTS}`);
    const robots = readFileSync(ROBOTS, 'utf-8');
    console.log(`    ${robots.split('\n').length} lines`);
  } else {
    console.log(`  ${RED}✗${RESET} No robots.txt`);
  }

  // === 3. KEY CONTENT PAGES ===
  divider('KEY PAGES');
  const keyPages = [
    '/', '/pricing', '/api-docs', '/api-playground',
    '/blog', '/agent-integration', '/mcp-install',
    '/dashboard', '/cli',
    '/blog/survival-story.html'
  ];

  for (const page of keyPages) {
    const url = `${DOMAINS[0]}${page}`;
    const result = await checkURL(url, 3000);
    const icon = result.ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    const code = result.ok ? `${GREEN}${result.status}${RESET}` : `${RED}${result.status}${RESET}`;
    console.log(`  ${icon} ${page.padEnd(30)} ${code}`);
  }

  // === 4. API ENDPOINTS ===
  divider('API ENDPOINTS');
  const apiEndpoints = [
    '/v1/analyze', '/v1/summarize', '/v1/review',
    '/v1/security', '/v1/explain', '/v1/refactor',
    '/v1/complexity', '/v1/batch', '/v1/render'
  ];

  for (const ep of apiEndpoints) {
    const result = await checkURL(`${DOMAINS[0]}${ep}`, 3000);
    const icon = result.status === 402 ? `${YELLOW}402${RESET}` : result.ok ? `${GREEN}${result.status}${RESET}` : `${RED}${result.status}${RESET}`;
    console.log(`  POST ${ep.padEnd(22)} ${icon} (402 = working, needs payment)`);
  }

  // === 5. DIRECTORY CHECKLIST ===
  divider('DIRECTORY SUBMISSIONS');
  console.log(`  ${BOLD}Status Legend:${RESET} ✓ = available, ? = unknown, ✗ = down\n`);
  for (const dir of DIRECTORIES) {
    try {
      const result = await checkURL(dir.url, 3000);
      const icon = result.ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
      dir.status = result.ok ? 'available' : 'down';
      console.log(`  ${icon} ${dir.name.padEnd(15)} ${dir.url}`);
      if (dir.submitUrl) {
        console.log(`           Submit: ${dir.submitUrl}`);
      }
    } catch {
      console.log(`  ${RED}✗${RESET} ${dir.name.padEnd(15)} ${dir.url} (timeout)`);
    }
  }

  // === 6. ANALYTICS SUMMARY ===
  divider('RECOMMENDATIONS');
  
  const keys = readJSON(join(AUTOMATON_HOME, 'api-keys.json'));
  const totalKeys = keys ? Object.keys(keys).length : 0;
  const devKeys = keys ? Object.values(keys).filter(k => k.price_id === undefined || k.price_id.startsWith('dev')).length : 0;
  const realUsers = totalKeys - devKeys;

  console.log(`  ${BOLD}Current State:${RESET}`);
  console.log(`    Total API Keys: ${totalKeys} (${realUsers} real, ${devKeys} dev/test)`);
  console.log(`    Revenue: ${YELLOW}$0${RESET}`);
  console.log(`    Traffic: ${YELLOW}Unknown${RESET} (no analytics tracking)`);
  console.log('');
  console.log(`  ${BOLD}Top Priorities:${RESET}`);
  console.log(`    1. ${'Install analytics tracking'.padEnd(45)} ${GREEN}analytics.mjs done${RESET}`);
  console.log(`    2. ${'Submit to agent directories'.padEnd(45)} ${YELLOW}PENDING${RESET}`);
  console.log(`    3. ${'Make free tier work end-to-end'.padEnd(45)} ${YELLOW}PENDING${RESET}`);
  console.log(`    4. ${'Add Google Analytics/Umami'.padEnd(45)} ${YELLOW}PENDING${RESET}`);
  console.log(`    5. ${'Write and share content'.padEnd(45)} ${YELLOW}PENDING${RESET}`);
}

function readJSON(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf-8')); }
  catch { return null; }
}

main().catch(console.error);
