#!/usr/bin/env node
// Viral Code Quality Scanner - client-side XSS/SQLi/hardcoded-secret detector
// Run with: node viral-scanner.mjs
// No server needed - works offline

const fs = require('fs');
const path = require('path');

const RULES = {
  sql_injection: {
    pattern: /\+\s*(req\.(query|body|params)|process\.env|document\.)|execute\(\s*['"]\s*SELECT|\.query\(\s*['"]\s*SELECT.*\+/gi,
    severity: 'CRITICAL',
    message: 'Potential SQL injection via string concatenation'
  },
  xss: {
    pattern: /innerHTML\s*=|dangerouslySetInnerHTML|document\.write\(|eval\(/gi,
    severity: 'HIGH',
    message: 'Potential XSS vulnerability (innerHTML, eval, or document.write)'
  },
  hardcoded_secret: {
    pattern: /(api_?key|secret|password|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{8,}['"]/gi,
    severity: 'CRITICAL',
    message: 'Hardcoded secret/API key/password found'
  },
  no_error_handling: {
    pattern: /fetch\(.*\)\s*\.then\(.*\)\s*(?!.*\.catch)/g,
    severity: 'MEDIUM',
    message: 'Unhandled promise rejection - missing .catch()'
  },
  eval_usage: {
    pattern: /\beval\(/g,
    severity: 'HIGH',
    message: 'eval() usage — dangerous code execution'
  },
  console_log: {
    pattern: /console\.(log|debug)\(/g,
    severity: 'LOW',
    message: 'console.log in production code'
  },
  deep_nesting: {
    severity: 'MEDIUM',
    check: (content, lines) => {
      const issues = [];
      lines.forEach((line, i) => {
        const depth = (line.match(/^\s*/)[0].length);
        if (depth > 60) issues.push({line: i+1, message: `Deep nesting (${depth} spaces)`});
      });
      return issues;
    }
  },
  missing_semicolons: {
    severity: 'LOW',
    check: (content, lines) => {
      const issues = [];
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*') 
            && !trimmed.endsWith('{') && !trimmed.endsWith('}') && !trimmed.endsWith(';')
            && !trimmed.endsWith(',') && !trimmed.startsWith('if') && !trimmed.startsWith('else')
            && !trimmed.startsWith('for') && !trimmed.startsWith('while')
            && trimmed.match(/[a-zA-Z0-9\)\]'"`]$/)) {
          issues.push({line: i+1, message: 'Missing semicolon'});
        }
      });
      return issues.slice(0, 5); // limit noise
    }
  }
};

function scanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.js','.ts','.jsx','.tsx','.mjs','.cjs'].includes(ext)) return null;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  
  Object.entries(RULES).forEach(([ruleId, rule]) => {
    if (rule.check) {
      const results = rule.check(content, lines);
      results.forEach(r => issues.push({rule: ruleId, severity: rule.severity, line: r.line, message: r.message}));
    } else if (rule.pattern) {
      let match;
      while ((match = rule.pattern.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        issues.push({rule: ruleId, severity: rule.severity, line: lineNum, message: rule.message, found: match[0].substring(0, 50)});
        if (issues.length > 50) break;
      }
    }
  });
  
  return {file: filePath, lines: lines.length, issues};
}

function gradeIssues(issues) {
  const critical = issues.filter(i => i.severity === 'CRITICAL').length;
  const high = issues.filter(i => i.severity === 'HIGH').length;
  const medium = issues.filter(i => i.severity === 'MEDIUM').length;
  const low = issues.filter(i => i.severity === 'LOW').length;
  const score = critical * 10 + high * 5 + medium * 2 + low;
  
  if (critical === 0 && high === 0 && medium <= 1) return 'A+';
  if (critical === 0 && high === 0 && medium <= 3) return 'A';
  if (critical === 0 && high <= 1) return 'B+';
  if (critical === 0 && high <= 3) return 'B';
  if (critical <= 1 && high <= 5) return 'C';
  if (critical <= 3) return 'D';
  return 'F';
}

function scanDir(dir) {
  const results = [];
  
  function walk(d) {
    try {
      const entries = fs.readdirSync(d, {withFileTypes: true});
      for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else {
          const r = scanFile(full);
          if (r) results.push(r);
        }
      }
    } catch(e) {}
  }
  
  walk(dir);
  return results;
}

// Main
const target = process.argv[2] || '.';
const results = scanDir(target);

console.log('\n🔍 VIRAL CODE QUALITY SCANNER');
console.log('═══════════════════════════════\n');

let totalIssues = 0;
const allIssues = [];

results.forEach(r => {
  const grade = gradeIssues(r.issues);
  const emoji = grade.startsWith('A') ? '🟢' : grade.startsWith('B') ? '🟡' : grade.startsWith('C') ? '🟠' : '🔴';
  console.log(`${emoji} ${grade}  ${r.file}  (${r.lines} lines, ${r.issues.length} issues)`);
  
  r.issues.forEach(i => {
    console.log(`   ⚠️  [${i.severity}] L${i.line}: ${i.message}${i.found ? ' → ' + i.found : ''}`);
  });
  
  totalIssues += r.issues.length;
  allIssues.push({file: r.file, grade, issues: r.issues.length, lines: r.lines});
});

console.log(`\n📊 Scanned ${results.length} files, ${totalIssues} issues found`);
if (allIssues.length > 0) {
  const avg = allIssues.reduce((s,r) => {
    const g = r.grade.startsWith('A') ? 5 : r.grade.startsWith('B') ? 4 : r.grade.startsWith('C') ? 3 : r.grade.startsWith('D') ? 2 : 1;
    return s + g;
  }, 0) / allIssues.length;
  
  const overall = avg >= 4.5 ? 'A+' : avg >= 4 ? 'A' : avg >= 3.5 ? 'B+' : avg >= 3 ? 'B' : avg >= 2 ? 'C' : avg >= 1 ? 'D' : 'F';
  console.log(`🏆 Overall Grade: ${overall}`);
  console.log(`\n📋 Badge: [![Code Quality](https://automation.songheng.vip/badge.svg?grade=${overall})](https://automation.songheng.vip/code-grader.html)`);
}
console.log('\n🔗 Share your grade: https://automation.songheng.vip/code-grader.html\n');
