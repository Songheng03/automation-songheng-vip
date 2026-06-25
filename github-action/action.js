/**
 * my-automaton Code Review GitHub Action
 * Automatically reviews PR code changes using my-automaton's AI services.
 * 
 * Driven by: automation.songheng.vip
 * Wallet: 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113
 */
const https = require('https');
const http = require('http');

const AUTOMATON_HOST = 'automation.songheng.vip';

async function request(method, path, body, apiKey) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: AUTOMATON_HOST,
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0,
        ...(apiKey ? { 'X-API-Key': apiKey } : {})
      }
    };
    const req = https.request(opts, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch(e) { resolve({ error: Buffer.concat(chunks).toString() }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function reviewCode(code, filename, apiKey) {
  return request('POST', '/v1/review', {
    text: `File: ${filename}\n\n\`\`\`\n${code}\n\`\`\``,
    mode: 'review'
  }, apiKey);
}

async function securityScan(code, filename, apiKey) {
  return request('POST', '/v1/security', {
    text: `File: ${filename}\n\n\`\`\`\n${code}\n\`\`\``,
    mode: 'security'
  }, apiKey);
}

async function explainCode(code, filename, apiKey) {
  return request('POST', '/v1/explain', {
    text: `File: ${filename}\n\n\`\`\`\n${code}\n\`\`\``,
    mode: 'explain'
  }, apiKey);
}

async function run() {
  // Parse inputs
  const inputs = {};
  process.argv.slice(2).forEach(arg => {
    const [k, ...v] = arg.split('=');
    inputs[k.replace(/^--/, '')] = v.join('=');
  });

  const apiKey = inputs['api-key'] || process.env.AUTOMATON_API_KEY || '';
  const githubToken = process.env.GITHUB_TOKEN || '';
  const mode = inputs.mode || 'review'; // review, security, all
  const commentOnPR = inputs['comment-on-pr'] !== 'false';
  const failOnIssues = inputs['fail-on-issues'] === 'true';

  if (!githubToken) {
    console.log('::warning::No GITHUB_TOKEN found. Skipping PR comment.');
  }

  // Get event info from GitHub env vars
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    console.log('::error::GITHUB_EVENT_PATH not set. Not running in a GitHub Action context.');
    process.exit(1);
  }

  const fs = require('fs');
  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));

  // Log what we're reviewing
  console.log(`::group::my-automaton Code Review`);
  console.log(`Event: ${process.env.GITHUB_EVENT_NAME}`);
  console.log(`Repository: ${process.env.GITHUB_REPOSITORY}`);
  console.log(`Mode: ${mode}`);
  console.log(`API Key: ${apiKey ? '✓ provided' : '✗ not provided (using free tier)'}`);
  console.log(`::endgroup::`);

  // Get changed files from PR
  let changedFiles = [];
  if (event.pull_request) {
    const prNumber = event.pull_request.number;
    console.log(`PR #${prNumber}: ${event.pull_request.title}`);
    
    // Get PR diff
    const repo = process.env.GITHUB_REPOSITORY;
    const diffUrl = `https://api.github.com/repos/${repo}/pulls/${prNumber}/files`;
    
    try {
      const diffResult = await fetchWithToken(diffUrl, githubToken);
      const results = [];

      for (const file of diffResult.slice(0, 10)) { // Max 10 files per run
        if (file.status === 'removed') continue;

        const filename = file.filename;
        const patch = file.patch || '';
        const content = await getFileContent(file.contents_url, githubToken);

        console.log(`\n::group::Reviewing: ${filename} (+${file.additions} -${file.deletions})`);

        let reviewResult, securityResult;
        
        if (mode === 'all' || mode === 'review') {
          try {
            reviewResult = await reviewCode(content || patch, filename, apiKey);
            console.log(`Review score: ${reviewResult.score || 'N/A'}`);
            console.log(`Issues found: ${(reviewResult.issues || []).length}`);
          } catch(e) {
            console.log(`Review failed: ${e.message}`);
          }
        }

        if (mode === 'all' || mode === 'security') {
          try {
            securityResult = await securityScan(content || patch, filename, apiKey);
            console.log(`Vulnerabilities: ${(securityResult.vulnerabilities || []).length}`);
          } catch(e) {
            console.log(`Security scan failed: ${e.message}`);
          }
        }

        // Generate summary
        let summary = `### ${filename}\n\n`;
        if (reviewResult && reviewResult.issues) {
          summary += `**Code Quality Score**: ${reviewResult.score || 'N/A'}/10\n\n`;
          if (reviewResult.issues.length > 0) {
            summary += `**Issues:**\n`;
            reviewResult.issues.slice(0, 5).forEach(issue => {
              summary += `- ⚠️ ${issue.description || issue}\n`;
            });
          } else {
            summary += `✅ No issues found.\n`;
          }
        }
        if (securityResult && securityResult.vulnerabilities) {
          if (securityResult.vulnerabilities.length > 0) {
            summary += `\n**🔒 Security Vulnerabilities:**\n`;
            securityResult.vulnerabilities.slice(0, 5).forEach(vuln => {
              summary += `- 🚨 ${vuln.description || vuln}\n`;
            });
          } else {
            summary += `\n✅ No security vulnerabilities found.\n`;
          }
        }
        summary += `\n[Review by my-automaton](https://automation.songheng.vip)\n`;
        results.push(summary);
        console.log(`::endgroup::`);
      }

      // Post comment on PR
      if (commentOnPR && results.length > 0) {
        const body = `## 🤖 my-automaton Code Review\n\n${results.join('\n---\n')}\n\n---\n*Powered by [my-automaton](https://automation.songheng.vip) — AI code review & security scanning*`;
        await postPRComment(repo, prNumber, body, githubToken);
        console.log('\n✅ PR comment posted.');
      }

      // Set GitHub outputs
      const totalIssues = results.join(' ').match(/⚠️/g)?.length || 0;
      const totalVulns = results.join(' ').match(/🚨/g)?.length || 0;
      console.log(`::set-output name=total-issues::${totalIssues}`);
      console.log(`::set-output name=total-vulnerabilities::${totalVulns}`);
      console.log(`::set-output name=review-count::${results.length}`);

      if (failOnIssues && (totalIssues > 0 || totalVulns > 0)) {
        console.log(`::error::Issues or vulnerabilities found. Failing check.`);
        process.exit(1);
      }
    } catch(e) {
      console.log(`::error::Failed to review PR: ${e.message}`);
      process.exit(1);
    }
  } else {
    console.log('::warning::No pull_request event found. Skipping review.');
  }
}

async function fetchWithToken(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'my-automaton-action/1.0'
      }
    };
    const req = https.request(opts, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch(e) { reject(new Error(Buffer.concat(chunks).toString())); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function getFileContent(url, token) {
  try {
    const result = await fetchWithToken(url, token);
    if (result.content) {
      return Buffer.from(result.content, 'base64').toString('utf8');
    }
  } catch(e) { /* ignore */ }
  return '';
}

async function postPRComment(repo, prNumber, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ body });
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/issues/${prNumber}/comments`,
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'my-automaton-action/1.0',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(opts, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

run().catch(e => {
  console.error('::error::Fatal error:', e.message);
  process.exit(1);
});
