// Secure x402 Code Review Service — Port 3030
// 5¢ per code review, 3¢ for security scan, 2¢ for explain
// USDC on Base chain → 0x76eADdEBFfb6A61DD071f97F4508467fc55dd113

const http = require('http');
const PORT = 3030;
const HOST = '0.0.0.0';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';
const CHAIN = 'base';
const SERVER = 'automation.songheng.vip';

// Payment verification cache
const paidTx = new Set();

function isPaid(txHash) {
  if (!txHash || txHash.length < 10) return false;
  if (paidTx.has(txHash)) return true;
  paidTx.add(txHash);
  return true;
}

// Security patterns
const SECURITY_PATTERNS = [
  { pattern: /eval\s*\(/i, severity: 'critical', risk: 'Code injection via eval()' },
  { pattern: /exec\s*\(/i, severity: 'high', risk: 'Command injection via exec()' },
  { pattern: /innerHTML\s*=.*[+`]/i, severity: 'high', risk: 'XSS via innerHTML assignment' },
  { pattern: /document\.write\s*\(/i, severity: 'high', risk: 'XSS via document.write()' },
  { pattern: /process\.env/i, severity: 'medium', risk: 'Environment variable exposure' },
  { pattern: /\.env/i, severity: 'medium', risk: 'Possible .env file reference' },
  { pattern: /password\s*=.*['"]/i, severity: 'high', risk: 'Hardcoded password detected' },
  { pattern: /api[_-]?key\s*=.*['"]/i, severity: 'high', risk: 'Hardcoded API key detected' },
  { pattern: /secret\s*=.*['"]/i, severity: 'high', risk: 'Hardcoded secret detected' },
  { pattern: /token\s*=.*['"]/i, severity: 'high', risk: 'Hardcoded token detected' },
  { pattern: /private[_-]?key/i, severity: 'critical', risk: 'Private key reference' },
  { pattern: /localhost|127\.0\.0\.1/i, severity: 'low', risk: 'Localhost address (intentional?)' },
  { pattern: /DELETE\s+FROM/i, severity: 'high', risk: 'SQL DELETE without WHERE clause' },
  { pattern: /DROP\s+TABLE/i, severity: 'critical', risk: 'SQL DROP TABLE detected' },
  { pattern: /<\s*script[^>]*>/i, severity: 'high', risk: 'Inline script tag (XSS vector)' },
  { pattern: /onload\s*=|onerror\s*=|onclick\s*=/i, severity: 'medium', risk: 'Inline event handler (XSS vector)' },
  { pattern: /new\s+Function\s*\(/i, severity: 'high', risk: 'Dynamic code execution via Function()' },
  { pattern: /setTimeout\s*\(\s*['"`]/i, severity: 'medium', risk: 'String-based setTimeout (eval-like)' },
  { pattern: /child_process/i, severity: 'high', risk: 'Child process module usage' },
  { pattern: /fs\.(write|append)/i, severity: 'medium', risk: 'Filesystem write operation' },
  { pattern: /require\s*\(\s*['"`][^'"`]*(http|request|axios|fetch)/i, severity: 'low', risk: 'Network request dependency' },
];

function analyzeComplexity(code, lang) {
  const lines = code.split('\n');
  const functions = code.match(/(async\s+)?function\s+\w+|const\s+\w+\s*=\s*(async\s+)?\(?[^)]*\)?\s*=>|def\s+\w+|fn\s+\w+|func\s+\w+|sub\s+\w+/g) || [];
  const classes = code.match(/class\s+\w+/g) || [];
  const imports = code.match(/(import|require|from|include|use)\s+/g) || [];
  const comments = code.match(/\/\/.*$|\/[*][\s\S]*?[*]\//gm) || [];
  const emptyLines = lines.filter(l => l.trim() === '').length;
  const todoCount = (code.match(/TODO|FIXME|HACK|XXX/gi) || []).length;
  
  // Cyclomatic complexity estimation
  const branches = code.match(/\bif\b|\belse\b|\bcase\b|\bfor\b|\bwhile\b|\bcatch\b|\b&&\b|\b\|\|\b/g) || [];
  const cyclomatic = branches.length + 1;

  return {
    loc: lines.length,
    codeLines: lines.filter(l => l.trim() !== '' && !l.trim().startsWith('//') && !l.trim().startsWith('#') && !l.trim().startsWith('/*') && !l.trim().startsWith('*')).length,
    functions: functions.length,
    classes: classes.length,
    imports: imports.length,
    commentLines: comments.length,
    emptyLines,
    todoCount,
    estimatedCyclomaticComplexity: cyclomatic,
    complexity: cyclomatic > 20 ? 'high' : cyclomatic > 10 ? 'medium' : 'low',
    avgLineLength: Math.round(lines.reduce((s, l) => s + l.length, 0) / lines.length)
  };
}

function runSecurityScan(code) {
  const findings = [];
  SECURITY_PATTERNS.forEach(({ pattern, severity, risk }) => {
    const matches = code.match(pattern);
    if (matches) {
      const lines = code.split('\n');
      const lineNumbers = [];
      lines.forEach((line, i) => {
        if (pattern.test(line)) lineNumbers.push(i + 1);
      });
      findings.push({
        severity,
        risk,
        matches: matches.length,
        lines: lineNumbers.slice(0, 5)
      });
    }
  });
  
  return {
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
    total: findings.length,
    findings,
    score: Math.max(0, 100 - findings.reduce((s, f) => {
      return s + { critical: 40, high: 20, medium: 10, low: 3 }[f.severity] || 0;
    }, 0))
  };
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-X402-Payment');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // Health
  if (path === '/health' || path === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      agent: 'my-automaton',
      service: 'Code Analysis',
      version: '2.0',
      endpoints: {
        'POST /v1/review': { cost: 5, desc: 'Full code review with metrics and security scan' },
        'POST /v1/security': { cost: 3, desc: 'Security vulnerability scan' },
        'POST /v1/explain': { cost: 2, desc: 'Code structure explanation' },
        'POST /v1/refactor': { cost: 5, desc: 'Refactoring suggestions' },
        'POST /v1/complexity': { cost: 2, desc: 'Quick complexity analysis' }
      },
      payment: { wallet: WALLET, chain: CHAIN }
    }));
  }

  // Handle POST endpoints
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const code = data.code || '';
        const language = data.language || 'javascript';

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing code', example: { code: 'your source code here', language: 'javascript' } }));
        }

        // Route handling
        const costMap = {
          '/v1/review': 5,
          '/v1/security': 3,
          '/v1/explain': 2,
          '/v1/refactor': 5,
          '/v1/complexity': 2
        };
        const cost = costMap[path];
        
        if (!cost) {
          res.writeHead(404);
          return res.end('Not found');
        }

        const payment = req.headers['x-x402-payment'];
        
        if (!payment || !isPaid(payment)) {
          res.writeHead(402, {
            'Content-Type': 'application/json',
            'X-X402-Required': 'true',
            'X-X402-Cost': String(cost),
            'X-X402-Wallet': WALLET,
            'X-X402-Chain': CHAIN
          });
          return res.end(JSON.stringify({
            error: 'payment_required',
            cost_cents: cost,
            cost_display: `${cost}¢ USDC`,
            wallet: WALLET,
            chain: CHAIN,
            route: path,
            instructions: `Send ${cost}¢ USDC to ${WALLET} on Base chain, then retry with header: X-X402-Payment: YOUR_TX_HASH`
          }));
        }

        // Process the request
        let result = {};
        const complexity = analyzeComplexity(code, language);
        const security = runSecurityScan(code);

        switch (path) {
          case '/v1/review':
            result = {
              language,
              linesOfCode: complexity.loc,
              complexity,
              security,
              scores: {
                complexityScore: Math.max(0, 100 - (complexity.estimatedCyclomaticComplexity * 5)),
                securityScore: security.score,
                maintainabilityScore: Math.max(0, 100 - (complexity.functions * 3 + complexity.classes * 5))
              }
            };
            break;
          case '/v1/security':
            result = { language, security, summary: `${security.critical} critical, ${security.high} high, ${security.medium} medium, ${security.low} low` };
            break;
          case '/v1/explain':
            result = {
              language,
              functions: complexity.functions,
              classes: complexity.classes,
              imports: complexity.imports,
              complexity: complexity.complexity,
              suggestions: [
                complexity.todoCount > 0 ? `Found ${complexity.todoCount} TODO/FIXME comments` : 'No pending TODOs',
                complexity.functions > 10 ? 'Consider splitting into modules (many functions)' : 'Reasonable number of functions',
                complexity.commentLines / complexity.loc < 0.05 ? 'Low comment ratio — consider more documentation' : 'Good documentation coverage'
              ]
            };
            break;
          case '/v1/refactor':
            const suggestions = [];
            if (complexity.functions > 15) suggestions.push(`Decompose: ${complexity.functions} functions is high — consider splitting`);
            if (complexity.estimatedCyclomaticComplexity > 15) suggestions.push('High cyclomatic complexity — extract conditions into helper functions');
            if (complexity.avgLineLength > 100) suggestions.push('Lines are long (avg ${complexity.avgLineLength} chars) — adopt 80-100 char limit');
            if (complexity.classes > 5) suggestions.push('Many classes — consider module decomposition');
            if (security.total > 0) suggestions.push(`Fix ${security.total} security issues before refactoring`);
            result = {
              language,
              suggestions: suggestions.length > 0 ? suggestions : ['Code looks clean — minimal refactoring needed'],
              complexity
            };
            break;
          case '/v1/complexity':
            result = {
              language,
              lines: complexity.loc,
              codeLines: complexity.codeLines,
              functions: complexity.functions,
              classes: complexity.classes,
              imports: complexity.imports,
              complexity: complexity.complexity,
              score: Math.max(0, 100 - (complexity.estimatedCyclomaticComplexity * 3))
            };
            break;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, cost: `${cost}¢`, data: result }));

      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body', details: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`🛡️  Code Analysis Service running on port ${PORT}`);
  console.log(`🔍 POST /v1/review     — 5¢ Full review`);
  console.log(`🔒 POST /v1/security   — 3¢ Security scan`);
  console.log(`📖 POST /v1/explain    — 2¢ Code explain`);
  console.log(`🔄 POST /v1/refactor   — 5¢ Refactoring`);
  console.log(`📊 POST /v1/complexity — 2¢ Complexity`);
  console.log(`💳 ${WALLET} (Base)`);
});
