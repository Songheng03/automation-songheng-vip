#!/usr/bin/env node
/**
 * my-automaton CLI - AI-powered code review from your terminal
 * 
 * Usage:
 *   automate review file.js
 *   automate analyze "your text here"
 *   automate summarize document.txt
 * 
 * Free tier: 3 requests/day per IP
 * Premium: Pay with USDC on Base chain
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const API_BASE = 'https://automation.songheng.vip';
const WALLET = '0x76eADdEBFfb6A61DD071f97F4508467fc55dd113';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function request(endpoint, data, isFree = true) {
  return new Promise((resolve, reject) => {
    const url = new URL(isFree ? `/free/v1${endpoint}` : `/v1${endpoint}`, API_BASE);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'automate-cli/1.0.0'
      }
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode === 200) {
            resolve(result);
          } else if (res.statusCode === 402) {
            log(colors.yellow, '\n💰 Payment required!');
            log(colors.cyan, `   Amount: ${result.amount} USDC`);
            log(colors.cyan, `   Send to: ${WALLET} on Base chain`);
            log(colors.cyan, `   Then retry with --paid flag`);
            process.exit(1);
          } else {
            log(colors.red, `Error ${res.statusCode}: ${result.error || body}`);
            process.exit(1);
          }
        } catch (e) {
          log(colors.red, `Error parsing response: ${body}`);
          process.exit(1);
        }
      });
    });

    req.on('error', (err) => {
      log(colors.red, `Request failed: ${err.message}`);
      process.exit(1);
    });

    req.write(JSON.stringify(data));
    req.end();
  });
}

function detectLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const langMap = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    java: 'java',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp'
  };
  return langMap[ext] || 'unknown';
}

async function reviewCommand(filename, options) {
  if (!filename) {
    log(colors.red, 'Error: Please specify a file to review');
    log(colors.cyan, 'Usage: automate review <file> [options]');
    process.exit(1);
  }

  let code;
  try {
    code = fs.readFileSync(filename, 'utf8');
  } catch (err) {
    log(colors.red, `Error reading file: ${err.message}`);
    process.exit(1);
  }

  const language = options.language || detectLanguage(filename);
  
  log(colors.blue, `🤖 Reviewing ${filename} (${language})...`);
  console.log('─'.repeat(60));

  const result = await request('/review', {
    code,
    language,
    focus: options.focus?.split(',') || ['security', 'best-practices', 'readability']
  });

  log(colors.green, '✅ Review Complete\n');
  
  if (result.result) {
    console.log(result.result);
  }
  
  if (result.metadata) {
    console.log('\n' + '─'.repeat(60));
    log(colors.cyan, `Tokens used: ${result.metadata.tokens_used || 'N/A'}`);
    log(colors.cyan, `Processing time: ${result.metadata.processing_time || 'N/A'}`);
  }
}

async function analyzeCommand(text, options) {
  if (!text) {
    log(colors.red, 'Error: Please provide text to analyze');
    log(colors.cyan, 'Usage: automate analyze "your text" [options]');
    process.exit(1);
  }

  log(colors.blue, '📊 Analyzing text...');
  console.log('─'.repeat(60));

  const result = await request('/analyze', {
    text,
    mode: options.mode || 'all'
  });

  log(colors.green, '✅ Analysis Complete\n');
  
  if (result.result) {
    console.log(result.result);
  }
}

async function summarizeCommand(textOrFile, options) {
  let text = textOrFile;
  
  // If it's a file, read it
  if (fs.existsSync(textOrFile)) {
    try {
      text = fs.readFileSync(textOrFile, 'utf8');
    } catch (err) {
      log(colors.red, `Error reading file: ${err.message}`);
      process.exit(1);
    }
  }

  if (!text) {
    log(colors.red, 'Error: Please provide text or file to summarize');
    log(colors.cyan, 'Usage: automate summarize <text or file> [options]');
    process.exit(1);
  }

  log(colors.blue, '📄 Summarizing...');
  console.log('─'.repeat(60));

  const result = await request('/summarize', {
    text,
    max_length: options.maxLength ? parseInt(options.maxLength) : undefined,
    style: options.style || 'brief'
  });

  log(colors.green, '✅ Summary Complete\n');
  
  if (result.result) {
    console.log(result.result);
  }
}

function helpCommand() {
  console.log(`
${colors.bold}${colors.cyan}my-automaton CLI${colors.reset} - AI-powered code review & text analysis

${colors.bold}USAGE:${colors.reset}
  automate <command> [options]

${colors.bold}COMMANDS:${colors.reset}
  ${colors.green}review${colors.reset} <file>              Review code in a file
  ${colors.green}analyze${colors.reset} <text>             Analyze text (sentiment, entities, keywords)
  ${colors.green}summarize${colors.reset} <text or file>   Summarize text or file
  ${colors.green}help${colors.reset}                       Show this help message

${colors.bold}OPTIONS:${colors.reset}
  ${colors.yellow}--language${colors.reset} <lang>          Specify programming language (auto-detect if not set)
  ${colors.yellow}--focus${colors.reset} <areas>            Comma-separated focus areas (security,performance,readability)
  ${colors.yellow}--mode${colors.reset} <mode>              Analysis mode (analyze,sentiment,entities,keywords,all)
  ${colors.yellow}--style${colors.reset} <style>            Summary style (brief,detailed,bullets)
  ${colors.yellow}--max-length${colors.reset} <n>           Maximum summary length
  ${colors.yellow}--paid${colors.reset}                     Use premium API (pay with USDC)

${colors.bold}EXAMPLES:${colors.reset}
  ${colors.cyan}automate review src/index.js${colors.reset}
  ${colors.cyan}automate analyze "AI is transforming healthcare"${colors.reset}
  ${colors.cyan}automate summarize document.txt --style detailed${colors.reset}
  ${colors.cyan}automate review code.py --focus security,performance${colors.reset}

${colors.bold}PRICING:${colors.reset}
  Free tier: 3 requests/day per IP (no payment needed)
  Premium: Unlimited requests via x402 USDC payments (1¢-5¢ per request)
  
  ${colors.magenta}Wallet: ${WALLET}${colors.reset}
  ${colors.magenta}Chain: Base${colors.reset}

${colors.bold}LINKS:${colors.reset}
  Website: ${colors.cyan}https://automation.songheng.vip${colors.reset}
  API Docs: ${colors.cyan}https://automation.songheng.vip/api-docs.html${colors.reset}
  Playground: ${colors.cyan}https://automation.songheng.vip/api-playground.html${colors.reset}
`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const options = {};

// Parse options
for (let i = 1; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    options[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
  }
}

// Route to command
(async () => {
  try {
    switch (command) {
      case 'review':
        await reviewCommand(args[1], options);
        break;
      case 'analyze':
        await analyzeCommand(args[1], options);
        break;
      case 'summarize':
        await summarizeCommand(args[1], options);
        break;
      case 'help':
      case '--help':
      case '-h':
      case undefined:
        helpCommand();
        break;
      default:
        log(colors.red, `Unknown command: ${command}`);
        helpCommand();
        process.exit(1);
    }
  } catch (err) {
    log(colors.red, `Error: ${err.message}`);
    process.exit(1);
  }
})();
