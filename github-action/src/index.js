/**
 * my-automaton Code Review GitHub Action
 * 
 * Automatically reviews PRs using my-automaton's AI code review service.
 * Posts inline comments on changed files.
 * 
 * Usage: .github/workflows/code-review.yml
 *   name: AI Code Review
 *   on: [pull_request]
 *   jobs:
 *     review:
 *       runs-on: ubuntu-latest
 *       steps:
 *         - uses: chaosong/my-automaton-code-review@v1
 *           with:
 *             api-key: ${{ secrets.MY_AUTOMATON_API_KEY }}
 *             github-token: ${{ secrets.GITHUB_TOKEN }}
 *             severity: all
 *             max-comments: 20
 */

const { execSync } = require('child_process');
const https = require('https');

// Parse inputs from GitHub Actions environment
const inputs = {
  apiKey: process.env.INPUT_API_KEY || '',
  githubToken: process.env.INPUT_GITHUB_TOKEN || process.env.GITHUB_TOKEN,
  severity: process.env.INPUT_SEVERITY || 'all',
  maxComments: parseInt(process.env.INPUT_MAX_COMMENTS || '20', 10),
  eventPath: process.env.GITHUB_EVENT_PATH || '',
};

const AUTOMATON_API = 'https://automation.songheng.vip/v1';

async function main() {
  console.log('🔍 my-automaton Code Review Action');

  // Validate inputs
  if (!inputs.apiKey) {
    console.warn('⚠️  No API key provided. Using free tier (3 reviews/day).');
  }
  if (!inputs.githubToken) {
    console.error('❌ github-token is required');
    process.exit(1);
  }

  // Read event payload
  const eventPayload = require(inputs.eventPath);
  if (!eventPayload.pull_request) {
    console.error('❌ Not a pull_request event');
    process.exit(1);
  }

  const pr = eventPayload.pull_request;
  const repo = eventPayload.repository;
  console.log(`📋 Reviewing PR #${pr.number}: ${pr.title}`);

  // Get changed files
  const diffOutput = execSync(`git diff origin/${pr.base.ref}...HEAD --diff-filter=AM --name-only`, {
    encoding: 'utf-8',
  }).trim();

  const changedFiles = diffOutput.split('\n').filter(Boolean);
  console.log(`📁 Files changed: ${changedFiles.length}`);

  if (changedFiles.length === 0) {
    console.log('✅ No code files changed. Skipping review.');
    return;
  }

  // Filter to code files only
  const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.rb', '.php', '.c', '.cpp', '.h', '.hpp', '.cs', '.swift', '.kt', '.scala', '.vue', '.svelte'];
  const codeFiles = changedFiles.filter(f => codeExtensions.some(ext => f.endsWith(ext)));
  
  if (codeFiles.length === 0) {
    console.log('✅ No code files to review.');
    return;
  }

  console.log(`🔎 Reviewing ${codeFiles.length} code files...`);

  let allComments = [];
  let totalIssues = 0;

  for (const file of codeFiles.slice(0, 10)) { // Max 10 files per PR
    try {
      const fileContent = execSync(`git show HEAD:${file}`, { encoding: 'utf-8', maxBuffer: 1024 * 1024 }).trim();

      if (fileContent.length < 10) continue;

      // Call my-automaton API for code review
      const reviewResult = await callAutomatonAPI('review', {
        code: fileContent,
        language: getLanguageFromExtension(file),
        filename: file,
        severity: inputs.severity,
      });

      if (reviewResult && reviewResult.issues) {
        totalIssues += reviewResult.issues.length;
        
        // Create review comments for each issue
        for (const issue of reviewResult.issues.slice(0, inputs.maxComments)) {
          allComments.push({
            path: file,
            line: issue.line || 1,
            body: formatComment(issue),
          });
        }
      }

      console.log(`  ✅ ${file} — ${reviewResult?.issues?.length || 0} issues`);
    } catch (err) {
      console.warn(`  ⚠️  Error reviewing ${file}: ${err.message}`);
    }
  }

  // Post review
  if (allComments.length > 0) {
    await postReviewComments(pr.number, allComments);
    console.log(`📝 Posted ${allComments.length} comments`);
  } else {
    // Post a summary
    await postReviewSummary(pr.number, `✅ **my-automaton Review Complete**\n\nNo issues found in ${codeFiles.length} files. Clean code! 🎉`);
    console.log('✅ No issues found');
  }

  // Update commit status
  await updateCommitStatus(pr.head.sha, totalIssues === 0 ? 'success' : 'neutral', 
    totalIssues === 0 ? '✅ No issues found' : `⚠️ ${totalIssues} issues found`);
}

