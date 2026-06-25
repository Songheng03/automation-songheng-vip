#!/usr/bin/env node
/**
 * submission-script.js — Automated Directory Submission
 * 
 * Reads submission-assessment.json to identify target directories,
 * attempts HTTP API submissions where possible, logs all outcomes,
 * and updates directory-submissions.json with results.
 * 
 * Run: node submission-script.js
 */

const fs = require('fs');
const path = require('path');

const AGENT = {
  name: 'my-automaton',
  url: 'https://automation.songheng.vip',
  tagline: 'AI Code Review & Security Scanning — Pay-Per-Use From 1¢',
  description: 'Sovereign AI agent providing 7 premium API endpoints via x402 micropayments. Services: code review, security vulnerability scanning, text analysis, summarization, code explanation, refactoring, and complexity analysis. Free tier: 3 requests/day per IP. Pay-as-you-go pricing from $5 for 500 credits.',
  tags: ['MCP', 'AI agent', 'code review', 'security scan'],
  category: 'Developer Tools',
  github: 'https://github.com'
};

// Target directories with their best-guess API endpoints
const DIRECTORIES = [
  {
    name: 'MCP.so',
    url: 'https://mcp.so/api/tools/submit',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton-submission/1.0' },
    body: {
      name: AGENT.name,
      description: AGENT.description.substring(0, 200),
      website: AGENT.url,
      tags: AGENT.tags,
      category: AGENT.category
    }
  },
  {
    name: 'Smithery',
    url: 'https://api.smithery.ai/servers',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton-submission/1.0' },
    body: {
      name: AGENT.name,
      displayName: 'my-automaton - AI Code Review & Analysis',
      description: AGENT.description.substring(0, 300),
      homepage: AGENT.url,
      tags: AGENT.tags
    }
  },
  {
    name: 'Glama.ai',
    url: 'https://glama.ai/api/mcp/servers',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton-submission/1.0' },
    body: {
      name: AGENT.name,
      package: AGENT.name,
      description: AGENT.tagline,
      homepage: AGENT.url
    }
  },
  {
    name: 'PulseMCP',
    url: 'https://api.pulsemcp.com/v0.1/servers',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton-submission/1.0' },
    body: {
      name: AGENT.name,
      description: AGENT.tagline,
      url: AGENT.url,
      categories: [AGENT.category]
    }
  },
  {
    name: 'OpenTools',
    url: 'https://opentools.ai/api/tools',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton-submission/1.0' },
    body: {
      name: AGENT.name,
      url: AGENT.url,
      description: AGENT.tagline,
      category: AGENT.category,
      tags: AGENT.tags
    }
  },
  {
    name: 'Toolspedia',
    url: 'https://toolspedia.io/api/tools',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton-submission/1.0' },
    body: {
      name: AGENT.name,
      description: AGENT.tagline,
      website: AGENT.url,
      category: AGENT.category,
      tags: AGENT.tags
    }
  },
  {
    name: 'DevHunt',
    url: 'https://devhunt.org/api/tools',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton-submission/1.0' },
    body: {
      name: AGENT.name,
      tagline: AGENT.tagline,
      description: AGENT.description.substring(0, 500),
      url: AGENT.url,
      github: AGENT.github,
      category: AGENT.category,
      tags: AGENT.tags
    }
  },
  {
    name: 'BetaList',
    url: 'https://betalist.com/api/startups',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton-submission/1.0' },
    body: {
      name: AGENT.name,
      tagline: AGENT.tagline,
      url: AGENT.url,
      description: AGENT.description.substring(0, 500)
    }
  },
  {
    name: 'ProductHunt',
    url: 'https://api.producthunt.com/v1/posts',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer',
      'User-Agent': 'my-automaton-submission/1.0'
    },
    body: {
      post: {
        name: AGENT.name,
        tagline: AGENT.tagline,
        description: AGENT.description.substring(0, 260),
        url: AGENT.url,
        category: AGENT.category
      }
    }
  },
  {
    name: 'AlternativeTo',
    url: 'https://alternativeto.net/api/suggestion/',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton-submission/1.0' },
    body: {
      name: AGENT.name + ' AI Developer Tools',
      url: AGENT.url,
      description: AGENT.tagline,
      category: 'developer-tools',
      tags: AGENT.tags
    }
  },
  {
    name: 'SaaSHub',
    url: 'https://www.saashub.com/api/v1/tools',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'my-automaton-submission/1.0' },
    body: {
      name: AGENT.name,
      url: AGENT.url,
      tagline: AGENT.tagline,
      description: AGENT.description.substring(0, 500),
      pricing: 'Free + Premium (from 1¢/request)',
      category: AGENT.category
    }
  }
];

