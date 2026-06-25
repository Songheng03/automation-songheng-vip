#!/usr/bin/env node
/**
 * npm-workflow.mjs — Complete npm publish + install one-liner generator
 * 
 * Generates the npm publish commands AND creates the one-liner install pages
 * that drive traffic from npm discoverability.
 * 
 * Run: node /root/automaton/scripts/npm-workflow.mjs
 * 
 * Environment:
 *   NPM_TOKEN — npm access token (needed for publish)
 *   GH_TOKEN — GitHub token (needed for repo creation)
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

const CONTENT = '/root/automaton/content';
const SERVICES = '/root/services';

const PACKAGES = {
  'mcp-server': {
    dir: `${SERVICES}/npm-packages/mcp-server`,
    name: '@my-automaton/mcp-server',
    description: 'MCP server for AI code review, security scanning & text analysis. 7 tools, 3 free/day.',
    main: 'mcp-server.mjs',
    entry: `${SERVICES}/mcp-server.mjs`,
    keywords: ['mcp','model-context-protocol','code-review','ai','security','claude','llm'],
    oneLiner: 'npx -y @my-automaton/mcp-server',
  },
  'cli': {
    dir: `${SERVICES}/npm-packages/cli`,
    name: '@my-automaton/cli',
    description: 'AI CLI for code review, security scanning & text analysis. 7 commands.',
    main: 'cli.mjs',
    entry: `${SERVICES}/npm-packages/cli/cli.mjs`,
    keywords: ['cli','code-review','security','ai','developer-tools'],
    oneLiner: 'npx @my-automaton/cli review --file app.js',
  }
};

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function buildPackage(name, config) {
  log(`Building ${config.name}...`);
  
  const dir = config.dir;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  // Create CLI entry if it doesn't exist
  if (name === 'cli' && !existsSync(`${dir}/cli.mjs`)) {
    writeFileSync(`${dir}/cli.mjs`, `#!/usr/bin/env node
import { execSync } from 'child_process';
const args = process.argv.slice(2);
const cmd = args[0] || 'review';
const fileFlag = args.indexOf('--file');
const file = fileFlag >= 0 ? args[fileFlag + 1] : args[1];
const API = process.env.MY_AUTOMATON_KEY 
  ? 'https://automation.songheng.vip' 
  : 'https://automation.songheng.vip';

async function main() {
  const content = file ? require('fs').readFileSync(file, 'utf8') : '';
  const endpoint = \`\${API}/api/free/\${cmd}\`;
  
  console.log(\`🔍 my-automaton: \${cmd}\`);
  console.log(\`   API: \${endpoint}\\n\`);
  
  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content, code: content, mode: cmd }),
    });
    const data = await resp.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
main();
`);
  }
  
  // Copy entry file
  if (existsSync(config.entry)) {
    const content = require('fs').readFileSync(config.entry, 'utf8');
    writeFileSync(`${dir}/${config.main}`, content);
  }
  
  // Create package.json
  writeFileSync(`${dir}/package.json`, JSON.stringify({
    name: config.name,
    version: '1.0.0',
    description: config.description,
    type: 'module',
    main: config.main,
    bin: name === 'cli' ? {
      'my-automaton': './cli.mjs',
      'ma-review': './cli.mjs review',
      'ma-security': './cli.mjs security',
    } : {
      'my-automaton-mcp': `./${config.main}`,
    },
    files: ['*.mjs', 'README.md', 'LICENSE'],
    keywords: config.keywords,
    license: 'MIT',
  }, null, 2));
  
  // Create README
  writeFileSync(`${dir}/README.md`, `# ${config.name}

${config.description}

## Quick Start

\`\`\`bash
${config.oneLiner}
\`\`\`

## Features
- **Free tier**: 3 analyses/day per endpoint
- **No signup**: Just call the API
- **x402 payments**: Pay per request with USDC on Base
- **CI/CD ready**: GitHub Actions, GitLab CI, CircleCI

## Documentation
https://automation.songheng.vip/api-docs.html
`);
  
  // Create LICENSE
  writeFileSync(`${dir}/LICENSE`, `MIT License

Copyright (c) 2026 my-automaton

Permission is hereby granted, free of charge...
`);
  
  log(`  ✅ Package files ready at ${dir}`);
}

function tryPublish(name, config) {
  const token = process.env.NPM_TOKEN;
  if (!token) {
    log(`  ⚠️  NPM_TOKEN not set. Skipping npm publish for ${config.name}`);
    return false;
  }
  
  try {
    // Create .npmrc
    writeFileSync(`${config.dir}/.npmrc`, `//registry.npmjs.org/:_authToken=\${NPM_TOKEN}`);
    
    // Publish
    execSync(`cd ${config.dir} && npm publish --access public 2>&1`, { 
      timeout: 30000, encoding: 'utf8', stdio: 'pipe' 
    });
    
    log(`  ✅ Published: https://www.npmjs.com/package/${config.name}`);
    return true;
  } catch (err) {
    log(`  ❌ Publish failed: ${err.message.substring(0, 200)}`);
    return false;
  }
}

function generateInstallPages() {
  // Install CLI page
  writeFileSync(`${CONTENT}/install.html`, `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Install my-automaton — AI Code Review CLI & MCP Server</title>
<meta name="description" content="Install my-automaton CLI or MCP server in one command. AI-powered code review, security scanning, and text analysis for developers.">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6;background:#0d1117;color:#c9d1d9}pre{background:#161b22;padding:16px;border-radius:8px;overflow-x:auto;border:1px solid #30363d}code{font-family:'SF Mono',Monaco,monospace;font-size:14px}.cmd{background:#1f2937;color:#58a6ff;padding:12px 16px;border-radius:6px;border:1px solid #30363d;margin:12px 0;font-size:15px;cursor:pointer}.cmd:hover{background:#2d3748}.badge{display:inline-block;background:#238636;color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;margin-left:8px}h1{border-bottom:1px solid #30363d;padding-bottom:12px}h2{margin-top:32px;color:#f0f6fc}.copy-btn{float:right;background:#21262d;color:#8b949e;border:1px solid #30363d;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px}.copy-btn:hover{background:#30363d;color:#c9d1d9}</style>
</head><body>
<h1>🚀 Install my-automaton</h1>
<p>AI-powered code review, security scanning, and text analysis tools. <span class="badge">Free tier available</span></p>

<h2>📦 CLI — One Command</h2>
<pre class="cmd" onclick="navigator.clipboard.writeText('npx @my-automaton/cli review --file app.js')">npx @my-automaton/cli review --file app.js</pre>
<p>Analyze any file — JavaScript, TypeScript, Python, Java, Go, Rust, and more.</p>

<h3>Try it now (no install needed):</h3>
<pre class="cmd" onclick="navigator.clipboard.writeText('curl -X POST https://automation.songheng.vip/api/free/review -H \"Content-Type: application/json\" -d \'{\"code\":\"function hello(){return \\\"world\\\"}\"}\'')">curl -X POST https://automation.songheng.vip/api/free/review \\
  -H "Content-Type: application/json" \\
  -d '{"code":"function hello(){return \\"world\\"}"}'</pre>

<h2>🤖 MCP Server — For Claude & AI Agents</h2>
<pre class="cmd" onclick="navigator.clipboard.writeText('npx -y @my-automaton/mcp-server')">npx -y @my-automaton/mcp-server</pre>
<p>7 MCP tools for AI agents: analyze, summarize, code_review, security_scan, explain_code, refactor_code, complexity_analysis.</p>

<h3>Claude Desktop Config</h3>
<pre>{
  "mcpServers": {
    "my-automaton": {
      "command": "npx",
      "args": ["-y", "@my-automaton/mcp-server"]
    }
  }
}</pre>

<h2>🔧 Available Commands</h2>
<table>
<tr><th>Command</th><th>Description</th><th>Free/Day</th></tr>
<tr><td><code>review</code></td><td>Full code review with score & issues</td><td>3</td></tr>
<tr><td><code>security</code></td><td>Security vulnerability scan (OWASP)</td><td>3</td></tr>
<tr><td><code>analyze</code></td><td>Deep text analysis</td><td>3</td></tr>
<tr><td><code>summarize</code></td><td>AI summarization</td><td>3</td></tr>
<tr><td><code>explain</code></td><td>Code explanation in plain English</td><td>3</td></tr>
<tr><td><code>refactor</code></td><td>Refactoring with diff suggestions</td><td>1</td></tr>
<tr><td><code>complexity</code></td><td>Cyclomatic/cognitive complexity</td><td>3</td></tr>
</table>

<h2>📊 Upgrade for More</h2>
<p>Free: 3/day per endpoint. Need more? <a href="/upgrade.html" style="color:#58a6ff">Get an API Key</a> for unlimited usage.</p>

<script>
document.querySelectorAll('pre').forEach(el => {
  const btn = document.createElement('span');
  btn.className = 'copy-btn';
  btn.textContent = '📋 Copy';
  btn.onclick = function(e) {
    e.stopPropagation();
    const text = el.textContent.replace('📋 Copy','').trim();
    navigator.clipboard.writeText(text);
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = '📋 Copy', 2000);
  };
  el.style.position = 'relative';
  el.appendChild(btn);
});
</script>
</body></html>`);
  
  log(`  ✅ Install page at ${CONTENT}/install.html`);
}

async function main() {
  console.log(`\n=== npm Workflow ===\n`);
  
  // 1. Build all packages
  for (const [name, config] of Object.entries(PACKAGES)) {
    buildPackage(name, config);
  }
  
  // 2. Generate install pages
  generateInstallPages();
  
  // 3. Try to publish to npm
  let published = 0;
  for (const [name, config] of Object.entries(PACKAGES)) {
    if (tryPublish(name, config)) published++;
  }
  
  // 4. Generate npm install one-liner content page
  console.log(`\n=== Summary ===`);
  console.log(`Packages built: ${Object.keys(PACKAGES).length}`);
  console.log(`Published to npm: ${published}`);
  console.log(`Install page: ${CONTENT}/install.html`);
  
  if (published === 0) {
    console.log(`\n📋 To publish manually:`);
    for (const [name, config] of Object.entries(PACKAGES)) {
      console.log(`  cd ${config.dir} && npm publish --access public`);
    }
    console.log(`\n🔑 Set NPM_TOKEN env var for auto-publish`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
