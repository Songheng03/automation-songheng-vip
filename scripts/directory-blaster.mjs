#!/usr/bin/env node
/**
 * directory-blaster.mjs — Submit my-automaton to AI agent directories
 * 
 * Generate submission data for manual or API-based directory listings.
 * Each directory gets a tailored one-pager submission.
 * 
 * Usage: node scripts/directory-blaster.mjs [--generate | --submit]
 */

const SERVICE_URL = 'https://automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const TAGLINE = 'Autonomous AI agent offering pay-per-use code review, security scanning, and text analysis APIs';

const directories = [
  {
    name: 'ClawHunt',
    url: 'https://clawhunt.com',
    submit_url: 'https://clawhunt.com/tools/submit',
    type: 'ai-agent-marketplace',
    description: `my-automaton is a sovereign AI agent that provides code review, security scanning, and text analysis via REST API. Pay per request from 1¢.`
  },
  {
    name: 'Smithery',
    url: 'https://smithery.ai',
    submit_url: 'https://smithery.ai/submit',
    type: 'mcp-server-directory',
    description: `MCP-compatible AI agent with 7 tools: analyze, summarize, code_review, security_scan, explain_code, refactor_code, complexity_analysis.`
  },
  {
    name: 'Glama',
    url: 'https://glama.ai',
    submit_url: 'https://glama.ai/mcp/servers',
    type: 'mcp-server-directory',
    description: `Open source MCP server for AI-powered code analysis. Integrates with Claude, Cursor, and any MCP-compatible client.`
  },
  {
    name: 'AgentHub',
    url: 'https://agenthub.dev',
    submit_url: 'https://agenthub.dev/submit',
    type: 'ai-agent-directory',
    description: `Fully autonomous AI agent running on its own VPS. Provides code review, security scanning, and text analysis via REST API and MCP.`
  },
  {
    name: 'PulseMCP',
    url: 'https://pulsemcp.com',
    submit_url: 'https://pulsemcp.com/servers',
    type: 'mcp-server-directory',
    description: `MCP server for code quality analysis. 7 tools for reviewing, analyzing, and explaining code. Free tier available.`
  },
  {
    name: 'MCP.so',
    url: 'https://mcp.so',
    submit_url: 'https://mcp.so/submit',
    type: 'mcp-server-directory',
    description: `AI code review and analysis MCP server. Supports JavaScript, Python, Go, Rust, Solidity, and 10+ languages.`
  },
  {
    name: 'OpenTools',
    url: 'https://opentools.ai',
    submit_url: 'https://opentools.ai/submit',
    type: 'ai-tools-directory',
    description: `Pay-per-use AI API for developers. Code review (5¢), security scan (3¢), text analysis (1¢). No subscription required.`
  },
  {
    name: 'DevPost',
    url: 'https://devpost.com',
    submit_url: 'https://devpost.com/software/submit',
    type: 'hackathon-platform',
    description: `A sovereign AI agent that pays for its own server by providing developer APIs. Built with DeepSeek, Node.js, and Stripe.`
  }
];

async function main() {
  const mode = process.argv.includes('--generate') ? 'generate' : 'submit';
  
  console.log('=== AI AGENT DIRECTORY BLASTER ===\n');
  
  for (const dir of directories) {
    console.log(`📌 ${dir.name} (${dir.type})`);
    console.log(`   Submit URL: ${dir.submit_url}`);
    console.log(`   Description: ${dir.description.slice(0, 100)}...`);
    console.log(`   Status: GENERATED (manual submission)`);
    
    // Generate submission content
    const submission = {
      name: 'my-automaton',
      tagline: TAGLINE,
      description: dir.description,
      url: SERVICE_URL,
      wallet: WALLET,
      category: dir.type,
      features: [
        'AI code review (5¢/request)',
        'Security vulnerability scanning (3¢/request)',
        'Text analysis and summarization (1-2¢/request)',
        'MCP server compatible with Claude/Cursor',
        'GitHub Actions integration',
        'Free tier: 3 requests/day per IP',
        'No signup required for free tier'
      ],
      pricing: 'Pay-per-use from 1¢. No subscription. $5 = 500 credits.',
      tech_stack: ['Node.js', 'DeepSeek AI', 'Stripe', 'Cloudflare', 'MCP']
    };
    
    // Write submission files
    const fs = await import('fs');
    const dirName = dir.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    fs.mkdirSync('/root/automaton/data/submissions', { recursive: true });
    fs.writeFileSync(
      `/root/automaton/data/submissions/${dirName}.json`,
      JSON.stringify(submission, null, 2)
    );
    
    console.log(`   ✅ Saved to data/submissions/${dirName}.json\n`);
  }
  
  // Generate summary
  console.log('=== SUBMISSION SUMMARY ===');
  console.log(`Total directories: ${directories.length}`);
  console.log(`Auto-generated: ${directories.length} submission files`);
  console.log('');
  console.log('MANUAL SUBMISSION REQUIRED for all directories.');
  console.log('Each has a data/submissions/<name>.json file with tailored content.');
  console.log('');
  console.log('Quick copy-paste submission text:');
  console.log('─'.repeat(50));
  console.log(`Name: my-automaton`);
  console.log(`URL: ${SERVICE_URL}`);
  console.log(`Wallet: ${WALLET}`);
  console.log(`Tagline: ${TAGLINE}`);
  console.log('─'.repeat(50));
}

main().catch(console.error);
