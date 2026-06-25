#!/usr/bin/env node
/**
 * AI Code Review CLI
 * 
 * Usage:
 *   ai-review <file> [options]
 *   ai-review --dir <directory> [options]
 *   ai-review --stdin [options]
 * 
 * Options:
 *   --format <json|text>  Output format (default: text)
 *   --focus <area>        Focus: bugs, security, performance, best-practices, all
 *   --language <lang>     Force language detection
 *   --key <api_key>       API key (or set AUTOMATION_API_KEY env var)
 *   --help                Show this help
 * 
 * Examples:
 *   ai-review src/app.js
 *   ai-review --dir src/ --format json > review.json
 *   cat code.py | ai-review --stdin --language python
 */

const fs = require('fs');
const path = require('path');
const { review, reviewFile, reviewFiles, formatReview } = require('./index');

const args = process.argv.slice(2);

// Parse arguments
const options = {};
let filePath = null;
let dirPath = null;
let useStdin = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  switch (arg) {
    case '--help':
    case '-h':
      printHelp();
      process.exit(0);
      break;
    case '--format':
      options.format = args[++i];
      break;
    case '--focus':
      options.focus = args[++i];
      break;
    case '--language':
      options.language = args[++i];
      break;
    case '--key':
      process.env.AUTOMATION_API_KEY = args[++i];
      break;
    case '--dir':
      dirPath = args[++i];
      break;
    case '--stdin':
      useStdin = true;
      break;
    default:
      if (!arg.startsWith('-')) {
        filePath = arg;
      }
      break;
  }
}

async function main() {
  try {
    let results;

    if (useStdin) {
      // Read from stdin
      const chunks = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      const code = Buffer.concat(chunks).toString('utf-8');
      const result = await review(code, options);
      results = [{ file: 'stdin', status: 'success', review: result }];
    } else if (dirPath) {
      // Review all files in directory
      const files = findFiles(dirPath);
      if (files.length === 0) {
        console.error('No files found in directory:', dirPath);
        process.exit(1);
      }
      console.log(`📁 Reviewing ${files.length} files in ${dirPath}...`);
      results = await reviewFiles(files, options);
    } else if (filePath) {
      // Review single file
      const result = await reviewFile(filePath, options);
      results = [{ file: filePath, status: 'success', review: result }];
    } else {
      printHelp();
      process.exit(1);
    }

    // Output results
    if (options.format === 'json') {
      console.log(JSON.stringify(results, null, 2));
    } else {
      for (const r of results) {
        if (r.status === 'error') {
          console.error(`❌ ${r.file}: ${r.error}`);
        } else {
          console.log(`\n📄 File: ${r.file}`);
          console.log(formatReview(r.review, { format: 'text' }));
        }
      }
    }

    // Exit with non-zero if critical issues found
    const hasCritical = results.some(r => 
      r.review && r.review.issues && 
      r.review.issues.some(i => i.severity === 'critical')
    );
    
    if (hasCritical) {
      process.exit(2); // Exit code 2 = critical issues found
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function findFiles(dir, extensions = ['.js', '.ts', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.rb', '.php', '.cs', '.swift', '.kt']) {
  const files = [];
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip common non-source directories
        if (['node_modules', '.git', 'dist', 'build', 'vendor', 'target', '__pycache__'].includes(entry.name)) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(path.resolve(dir));
  return files;
}

function printHelp() {
  console.log(`
AI Code Review CLI — Powered by DeepSeek AI

Usage:
  ai-review <file> [options]        Review a single file
  ai-review --dir <directory>       Review all source files in a directory
  ai-review --stdin                 Review code from stdin

Options:
  --format <json|text>  Output format (default: text)
  --focus <area>        Focus: bugs, security, performance, best-practices, all
  --language <lang>     Force language (js, python, java, go, rust, etc.)
  --key <api_key>       API key (or set AUTOMATION_API_KEY env var)
  --help, -h            Show this help

Examples:
  ai-review src/app.js
  ai-review --dir src/ --format json > review.json
  cat code.py | ai-review --stdin --language python

Environment:
  AUTOMATION_API_KEY   Your API key from https://automation.songheng.vip/pricing
  AUTOMATION_API_URL   API base URL (default: https://automation.songheng.vip)

Exit codes:
  0  Success, no critical issues
  1  Error (invalid key, network issue, etc.)
  2  Critical issues found in code

Get your API key: https://automation.songheng.vip/pricing
`);
}

main();
