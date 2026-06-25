const fs = require('fs');
const https = require('https');
const http = require('http');

const data = JSON.parse(fs.readFileSync('directory-submissions.json', 'utf-8'));
const submissions = data.submissions || {};
const targetDirectories = data.target_directories || [];
const results = {};

function headRequest(url, timeout = 10000) {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ status: 'no-url', statusCode: null, error: 'No URL provided' });
      return;
    }

    const urlObj = new URL(url);
    const mod = urlObj.protocol === 'https:' ? https : http;
    const options = {
      method: 'HEAD',
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      timeout,
      rejectUnauthorized: false,
    };

    const req = mod.request(options, (res) => {
      resolve({ status: 'reachable', statusCode: res.statusCode, error: null });
    });

    req.on('error', (err) => {
      resolve({ status: 'unreachable', statusCode: null, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'timeout', statusCode: null, error: 'Request timed out' });
    });

    req.end();
  });
}

async function main() {
  const summary = {
    total: targetDirectories.length,
    submitted: 0,
    verified_live: 0,
    pending: 0,
    error: 0,
    manual: 0,
    entries: {}
  };

  for (const [name, entry] of Object.entries(submissions)) {
    const result = {
      status: entry.status,
      reason: entry.reason || null,
      submission_url: entry.submission_url || null,
      verified: null,
      statusCode: null,
      error: null
    };

    if (entry.status === 'submitted') {
      summary.submitted++;
      const url = entry.submission_url || entry.directory_url || null;
      const headResult = await headRequest(url);
      result.verified = headResult.status === 'reachable' ? 'live' : 'dead';
      result.statusCode = headResult.statusCode;
      result.error = headResult.error;
      if (headResult.status === 'reachable') {
        summary.verified_live++;
      } else {
        summary.error++;
      }
    } else if (entry.status === 'pending' || entry.status === 'error') {
      if (entry.status === 'pending') summary.pending++;
      if (entry.status === 'error') summary.error++;
      result.verified = entry.status;
    } else if (entry.status === 'manual-required') {
      summary.manual++;
      result.verified = 'manual-required';
    } else {
      result.verified = entry.status || 'unknown';
    }

    results[name] = result;
    summary.entries[name] = result;
  }

  // Write results back to JSON, updating statuses
  const outputData = { ...data };
  for (const [name, entry] of Object.entries(outputData.submissions || {})) {
    if (results[name]) {
      entry.verified = results[name].verified;
      if (results[name].statusCode !== null) {
        entry.statusCode = results[name].statusCode;
      }
      if (results[name].error) {
        entry.lastError = results[name].error;
      }
    }
  }

  fs.writeFileSync('directory-submissions.json', JSON.stringify(outputData, null, 2) + '\n');
  fs.writeFileSync('submission-summary.md', generateMarkdown(summary));
  console.log('Summary:', JSON.stringify(summary, null, 2));
}

function generateMarkdown(summary) {
  let md = `# Submission Validation Summary\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `## Overview\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|------:|\n`;
  md += `| Total Directories | ${summary.total} |\n`;
  md += `| Submitted | ${summary.submitted} |\n`;
  md += `| Verified Live | ${summary.verified_live} |\n`;
  md += `| Pending | ${summary.pending} |\n`;
  md += `| Error | ${summary.error} |\n`;
  md += `| Manual Required | ${summary.manual} |\n\n`;

  md += `## Entry Details\n\n`;
  md += `| Directory | Status | Verified | URL | Notes |\n`;
  md += `|-----------|--------|----------|-----|-------|\n`;

  for (const [name, entry] of Object.entries(summary.entries)) {
    const url = entry.submission_url || '—';
    const notes = entry.reason || entry.error || '—';
    md += `| ${name} | ${entry.status} | ${entry.verified} | ${url} | ${notes} |\n`;
  }

  md += `\n## Next Steps\n\n`;
  const steps = [];
  if (summary.submitted > 0 && summary.verified_live > 0) {
    steps.push(`- ${summary.verified_live} submitted directories verified as reachable.`);
  }
  if (summary.submitted > 0 && summary.verified_live < summary.submitted) {
    steps.push(`- Investigate ${summary.submitted - summary.verified_live} submitted directories that are unreachable.`);
  }
  if (summary.manual > 0) {
    steps.push(`- Complete manual submissions for ${summary.manual} directories requiring manual intervention.`);
  }
  if (summary.pending > 0) {
    steps.push(`- Follow up on ${summary.pending} pending submissions.`);
  }
  if (summary.error > 0) {
    steps.push(`- Address ${summary.error} entries with errors.`);
  }
  if (steps.length === 0) {
    steps.push('- All directories have been processed. Review and plan next actions.');
  }
  md += steps.join('\n');
  md += '\n';

  return md;
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
