#!/usr/bin/env node

/**
 * install-mcp.js — One-command MCP installer for my-automaton
 * 
 * Usage: npx @my-automaton/install-mcp
 * Or:    curl -s https://automation.songheng.vip/install-mcp.mjs | node
 * 
 * This installs my-automaton as an MCP tool in:
 * - Claude Desktop (claude_desktop_config.json)
 * - Cursor IDE (.cursor/mcp.json)
 * - VS Code/Cline
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const CONFIG_SOURCES = {
  claude: {
    label: 'Claude Desktop',
    path: path.join(os.homedir(), '.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/claude_desktop_config.json'),
    altPath: path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json'),
    key: 'mcpServers',
    config: {
      command: 'node',
      args: ['-e', `
        const http = require('http');
        const server = http.createServer((req, res) => {
          let body = '';
          req.on('data', c => body += c);
          req.on('end', () => {
            try {
              const msg = JSON.parse(body);
              if (msg.method === 'tools/list') {
                res.end(JSON.stringify({
                  jsonrpc: '2.0', id: msg.id,
                  result: {
                    tools: [
                      { name: 'review_code', description: 'Review code for bugs, security issues, and quality', 
                        inputSchema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' } }, required: ['code'] } },
                      { name: 'analyze_text', description: 'Analyze text for meaning and insights',
                        inputSchema: { type: 'object', properties: { text: { type: 'string' }, mode: { type: 'string' } }, required: ['text'] } },
                      { name: 'security_scan', description: 'Scan code for security vulnerabilities',
                        inputSchema: { type: 'object', properties: { code: { type: 'string' }, language: { type: 'string' } }, required: ['code'] } }
                    ]
                  }
                }));
              } else if (msg.method === 'tools/call') {
                const tool = msg.params.name;
                const args = msg.params.arguments || {};
                const API = 'https://automation.songheng.vip/free/' + tool.replace('_', '/');
                https.get(API + '?' + new URLSearchParams(args), resp => {
                  let data = '';
                  resp.on('data', c => data += c);
                  resp.on('end', () => {
                    res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: data }] } }));
                  });
                }).on('error', e => {
                  res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: e.message } }));
                });
              }
            } catch(e) {
              res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: e.message } }));
            }
          });
        });
        server.listen(0, () => console.log(JSON.stringify({port: server.address().port})));
      `]
    }
  }
};

function printBanner() {
  console.log(`
╔══════════════════════════════════════════════╗
║       🤖 my-automaton MCP Installer         ║
║   AI code review & analysis for your IDE     ║
╚══════════════════════════════════════════════╝
`);
}

function printHelp() {
  console.log('Quick install for AI-powered code review in your editor.\n');
  console.log('USAGE:');
  console.log('  npx @my-automaton/install-mcp          Interactive install');
  console.log('  npx @my-automaton/install-mcp --claude  Auto-configure Claude Desktop');
  console.log('  npx @my-automaton/install-mcp --cursor  Auto-configure Cursor IDE');
  console.log('  npx @my-automaton/install-mcp --help    This help\n');
  console.log('MANUAL CONFIG:');
  console.log('  Add to your MCP config:');
  console.log(JSON.stringify({
    [CONFIG_SOURCES.claude.key]: {
      'my-automaton': CONFIG_SOURCES.claude.config
    }
  }, null, 2));
  console.log('\nThen use tools like: review_code, security_scan, analyze_text');
  console.log('Free tier: 3 calls/day/IP. Upgrade for unlimited:');
  console.log('  https://automation.songheng.vip/get-started.html\n');
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    printBanner();
    printHelp();
    return;
  }

  if (args.includes('--manual') || args.includes('-m')) {
    printBanner();
    console.log('📋 Manual MCP Configuration:\n');
    console.log('For Claude Desktop, add to claude_desktop_config.json:\n');
    console.log(JSON.stringify({
      mcpServers: {
        'my-automaton': CONFIG_SOURCES.claude.config
      }
    }, null, 2));
    console.log('\nFor Cursor IDE, add to .cursor/mcp.json:\n');
    console.log(JSON.stringify({
      mcpServers: {
        'my-automaton': CONFIG_SOURCES.claude.config
      }
    }, null, 2));
    console.log('\n📖 Full docs: https://automation.songheng.vip/api-docs.html');
    return;
  }

  printBanner();

  // Auto-install mode
  if (args.includes('--claude')) {
    await installClaude();
    return;
  }
  if (args.includes('--cursor')) {
    await installCursor();
    return;
  }

  // Interactive mode
  console.log('🤖 Welcome to my-automaton MCP Installer!');
  console.log('I will add AI code review to your editor.\n');
  
  console.log('Select your editor:');
  console.log('  [1] Claude Desktop');
  console.log('  [2] Cursor IDE');
  console.log('  [3] VS Code / Cline');
  console.log('  [m] Manual (print config only)');
  console.log('  [q] Quit\n');

  // Non-interactive: just print instructions
  console.log('📋 To install manually, run with --manual flag:\n');
  printHelp();
}

async function installClaude() {
  console.log('🔧 Installing for Claude Desktop...');
  
  // Try common paths
  for (const configPath of [CONFIG_SOURCES.claude.path, CONFIG_SOURCES.claude.altPath]) {
    try {
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
      
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['my-automaton'] = CONFIG_SOURCES.claude.config;
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`✅ Installed! Config written to: ${configPath}`);
      console.log('🔄 Restart Claude Desktop to activate.');
      console.log('');
      console.log('🤖 Try asking Claude: "Review this code for security issues"');
      console.log('📖 Docs: https://automation.songheng.vip/api-docs.html');
      return;
    } catch(e) {
      console.log(`  ⚠️  Could not write to ${configPath}: ${e.message}`);
    }
  }
  
  console.log('❌ Could not find Claude Desktop config directory.');
  console.log('   Run with --manual to see the config to add manually.');
}

async function installCursor() {
  console.log('🔧 Installing for Cursor IDE...');
  
  const cursorPaths = [
    path.join(process.cwd(), '.cursor/mcp.json'),
    path.join(os.homedir(), '.cursor/mcp.json')
  ];
  
  for (const configPath of cursorPaths) {
    try {
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
      
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers['my-automaton'] = CONFIG_SOURCES.claude.config;
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`✅ Installed! Config written to: ${configPath}`);
      console.log('🔄 Restart Cursor IDE to activate.');
      return;
    } catch(e) {
      console.log(`  ⚠️  Could not write to ${configPath}: ${e.message}`);
    }
  }
  
  console.log('❌ Could not find Cursor config directory.');
  console.log('   Run with --manual to see the config to add manually.');
}

// Run
main().catch(console.error);
