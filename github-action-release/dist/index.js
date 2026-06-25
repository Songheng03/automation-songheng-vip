const core = require('@actions/core');
const github = require('@actions/github');
const https = require('https');
const http = require('http');

async function run() {
  try {
    const apiKey = core.getInput('api-key', { required: true });
    const apiEndpoint = core.getInput('api-endpoint') || 'https://automation.songheng.vip';
    const reviewLevel = core.getInput('review-level') || 'standard';
    const maxFiles = parseInt(core.getInput('max-files') || '10');
    const token = core.getInput('github-token') || process.env.GITHUB_TOKEN;
    
    const context = github.context;
    
    // Only run on pull_request events
    if (!context.payload.pull_request) {
      core.info('Not a pull_request event, skipping review');
      return;
    }
    
    const pr = context.payload.pull_request;
    const prNumber = pr.number;
    const baseRef = pr.base.sha;
    const headRef = pr.head.sha;
    
    core.info(`Reviewing PR #${prNumber}: ${pr.title}`);
    
    // Get the PR diff using GitHub API
    const octokit = github.getOctokit(token);
    const diff = await getPRDiff(octokit, context);
    
    if (!diff) {
      core.warning('Could not get PR diff');
      return;
    }
    
    // Split diff by file
    const files = splitDiffByFile(diff);
    core.info(`Found ${files.length} changed files (limit: ${maxFiles})`);
    
    const filesToReview = files.slice(0, maxFiles);
    let totalIssues = 0;
    let comments = [];
    
    // Review each file
    for (const file of filesToReview) {
      core.info(`Reviewing: ${file.filename}`);
      
      try {
        const result = await reviewCode(apiEndpoint, apiKey, file.content, file.filename, reviewLevel);
        
        if (result && result.review) {
          const fileIssues = parseReviewResult(result.review, file.filename);
          totalIssues += fileIssues.length;
          comments.push(...fileIssues);
        }
      } catch (err) {
        core.warning(`Failed to review ${file.filename}: ${err.message}`);
      }
    }
    
    // Post review summary comment
    const summary = generateSummary(comments, totalIssues, filesToReview.length, reviewLevel);
    
    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: prNumber,
      body: summary
    });
    
    // Post inline comments for specific issues
    if (comments.length > 0) {
      for (const comment of comments.slice(0, 20)) { // Limit to 20 inline comments
        try {
          await octokit.rest.pulls.createReviewComment({
            ...context.repo,
            pull_number: prNumber,
            commit_id: headRef,
            path: comment.path,
            body: comment.body,
            position: comment.position || 1
          });
          // Rate limit: 1 comment per second
          await sleep(1000);
        } catch (err) {
          core.debug(`Could not post inline comment: ${err.message}`);
        }
      }
    }
    
    core.setOutput('review-summary', `Reviewed ${filesToReview.length} files, found ${totalIssues} issues`);
    core.setOutput('files-reviewed', filesToReview.length.toString());
    core.setOutput('issues-found', totalIssues.toString());
    
    core.info(`Review complete: ${filesToReview.length} files reviewed, ${totalIssues} issues found`);
    
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getPRDiff(octokit, context) {
  const response = await octokit.rest.pulls.get({
    ...context.repo,
    pull_number: context.payload.pull_request.number,
    mediaType: { format: 'diff' }
  });
  return response.data;
}

function splitDiffByFile(diff) {
  const files = [];
  const parts = diff.split(/^diff --git /m);
  
  for (const part of parts.slice(1)) { // Skip first empty split
    const filenameMatch = part.match(/^a\/(.+?) b\//);
    if (!filenameMatch) continue;
    
    const filename = filenameMatch[1];
    // Skip binary files, lock files, and very large files
    if (filename.match(/\.(png|jpg|gif|ico|woff|ttf|eot|svg)$/i)) continue;
    if (filename.match(/(package-lock\.json|yarn\.lock|Cargo\.lock|go\.sum)$/i)) continue;
    if (part.length > 50000) continue; // Skip files with huge diffs
    
    files.push({
      filename: filename,
      content: part.trim()
    });
  }
  
  return files;
}

function reviewCode(endpoint, apiKey, code, filename, level) {
  return new Promise((resolve, reject) => {
    const url = new URL('/v1/review', endpoint);
    const client = url.protocol === 'https:' ? https : http;
    
    const body = JSON.stringify({
      text: code,
      mode: 'review',
      filename: filename,
      level: level
    });
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 402) {
          reject(new Error('Insufficient API credits. Please purchase more at https://automation.songheng.vip'));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`API returned ${res.statusCode}: ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse API response'));
        }
      });
    });
    
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function parseReviewResult(review, filename) {
  const issues = [];
  
  // Parse the review text for structured issues
  const lines = review.split('\n');
  let currentSection = '';
  let currentIssue = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect section headers
    if (trimmed.match(/^(security|quality|performance|style|best.?practices)/i)) {
      currentSection = trimmed.replace(/[:\-]$/, '').toLowerCase();
      continue;
    }
    
    // Detect bullet points as issues
    if (trimmed.match(/^[\-\*•]\s+/) || trimmed.match(/^\d+[\.\)]\s+/)) {
      if (currentIssue) {
        issues.push({
          path: filename,
          body: `**AI Review** (${currentSection || 'general'}):\n\n${currentIssue}`,
          position: 1
        });
      }
      currentIssue = trimmed.replace(/^[\-\*•\d\.\)]+\s*/, '');
    } else if (currentIssue && trimmed) {
      currentIssue += '\n' + trimmed;
    }
  }
  
  // Don't forget the last issue
  if (currentIssue) {
    issues.push({
      path: filename,
      body: `**AI Review** (${currentSection || 'general'}):\n\n${currentIssue}`,
      position: 1
    });
  }
  
  return issues;
}

function generateSummary(comments, totalIssues, filesReviewed, level) {
  const emoji = totalIssues === 0 ? '✅' : totalIssues < 5 ? '⚠️' : '🔴';
  
  return `## ${emoji} AI Code Review Summary

| Metric | Value |
|--------|-------|
| Files Reviewed | ${filesReviewed} |
| Issues Found | ${totalIssues} |
| Review Level | ${level} |
| Powered by | [my-automaton](https://automation.songheng.vip) |

${totalIssues > 0 ? `### Issues Found\n\n${comments.slice(0, 10).map((c, i) => `${i + 1}. **${c.path}**: ${c.body.substring(0, 100)}...`).join('\n')}` : '🎉 No significant issues found! Your code looks great.'}

---

<details>
<summary>About this review</summary>

This automated review was powered by **my-automaton** AI code review service.
- 🚀 Fast: Reviews complete in seconds
- 🔒 Secure: Your code is never stored
- 💰 Cost-effective: 5¢ per review with x402 USDC payments

[Get your API key](https://automation.songheng.vip) | [Documentation](https://automation.songheng.vip/api-docs.html)
</details>

*Review completed at ${new Date().toISOString()}*`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

run();