/**
 * Make an HTTP request with timeout and error handling
 */
async function httpRequest(url, method, headers, body, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? require('https') : require('http');
    const u = new URL(url);
    
    const data = body ? JSON.stringify(body) : null;
    
    const options = {
      hostname: u.hostname,
      port: u.port || (url.startsWith('https') ? 443 : 80),
      path: u.pathname + u.search,
      method: method || 'GET',
      headers: { ...headers },
      timeout: timeoutMs
    };
    
    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    
    const req = protocol.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage || '',
          headers: res.headers,
          data: responseData.substring(0, 500)
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({ status: 0, statusText: '', headers: {}, data: '', error: err.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, statusText: '', headers: {}, data: '', error: 'Request timeout' });
    });
    
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

/**
 * Classify response status
 */
function classifyStatus(statusCode, data, error) {
  if (error) return 'error';
  if (statusCode >= 200 && statusCode < 300) return 'submitted';
  if (statusCode === 403) return 'blocked';
  if (statusCode === 404) return 'endpoint_not_found';
  if (statusCode === 405) return 'method_not_allowed';
  if (statusCode === 401 || statusCode === 402) return 'auth_required';
  if (statusCode >= 500) return 'server_error';
  return 'failed';
}

/**
 * Get a human-readable suggestion based on the response
 */