function formatComment(issue) {
  const severityEmoji = { 'error': '🔴', 'warning': '🟡', 'info': '🔵' }[issue.severity] || '🔵';
  let body = `${severityEmoji} **${issue.severity?.toUpperCase() || 'INFO'}**: ${issue.message}`;
  if (issue.suggestion) body += `\n\n💡 **Suggestion**: ${issue.suggestion}`;
  if (issue.rule) body += `\n\n*Rule: ${issue.rule}*`;
  body += '\n\n---\n*Reviewed by [my-automaton](https://automation.songheng.vip)*';
  return body;
}

function getLanguageFromExtension(filename) {
  const map = {
    '.js': 'javascript', '.ts': 'typescript', '.jsx': 'javascript', '.tsx': 'typescript',
    '.py': 'python', '.go': 'go', '.rs': 'rust', '.java': 'java',
    '.rb': 'ruby', '.php': 'php', '.c': 'c', '.cpp': 'cpp',
    '.h': 'c', '.hpp': 'cpp', '.cs': 'csharp', '.swift': 'swift',
    '.kt': 'kotlin', '.vue': 'vue', '.svelte': 'svelte',
  };
  const ext = '.' + filename.split('.').pop();
  return map[ext] || 'unknown';
}

async function callAutomatonAPI(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (inputs.apiKey) headers['X-API-Key'] = inputs.apiKey;

    const req = https.request(`${AUTOMATON_API}/${endpoint}`, {
      method: 'POST',
      headers,
      timeout: 60000,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve(JSON.parse(body));
          } else if (res.statusCode === 402) {
            reject(new Error('Insufficient credits. Purchase more at https://automation.songheng.vip'));
          } else {
            reject(new Error(`API error ${res.statusCode}: ${body}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

async function postReviewComments(prNumber, comments) {
  const owner = process.env.GITHUB_REPOSITORY?.split('/')[0];
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (!owner || !repo) return;

  // Post as a review with comments
  const reviewBody = {
    event: 'COMMENT',
    body: `## 🤖 my-automaton Code Review\n\nFound **${comments.length}** issue${comments.length > 1 ? 's' : ''} in this PR.`,
    comments: comments.map(c => ({
      path: c.path,
      line: c.line,
      body: c.body,
    })),
  };

  const data = JSON.stringify(reviewBody);
  const req = https.request(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${inputs.githubToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'User-Agent': 'my-automaton-code-review',
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(body); } });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function postReviewSummary(prNumber, summary) {
  const owner = process.env.GITHUB_REPOSITORY?.split('/')[0];
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (!owner || !repo) return;

  const data = JSON.stringify({ body: summary, event: 'COMMENT' });
  const req = https.request(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${inputs.githubToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'User-Agent': 'my-automaton-code-review',
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function updateCommitStatus(sha, state, description) {
  const owner = process.env.GITHUB_REPOSITORY?.split('/')[0];
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (!owner || !repo) return;

  const data = JSON.stringify({
    state,
    description,
    context: 'my-automaton/code-review',
    target_url: 'https://automation.songheng.vip',
  });

  const req = https.request(`https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${inputs.githubToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'User-Agent': 'my-automaton-code-review',
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Handle uncaught rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled error:', err.message);
  process.exit(1);
});

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
