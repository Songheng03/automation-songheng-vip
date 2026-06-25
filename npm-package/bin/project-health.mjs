#!/usr/bin/env node
/**
 * 🔬 Project Health Scanner — my-automaton
 * 
 * Zero-dependency CLI that scans any project directory and generates
 * a health report with actionable recommendations.
 * 
 * 100% offline — no API calls needed for core analysis.
 * Optional: connect to my-automaton Gateway for AI-powered deep analysis.
 * 
 * Usage:
 *   npx my-automaton-health ./my-project
 *   npx my-automaton-health . --format json
 *   npx my-automaton-health . --deep   # uses Gateway AI analysis
 */

import { readdir, readFile, stat, access } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';

// ─── Configuration ───────────────────────────────────────────
const GATEWAY_URL = process.env.AUTOMATON_GATEWAY || 'https://automation.songheng.vip';
const API_KEY = process.env.AUTOMATON_API_KEY || '';

// ─── Heuristic Rules ─────────────────────────────────────────
const BEST_PRACTICES = {
  // Files that should exist in a healthy project
  expectedFiles: [
    { file: 'README.md', points: 15, missing: 'No README.md — projects without docs are 3x less likely to be used' },
    { file: '.gitignore', points: 10, missing: 'No .gitignore — risking committing secrets and build artifacts' },
    { file: 'LICENSE', points: 10, missing: 'No LICENSE file — unclear usage rights scare away contributors' },
    { file: 'package.json', points: 0, optional: true, missing: null },
    { file: '.github/workflows', points: 5, optional: true, missing: 'No CI/CD — automate your tests and deploys!' },
    { file: '.editorconfig', points: 3, optional: true, missing: null },
    { file: 'CHANGELOG.md', points: 5, optional: true, missing: 'No CHANGELOG — users don\'t know what changed between versions' },
    { file: 'CONTRIBUTING.md', points: 5, optional: true, missing: 'No CONTRIBUTING guide — missed opportunity for community growth' },
  ],
  
  // Security patterns to flag
  securityChecks: [
    { pattern: /API[_-]?KEY\s*=\s*['"][^'"]+['"]/gi, severity: 'critical', message: 'Hardcoded API key detected! Use environment variables.' },
    { pattern: /SECRET\s*=\s*['"][^'"]+['"]/gi, severity: 'critical', message: 'Hardcoded secret detected! Move to .env immediately.' },
    { pattern: /password\s*=\s*['"][^'"]+['"]/gi, severity: 'critical', message: 'Hardcoded password found! This is a security vulnerability.' },
    { pattern: /mongodb:\/\/[^:]+:[^@]+@/gi, severity: 'critical', message: 'MongoDB connection string with credentials in source code!' },
    { pattern: /eval\s*\(/gi, severity: 'high', message: 'eval() usage detected — code injection risk' },
    { pattern: /innerHTML\s*=/gi, severity: 'high', message: 'innerHTML assignment — potential XSS vector' },
    { pattern: /dangerouslySetInnerHTML/gi, severity: 'high', message: 'dangerouslySetInnerHTML — React XSS risk' },
    { pattern: /exec\s*\(\s*['"][^'"]*\$[{(]/gi, severity: 'high', message: 'Shell exec with user input — command injection risk' },
    { pattern: /\.execute\s*\(\s*['"][^'"]*\$/gi, severity: 'medium', message: 'SQL query with string interpolation — SQL injection risk' },
    { pattern: /TODO|FIXME|HACK|XXX/gi, severity: 'info', message: 'Technical debt markers found — track these in issues' },
  ],
  
  // Dependency health checks (for package.json)
  depWarnings: [
    { name: 'left-pad', severity: 'high', message: 'left-pad detected — this package was famously yanked and broke the internet' },
    { name: 'event-stream', severity: 'high', message: 'event-stream — had a malicious dependency injection in 2018' },
    { name: 'flatmap-stream', severity: 'critical', message: 'flatmap-stream — known malicious package' },
    { name: 'eslint-scope', version: '3.7.2', severity: 'critical', message: 'eslint-scope 3.7.2 was compromised — update immediately' },
  ],
};

// ─── Scoring ──────────────────────────────────────────────────
const SCORE_WEIGHTS = {
  docs: 25,
  security: 30,
  dependencies: 20,
  structure: 15,
  testing: 10,
};

// ─── Color Output ─────────────────────────────────────────────
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  redBg: '\x1b[41m',
  greenBg: '\x1b[42m',
  yellowBg: '\x1b[43m',
};

const GRADE_LETTERS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
const GRADE_COLORS = [COLORS.red, COLORS.red, COLORS.yellow, COLORS.yellow, COLORS.cyan, COLORS.green, COLORS.magenta];
const GRADE_EMOJI = ['💀', '😰', '😬', '🤔', '👍', '✨', '👑'];

function color(c, text) { return `${c}${text}${COLORS.reset}`; }
function gradeLetter(score) {
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  if (score >= 20) return 'E';
  return 'F';
}

// ─── Main Scanner ─────────────────────────────────────────────
async function scan(targetPath, options = {}) {
  const results = {
    path: targetPath,
    score: 100,
    maxScore: 100,
    grade: 'A',
    files: [],
    issues: [],
    suggestions: [],
    stats: {},
    securityFindings: [],
    depIssues: [],
    timestamp: new Date().toISOString(),
  };

  try {
    await access(targetPath);
  } catch {
    return { error: `Directory not found: ${targetPath}`, score: 0, grade: 'F' };
  }

  // Collect all files
  const allFiles = await walkDir(targetPath, '', 50);
  results.files = allFiles;
  results.stats.totalFiles = allFiles.length;

  // Check expected files
  let docsScore = SCORE_WEIGHTS.docs;
  for (const { file, points, missing, optional } of BEST_PRACTICES.expectedFiles) {
    const exists = await fileExists(join(targetPath, file));
    if (exists) {
      results.stats[`has_${file.replace(/[.\/]/g, '_')}`] = true;
    } else if (!optional && missing) {
      results.score -= points;
      results.issues.push({ type: 'missing_file', file, message: missing, severity: points > 8 ? 'high' : 'medium' });
    } else if (missing) {
      results.suggestions.push({ type: 'missing_optional', file, message: missing });
    }
  }

  // Analyze file types
  const extCounts = {};
  let totalLines = 0;
  let jsFiles = [];
  for (const f of allFiles) {
    const ext = f.split('.').pop()?.toLowerCase() || '';
    extCounts[ext] = (extCounts[ext] || 0) + 1;
    if (['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'].includes(ext)) {
      jsFiles.push(f);
    }
  }
  results.stats.fileTypes = extCounts;
  results.stats.jsFiles = jsFiles.length;

  // Security scan on JS/TS files
  let securityScore = SCORE_WEIGHTS.security;
  const scannedFiles = jsFiles.slice(0, 20); // Limit to avoid slow scans
  for (const f of scannedFiles) {
    try {
      const content = await readFile(join(targetPath, f), 'utf-8');
      totalLines += content.split('\n').length;
      
      for (const { pattern, severity, message } of BEST_PRACTICES.securityChecks) {
        const matches = content.match(pattern);
        if (matches) {
          const deduped = [...new Set(matches)].slice(0, 3);
          for (const match of deduped) {
            const trimmed = match.length > 60 ? match.slice(0, 57) + '...' : match;
            if (severity === 'critical' || severity === 'high') {
              results.score -= severity === 'critical' ? 10 : 5;
            }
            results.securityFindings.push({ file: f, finding: trimmed, severity, message });
          }
        }
      }
    } catch {}
  }
  results.stats.totalLines = totalLines;

  // Check package.json for dependency issues
  try {
    const pkg = JSON.parse(await readFile(join(targetPath, 'package.json'), 'utf-8'));
    results.stats.hasPackageJson = true;
    results.stats.projectName = pkg.name || basename(targetPath);
    results.stats.dependencies = Object.keys(pkg.dependencies || {}).length + 
                                Object.keys(pkg.devDependencies || {}).length;
    
    // Check for outdated patterns
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    for (const [name, version] of Object.entries(allDeps)) {
      for (const warn of BEST_PRACTICES.depWarnings) {
        if (name === warn.name && (!warn.version || version === warn.version)) {
          results.score -= 10;
          results.depIssues.push({ name, version, severity: warn.severity, message: warn.message });
        }
      }
    }
    
    // Check if using deprecated packages
    const deprecated = ['request', 'hoek', 'cryptiles', 'babel-eslint', 'gulp-util', 'phantomjs'];
    for (const dep of deprecated) {
      if (allDeps[dep]) {
        results.score -= 3;
        results.depIssues.push({ name: dep, severity: 'medium', message: `${dep} is deprecated — consider migrating` });
      }
    }
    
    // Check for lockfile
    const hasLock = await fileExists(join(targetPath, 'package-lock.json')) || 
                    await fileExists(join(targetPath, 'yarn.lock')) ||
                    await fileExists(join(targetPath, 'pnpm-lock.yaml'));
    if (!hasLock) {
      results.score -= 5;
      results.issues.push({ type: 'missing_lockfile', message: 'No lockfile — builds may be non-deterministic' });
    }
  } catch {
    // No package.json — not a JS project
  }

  // Size analysis
  const totalSize = allFiles.length > 0 ? 'small' : 'empty';
  if (allFiles.length > 500) results.suggestions.push({ message: 'Large project — consider splitting into monorepo packages' });
  if ((extCounts['js'] || 0) > 100) results.suggestions.push({ message: '100+ JS files — consider TypeScript migration for type safety' });

  // Final score clamping
  results.score = Math.max(0, Math.min(100, results.score));
  results.grade = gradeLetter(results.score);
  
  return results;
}

// ─── Helpers ──────────────────────────────────────────────────
async function walkDir(dir, prefix, maxDepth) {
  if (maxDepth <= 0) return [];
  const results = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      
      // Skip noise
      if (entry.name.startsWith('.') && entry.name !== '.gitignore' && entry.name !== '.github' && entry.name !== '.editorconfig') continue;
      if (['node_modules', 'dist', 'build', '.git', '__pycache__', 'coverage', '.next', '.nuxt'].includes(entry.name)) continue;
      
      if (entry.isDirectory()) {
        const nested = await walkDir(fullPath, relPath, maxDepth - 1);
        results.push(...nested);
      } else if (entry.isFile()) {
        results.push(relPath);
      }
    }
  } catch {}
  return results;
}

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

// ─── Output Formatters ────────────────────────────────────────
function formatTerminal(results) {
  if (results.error) {
    return `${color(COLORS.red, '✖')} ${results.error}\n`;
  }

  const g = results.grade;
  const gi = GRADE_LETTERS.indexOf(g);
  const gc = GRADE_COLORS[gi];
  const ge = GRADE_EMOJI[gi];

  let out = '\n';
  out += color(COLORS.bold, '╔══════════════════════════════════════════╗\n');
  out += color(COLORS.bold, '║     🔬  PROJECT HEALTH SCANNER          ║\n');
  out += color(COLORS.bold, '║        my-automaton.ai                  ║\n');
  out += color(COLORS.bold, '╚══════════════════════════════════════════╝\n');
  out += '\n';
  
  // Grade badge
  out += `  ${color(COLORS.bold, 'Project:')} ${color(COLORS.cyan, results.stats.projectName || basename(results.path))}\n`;
  out += `  ${color(COLORS.bold, 'Score:')}   ${color(gc, `${results.score}/100`)}  ${ge}\n`;
  out += `  ${color(COLORS.bold, 'Grade:')}   ${color(gc, color(COLORS.bold, ` ${g} `))}\n`;
  out += '\n';

  // Quick stats
  out += color(COLORS.bold, '  ── Quick Stats ──\n');
  out += `  Files:     ${results.stats.totalFiles}\n`;
  out += `  JS Files:  ${results.stats.jsFiles || 0}\n`;
  if (results.stats.totalLines) out += `  Lines:     ${results.stats.totalLines.toLocaleString()}\n`;
  if (results.stats.dependencies) out += `  Deps:      ${results.stats.dependencies}\n`;
  out += '\n';

  // Issues
  if (results.issues.length > 0) {
    out += color(COLORS.bold, `  ${color(COLORS.red, '─ Issues ─')} (${results.issues.length})\n`);
    for (const issue of results.issues.slice(0, 5)) {
      const icon = issue.severity === 'high' ? '🔴' : '🟡';
      out += `  ${icon} ${issue.message}\n`;
    }
    if (results.issues.length > 5) {
      out += `  ${color(COLORS.dim, `  ...and ${results.issues.length - 5} more`)}\n`;
    }
    out += '\n';
  }

  // Security findings
  if (results.securityFindings.length > 0) {
    const criticals = results.securityFindings.filter(f => f.severity === 'critical');
    out += color(COLORS.bold, `  ${color(COLORS.red, '─ Security ─')} (${results.securityFindings.length} findings)\n`);
    for (const f of criticals.slice(0, 3)) {
      out += `  🚨 ${color(COLORS.red, f.severity.toUpperCase())}: ${f.message}\n`;
      out += `     ${color(COLORS.dim, `in ${f.file}: ${f.finding}`)}\n`;
    }
    if (results.securityFindings.length > 0) {
      out += `  ${color(COLORS.dim, `  Run with --deep for AI-powered security analysis`)}\n`;
    }
    out += '\n';
  }

  // Suggestions
  if (results.suggestions.length > 0) {
    out += color(COLORS.bold, `  ${color(COLORS.yellow, '─ Suggestions ─')}\n`);
    for (const s of results.suggestions.slice(0, 3)) {
      out += `  💡 ${s.message}\n`;
    }
    out += '\n';
  }

  // Shareable badge
  const badgeUrl = `https://img.shields.io/badge/health-${results.grade}-${results.score >= 70 ? 'brightgreen' : results.score >= 40 ? 'yellow' : 'red'}?style=for-the-badge&logo=robot&logoColor=white`;
  out += color(COLORS.bold, '  ── Shareable Badge ──\n');
  out += `  ${color(COLORS.dim, badgeUrl)}\n`;
  out += '\n';

  // CTA
  if (results.score < 90 || results.securityFindings.length > 0) {
    out += color(COLORS.bold, '  ── Upgrade ──\n');
    out += `  ${color(COLORS.yellow, '⚡ Get AI-powered deep analysis:')}\n`;
    out += `  ${color(COLORS.dim, 'export AUTOMATON_API_KEY=am_YOUR_KEY')}\n`;
    out += `  ${color(COLORS.dim, 'npx my-automaton-health . --deep')}\n`;
    out += `  ${color(COLORS.dim, `Get a free API key: ${GATEWAY_URL}`)}\n`;
    out += '\n';
  }

  out += color(COLORS.dim, '  my-automaton  •  automation.songheng.vip  •  MIT\n');
  out += '\n';

  return out;
}

function formatJson(results) {
  return JSON.stringify(results, null, 2) + '\n';
}

function formatMarkdown(results) {
  const g = results.grade;
  const ge = GRADE_EMOJI[GRADE_LETTERS.indexOf(g)];
  let md = '';
  md += `# 🔬 Project Health Report\n\n`;
  md += `**Project:** ${results.stats.projectName || basename(results.path)}  \n`;
  md += `**Grade:** ${ge} ${g} (${results.score}/100)  \n`;
  md += `**Files:** ${results.stats.totalFiles}  \n`;
  md += `**Generated:** ${new Date(results.timestamp).toISOString()}\n\n`;
  
  if (results.issues.length) {
    md += `## Issues\n\n`;
    for (const i of results.issues) md += `- ❌ ${i.message}\n`;
    md += '\n';
  }
  
  if (results.securityFindings.length) {
    md += `## Security Findings\n\n`;
    for (const f of results.securityFindings) {
      md += `- 🚨 **${f.severity.toUpperCase()}**: ${f.message} (\`${f.file}\`)\n`;
    }
    md += '\n';
  }

  md += `## Badge\n\n`;
  md += `![Health ${g}](https://img.shields.io/badge/health-${g}-${results.score >= 70 ? 'brightgreen' : results.score >= 40 ? 'yellow' : 'red'}?style=for-the-badge&logo=robot&logoColor=white)\n\n`;
  md += `---\n`;
  md += `*Scanned by [my-automaton](https://automation.songheng.vip) — AI-powered code health analysis*\n`;
  return md;
}

// ─── CLI ──────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${color(COLORS.bold, '🔬 my-automaton Project Health Scanner')}

${color(COLORS.dim, 'Zero-dependency CLI that grades your project\'s health.')}

${color(COLORS.bold, 'Usage:')}
  npx my-automaton-health <path>            Scan a directory
  npx my-automaton-health .                 Scan current directory
  npx my-automaton-health . --format json   JSON output
  npx my-automaton-health . --format md     Markdown report
  npx my-automaton-health . --deep          AI-powered deep analysis

${color(COLORS.bold, 'Environment:')}
  AUTOMATON_API_KEY    Your my-automaton API key (for --deep)
  AUTOMATON_GATEWAY    Gateway URL (default: ${GATEWAY_URL})

${color(COLORS.bold, 'Get a free API key:')}
  ${color(COLORS.cyan, GATEWAY_URL)}

${color(COLORS.dim, 'my-automaton  •  MIT  •  automation.songheng.vip')}
`);
    process.exit(0);
  }

  const targetPath = args.find(a => !a.startsWith('-')) || '.';
  const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'terminal';
  const deep = args.includes('--deep');

  const results = await scan(targetPath, { deep });

  if (deep && API_KEY) {
    // Deep analysis via Gateway
    try {
      const resp = await fetch(`${GATEWAY_URL}/free/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({ 
          text: `Health scan results:\n${JSON.stringify(results, null, 2)}\n\nProvide 3 specific recommendations.`,
          mode: 'analyze'
        }),
      });
      if (resp.ok) {
        const ai = await resp.json();
        results.aiAnalysis = ai;
      }
    } catch {
      results.aiAnalysis = { error: 'Gateway unreachable — try again when tunnel is up' };
    }
  }

  switch (format) {
    case 'json': console.log(formatJson(results)); break;
    case 'md':
    case 'markdown': console.log(formatMarkdown(results)); break;
    default: console.log(formatTerminal(results));
  }

  process.exit(results.score >= 50 ? 0 : 1);
}

await main();
