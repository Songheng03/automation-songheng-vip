/**
 * AI Code Review Library
 * Review code for bugs, security issues, and best practices using DeepSeek AI
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.AUTOMATION_API_URL || 'https://automation.songheng.vip';
const API_KEY = process.env.AUTOMATION_API_KEY || '';

/**
 * Review code using the AI API
 * @param {string} code - The code to review
 * @param {object} options - Review options
 * @param {string} options.language - Programming language (auto-detected if not specified)
 * @param {string} options.focus - Focus area: 'bugs', 'security', 'performance', 'best-practices', 'all'
 * @returns {Promise<object>} Review results
 */
async function review(code, options = {}) {
  if (!API_KEY) {
    throw new Error('AUTOMATION_API_KEY environment variable is required. Get your key at https://automation.songheng.vip/pricing');
  }

  if (!code || typeof code !== 'string') {
    throw new Error('Code must be a non-empty string');
  }

  const language = options.language || detectLanguage(code);
  const focus = options.focus || 'all';

  const payload = JSON.stringify({
    code,
    language,
    focus,
    format: 'json'
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: new URL(API_BASE).hostname,
      port: 443,
      path: '/v1/review',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 402) {
            reject(new Error('Insufficient credits. Purchase more at https://automation.songheng.vip/pricing'));
            return;
          }
          if (res.statusCode === 401) {
            reject(new Error('Invalid API key. Get your key at https://automation.songheng.vip/pricing'));
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`API error: ${res.statusCode} - ${data}`));
            return;
          }
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Review a file
 * @param {string} filePath - Path to the file
 * @param {object} options - Review options
 * @returns {Promise<object>} Review results
 */
async function reviewFile(filePath, options = {}) {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const code = fs.readFileSync(absolutePath, 'utf-8');
  const ext = path.extname(filePath).slice(1);
  const language = options.language || ext || detectLanguage(code);

  return review(code, { ...options, language });
}

/**
 * Review multiple files
 * @param {string[]} filePaths - Array of file paths
 * @param {object} options - Review options
 * @returns {Promise<object[]>} Array of review results
 */
async function reviewFiles(filePaths, options = {}) {
  const results = [];
  
  for (const filePath of filePaths) {
    try {
      const result = await reviewFile(filePath, options);
      results.push({
        file: filePath,
        status: 'success',
        review: result
      });
    } catch (error) {
      results.push({
        file: filePath,
        status: 'error',
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Detect programming language from code
 */
function detectLanguage(code) {
  const signatures = {
    javascript: [
      /\bfunction\s+\w+\s*\(/,
      /\bconst\s+\w+\s*=/,
      /\blet\s+\w+\s*=/,
      /\bvar\s+\w+\s*=/,
      /=>\s*{/,
      /\bconsole\.log/
    ],
    python: [
      /\bdef\s+\w+\s*\(/,
      /\bimport\s+\w+/,
      /\bfrom\s+\w+\s+import/,
      /\bclass\s+\w+:/,
      /\bif\s+__name__\s*==\s*['"]__main__['"]/
    ],
    typescript: [
      /:\s*(string|number|boolean|any)\b/,
      /\binterface\s+\w+/,
      /\btype\s+\w+\s*=/,
      /\benum\s+\w+/
    ],
    java: [
      /\bpublic\s+class\s+\w+/,
      /\bprivate\s+\w+\s+\w+/,
      /\bpublic\s+static\s+void\s+main/,
      /\bSystem\.out\.print/
    ],
    go: [
      /\bpackage\s+\w+/,
      /\bfunc\s+\w+\s*\(/,
      /\bimport\s*\(/,
      /\bfmt\.Print/
    ],
    rust: [
      /\bfn\s+\w+\s*\(/,
      /\blet\s+mut\s+\w+/,
      /\bimpl\s+\w+/,
      /\buse\s+\w+::/
    ],
    c: [
      /#include\s*<\w+\.h>/,
      /\bint\s+main\s*\(/,
      /\bprintf\s*\(/,
      /\bmalloc\s*\(/
    ],
    cpp: [
      /#include\s*<\w+>/,
      /\bstd::/,
      /\bnamespace\s+\w+/,
      /\btemplate\s*</
    ],
    ruby: [
      /\bdef\s+\w+/,
      /\bclass\s+\w+\s*<\s*\w+/,
      /\bputs\s+/,
      /\bend\s*$/
    ],
    php: [
      /<\?php/,
      /\$\w+\s*=/,
      /\bfunction\s+\w+\s*\(/,
      /\becho\s+/
    ]
  };

  let maxScore = 0;
  let detected = 'text';

  for (const [lang, patterns] of Object.entries(signatures)) {
    const score = patterns.filter(p => p.test(code)).length;
    if (score > maxScore) {
      maxScore = score;
      detected = lang;
    }
  }

  return detected;
}

/**
 * Format review results for console output
 */
function formatReview(result, options = {}) {
  const format = options.format || 'text';
  
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  if (!result || !result.review) {
    return 'No review data available';
  }

  const lines = [];
  lines.push('╔═══════════════════════════════════════════════════════════╗');
  lines.push('║                    AI CODE REVIEW                         ║');
  lines.push('╚═══════════════════════════════════════════════════════════╝');
  lines.push('');

  if (result.score !== undefined) {
    const emoji = result.score >= 8 ? '✅' : result.score >= 5 ? '⚠️' : '❌';
    lines.push(`${emoji} Score: ${result.score}/10`);
    lines.push('');
  }

  if (result.summary) {
    lines.push('📋 Summary:');
    lines.push(result.summary);
    lines.push('');
  }

  if (result.issues && result.issues.length > 0) {
    lines.push(`🔍 Found ${result.issues.length} issue(s):`);
    lines.push('');
    
    result.issues.forEach((issue, i) => {
      const severity = issue.severity || 'info';
      const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🔵';
      lines.push(`${icon} ${issue.type || 'Issue'}: ${issue.message}`);
      if (issue.line) lines.push(`   Line: ${issue.line}`);
      if (issue.suggestion) lines.push(`   Suggestion: ${issue.suggestion}`);
      lines.push('');
    });
  } else {
    lines.push('✅ No issues found!');
    lines.push('');
  }

  if (result.recommendations && result.recommendations.length > 0) {
    lines.push('💡 Recommendations:');
    result.recommendations.forEach((rec, i) => {
      lines.push(`   ${i + 1}. ${rec}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  review,
  reviewFile,
  reviewFiles,
  detectLanguage,
  formatReview
};