function getSuggestion(name, status, statusCode, data) {
  const suggestions = {
    'MCP.so': 'Manual: Open https://mcp.so/submit (GitHub OAuth required)',
    'Smithery': 'Manual: Open https://smithery.ai and sign in with GitHub to submit',
    'Glama.ai': 'Manual: Open https://glama.ai/mcp/servers and submit via GitHub OAuth',
    'PulseMCP': 'Manual: Open https://www.pulsemcp.com/submit (Cloudflare protected)',
    'OpenTools': 'Manual: Open https://opentools.ai/friends/launch-tool',
    'Toolspedia': 'Manual: Open https://toolspedia.io and submit via web form',
    'DevHunt': 'Manual: Open https://devhunt.org/submit to create a listing',
    'BetaList': 'Manual: Open https://betalist.com/submit',
    'ProductHunt': 'Manual: Open https://www.producthunt.com/posts/new (OAuth required)',
    'AlternativeTo': 'Manual: Open https://alternativeto.net/submit/ (Cloudflare protected)',
    'SaaSHub': 'Manual: Open https://www.saashub.com/submit'
  };
  return suggestions[name] || 'Manual submission via web browser required';
}

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log(`  my-automaton — Directory Submission Script`);
  console.log(`  ${AGENT.url}`);
  console.log(`  ${AGENT.tagline}`);
  console.log('══════════════════════════════════════════════\n');

  // Read the assessment file to get targets
  let targets = [];
  try {
    const assessment = JSON.parse(fs.readFileSync('submission-assessment.json', 'utf8'));
    console.log(`📋 Loaded assessment file`);
    
    // Get targets from needs_automated_action, or fallback to all directories
    if (assessment.needs_automated_action && Array.isArray(assessment.needs_automated_action) && assessment.needs_automated_action.length > 0) {
      targets = assessment.needs_automated_action;
      console.log(`📋 Using ${targets.length} directories from assessment.needs_automated_action`);
    } else {
      targets = DIRECTORIES.map(d => d.name);
      console.log(`📋 Using all ${targets.length} configured directories (assessment had no targets)`);
    }
  } catch (e) {
    targets = DIRECTORIES.map(d => d.name);
    console.log(`📋 Using all ${targets.length} configured directories (no assessment file)`);
  }

  console.log(`🎯 Target directories: ${targets.join(', ')}\n`);

  const results = [];
  let submitted = 0;
  let failed = 0;

  for (const dirConfig of DIRECTORIES) {
    if (!targets.includes(dirConfig.name)) {
      console.log(`⏭️  Skipping ${dirConfig.name} (not in target list)`);
      continue;
    }

    process.stdout.write(`📤 ${dirConfig.name}... `);

    const response = await httpRequest(
      dirConfig.url,
      dirConfig.method,
      dirConfig.headers,
      dirConfig.body
    );

    const status = classifyStatus(response.status, response.data, response.error);
    const suggestion = getSuggestion(dirConfig.name, status, response.status, response.data);

    const result = {
      name: dirConfig.name,
      url: dirConfig.url,
      method: dirConfig.method,
      status_code: response.status,
      status: status,
      response_preview: response.data ? response.data.substring(0, 200) : '',
      error: response.error || null,
      suggestion: suggestion,
      timestamp: new Date().toISOString()
    };
    results.push(result);

    if (status === 'submitted') {
      submitted++;
      console.log(`✅ ${response.status} — accepted`);
    } else if (status === 'error') {
      failed++;
      console.log(`❌ Error: ${response.error}`);
    } else if (status === 'blocked') {
      failed++;
      console.log(`🔒 ${response.status} — blocked (${suggestion})`);
    } else if (status === 'endpoint_not_found') {
      failed++;
      console.log(`📭 ${response.status} — endpoint not found (${suggestion})`);
    } else if (status === 'auth_required') {
      failed++;
      console.log(`🔑 ${response.status} — auth required (${suggestion})`);
    } else {
      failed++;
      console.log(`⚠️  ${response.status} — ${suggestion}`);
    }
  }

  // Build the updated directory-submissions.json
  const submissionData = {
    last_updated: new Date().toISOString(),
    agent: {
      name: AGENT.name,
      url: AGENT.url,
      tags: AGENT.tags,
      category: AGENT.category
    },
    summary: {
      total: results.length,
      submitted: submitted,
      failed: failed,
      needs_manual: results.filter(r => r.status !== 'submitted').length
    },
    submissions: {}
  };

  for (const r of results) {
    submissionData.submissions[r.name] = {
      status: r.status,
      status_code: r.status_code,
      timestamp: r.timestamp,
      error: r.error,
      response_preview: r.response_preview,
      suggestion: r.suggestion
    };
  }

  // Also include directories that were in targets but not attempted
  for (const target of targets) {
    if (!submissionData.submissions[target]) {
      submissionData.submissions[target] = {
        status: 'not_attempted',
        timestamp: new Date().toISOString(),
        suggestion: 'No API endpoint configured for this directory'
      };
    }
  }

  // Write the results
  fs.writeFileSync('directory-submissions.json', JSON.stringify(submissionData, null, 2));
  console.log(`\n📄 Updated directory-submissions.json`);

  // Also write detailed log
  const logPath = `data/submissions/auto-submit-${Date.now()}.json`;
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  try { fs.writeFileSync(logPath, JSON.stringify(results, null, 2)); } catch(e) {}
  console.log(`📄 Detailed log saved to ${logPath}`);

  // Print summary
  console.log('\n══════════════════════════════════════════════');
  console.log(`  Summary:`);
  console.log(`  ✅ Auto-submitted: ${submitted}/${results.length}`);
  console.log(`  ❌ Failed/Blocked: ${failed}/${results.length}`);
  console.log(`  📋 Manual needed: ${submissionData.summary.needs_manual}/${results.length}`);
  console.log('══════════════════════════════════════════════\n');

  // Print manual submission guide
  if (submissionData.summary.needs_manual > 0) {
    console.log('📋 Directories requiring manual browser submission:');
    for (const r of results) {
      if (r.status !== 'submitted') {
        console.log(`   • ${r.name}: ${r.suggestion}`);
      }
    }
    console.log('');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
