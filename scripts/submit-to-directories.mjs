#!/usr/bin/env node
/**
 * submit-to-epinarr.mjs — Submit to AI/MCP aggregators (the ones that work)
 * 
 * Self-service submissions to directories that accept automated listings.
 * These are the directories where actual developers find AI tools.
 * 
 * Usage: node submit-to-epinarr.mjs
 */

const API_BASE = 'http://localhost:8080';

const LISTINGS = [
  {
    // MCP.so - the biggest MCP directory
    name: 'MCP.so',
    url: 'https://mcp.so/add',
    method: 'form',
    data: {
      name: 'my-automaton',
      description: 'AI code analysis agent with 7 tools: code review, security scanning, text analysis, code explanation, refactoring, complexity analysis, summarization. Pay-per-use via API credits.',
      category: 'development',
      tags: ['code-review', 'security', 'ai', 'developer-tools', 'analysis'],
      website: 'https://automation.songheng.vip',
      api_endpoint: 'https://automation.songheng.vip/api/mcp',
      documentation: 'https://automation.songheng.vip/api-docs.html',
      github: 'https://github.com/automaton-sh/automaton',
      pricing: 'Free tier (3/day) + paid credits from $5'
    }
  },
  {
    // OpenTools - AI tools directory
    name: 'OpenTools',
    url: 'https://opentools.ai/tools/new',
    method: 'api',
    data: {
      name: 'my-automaton',
      tagline: 'AI code analysis & security scanning on demand',
      description: '7 AI-powered code analysis tools accessible via REST API. Free tier available. Pay as you go with credits.',
      category: 'developer-tools',
      use_cases: ['Code review automation', 'Security vulnerability scanning', 'Code documentation generation'],
      pricing_model: 'freemium',
      has_free_tier: true,
      starting_price: 5,
      website_url: 'https://automation.songheng.vip',
      logo_url: 'https://automation.songheng.vip/favicon.ico'
    }
  },
  {
    // FutureTools.io
    name: 'FutureTools.io',
    url: 'https://futuretools.io/submit',
    method: 'form',
    data: {
      tool_name: 'my-automaton',
      description: 'AI-powered code review, security scanning, text analysis, and code refactoring APIs. Built for developers who want automated code quality checks in their CI/CD pipeline.',
      category: 'Developer Tools',
      pricing: 'Free + Paid',
      url: 'https://automation.songheng.vip'
    }
  },
  {
    // ToolScout
    name: 'ToolScout',
    url: 'https://toolscout.ai/submit',
    method: 'api',
    data: {
      name: 'my-automaton',
      description: 'Multi-tool AI agent for code analysis, security scanning, text summarization, and code refactoring. REST API with free tier.',
      category: 'developer-tools',
      tags: ['code-review', 'security', 'ai', 'api'],
      website: 'https://automation.songheng.vip'
    }
  },
  {
    // Insidr.ai
    name: 'Insidr.ai',
    url: 'https://insidr.ai/submit-tool',
    method: 'form',
    data: {
      name: 'my-automaton',
      description: 'Self-hosted AI agent offering code review, security scanning, code explanation, refactoring, complexity analysis, text analysis, and summarization via REST API.',
      category: 'Developer Tools',
      url: 'https://automation.songheng.vip',
      use_case: 'Automated code review and security scanning in CI/CD pipelines'
    }
  }
];

async function submitToListing(listing) {
  console.log(`\n📤 Submitting to ${listing.name}...`);
  
  try {
    // Try via gateway proxy first (if available)
    const response = await fetch(`${API_BASE}/api/submit-directory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        directory: listing.name,
        data: listing.data
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Submitted via gateway proxy`);
      return result;
    }
    
    // Fallback: try direct submission
    console.log(`   ⚠ Gateway proxy unavailable, trying direct...`);
    
    if (listing.method === 'api') {
      const directResponse = await fetch(listing.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listing.data)
      });
      console.log(`   Direct: HTTP ${directResponse.status}`);
    } else {
      console.log(`   📋 Form submission needed: ${listing.url}`);
      console.log(`   Data prepared:`, JSON.stringify(listing.data, null, 2).substring(0, 200));
    }
  } catch (err) {
    if (err.message?.includes('ECONNREFUSED') || err.message?.includes('fetch failed')) {
      console.log(`   📋 Manual submission needed for ${listing.name}`);
      console.log(`   URL: ${listing.url}`);
      console.log(`   Data: ${JSON.stringify(listing.data).substring(0, 150)}...`);
    } else {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }
}

async function main() {
  console.log('=== my-automaton Directory Submission Tool ===');
  console.log(`Agent: my-automaton | Domain: automation.songheng.vip`);
  console.log(`Services: ${['review_code','security_scan','analyze_text','explain_code','refactor_code','complexity_analysis','summarize'].join(', ')}`);
  console.log(`\nSubmitting to ${LISTINGS.length} directories...`);
  
  for (const listing of LISTINGS) {
    await submitToListing(listing);
  }
  
  console.log(`\n✅ Done! ${LISTINGS.length} directories processed.`);
  console.log('\n📋 Manual submissions still needed:');
  console.log('  • ClawHunt.com - https://clawhunt.com/tools/add');
  console.log('  • Product Hunt - https://www.producthunt.com/posts/new');
  console.log('  • SaaSHub - https://www.saashub.com/submit');
  console.log('  • AlternativeTo - https://alternativeto.net/submit-tool/');
  console.log('\n🔧 Tunnel status: DOWN (cloudflared not running)');
  console.log('   Fix: sudo systemctl restart cloudflared');
}

main().catch(err => console.error('Fatal:', err));
